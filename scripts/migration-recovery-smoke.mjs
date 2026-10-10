import {_electron as electron,expect} from '@playwright/test';import fs from 'node:fs/promises';import path from 'node:path';import {spawn} from 'node:child_process';
const root=process.cwd(),folder=path.join(root,'test-results','migration-recovery-'+Date.now()),exe=process.env.CITOGRAPH_SMOKE_EXE;
await fs.mkdir(folder,{recursive:true});let app;
try{
 app=await electron.launch({...(exe?{executablePath:exe,args:[]}:{args:[root]}),cwd:root,env:{...process.env,CITOGRAPH_TEST:'1',CITOGRAPH_DATA_DIR:folder,CITOGRAPH_BRIDGE_PORT:'0'},timeout:45000});
 const page=await app.firstWindow();page.setDefaultTimeout(20000);await expect(page.locator('.reference-row')).toHaveCount(10,{timeout:45000});
 const descriptor=path.join(folder,'word-bridge.json');await expect.poll(async()=>{try{await fs.access(descriptor);return true;}catch{return false;}}).toBe(true);
 await new Promise((resolve,reject)=>{
  const ps=spawn('powershell.exe',['-NoProfile','-ExecutionPolicy','Bypass','-File',path.join(root,'scripts/word-migration-recovery-native.ps1'),'-Root',exe?path.dirname(exe):root,'-BridgeFile',descriptor,'-ResultFolder',folder,...(process.env.CITOGRAPH_MIGRATION_FIXTURE?['-Manuscript',process.env.CITOGRAPH_MIGRATION_FIXTURE]:[])],{cwd:root,windowsHide:true});
  ps.stdout.on('data',chunk=>process.stdout.write(chunk));ps.stderr.on('data',chunk=>process.stderr.write(chunk));ps.on('error',reject);ps.on('exit',code=>code===0?resolve():reject(new Error('Word recovery validation failed; report: '+folder)));
 });
 const report=JSON.parse((await fs.readFile(path.join(folder,'migration-recovery-report.json'),'utf8')).replace(/^\uFEFF/,''));
 const saved=await page.evaluate(()=>window.citograph.load());expect(saved.state.references).toHaveLength(report.expectedLibraryReferences);console.log('PASS recovered references persist in the isolated desktop library');console.log('Reports: '+folder);
}finally{if(app){await app.evaluate(({BrowserWindow})=>BrowserWindow.getAllWindows().forEach(w=>w.destroy())).catch(()=>{});await app.close().catch(()=>{});}}
