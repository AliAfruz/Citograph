const {DatabaseSync}=require('node:sqlite');const fs=require('node:fs');const path=require('node:path');const crypto=require('node:crypto');
const FORMAT_ID=0x4349544f,MAX_METADATA=100*1024*1024,MAX_PDF=150*1024*1024;
function validateState(state){
 if(state?.schemaVersion!==1||!Array.isArray(state.references)||!Array.isArray(state.collections)||!Array.isArray(state.projects)||!state.settings||typeof state.settings!=='object')throw new Error('Invalid library data.');
 if(state.references.some(r=>!r||typeof r.id!=='string')||new Set(state.references.map(r=>r.id)).size!==state.references.length)throw new Error('Duplicate or invalid reference IDs.');
}
function attachmentId(id){if(typeof id!=='string'||!/^[0-9a-f-]{36}\.pdf$/i.test(id))throw new Error('Invalid attachment identifier.');return id;}
function inspectFile(file){
 if(!fs.existsSync(file))throw new Error('The library file was moved or cannot be found.');
 const header=Buffer.alloc(16),fd=fs.openSync(file,'r');try{fs.readSync(fd,header,0,16,0);}finally{fs.closeSync(fd);}
 if(header.toString('ascii')!=='SQLite format 3\0')throw new Error('This is not a Citograph library file.');
 let db;try{
  db=new DatabaseSync(file,{readOnly:true,timeout:3000});db.exec('PRAGMA trusted_schema=OFF;');
  if(db.prepare('PRAGMA application_id').get().application_id!==FORMAT_ID)throw new Error('This SQLite file is not a Citograph library.');
  const tables=db.prepare("SELECT name,type FROM sqlite_master WHERE name IN ('library','assets','citograph_format')").all();
  if(tables.length!==3||tables.some(t=>t.type!=='table')||db.prepare("SELECT count(*) n FROM sqlite_master WHERE type IN ('trigger','view')").get().n)throw new Error('Unsupported library structure.');
  const row=db.prepare('SELECT data FROM citograph_format WHERE id=1').get();if(!row||row.data.length>10000)throw new Error('Library format information is missing.');
  const info=JSON.parse(row.data);if(info.format!=='citograph-library'||info.version!==1||typeof info.id!=='string'||!/^[0-9a-f-]{36}$/i.test(info.id))throw new Error('Unsupported Citograph library version.');
  const length=db.prepare('SELECT length(CAST(data AS BLOB)) n FROM library WHERE id=1').get();if(!length||length.n>MAX_METADATA)throw new Error('Library metadata is missing or exceeds 100 MB.');
  validateState(JSON.parse(db.prepare('SELECT data FROM library WHERE id=1').get().data));return info;
 }catch(e){throw new Error('Cannot open library: '+e.message);}finally{db?.close();}
}
class LibraryDatabase {
 constructor(directory,options={}){
  fs.mkdirSync(directory,{recursive:true});this.directory=directory;this.portable=!!options.filePath;this.filePath=options.filePath?path.resolve(options.filePath):path.join(directory,'library.sqlite');
  this.formatInfo=this.portable&&!options.create?inspectFile(this.filePath):this.portable?{format:'citograph-library',version:1,id:crypto.randomUUID(),createdAt:new Date().toISOString()}:null;
  this.id=this.formatInfo?.id||'desktop';this.backupDirectory=options.backups===false?null:options.backupDirectory||path.join(directory,'backups');
  this.db=new DatabaseSync(this.filePath,{timeout:3000});
  this.db.exec('PRAGMA trusted_schema=OFF; PRAGMA journal_mode='+ (this.portable?'DELETE':'WAL')+'; PRAGMA synchronous=FULL; CREATE TABLE IF NOT EXISTS library (id INTEGER PRIMARY KEY CHECK(id=1), data TEXT NOT NULL, revision INTEGER NOT NULL DEFAULT 0);');
  if(this.portable){this.db.exec('CREATE TABLE IF NOT EXISTS assets (id TEXT PRIMARY KEY,data BLOB NOT NULL); CREATE TABLE IF NOT EXISTS citograph_format (id INTEGER PRIMARY KEY CHECK(id=1),data TEXT NOT NULL);');if(options.create){this.db.exec('PRAGMA application_id='+FORMAT_ID+'; PRAGMA user_version=1;');this.db.prepare('INSERT INTO citograph_format(id,data) VALUES(1,?)').run(JSON.stringify(this.formatInfo));}}
  else{this.attachmentRoot=path.join(directory,'attachments');fs.mkdirSync(this.attachmentRoot,{recursive:true});}
 }
 static openFile(file,backupRoot){const info=inspectFile(file);return new LibraryDatabase(path.dirname(file),{filePath:file,backupDirectory:path.join(backupRoot,info.id)});}
 load(){const row=this.db.prepare('SELECT data,revision FROM library WHERE id=1').get();return row?{state:JSON.parse(row.data),revision:row.revision}:null;}
 save(input){
  const {__session,...state}=input||{};validateState(state);const payload=JSON.stringify(state);if(Buffer.byteLength(payload)>MAX_METADATA)throw new Error('Library exceeds the 100 MB metadata limit.');
  this.db.prepare('INSERT INTO library(id,data,revision) VALUES(1,?,1) ON CONFLICT(id) DO UPDATE SET data=excluded.data,revision=library.revision+1').run(payload);
  if(this.backupDirectory){fs.mkdirSync(this.backupDirectory,{recursive:true});const daily=path.join(this.backupDirectory,new Date().toISOString().slice(0,10)+'.json');if(!fs.existsSync(daily))fs.writeFileSync(daily,payload,'utf8');const backups=fs.readdirSync(this.backupDirectory).filter(f=>/^\d{4}-\d{2}-\d{2}\.json$/.test(f)).sort();for(const name of backups.slice(0,-14))fs.unlinkSync(path.join(this.backupDirectory,name));}
  return this.db.prepare('SELECT revision FROM library WHERE id=1').get().revision;
 }
 putAttachment(id,data){attachmentId(id);if(data.byteLength>MAX_PDF)throw new Error('PDFs must be smaller than 150 MB.');if(this.portable)this.db.prepare('INSERT INTO assets(id,data) VALUES(?,?) ON CONFLICT(id) DO UPDATE SET data=excluded.data').run(id,data);else fs.writeFileSync(path.join(this.attachmentRoot,id),data);}
 hasAttachment(id){attachmentId(id);return this.portable?!!this.db.prepare('SELECT id FROM assets WHERE id=?').get(id):fs.existsSync(path.join(this.attachmentRoot,id));}
 readAttachment(id){attachmentId(id);if(this.portable){const size=this.db.prepare('SELECT length(data) n FROM assets WHERE id=?').get(id);if(!size)throw new Error('The attached PDF is missing from this library.');if(size.n>MAX_PDF)throw new Error('PDF exceeds 150 MB.');return Buffer.from(this.db.prepare('SELECT data FROM assets WHERE id=?').get(id).data);}return fs.readFileSync(path.join(this.attachmentRoot,id));}
 exportNative(target,state=this.load()?.state,{overwrite=false}={}){
  target=path.resolve(target);if(!/\.citograph$/i.test(target))throw new Error('Save native libraries with the .citograph extension.');
  if(target.toLowerCase()===this.filePath.toLowerCase()){this.save(state);return target;}
  if(fs.existsSync(target)&&!overwrite)throw new Error('A library already exists at this location.');
  validateState(state);const temporary=path.join(path.dirname(target),'.citograph-'+crypto.randomUUID()+'.tmp');let output;
  try{
   const fd=fs.openSync(temporary,'wx');fs.closeSync(fd);output=new LibraryDatabase(path.dirname(target),{filePath:temporary,create:true,backups:false});
   output.db.exec('BEGIN IMMEDIATE');try{output.save(state);for(const id of new Set(state.references.flatMap(r=>(r.attachments||[]).map(a=>a.id)))){if(!this.hasAttachment(id))throw new Error('An attached PDF is missing ('+id+'). Restore it before saving a portable copy.');output.putAttachment(id,this.readAttachment(id));}output.db.exec('COMMIT');}catch(e){output.db.exec('ROLLBACK');throw e;}
   output.close();output=null;fs.renameSync(temporary,target);return target;
  }finally{output?.close();if(fs.existsSync(temporary))fs.unlinkSync(temporary);if(fs.existsSync(temporary+'-journal'))fs.unlinkSync(temporary+'-journal');}
 }
 close(){this.db.close();}
}
module.exports={LibraryDatabase,inspectFile,validateState};
