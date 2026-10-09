let database;
function openDB(){return database ||= new Promise((resolve,reject)=>{const request=indexedDB.open('citograph-local',1);request.onupgradeneeded=()=>{request.result.createObjectStore('data');};request.onsuccess=()=>resolve(request.result);request.onerror=()=>reject(request.error);});}
async function read(key){const db=await openDB();return new Promise((resolve,reject)=>{const req=db.transaction('data','readonly').objectStore('data').get(key);req.onsuccess=()=>resolve(req.result);req.onerror=()=>reject(req.error);});}
async function write(key,value){const db=await openDB();return new Promise((resolve,reject)=>{const tx=db.transaction('data','readwrite');tx.objectStore('data').put(value,key);tx.oncomplete=resolve;tx.onerror=()=>reject(tx.error);});}
let pending=Promise.resolve();
export const storage={
 load:async()=>window.citograph ? (await window.citograph.load())?.state : await read('library'),
 save:state=>{pending=pending.catch(()=>{}).then(()=>window.citograph ? window.citograph.save(state) : write('library',state));return pending;},
 attach:async files=>{if(window.citograph)return window.citograph.attach();const result=[];for(const f of files || []){if(f.size>150*1024*1024)throw new Error('PDFs must be smaller than 150 MB.');const data=new Uint8Array(await f.arrayBuffer());if(!new TextDecoder().decode(data.slice(0,1024)).includes('%PDF-'))throw new Error('Please select a valid PDF document.');const id=crypto.randomUUID()+'.pdf';await write(id,data);result.push({id,name:f.name,size:f.size});}return result;},
 readAttachment:async id=>window.citograph ? new Uint8Array(await window.citograph.readAttachment(id)) : await read(id),
 exportFile:async(name,content)=>{if(window.citograph)return window.citograph.exportFile(name,content);const blob=new Blob([content],{type:'text/plain;charset=utf-8'});const url=URL.createObjectURL(blob);const a=document.createElement('a');a.href=url;a.download=name;a.click();setTimeout(()=>URL.revokeObjectURL(url),1000);return true;},
 openExternal:async url=>{if(!/^https?:\/\//i.test(url))throw new Error('Invalid web URL.');if(window.citograph)return window.citograph.openExternal(url);window.open(url,'_blank','noopener,noreferrer');},
 backup:async state=>{await storage.save(state);if(window.citograph)return window.citograph.backup();const embeddedAttachments={};for(const r of state.references)for(const a of r.attachments){const data=await read(a.id);if(data){let raw='';for(let i=0;i<data.length;i++)raw+=String.fromCharCode(data[i]);embeddedAttachments[a.id]=btoa(raw);}}return storage.exportFile('Citograph-backup.json',JSON.stringify({...state,embeddedAttachments},null,2));},
 restoreAttachments:async data=>{for(const [id,base64] of Object.entries(data.embeddedAttachments || {})){if(!/^[0-9a-f-]{36}\.pdf$/i.test(id))throw new Error('Invalid backup attachment.');const raw=atob(base64);await write(id,Uint8Array.from(raw,c=>c.charCodeAt(0)));}delete data.embeddedAttachments;return data;}
};
export async function loadStyle(id,customStyles=[]){
 const custom=customStyles.find(s=>s.id===id);
 const [style,locale]=await Promise.all([custom ? Promise.resolve(custom.xml) : fetch(`${import.meta.env.BASE_URL}styles/${id}.csl`).then(r=>{if(!r.ok)throw new Error('Citation style unavailable.');return r.text();}),fetch(`${import.meta.env.BASE_URL}styles/locales-en-US.xml`).then(r=>r.text())]);return {style,locale};
}
