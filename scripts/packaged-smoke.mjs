import {_electron as electron,expect} from '@playwright/test';
import fs from 'node:fs/promises';
import path from 'node:path';
import {fileURLToPath} from 'node:url';
const root=path.resolve(path.dirname(fileURLToPath(import.meta.url)),'..'),results=path.join(root,'test-results');await fs.mkdir(results,{recursive:true});const errors=[];let app;
try{
 app=await electron.launch({executablePath:path.join(root,'release/win-unpacked/Citograph.exe'),args:[],cwd:root,env:{...process.env,CITOGRAPH_DATA_DIR:path.join(results,'packaged-library-'+Date.now()),CITOGRAPH_TEST:'1'},timeout:45000});
 await app.evaluate(({BrowserWindow})=>{const win=BrowserWindow.getAllWindows()[0];win.show();win.setBounds({x:0,y:0,width:1536,height:980});});
 const page=await app.firstWindow();page.on('pageerror',e=>errors.push(e.message));await page.getByRole('heading',{name:'Your research, connected.'}).waitFor({timeout:45000});await expect(page.locator('.reference-row')).toHaveCount(10);await expect(page.getByRole('button',{name:'Read full abstract',exact:true})).toBeVisible();await expect(page.locator('.metadata')).toContainText('Science');await page.waitForTimeout(500);await page.screenshot({path:path.join(root,'Citograph-preview.png')});console.log('PASS Standalone executable launches with all bundled resources');
 await page.getByRole('button',{name:'Citations',exact:true}).click();await expect(page.locator('.citation-box').first()).toContainText('Furukawa');await page.getByLabel('Citation style',{exact:true}).selectOption('nature');await expect(page.locator('.citation-box').first()).toContainText('1');console.log('PASS Citation processing works with development packages excluded');
 await page.getByRole('button',{name:'Settings',exact:true}).click();await page.getByRole('button',{name:'Midnight dark',exact:true}).click();await page.locator('.sidebar nav').getByRole('button',{name:/^Library/}).first().click();await page.getByRole('button',{name:'Overview',exact:true}).click();await page.screenshot({path:path.join(root,'Citograph-preview-dark.png')});console.log('PASS Packaged dark theme');
 await page.getByRole('button',{name:'Research atlas',exact:false}).first().click();await expect(page.locator('.atlas-node')).toHaveCount(10);await page.screenshot({path:path.join(root,'Citograph-preview-atlas.png')});console.log('PASS Packaged research atlas');
 if(errors.length)throw new Error(errors.join('; '));await fs.writeFile(path.join(results,'packaged-report.json'),JSON.stringify({passed:true,checks:4,errors,time:new Date().toISOString()},null,2));console.log('PASS No packaged renderer exceptions');
}catch(e){console.error(e);await fs.writeFile(path.join(results,'packaged-report.json'),JSON.stringify({passed:false,error:String(e),errors},null,2));process.exitCode=1;}
finally{if(app){await app.evaluate(({BrowserWindow})=>BrowserWindow.getAllWindows().forEach(w=>w.destroy())).catch(()=>{});await app.close().catch(()=>{});}}
