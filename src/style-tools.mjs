export const PYTHON_RECIPE=`from citograph_style import Style, emit

# Edit the selected style, keeping its existing journal rules.
style = Style.from_xml(BASE_STYLE_XML)
style.rename("My journal style")
style.set("citation/layout", prefix="[", suffix="]", delimiter="; ")
style.set("bibliography", hanging_indent="true", line_spacing="1")

print("Style compiled. Preview it, save a version, then apply to Word.")
emit(style)
`;
export const BUILDER_DEFAULTS={name:'My journal style',mode:'author-date',prefix:'(',suffix:')',delimiter:'; ',author_limit:3,names:'family-given',sort:'author',italic_journal:true,italic_title:false,include_doi:true,hanging_indent:true,line_spacing:1,entry_spacing:1};
export function validateStyle(xml){
 if(typeof xml!=='string'||xml.length>2000000)throw new Error('Style must be smaller than 2 MB.');
 if(/<!DOCTYPE|<!ENTITY/i.test(xml))throw new Error('DTD and entity declarations are not supported.');
 const doc=new DOMParser().parseFromString(xml,'application/xml');
 if(doc.querySelector('parsererror'))throw new Error('CSL contains invalid XML: '+doc.querySelector('parsererror').textContent.slice(0,250));
 const root=doc.documentElement;
 if(root.localName!=='style'||root.namespaceURI!=='http://purl.org/net/xbiblio/csl'||root.getAttribute('version')!=='1.0')throw new Error('Choose a CSL 1.0 independent style.');
 if(!doc.querySelector('info title')?.textContent.trim()||!doc.querySelector('citation > layout')||!doc.querySelector('bibliography > layout'))throw new Error('Style needs a title, citation layout and bibliography layout.');
 const macros=new Map([...doc.querySelectorAll('macro')].map(m=>[m.getAttribute('name'),m]));
 const visit=(name,stack=[])=>{if(!macros.has(name))throw new Error('Undefined macro: '+name);if(stack.includes(name))throw new Error('Recursive CSL macro: '+name);if(stack.length>100)throw new Error('Macro nesting exceeds 100.');for(const e of macros.get(name).querySelectorAll('[macro]'))visit(e.getAttribute('macro'),[...stack,name]);};
 for(const e of doc.querySelectorAll('[macro]'))visit(e.getAttribute('macro'));
 return {name:doc.querySelector('info title').textContent.trim(),category:doc.querySelector('category[citation-format]')?.getAttribute('citation-format')||'custom',authors:[...doc.querySelectorAll('info author name')].map(e=>e.textContent),summary:doc.querySelector('info summary')?.textContent||'',license:doc.querySelector('info rights')?.textContent||''};
}
export function nativeStyle(style){return {format:'citograph-style',version:1,style:{...style,versions:(style.versions||[]).slice(0,30)}};}
export function parseStylePackage(text){const data=JSON.parse(text);if(data.format!=='citograph-style'||data.version!==1||!data.style||typeof data.style.xml!=='string')throw new Error('Not a Citograph style package version 1.');validateStyle(data.style.xml);if(typeof data.style.name!=='string'||!data.style.name.trim())throw new Error('Style package needs a name.');if(data.style.versions&&!Array.isArray(data.style.versions))throw new Error('Invalid version history.');for(const v of (data.style.versions||[]).slice(0,30))validateStyle(v.xml);return {...data.style,versions:(data.style.versions||[]).slice(0,30)};}
export function saveVersion(draft,existing,note=''){
 validateStyle(draft.xml);const now=new Date().toISOString();
 const previous=existing?.xml&&existing.revision!==0?[{number:existing.revision||1,date:existing.updatedAt||now,note:existing.versionNote||'Previous version',xml:existing.xml,source:existing.source||'',options:existing.options||null},...(existing.versions||[])].slice(0,30):[];
 return {...draft,name:draft.name.trim(),revision:(existing?.revision||0)+1,createdAt:existing?.createdAt||now,updatedAt:now,versionNote:note||'Saved from Style Studio',versions:previous};
}
export async function inspectEndNote(file){
 if(file.size>4000000||file.size<8)throw new Error('Choose an EndNote style smaller than 4 MB.');
 const bytes=new Uint8Array(await file.arrayBuffer());
 const ascii=new TextDecoder('windows-1252').decode(bytes),unicode=new TextDecoder('utf-16le').decode(bytes);
 const strings=[...new Set([...ascii.matchAll(/[\x20-\x7e]{8,}/g),...unicode.matchAll(/[\x20-\x7e]{8,}/g)].map(m=>m[0].trim()))].filter(s=>s.length<1000).slice(0,80);
 const hash=await crypto.subtle.digest('SHA-256',bytes);
 return {sourceName:file.name,bytes:bytes.length,sha256:[...new Uint8Array(hash)].map(b=>b.toString(16).padStart(2,'0')).join(''),strings,status:'needs-review',method:'guided-rebuild',warnings:['Binary EndNote rules have not been decoded. This draft uses the CSL base you explicitly choose.','Author lists, reference-type templates, sorting, punctuation, disambiguation and note rules must be checked against the original EndNote style.'],importedAt:new Date().toISOString()};
}
export const PREVIEW_REFERENCES=[
 {id:'sample-article',type:'article-journal',title:'Mapping scientific connections',author:[{family:'Rivera',given:'Elena'},{family:'Chen',given:'Wei'},{family:'Patel',given:'Arun'}],issued:{'date-parts':[[2025]]},'container-title':'Journal of Research Methods',volume:'18',issue:'2',page:'125–139',DOI:'10.1234/example.2025.001'},
 {id:'sample-book',type:'book',title:'The connected researcher',author:[{family:'Morgan',given:'Alex'}],issued:{'date-parts':[[2023]]},publisher:'Example Press','publisher-place':'London'},
 {id:'sample-web',type:'webpage',title:'Open research handbook',author:[{literal:'Research Collective'}],issued:{'date-parts':[[2024]]},URL:'https://example.org/handbook',accessed:{'date-parts':[[2026,10,9]]}}
];
