const {parentPort,workerData}=require('node:worker_threads');
try{const {formatDocument}=require('./citation-engine.cjs');parentPort.postMessage({result:formatDocument(workerData.input,workerData.styleXML,workerData.localeXML)});}catch(error){parentPort.postMessage({error:error.message});}
