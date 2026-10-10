import {uniqueCitationItems} from './citation-items.mjs';
import { Cite } from '@citation-js/core';
import '@citation-js/plugin-bibtex';
import '@citation-js/plugin-ris';
import CSL from 'citeproc';
import {parsePubMed} from './pubmed.mjs';

export const uid = () => globalThis.crypto.randomUUID();
export const STYLES = [{id:'apa',name:'APA 7th edition'},{id:'ieee',name:'IEEE'},{id:'nature',name:'Nature'},{id:'nlm-citation-sequence',name:'NLM / Vancouver'},{id:'chicago-author-date',name:'Chicago author–date'},{id:'modern-language-association',name:'MLA 9th edition'},{id:'american-chemical-society',name:'American Chemical Society'},{id:'harvard-cite-them-right',name:'Harvard · Cite Them Right'}];
export const year = r => r.issued?.['date-parts']?.[0]?.[0] || '';
export const authors = r => (r.author || []).map(a => a.literal || [a.given,a.family].filter(Boolean).join(' ')).join(', ');
export const shortAuthors = r => r.author?.length ? (r.author[0].family || r.author[0].literal || '') + (r.author.length > 1 ? ' et al.' : '') : 'Unknown author';
export const normalizeDOI = value => String(value || '').trim().replace(/^(?:https?:\/\/(?:dx\.)?doi\.org\/|doi:\s*)/i,'').replace(/[.,;]+$/,'').toLowerCase();
export const stripTags = str => String(str || '').replace(/<[^>]*>/g,' ').replace(/\s+/g,' ').trim();
export const escapeHTML = str => String(str ?? '').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
export function normalizeReference(raw, overrides={}) {
  if (!raw || typeof raw !== 'object' || Array.isArray(raw)) throw new Error('A reference must be an object.');
  const list=value=>Array.isArray(value)?[...new Set(value.filter(v=>typeof v==='string'&&v.trim()).map(v=>v.trim()))]:[];
  return {...raw,id:String(raw.id || uid()),title:stripTags(raw.title || 'Untitled reference'),type:String(raw.type || 'article-journal'),author:Array.isArray(raw.author)?raw.author.filter(a=>a&&typeof a==='object').map(a=>({...a,...(a.family?{family:String(a.family)}:{}),...(a.given?{given:String(a.given)}:{}),...(a.literal?{literal:String(a.literal)}:{})})):[],DOI:normalizeDOI(raw.DOI),abstract:stripTags(raw.abstract),tags:list(raw.tags),collections:list(raw.collections),status:['unread','reading','read'].includes(raw.status)?raw.status:'unread',starred:!!raw.starred,notes:String(raw.notes || ''),evidence:String(raw.evidence || ''),method:String(raw.method || ''),limitations:String(raw.limitations || ''),attachments:Array.isArray(raw.attachments)?raw.attachments.filter(a=>a&&typeof a.id==='string'):[],annotations:Array.isArray(raw.annotations)?raw.annotations.filter(a=>a&&typeof a.id==='string'):[],addedAt:raw.addedAt || new Date().toISOString(),...overrides};
}
export function crossrefToReference(work) {
  return normalizeReference({title:work.title?.[0],type:({'journal-article':'article-journal','book-chapter':'chapter','proceedings-article':'paper-conference'})[work.type] || work.type || 'article-journal',author:work.author?.map(a=>({family:a.family || '',given:a.given || '',...(a.name ? {literal:a.name}: {})})),issued:work.published || work.issued,'container-title':work['container-title']?.[0] || '',publisher:work.publisher || '',volume:work.volume || '',issue:work.issue || '',page:work.page || '',DOI:work.DOI,URL:work.URL || '',ISBN:work.ISBN?.[0] || '',abstract:work.abstract || '',citationCount:work['is-referenced-by-count'] || 0,tags:work.subject?.slice(0,5) || [],source:'Crossref',fetchedAt:new Date().toISOString()});
}
export async function searchCrossref(query) {
  const doi = normalizeDOI(query);
  const direct = /^10\.\d{4,9}\//.test(doi);
  const url = direct ? `https://api.crossref.org/works/${encodeURIComponent(doi)}` : `https://api.crossref.org/works?query.bibliographic=${encodeURIComponent(query)}&rows=20`;
  const json = window.citograph ? await window.citograph.crossref(url) : await fetch(url,{signal:AbortSignal.timeout(25000)}).then(r=>{if(!r.ok)throw new Error(`Crossref returned ${r.status}. Try again later.`);return r.json();});
  return (direct ? [json.message] : json.message.items).map(crossrefToReference);
}
export function importReferences(text,filename='') {
  let records;
  const trimmed = text.trim();
  if (/\.(?:nbib|medline)$/i.test(filename) || /^PMID\s*-\s*\d+/m.test(trimmed)) {
    records = parsePubMed(trimmed);
  } else if (/\.(?:json|csl)$/i.test(filename) || /^[\[{]/.test(trimmed)) {
    const json = JSON.parse(trimmed);
    records = Array.isArray(json) ? json : json.references || json.items || [json];
  } else if (/^<\?xml|^<xml|^<records|^<EndNote/i.test(trimmed) || /\.xml$/i.test(filename)) {
    const doc = new DOMParser().parseFromString(text,'application/xml');
    if(doc.querySelector('parsererror')) throw new Error('This XML file is not valid.');
    records = [...doc.querySelectorAll('record')].map(el=>{
      const get = name=>el.querySelector(name)?.textContent.trim() || '';
      return {title:get('title'),author:[...el.querySelectorAll('authors author')].map(a=>parseAuthor(a.textContent)),issued:{'date-parts':[[Number(get('year')) || 0]]},'container-title':get('secondary-title'),DOI:get('electronic-resource-num'),volume:get('volume'),issue:get('number'),page:get('pages'),abstract:get('abstract'),notes:get('notes'),tags:[...el.querySelectorAll('keyword')].map(k=>k.textContent),type:'article-journal'};
    });
  } else {
    records = new Cite(trimmed).data;
  }
  if(!Array.isArray(records) || !records.length) throw new Error('No references found. Use PubMed NBIB, BibTeX, RIS, CSL JSON, or EndNote XML.');
  return records.map(r=>normalizeReference(r,{id:uid()}));
}
export function parseAuthor(value) {
  const str=value.trim();
  if(str.includes(',')){const [family,...given]=str.split(',');return {family:family.trim(),given:given.join(',').trim()};}
  const words=str.split(/\s+/);return {family:words.pop() || '',given:words.join(' ')};
}
export function duplicateGroups(refs) {
  const parent=refs.map((_,i)=>i),doiMap=new Map(),titleMap=new Map();
  const find=i=>parent[i]===i?i:(parent[i]=find(parent[i]));const join=(a,b)=>{parent[find(b)]=find(a);};
  refs.forEach((r,i)=>{const doi=normalizeDOI(r.DOI);if(doi){if(doiMap.has(doi))join(doiMap.get(doi),i);else doiMap.set(doi,i);}const title=r.title.toLowerCase().replace(/[^\p{L}\p{N}]/gu,'');if(title.length<16)return;const y=String(year(r));if(!titleMap.has(title))titleMap.set(title,new Map());const matches=titleMap.get(title);if(matches.has(y))join(matches.get(y),i);else matches.set(y,i);if(matches.has(''))join(matches.get(''),i);if(!y)for(const at of matches.values())join(at,i);});
  const groups=new Map();refs.forEach((r,i)=>{const root=find(i);if(!groups.has(root))groups.set(root,[]);groups.get(root).push(r);});return [...groups.values()].filter(g=>g.length>1);
}
export function mergeReferences(records) {
  const [first,...rest]=records;
  const result={...first};
  for(const r of rest) {
    for(const key of ['DOI','abstract','container-title','volume','issue','page','URL','publisher','ISBN','evidence','method','limitations']) if(!result[key] && r[key])result[key]=r[key];
    if(!result.author?.length && r.author?.length)result.author=r.author;
    if(!year(result) && year(r))result.issued=r.issued;
    result.tags=[...new Set([...result.tags,...r.tags])];result.collections=[...new Set([...result.collections,...r.collections])];
    result.notes=[result.notes,r.notes].filter(Boolean).filter((x,i,a)=>a.indexOf(x)===i).join('\n\n');
    result.attachments=[...new Map([...result.attachments,...r.attachments].map(a=>[a.id,a])).values()];
    result.annotations=[...new Map([...result.annotations,...r.annotations].map(a=>[a.id,a])).values()];
    result.starred=result.starred || r.starred;
  }return result;
}
export function cslData(r) {
  const allowed=['id','type','title','author','editor','issued','accessed','container-title','collection-title','publisher','publisher-place','volume','issue','page','DOI','URL','ISBN','ISSN','edition','language','abstract'];
  return Object.fromEntries(allowed.filter(k=>r[k]!==undefined && r[k]!=='' && (k!=='issued'||year(r))).map(k=>[k,r[k]]));
}
export function formatCitations(refs,styleXML,localeXML,clusters=null) {
  if(!refs.length)return {bibliography:'',entries:[],citations:[]};
  const records=Object.fromEntries(refs.map(r=>[String(r.id),cslData(r)]));
  const engine=new CSL.Engine({retrieveLocale:()=>localeXML,retrieveItem:id=>records[id]},styleXML,'en-US');
  engine.setOutputFormat('html');
  engine.updateItems(Object.keys(records));
  const groups=clusters || refs.map(r=>[{id:String(r.id)}]);
  const citations=groups.map(items=>engine.makeCitationCluster(uniqueCitationItems(items)));
  const bib=engine.makeBibliography();
  return {bibliography:bib ? bib[1].join('') : '',entries:bib ? bib[1] : [],citations};
}
export function formatManuscript(body,refs,styleXML,localeXML){
  const byId=Object.fromEntries(refs.map(r=>[r.id,r]));
  const matches=[...body.matchAll(/\[\[cite:([^\]|]+)(?:\|([^\]]+))?\]\]/g)];
  const citedIds=[...new Set(matches.flatMap(m=>m[1].split(',')).filter(id=>byId[id]))];
  const engine=new CSL.Engine({retrieveLocale:()=>localeXML,retrieveItem:id=>cslData(byId[id])},styleXML,'en-US');engine.setOutputFormat('html');
  const citations=matches.map((m,i)=>({citationID:'citation-'+i,citationItems:uniqueCitationItems(m[1].split(',').filter(id=>byId[id]).map(id=>({id,...(m[2]?{locator:m[2],label:'page'}:{})}))),properties:{noteIndex:0}}));
  const valid=citations.filter(c=>c.citationItems.length);
  const formatted=new Map(engine.rebuildProcessorState(valid).map(c=>[c[0],c[2]]));
  let index=0;
  const html=escapeHTML(body).replace(/\[\[cite:([^\]|]+)(?:\|([^\]]+))?\]\]/g,()=>`<span class="manuscript-citation">${formatted.get('citation-'+(index++)) || '[Missing reference]'}</span>`);
  const bib=citedIds.length ? engine.makeBibliography() : null;
  return {html:html.split(/\n\n+/).map(p=>`<p>${p.replace(/\n/g,'<br>')}</p>`).join(''),bibliography:bib?bib[1].join(''):'',citedIds};
}
const bibEscape=s=>String(s ?? '').replace(/[{}]/g,c=>'\\'+c);
export function exportReferences(refs,format) {
  if(format==='json')return JSON.stringify(refs.map(cslData),null,2);
  if(format==='bib') return refs.map((r,index)=>{
    const type=({'article-journal':'article','paper-conference':'inproceedings','book':'book','chapter':'incollection','thesis':'phdthesis'})[r.type] || 'misc';
    const fields={title:r.title,author:(r.author || []).map(a=>a.literal || `${a.family}${a.given ? ', '+a.given : ''}`).join(' and '),year:year(r),journal:r['container-title'],volume:r.volume,number:r.issue,pages:r.page,doi:r.DOI,url:r.URL,publisher:r.publisher,isbn:r.ISBN};
    const key=(r.author?.[0]?.family || 'ref').replace(/[^a-zA-Z]/g,'')+year(r)+'_'+(index+1);
    return `@${type}{${key},\n${Object.entries(fields).filter(([,v])=>v).map(([k,v])=>`  ${k} = {${bibEscape(v)}}`).join(',\n')}\n}`;
  }).join('\n\n');
  if(format==='ris')return refs.map(r=>[
    `TY  - ${({book:'BOOK',chapter:'CHAP',thesis:'THES','paper-conference':'CONF'})[r.type] || 'JOUR'}`,
    `TI  - ${r.title}`,...(r.author || []).map(a=>`AU  - ${a.literal || `${a.family}, ${a.given || ''}`}`),year(r)&&`PY  - ${year(r)}`,r['container-title']&&`JO  - ${r['container-title']}`,r.DOI&&`DO  - ${r.DOI}`,r.volume&&`VL  - ${r.volume}`,r.issue&&`IS  - ${r.issue}`,r.page&&`SP  - ${r.page}`,r.URL&&`UR  - ${r.URL}`,r.abstract&&`AB  - ${r.abstract}`,...r.tags.map(t=>`KW  - ${t}`),'ER  - '
  ].filter(Boolean).join('\n')).join('\n\n');
  throw new Error('Unknown export format.');
}
export function relationships(refs) {
  const links=[];
  for(let i=0;i<refs.length;i++)for(let j=i+1;j<refs.length;j++){
    const sharedTags=refs[i].tags.filter(t=>refs[j].tags.some(s=>s.toLowerCase()===t.toLowerCase()));
    const sharedAuthors=(refs[i].author || []).filter(a=>a.family && refs[j].author?.some(b=>a.family.toLowerCase()===b.family?.toLowerCase() && a.given===b.given));
    if(sharedTags.length || sharedAuthors.length)links.push({source:refs[i].id,target:refs[j].id,weight:sharedTags.length+sharedAuthors.length*2,label:[...sharedTags,...sharedAuthors.map(a=>a.family)].join(', ')});
  }return links;
}
export function validateBackup(data) {
  if(!data || data.schemaVersion!==1 || !Array.isArray(data.references) || !Array.isArray(data.collections) || !Array.isArray(data.projects))throw new Error('This is not a compatible Citograph backup.');
  if(new Set(data.references.map(r=>r.id)).size!==data.references.length)throw new Error('Backup contains duplicate IDs.');
  return {...data,references:data.references.map(r=>normalizeReference(r))};
}
export function blankState() {
  return {schemaVersion:1,references:[],collections:[],projects:[],settings:{theme:'light',style:'apa',name:'Researcher',showInspector:true,textSize:18},activity:[]};
}
