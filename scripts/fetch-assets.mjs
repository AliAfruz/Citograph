import fs from 'node:fs/promises';
const root = new URL('../public/',import.meta.url);
await fs.mkdir(new URL('styles/',root),{recursive:true});
const styles=['apa','ieee','nature','nlm-citation-sequence','chicago-author-date','modern-language-association','american-chemical-society','harvard-cite-them-right'];
for(const id of styles){const response=await fetch(`https://raw.githubusercontent.com/citation-style-language/styles/master/${id}.csl`);if(!response.ok)throw new Error(`${id}: ${response.status}`);await fs.writeFile(new URL(`styles/${id}.csl`,root),await response.text());console.log('Bundled '+id);}
const locale=await fetch('https://raw.githubusercontent.com/citation-style-language/locales/master/locales-en-US.xml');if(!locale.ok)throw new Error('Locale unavailable');await fs.writeFile(new URL('styles/locales-en-US.xml',root),await locale.text());
const groups=[
 {doi:'10.1126/science.1230444',collection:'porous',tags:['Metal–organic frameworks','Materials chemistry'],starred:true,status:'reading'},
 {doi:'10.1038/nature01650',collection:'porous',tags:['Metal–organic frameworks','Reticular chemistry'],starred:false,status:'read'},
 {doi:'10.1126/science.1067208',collection:'porous',tags:['Metal–organic frameworks','Gas storage'],starred:true,status:'unread'},
 {doi:'10.1038/nature14539',collection:'learning',tags:['Machine learning','Neural networks'],starred:true,status:'read'},
 {doi:'10.1038/nature16961',collection:'learning',tags:['Machine learning','Neural networks'],starred:false,status:'unread'},
 {doi:'10.1038/s41586-021-03819-2',collection:'learning',tags:['Machine learning','Structure prediction'],starred:false,status:'reading'},
 {doi:'10.1371/journal.pmed.1000097',collection:'methods',tags:['Systematic reviews','Research methods'],starred:false,status:'read'},
 {doi:'10.1136/bmj.n71',collection:'methods',tags:['Systematic reviews','Research methods'],starred:false,status:'unread'},
 {doi:'10.1109/CVPR.2016.90',collection:'learning',tags:['Machine learning','Neural networks'],starred:false,status:'unread'},
 {doi:'10.1038/nature11893',collection:'porous',tags:['Metal–organic frameworks','Gas storage'],starred:false,status:'unread'}
];
const refs=[];
for(const [index,item] of groups.entries()){
 try{
 const response=await fetch('https://api.crossref.org/works/'+encodeURIComponent(item.doi),{signal:AbortSignal.timeout(25000)});if(!response.ok)throw new Error(String(response.status));const {message:w}=await response.json();
 refs.push({id:'demo-'+(index+1),type:({'journal-article':'article-journal','proceedings-article':'paper-conference'})[w.type] || w.type,title:w.title?.[0],author:w.author?.map(a=>({family:a.family || '',given:a.given || ''})),issued:w.published || w.issued,'container-title':w['container-title']?.[0] || '',volume:w.volume || '',issue:w.issue || '',page:w.page || '',DOI:w.DOI,URL:w.URL,abstract:(w.abstract || '').replace(/<[^>]+>/g,' ').replace(/\s+/g,' ').trim(),citationCount:w['is-referenced-by-count'] || 0,collections:[item.collection],tags:item.tags,starred:item.starred,status:item.status,source:'Crossref · demo library',addedAt:new Date(Date.now()-index*600000).toISOString(),notes:'',method:'',evidence:'',limitations:'',attachments:[],annotations:[],demo:true});console.log('Verified '+w.title?.[0]);
 }catch(error){console.warn('Skipping '+item.doi+': '+error.message);}
}
await fs.writeFile(new URL('demo.json',root),JSON.stringify(refs,null,2));
