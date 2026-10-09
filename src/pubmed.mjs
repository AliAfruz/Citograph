// NLM PubMed tagged text (.nbib / MEDLINE). Reference data is parsed as text.
const months=['jan','feb','mar','apr','may','jun','jul','aug','sep','oct','nov','dec'];
function publicationDate(value){
 const year=value.match(/^(\d{4})/);if(!year)return undefined;const parts=[Number(year[1])];
 const compact=value.match(/^\d{4}(\d{2})(\d{2})$/),numeric=value.match(/^\d{4}[/-](\d{1,2})(?:[/-](\d{1,2}))?$/),named=value.match(/^\d{4}\s+([A-Za-z]{3})(?:\s+(\d{1,2}))?$/);
 const month=compact?Number(compact[1]):numeric?Number(numeric[1]):named?months.indexOf(named[1].toLowerCase())+1:0;
 const day=compact?Number(compact[2]):numeric?Number(numeric[2]||0):named?Number(named[2]||0):0;
 if(month>=1&&month<=12){parts.push(month);if(day>=1&&day<=31)parts.push(day);}
 return {'date-parts':[parts]};
}
function person(value,full){
 if(full&&value.includes(',')){const comma=value.indexOf(',');let given=value.slice(comma+1).trim();const suffix=given.match(/(?:,?\s+)(Jr\.?|Sr\.?|II|III|IV)$/);if(suffix)given=given.slice(0,suffix.index).trim();return {family:value.slice(0,comma).trim(),given,...(suffix?{suffix:suffix[1]}:{})};}
 const initials=value.match(/^(.*\S)\s+([A-Z]+)(?:\s+(Jr\.?|Sr\.?|II|III|IV))?$/);return initials?{family:initials[1],given:initials[2].split('').join(' '),...(initials[3]?{suffix:initials[3]}:{})}:{literal:value};
}
export function parsePubMed(text){
 const records=[];let fields=[];
 const finish=()=>{if(fields.length){records.push(fields);fields=[];}};
 for(const [index,line] of String(text).replace(/^\uFEFF/,'').split(/\r\n|\n|\r/).entries()){
  if(!line.trim()){finish();continue;}const tag=line.match(/^([A-Z][A-Z0-9]{1,3})\s*-\s?(.*)$/);
  if(tag){if(tag[1]==='PMID'&&fields.some(f=>f.tag==='PMID'))finish();fields.push({tag:tag[1],value:tag[2].trim()});}
  else if(/^\s+/.test(line)&&fields.length)fields.at(-1).value+=' '+line.trim();
  else throw new Error('Invalid PubMed record at line '+(index+1)+'. Choose a .nbib or PubMed-format text file.');
 }
 finish();if(!records.length)throw new Error('No PubMed references found in this file.');
 return records.map((record,index)=>{
  const all=tag=>record.filter(f=>f.tag===tag).map(f=>f.value),first=tag=>all(tag)[0]||'';
  const pmid=first('PMID'),title=first('TI')||first('BTI');if(!/^\d+$/.test(pmid)||!title)throw new Error('PubMed record '+(index+1)+' needs a valid PMID and title.');
  const author=[];let fullPending=false;
  for(const field of record){if(field.tag==='FAU'){author.push(person(field.value,true));fullPending=true;}else if(field.tag==='AU'){if(fullPending)fullPending=false;else author.push(person(field.value,false));}else if(field.tag==='CN'){author.push({literal:field.value});fullPending=false;}}
  const doi=[...all('AID'),...all('LID')].find(v=>/\[doi\]\s*$/i.test(v))?.replace(/\s*\[doi\]\s*$/i,'')||'';
  const electronicPage=all('LID').find(v=>! /\[doi\]\s*$/i.test(v))?.replace(/\s*\[[^\]]+\]\s*$/,'')||'';
  const date=first('DP')||first('DEP'),issn=all('IS').map(v=>v.replace(/\s*\([^)]*\)\s*$/,'')).filter(Boolean);
  return {type:'article-journal',title,author,issued:publicationDate(date),publicationDate:date,'container-title':first('JT')||first('TA'),'container-title-short':first('TA'),volume:first('VI'),issue:first('IP'),page:first('PG')||electronicPage,DOI:doi,URL:'https://pubmed.ncbi.nlm.nih.gov/'+pmid+'/',PMID:pmid,PMCID:first('PMC'),ISSN:issn[0]||'',abstract:all('AB').join(' '),language:first('LA'),tags:[...new Set([...all('OT'),...all('MH').map(v=>v.replace(/\*/g,''))])],source:'PubMed',pubmed:{publicationTypes:all('PT'),affiliations:all('AD'),mesh:all('MH'),issn,rights:all('CI')}};
 });
}
