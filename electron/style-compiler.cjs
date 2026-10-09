const fs=require('node:fs/promises');const path=require('node:path');const os=require('node:os');const {spawn}=require('node:child_process');
function processResult(executable,args,options={},timeout=15000){return new Promise((resolve,reject)=>{
 const child=spawn(executable,args,{windowsHide:true,shell:false,...options});let stdout='',stderr='',size=0,problem=null;
 const timer=setTimeout(()=>{problem=new Error('Python exceeded the '+timeout/1000+' second execution limit.');child.kill();},timeout);
 function collect(which,buffer){size+=buffer.length;if(size>512000){problem=new Error('Python output exceeded 512 KB.');child.kill();return;}if(which==='out')stdout+=buffer.toString('utf8');else stderr+=buffer.toString('utf8');}
 child.stdout.on('data',b=>collect('out',b));child.stderr.on('data',b=>collect('err',b));child.on('error',e=>{clearTimeout(timer);reject(e);});child.on('close',code=>{clearTimeout(timer);if(problem)reject(problem);else resolve({code,stdout,stderr});});
});}
async function runtime(configured='',bundled=path.join(__dirname,'../python/runtime/python.exe')){
 const candidates=configured?[{exe:configured,args:[]}]:[...(process.env.CITOGRAPH_PYTHON?[{exe:process.env.CITOGRAPH_PYTHON,args:[]}]:[]),{exe:bundled,args:[]},{exe:'py',args:['-3']},{exe:path.join(process.env.LOCALAPPDATA||'', 'Programs/Python/Python311/python.exe'),args:[]},{exe:'python',args:[]}];
 for(const c of candidates){try{const r=await processResult(c.exe,[...c.args,'-c','import sys,json; print(json.dumps({"version":sys.version.split()[0],"executable":sys.executable,"supported":sys.version_info >= (3,11)}))'],{},4000);const data=JSON.parse(r.stdout);if(r.code===0&&data.supported)return {...c,...data};}catch{}}
 throw new Error('Python 3.11 or later was not found. Install Python or choose its python.exe path in Python Lab.');
}
async function compile(request,pythonDirectory){
 if(!request||!['builder','python'].includes(request.mode))throw new Error('Choose builder or Python mode.');
 if(typeof request.source!=='string'||request.source.length>200000||typeof request.xml!=='string'||request.xml.length>2000000)throw new Error('Invalid compiler input.');
 const py=await runtime(request.interpreter||'',path.join(pythonDirectory,'runtime/python.exe'));const directory=await fs.mkdtemp(path.join(os.tmpdir(),'citograph-style-'));
 try{
  await Promise.all(['runner.py','citograph_style.py'].map(f=>fs.copyFile(path.join(pythonDirectory,f),path.join(directory,f))));
  await fs.writeFile(path.join(directory,'request.json'),JSON.stringify(request));await fs.writeFile(path.join(directory,'recipe.py'),request.source);
  const output=path.join(directory,'result.json');
  const r=await processResult(py.exe,[...py.args,'-B','-u',path.join(directory,'runner.py'),path.join(directory,'request.json'),path.join(directory,'recipe.py')],{cwd:directory,env:{...process.env,PYTHONIOENCODING:'utf-8',CITOGRAPH_STYLE_OUTPUT:output}},15000);
  if(r.code!==0)return {ok:false,...r,version:py.version};
  let result;try{const stat=await fs.stat(output);if(stat.size>2200000)throw new Error('Compiled style exceeds 2 MB.');result=JSON.parse(await fs.readFile(output,'utf8'));}catch(e){return {ok:false,...r,stderr:r.stderr+'\nNo usable style was emitted. Define style = Style(...) or call emit(style). '+e.message,version:py.version};}
  return {ok:true,xml:result.xml,...r,version:py.version};
 }finally{await fs.rm(directory,{recursive:true,force:true});}
}
module.exports={runtime,compile,processResult};
