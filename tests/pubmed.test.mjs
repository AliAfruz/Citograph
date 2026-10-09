import test from 'node:test';import assert from 'node:assert/strict';import {importReferences,formatCitations} from '../src/core.mjs';import {parsePubMed} from '../src/pubmed.mjs';import fs from 'node:fs';
const record=`PMID- 99000001
TI  - A reproducible example of reference importing.
      Continuation text stays in the title.
DP  - 2026 Oct 9
FAU - Müller, Anna M
AU  - Müller AM
AD  - Example university,
      research department.
FAU - van de Sluis, Bart
AU  - van de Sluis B
CN  - Reference Research Group
JT  - Example Research Journal
TA  - Example Res J
VI  - 12
IP  - 3
PG  - 10-18
AID - unrelated-id [pii]
LID - 10.1234/EXAMPLE [doi]
AB  - This is a synthetic abstract for an import test.
      It verifies wrapped text without publishing a supplied article.
IS  - 1234-5678 (Electronic)
PMC - PMC99000001
OT  - Reference tools
MH  - Citation/*methods
LA  - eng
PT  - Journal Article
`;
test('NBIB imports wrapped fields, complete Unicode authors and group authors once',()=>{const [r]=importReferences(record,'example.nbib');assert.equal(r.PMID,'99000001');assert.equal(r.author.length,3);assert.deepEqual(r.author[0],{family:'Müller',given:'Anna M'});assert.deepEqual(r.author[1],{family:'van de Sluis',given:'Bart'});assert.equal(r.author[2].literal,'Reference Research Group');assert.match(r.title,/importing\. Continuation/);assert.match(r.abstract,/test\. It verifies/);assert.equal(r.pubmed.affiliations[0],'Example university, research department.');});
test('NBIB maps DOI, PubMed URL, dates, journal, pages and identifiers',()=>{const [r]=importReferences(record,'example.NBIB');assert.equal(r.DOI,'10.1234/example');assert.equal(r.URL,'https://pubmed.ncbi.nlm.nih.gov/99000001/');assert.deepEqual(r.issued,{'date-parts':[[2026,10,9]]});assert.equal(r['container-title'],'Example Research Journal');assert.equal(r.page,'10-18');assert.equal(r.PMCID,'PMC99000001');assert.equal(r.ISSN,'1234-5678');assert.ok(r.tags.includes('Citation/methods'));});
test('PubMed format is detected when pasted or supplied as .txt',()=>{assert.equal(importReferences('\uFEFF'+record.replaceAll('\n','\r\n'),'references.txt')[0].source,'PubMed');assert.equal(importReferences(record)[0].PMID,'99000001');});
test('multiple PubMed records retain order, including missing blank separators',()=>{const second=record.replace('99000001','99000002');assert.deepEqual(importReferences(record+'\n'+second,'two.nbib').map(r=>r.PMID),['99000001','99000002']);assert.equal(importReferences(record+second,'two.nbib').length,2);});
test('abbreviated and mixed author records preserve initials and suffixes',()=>{const [r]=parsePubMed('PMID- 99000003\nTI  - Author test\nAU  - Smith AB Jr\nFAU - Doe, Jane\nAU  - Doe J\nAU  - Other CD\n');assert.deepEqual(r.author,[{family:'Smith',given:'A B',suffix:'Jr'},{family:'Doe',given:'Jane'},{family:'Other',given:'C D'}]);});
test('partial publication dates and electronic identifiers are retained',()=>{const [r]=parsePubMed('PMID- 99000004\nTI  - Date test\nDP  - 2021 Spring\nLID - e100 [pii]\n');assert.deepEqual(r.issued,{'date-parts':[[2021]]});assert.equal(r.publicationDate,'2021 Spring');assert.equal(r.page,'e100');const [online]=parsePubMed('PMID- 99000005\nTI  - Electronic date test\nDEP - 20261009\n');assert.deepEqual(online.issued,{'date-parts':[[2026,10,9]]});});
test('empty or malformed NBIB files produce a useful error without partial imports',()=>{assert.throws(()=>importReferences('','empty.nbib'),/No PubMed/);assert.throws(()=>parsePubMed('PMID- 123\nAB  - Missing title'),/title/);assert.throws(()=>parsePubMed(record+'\nnot a record'),/line/);});
test('PubMed references format and export through the existing CSL citation processor',()=>{const refs=importReferences(record,'example.nbib');const style=fs.readFileSync(new URL('../public/styles/apa.csl',import.meta.url),'utf8'),locale=fs.readFileSync(new URL('../public/styles/locales-en-US.xml',import.meta.url),'utf8');const output=formatCitations(refs,style,locale);assert.match(output.bibliography,/Müller/);assert.match(output.bibliography,/10\.1234\/example/);});
