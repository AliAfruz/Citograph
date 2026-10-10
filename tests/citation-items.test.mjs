import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs/promises';
import {uniqueCitationItems} from '../src/citation-items.mjs';
import {formatCitations,formatManuscript} from '../src/core.mjs';

test('identical items collapse in first-occurrence order without changing input',()=>{
 const items=[{id:'b'},{id:'a'},{id:'a',locator:'',label:'page',prefix:'',suffix:'',suppressAuthor:false},{id:'b'}];
 const before=JSON.stringify(items);assert.deepEqual(uniqueCitationItems(items),items.slice(0,2));assert.equal(JSON.stringify(items),before);
});
test('different locators and rendering options remain distinct',()=>{
 const items=[{id:'a',locator:'12'},{id:'a',locator:'20'},{id:'a',locator:'12',label:'chapter'},{id:'a',locator:'12',prefix:'see '},{id:'a',locator:'12',suffix:', especially'},{id:'a',locator:'12','suppress-author':true},{id:'a',locator:'12','author-only':true}];
 assert.equal(uniqueCitationItems([...items,{id:'a',locator:'12',label:'page'}]).length,items.length);
});
test('desktop previews and manuscript tokens omit identical repeats within each group',async()=>{
 const style=await fs.readFile(new URL('../public/styles/american-chemical-society.csl',import.meta.url),'utf8');
 const locale=await fs.readFile(new URL('../public/styles/locales-en-US.xml',import.meta.url),'utf8');
 const refs=[{id:'a',type:'article-journal',title:'Alpha',author:[{family:'Smith'}],issued:{'date-parts':[[2024]]}},{id:'b',type:'article-journal',title:'Beta',author:[{family:'Jones'}],issued:{'date-parts':[[2025]]}}];
 const preview=formatCitations(refs,style,locale,[[{id:'a'},{id:'a'},{id:'b'},{id:'b'}]]);assert.equal(preview.citations[0],'<sup>1,2</sup>');
 const manuscript=formatManuscript('First [[cite:a,a,b,b]]. Later [[cite:a]].',refs,style,locale);
 assert.match(manuscript.html,/<sup>1,2<\/sup>/);assert.match(manuscript.html,/Later .*<sup>1<\/sup>/);assert.deepEqual(manuscript.citedIds,['a','b']);
});
