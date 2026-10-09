const CSL=require('citeproc');
function formatDocument(input,styleXML,localeXML){
 const refs=Object.fromEntries(input.references.map(r=>[String(r.id),r]));
 const engine=new CSL.Engine({retrieveLocale:()=>localeXML,retrieveItem:id=>{if(!refs[id])throw new Error('Missing reference '+id);return refs[id];}},styleXML,'en-US');engine.setOutputFormat('html');
 const citations=input.clusters.map((c,i)=>({citationID:c.id,citationItems:c.items.map(item=>({id:String(item.id),...(item.locator?{locator:String(item.locator),label:item.label||'page'}:{}),...(item.prefix?{prefix:String(item.prefix)}:{}),...(item.suffix?{suffix:String(item.suffix)}:{}),...(item.suppressAuthor?{'suppress-author':true}:{})})),properties:{noteIndex:c.noteIndex||0}}));
 const citationResults=engine.rebuildProcessorState(citations);
 const bibliography=citations.length?engine.makeBibliography():null;
 return {citations:Object.fromEntries(citationResults.map(c=>[c[0],c[2]])),bibliography:bibliography?bibliography[1].join(''):'',bibliographySettings:bibliography?bibliography[0]:{},styleXml:styleXML,localeXml:localeXML};
}
module.exports={formatDocument};
