const fs=require('node:fs');const path=require('node:path');const crypto=require('node:crypto');const {LibraryDatabase}=require('./database.cjs');
class LibraryManager {
 constructor(directory){this.directory=directory;this.defaultDirectory=path.join(directory,'research');this.backupRoot=path.join(directory,'library-backups');this.configPath=path.join(directory,'libraries.json');this.config={lastFile:null,recents:[]};try{const data=JSON.parse(fs.readFileSync(this.configPath,'utf8'));this.config={lastFile:typeof data.lastFile==='string'?data.lastFile:null,recents:Array.isArray(data.recents)?data.recents.filter(r=>typeof r?.filePath==='string'&&typeof r.name==='string').slice(0,12):[]};}catch{}
  this.session=crypto.randomUUID();this.warning='';
  if(this.config.lastFile)try{this.store=LibraryDatabase.openFile(this.config.lastFile,this.backupRoot);}catch(e){this.warning=e.message;this.config.lastFile=null;}
  this.store||=new LibraryDatabase(this.defaultDirectory);this.remember();
 }
 assertSession(session){if(session!==this.session)throw new Error('The active library changed. This operation belongs to the previous library and was stopped.');}
 info(){return {id:this.store.id,session:this.session,name:this.store.portable?path.basename(this.store.filePath).replace(/\.citograph$/i,''):'Desktop library',filePath:this.store.portable?this.store.filePath:null,portable:this.store.portable,warning:this.warning,recents:this.config.recents.slice(0,12)};}
 load(){const data=this.store.load();return {state:data?{...data.state,__session:this.session}:null,revision:data?.revision||0,library:this.info()};}
 save(state){this.assertSession(state?.__session);return this.store.save(state);}
 remember(){const file=this.store.portable?this.store.filePath:null;this.config.lastFile=file;if(file)this.config.recents=[{filePath:file,name:path.basename(file).replace(/\.citograph$/i,''),openedAt:new Date().toISOString()},...this.config.recents.filter(r=>r.filePath.toLowerCase()!==file.toLowerCase())].slice(0,12);try{fs.mkdirSync(this.directory,{recursive:true});const temporary=this.configPath+'.tmp';fs.writeFileSync(temporary,JSON.stringify(this.config),'utf8');fs.renameSync(temporary,this.configPath);}catch(e){this.warning='The library is open, but recent-library preferences could not be saved: '+e.message;}}
 switchStore(next){const previous=this.store;this.store=next;this.session=crypto.randomUUID();this.warning='';previous.close();this.remember();return this.load();}
 open(file,session){this.assertSession(session);file=path.resolve(file);if(!/\.citograph$/i.test(file))throw new Error('Choose a .citograph library file.');if(this.store.portable&&file.toLowerCase()===this.store.filePath.toLowerCase())return this.load();const next=LibraryDatabase.openFile(file,this.backupRoot);return this.switchStore(next);}
 desktop(session){this.assertSession(session);if(!this.store.portable)return this.load();const next=new LibraryDatabase(this.defaultDirectory);if(!next.load())next.save({schemaVersion:1,references:[],collections:[],projects:[],settings:{theme:'light',name:'Researcher',style:'apa',showInspector:true},activity:[]});return this.switchStore(next);}
 newLibrary(file,session){this.assertSession(session);file=path.resolve(file);if(!/\.citograph$/i.test(file))throw new Error('Use the .citograph extension.');if(fs.existsSync(file))throw new Error('Choose a new filename. New Library does not replace an existing library.');const settings=this.store.load()?.state.settings||{};const empty={schemaVersion:1,references:[],collections:[],projects:[],settings:{theme:settings.theme||'light',name:settings.name||'Researcher',style:'apa',showInspector:true},activity:[]};this.store.exportNative(file,empty);return this.open(file,session);}
 saveAs(file,session,overwrite=false){this.assertSession(session);this.store.exportNative(file,this.store.load()?.state,{overwrite});return this.open(file,session);}
 close(){this.store.close();}
}
module.exports={LibraryManager};
