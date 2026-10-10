import {normalizeReference,normalizeDOI,authors,uid} from './core.mjs';
const key=value=>String(value||'').normalize('NFKC').toLowerCase().replace(/[^\p{L}\p{N}]/gu,'');
export function prepareWordImport(previous,refs){
 if(!Array.isArray(refs)||refs.length>10000)throw new Error('Invalid Word references.');
 const existing=previous.references.filter(r=>!r.deletedAt),imported=[],idMap={};let skipped=0;
 for(const raw of refs){
  if(!raw||typeof raw.id!=='string'||!raw.title)throw new Error('Word source requires an ID and title.');
  const ref=normalizeReference(raw,{id:uid(),source:raw.source==='EndNote Word migration'?raw.source:'Word traveling library',collections:[],attachments:[],annotations:[],notes:'',evidence:'',method:'',limitations:''});
  const match=[...existing,...imported].find(r=>ref.DOI&&normalizeDOI(r.DOI)===ref.DOI||(!(ref.DOI&&r.DOI)&&key(ref.title)===key(r.title)&&JSON.stringify(ref.issued||null)===JSON.stringify(r.issued||null)&&key(authors(ref))===key(authors(r))));
  if(match){skipped++;idMap[raw.id]=match.id;}else{imported.push(ref);idMap[raw.id]=ref.id;}
 }
 return {state:{...previous,references:[...imported,...previous.references]},result:{added:imported.length,skipped,idMap}};
}
