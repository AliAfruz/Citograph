const {contextBridge,ipcRenderer}=require('electron');let session;const loaded=result=>{if(result?.library)session=result.library.session;return result;};
contextBridge.exposeInMainWorld('citograph',{
  load:async()=>loaded(await ipcRenderer.invoke('library:load')),save:state=>ipcRenderer.invoke('library:save',state),
  libraryFile:async(action,currentSession,file)=>loaded(await ipcRenderer.invoke('library:file',action,currentSession,file)),
  attach:()=>ipcRenderer.invoke('file:attach',session),readAttachment:id=>ipcRenderer.invoke('file:read',id,session),
  exportFile:(name,content)=>ipcRenderer.invoke('file:export',name,content),
  openExternal:url=>ipcRenderer.invoke('link:open',url),crossref:url=>ipcRenderer.invoke('crossref:fetch',url),
  backup:()=>ipcRenderer.invoke('library:backup',session),restore:()=>ipcRenderer.invoke('library:restore',session),
  dataFolder:()=>ipcRenderer.invoke('library:folder'),
  window:action=>ipcRenderer.invoke('window:action',action),
  onBeforeClose:callback=>{const handler=()=>callback();ipcRenderer.on('library:before-close',handler);return ()=>ipcRenderer.removeListener('library:before-close',handler);},
  onWordImport:callback=>{const handler=async(event,request)=>{try{const result=await callback(request.references,request.session);await ipcRenderer.invoke('word:import-response',request.id,result);}catch(error){await ipcRenderer.invoke('word:import-response',request.id,{error:error.message});}};ipcRenderer.on('word:import-request',handler);return()=>ipcRenderer.removeListener('word:import-request',handler);},
  onLibraryOpen:callback=>{const handler=(event,file)=>callback(file);ipcRenderer.on('library:open-request',handler);return()=>ipcRenderer.removeListener('library:open-request',handler);},
  platform:process.platform
  ,endNoteWindows:()=>ipcRenderer.invoke('word:migration-windows'),inspectEndNote:target=>ipcRenderer.invoke('word:migration-inspect',target),migrateEndNote:(style,target)=>ipcRenderer.invoke('word:migrate',style,target,session)
  ,styleRuntime:interpreter=>ipcRenderer.invoke('style:runtime',interpreter),compileStyle:request=>ipcRenderer.invoke('style:compile',request),pickPython:()=>ipcRenderer.invoke('style:pick-python'),wordStyleTarget:()=>ipcRenderer.invoke('style:word-target'),applyWordStyle:(id,target)=>ipcRenderer.invoke('style:word-apply',id,target,session),
  onStyleOpen:callback=>{const handler=()=>callback();ipcRenderer.on('style:open',handler);return()=>ipcRenderer.removeListener('style:open',handler);}
});
