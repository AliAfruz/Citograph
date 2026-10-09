const http=require('node:http'),fs=require('node:fs'),path=require('node:path'),crypto=require('node:crypto');const {Worker}=require('node:worker_threads');
const STYLE_LIST=[['apa','APA 7th edition'],['ieee','IEEE'],['nature','Nature'],['nlm-citation-sequence','NLM / Vancouver'],['chicago-author-date','Chicago author–date'],['modern-language-association','MLA 9th edition'],['american-chemical-society','American Chemical Society'],['harvard-cite-them-right','Harvard · Cite Them Right']].map(([id,name])=>({id,name}));
const CSL_FIELDS=['id','type','title','author','editor','issued','accessed','container-title','collection-title','publisher','publisher-place','volume','issue','page','DOI','URL','ISBN','ISSN','edition','language','abstract'];
const publicReference=r=>Object.fromEntries([...CSL_FIELDS,'tags','collections','starred'].filter(k=>r[k]!==undefined).map(k=>[k,r[k]]));
function validateFormat(input){
 if(!input||!Array.isArray(input.references)||!Array.isArray(input.clusters))throw new Error('References and citation clusters are required.');
 if(input.references.length>10000||input.clusters.length>5000)throw new Error('Document exceeds the 10,000-source or 5,000-citation limit.');
 const ids=new Set();for(const r of input.references){if(!r||typeof r.id!=='string'||typeof r.title!=='string'||ids.has(r.id))throw new Error('Invalid or duplicate source.');ids.add(r.id);}
 const citationIds=new Set();for(const c of input.clusters){if(!c||typeof c.id!=='string'||citationIds.has(c.id)||!Array.isArray(c.items)||!c.items.length||c.items.length>100)throw new Error('Invalid citation cluster.');citationIds.add(c.id);for(const item of c.items)if(!item||!ids.has(item.id))throw new Error('Citation contains a missing source.');}
 if(input.styleXml&& (typeof input.styleXml!=='string'||input.styleXml.length>2000000||!input.styleXml.includes('<style')))throw new Error('Invalid CSL style snapshot.');
 return input;
}
function runFormatter(input,styleXML,localeXML){return new Promise((resolve,reject)=>{const worker=new Worker(path.join(__dirname,'citation-worker.cjs'),{workerData:{input,styleXML,localeXML}});const timeout=setTimeout(()=>{worker.terminate();reject(new Error('Citation formatting timed out.'));},40000);worker.once('message',m=>{clearTimeout(timeout);worker.terminate();m.error?reject(new Error(m.error)):resolve(m.result);});worker.once('error',e=>{clearTimeout(timeout);reject(e);});worker.once('exit',code=>{if(code!==0){clearTimeout(timeout);reject(new Error('Citation worker stopped.'));}});});}
async function startWordBridge({directory,stylesDirectory,getState,getLibrarySession,onImport,version='1.2.0',port=47631,format=runFormatter}){
 const token=crypto.randomBytes(32).toString('hex');const descriptorPath=path.join(directory,'word-bridge.json');
 const respond=(res,status,data)=>{res.writeHead(status,{'Content-Type':'application/json; charset=utf-8','Cache-Control':'no-store','X-Content-Type-Options':'nosniff'});res.end(JSON.stringify(data));};
 const server=http.createServer(async(req,res)=>{
  try{
   if(req.headers.origin) return respond(res,403,{error:'Browser access is not allowed.'});
   const expected=Buffer.from('Bearer '+token);const actual=Buffer.from(String(req.headers.authorization||''));if(expected.length!==actual.length||!crypto.timingSafeEqual(expected,actual))return respond(res,401,{error:'Unauthorized Word bridge request.'});
   const url=new URL(req.url,'http://127.0.0.1');const state=getState(),librarySession=getLibrarySession?.();
   if(req.method==='GET'&&url.pathname==='/health')return respond(res,200,{name:'Citograph Word Bridge',version,protocol:1,ready:!!state});
   if(req.method==='GET'&&url.pathname==='/library')return respond(res,200,{references:(state?.references||[]).filter(r=>!r.deletedAt).map(publicReference),collections:state?.collections||[],styles:[...STYLE_LIST,...(state?.settings?.customStyles||[]).map(s=>({id:s.id,name:s.name}))]});
   if(req.method!=='POST'||!['/format','/import'].includes(url.pathname))return respond(res,404,{error:'Unknown Word bridge endpoint.'});
   let size=0;const chunks=[];for await(const chunk of req){size+=chunk.length;if(size>16*1024*1024){respond(res,413,{error:'Request exceeds 16 MB.'});req.destroy();return;}chunks.push(chunk);}
   let input;try{input=JSON.parse(Buffer.concat(chunks).toString('utf8'));}catch{return respond(res,400,{error:'Invalid JSON request.'});}
   if(url.pathname==='/import'){if(!Array.isArray(input.references)||input.references.length>10000)throw new Error('Invalid import.');return respond(res,200,await onImport(input.references,librarySession));}
   validateFormat(input);
   const styles=[...STYLE_LIST,...(state?.settings?.customStyles||[])];const selected=styles.find(s=>s.id===(input.style||'apa'));
   const styleXML=input.styleXml || selected?.xml || (selected?fs.readFileSync(path.join(stylesDirectory,selected.id+'.csl'),'utf8'):null);if(!styleXML)throw new Error('Citation style is unavailable.');
   const localeXML=input.localeXml || fs.readFileSync(path.join(stylesDirectory,'locales-en-US.xml'),'utf8');if(typeof localeXML!=='string'||localeXML.length>2000000)throw new Error('Invalid locale.');
   respond(res,200,await format(input,styleXML,localeXML));
  }catch(error){if(!res.headersSent)respond(res,400,{error:error.message});}
 });
 await new Promise((resolve,reject)=>{server.once('error',reject);server.listen(port,'127.0.0.1',resolve);});
 const descriptor={port:server.address().port,token,pid:process.pid,protocol:1,version};fs.mkdirSync(directory,{recursive:true});fs.writeFileSync(descriptorPath,JSON.stringify(descriptor),'utf8');
 return {server,descriptor,close:()=>{server.close();try{const current=JSON.parse(fs.readFileSync(descriptorPath,'utf8'));if(current.token===token)fs.unlinkSync(descriptorPath);}catch{}}};
}
module.exports={startWordBridge,validateFormat,publicReference};
