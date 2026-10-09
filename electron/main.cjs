const {app,BrowserWindow,ipcMain,dialog,shell,Menu}=require('electron');
const fs=require('node:fs');const path=require('node:path');const crypto=require('node:crypto');
const {LibraryManager}=require('./library-manager.cjs');const {validateState}=require('./database.cjs');
const {startWordBridge}=require('./word-bridge.cjs');
const {compile,runtime}=require('./style-compiler.cjs');
const {wordStyle}=require('./word-style.cjs');
let win,store,libraries,wordBridge,allowClose=false,pendingWordStyles=0;const pendingWordImports=new Map();
if(process.env.CITOGRAPH_DATA_DIR){fs.mkdirSync(process.env.CITOGRAPH_DATA_DIR,{recursive:true});app.setPath('userData',process.env.CITOGRAPH_DATA_DIR);}
if(!app.requestSingleInstanceLock()){app.quit();} else {
  app.on('second-instance',(event,args)=>{if(win&&!args.includes('--word-bridge')){if(win.isMinimized())win.restore();win.show();win.focus();if(args.includes('--style-studio'))win.webContents.send('style:open');const file=args.find(a=>/\.citograph$/i.test(a));if(file)win.webContents.send('library:open-request',file);}});
  app.whenReady().then(async()=>{
    app.setAppUserModelId('com.citograph.desktop');
    libraries=new LibraryManager(app.getPath('userData'));store=libraries.store;
    const secureHandle=(channel,handler)=>ipcMain.handle(channel,(event,...args)=>{if(!win || event.sender!==win.webContents || event.senderFrame!==win.webContents.mainFrame)throw new Error('Untrusted request.');return handler(...args);});
    secureHandle('library:load',()=>libraries.load());secureHandle('library:save',data=>libraries.save(data));
    secureHandle('library:file',async(action,session,requestedPath)=>{
      libraries.assertSession(session);if(pendingWordImports.size||pendingWordStyles)throw new Error('Wait for the Word operation to finish before switching libraries.');
      let file=requestedPath;
      if(action==='open'&&!file){const result=await dialog.showOpenDialog(win,{title:'Open Citograph library',properties:['openFile'],filters:[{name:'Citograph library',extensions:['citograph']}]});if(result.canceled)return null;file=result.filePaths[0];}
      if(action==='new'||action==='save-as'){const result=await dialog.showSaveDialog(win,{title:action==='new'?'Create a new library':'Save a portable library copy',defaultPath:action==='new'?'Untitled library.citograph':(libraries.info().name+'.citograph'),filters:[{name:'Citograph library',extensions:['citograph']}]});if(result.canceled)return null;file=result.filePath;if(!/\.citograph$/i.test(file))file+='.citograph';}
      libraries.assertSession(session);if(pendingWordImports.size||pendingWordStyles)throw new Error('Wait for the Word operation to finish before switching libraries.');
      let result;if(action==='open')result=libraries.open(file,session);else if(action==='new')result=libraries.newLibrary(file,session);else if(action==='save-as')result=libraries.saveAs(file,session,true);else if(action==='desktop')result=libraries.desktop(session);else throw new Error('Unknown library action.');
      store=libraries.store;return result;
    });
    const deliveryRoot=app.isPackaged?path.dirname(app.getPath('exe')):path.join(__dirname,'..');
    secureHandle('style:runtime',interpreter=>runtime(typeof interpreter==='string'?interpreter:'',path.join(deliveryRoot,'python/runtime/python.exe')));
    secureHandle('style:compile',request=>compile(request,path.join(deliveryRoot,'python')));
    secureHandle('style:pick-python',async()=>{const result=await dialog.showOpenDialog(win,{title:'Choose Python 3.11 or later',properties:['openFile'],filters:[{name:'Python interpreter',extensions:['exe']}]});return result.canceled?null:result.filePaths[0];});
    secureHandle('style:word-target',()=>wordStyle('inspect',{root:deliveryRoot,descriptor:path.join(app.getPath('userData'),'word-bridge.json')}));
    secureHandle('style:word-apply',async(styleId,target,session)=>{libraries.assertSession(session);if(!store.load()?.state.settings.customStyles?.some(s=>s.id===styleId)&&!['apa','ieee','nature','nlm-citation-sequence','chicago-author-date','modern-language-association','american-chemical-society','harvard-cite-them-right'].includes(styleId))throw new Error('Save the style before applying it.');pendingWordStyles++;try{return await wordStyle('apply',{root:deliveryRoot,descriptor:path.join(app.getPath('userData'),'word-bridge.json'),styleId,target});}finally{pendingWordStyles--;}});
    secureHandle('word:import-response',(id,result)=>{const pending=pendingWordImports.get(id);if(pending){clearTimeout(pending.timer);pendingWordImports.delete(id);result.error?pending.reject(new Error(result.error)):pending.resolve(result);}});
    secureHandle('file:attach',async(session)=>{libraries.assertSession(session);
      const result=await dialog.showOpenDialog(win,{title:'Attach research PDFs',properties:['openFile','multiSelections'],filters:[{name:'PDF documents',extensions:['pdf']}]});
      if(result.canceled)return [];libraries.assertSession(session);
      return result.filePaths.map(file=>{const stats=fs.statSync(file);if(stats.size>150*1024*1024)throw new Error('PDFs must be smaller than 150 MB.');const signature=fs.readFileSync(file).subarray(0,1024).toString('latin1');if(!signature.includes('%PDF-'))throw new Error('Invalid PDF document.');const id=crypto.randomUUID()+'.pdf';store.putAttachment(id,fs.readFileSync(file));return {id,name:path.basename(file),size:stats.size};});
    });
    secureHandle('file:read',(id,session)=>{libraries.assertSession(session);return new Uint8Array(store.readAttachment(id));});
    secureHandle('file:export',async(name,content)=>{
      if(typeof content!=='string' || Buffer.byteLength(content)>100*1024*1024)throw new Error('Invalid export.');
      const result=await dialog.showSaveDialog(win,{defaultPath:path.basename(String(name))});if(result.canceled)return false;fs.writeFileSync(result.filePath,content,'utf8');return true;
    });
    secureHandle('link:open',async value=>{const url=new URL(value);if(!['https:','http:'].includes(url.protocol))throw new Error('Only web URLs can be opened.');await shell.openExternal(url.href);});
    secureHandle('crossref:fetch',async value=>{const url=new URL(value);if(url.protocol!=='https:' || url.hostname!=='api.crossref.org' || !url.pathname.startsWith('/works'))throw new Error('Invalid metadata request.');const response=await fetch(url,{signal:AbortSignal.timeout(25000),headers:{'User-Agent':'Citograph/1.0 (local citation manager)'}});if(!response.ok)throw new Error('Crossref returned '+response.status+'. Please retry later.');return response.json();});
    secureHandle('library:backup',async(session)=>{libraries.assertSession(session);
      const result=await dialog.showSaveDialog(win,{title:'Create complete backup',defaultPath:'Citograph-'+new Date().toISOString().slice(0,10)+'.citograph.json',filters:[{name:'Citograph backup',extensions:['json']}]});if(result.canceled)return false;
      libraries.assertSession(session);const data=store.load()?.state;if(!data)throw new Error('No library to back up.');
      const ids=[...new Set(data.references.flatMap(r=>(r.attachments||[]).map(a=>a.id)))];
      const embeddedAttachments={};let total=0;
      for(const id of ids){const buffer=store.readAttachment(id);total+=buffer.length;if(total>300*1024*1024)throw new Error('JSON backups support 300 MB of PDFs. Save a .citograph library for larger libraries.');embeddedAttachments[id]=buffer.toString('base64');}
      fs.writeFileSync(result.filePath,JSON.stringify({...data,embeddedAttachments},null,2),'utf8');return true;
    });
    secureHandle('library:restore',async(session)=>{libraries.assertSession(session);
      const result=await dialog.showOpenDialog(win,{title:'Choose a Citograph backup',properties:['openFile'],filters:[{name:'Citograph backup',extensions:['json']}]});if(result.canceled)return null;
      libraries.assertSession(session);if(fs.statSync(result.filePaths[0]).size>450*1024*1024)throw new Error('Backup is too large.');
      const data=JSON.parse(fs.readFileSync(result.filePaths[0],'utf8'));validateState(data);
      const confirmed=await dialog.showMessageBox(win,{type:'question',buttons:['Cancel','Restore backup'],defaultId:0,cancelId:0,message:'Replace this library with the selected backup?',detail:'A portable recovery copy of the current library will be saved first.'});if(confirmed.response!==1)return null;
      libraries.assertSession(session);fs.mkdirSync(libraries.backupRoot,{recursive:true});const old=store.load();if(old)store.exportNative(path.join(libraries.backupRoot,'before-restore-'+Date.now()+'.citograph'),old.state);
      const attachments=Object.entries(data.embeddedAttachments||{}).map(([id,base64])=>{if(typeof base64!=='string'||base64.length>210*1024*1024)throw new Error('Invalid backup PDF.');return [id,Buffer.from(base64,'base64')];});
      delete data.embeddedAttachments;delete data.__session;store.db.exec('BEGIN IMMEDIATE');try{for(const [id,buffer] of attachments)store.putAttachment(id,buffer);store.save(data);store.db.exec('COMMIT');}catch(e){store.db.exec('ROLLBACK');throw e;}return {...data,__session:session};
    });
    secureHandle('library:folder',()=>shell.openPath(store.directory));
    secureHandle('window:action',action=>{if(action==='minimize')win.minimize();else if(action==='maximize')win.isMaximized()?win.unmaximize():win.maximize();else if(action==='close')win.close();else if(action==='finish-close'){allowClose=true;win.close();}});
    Menu.setApplicationMenu(null);
    win=new BrowserWindow({width:1536,height:980,minWidth:1060,minHeight:720,frame:false,backgroundColor:'#f6f7f9',show:false,title:'Citograph',icon:path.join(__dirname,'../dist/icon.png'),webPreferences:{preload:path.join(__dirname,'preload.cjs'),contextIsolation:true,nodeIntegration:false,sandbox:true}});
    win.webContents.setWindowOpenHandler(()=>({action:'deny'}));
    win.webContents.on('will-navigate',(event)=>event.preventDefault());
    if(process.env.CITOGRAPH_DEV_URL)win.loadURL(process.env.CITOGRAPH_DEV_URL);else win.loadFile(path.join(__dirname,'../dist/index.html'));
    win.once('ready-to-show',()=>{if(process.env.CITOGRAPH_TEST!=='1'&&!process.argv.includes('--word-bridge'))win.show();});
    win.webContents.on('did-finish-load',()=>{if(process.argv.includes('--style-studio'))win.webContents.send('style:open');const file=process.argv.find(a=>/\.citograph$/i.test(a));if(file)win.webContents.send('library:open-request',file);});
    try{wordBridge=await startWordBridge({directory:app.getPath('userData'),stylesDirectory:path.join(__dirname,'../dist/styles'),version:app.getVersion(),getState:()=>store.load()?.state,getLibrarySession:()=>libraries.session,port:process.env.CITOGRAPH_BRIDGE_PORT?Number(process.env.CITOGRAPH_BRIDGE_PORT):47631,onImport:(references,session)=>new Promise((resolve,reject)=>{libraries.assertSession(session);const id=crypto.randomUUID();const timer=setTimeout(()=>{pendingWordImports.delete(id);reject(new Error('The library is not ready to import. Please open Citograph and retry.'));},15000);pendingWordImports.set(id,{resolve,reject,timer});win.webContents.send('word:import-request',{id,references,session:libraries.session});})});}catch(error){console.error('Word bridge: '+error.message);}
    win.on('close',event=>{if(!allowClose && !win.webContents.isDestroyed()){event.preventDefault();win.webContents.send('library:before-close');}});
    app.on('activate',()=>win?.show());
  });
  app.on('window-all-closed',()=>app.quit());app.on('will-quit',()=>{wordBridge?.close();libraries?.close();});
}
