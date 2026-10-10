import {_electron as electron,expect} from '@playwright/test';
import fs from 'node:fs/promises';
import path from 'node:path';
const root=path.resolve('.'),folder=path.join(root,'test-results','readability-'+Date.now()),exe=process.env.CITOGRAPH_SMOKE_EXE;
await fs.mkdir(folder,{recursive:true});
const checks=[],errors=[],metrics=[];let app;
const capture=async(page,file)=>{if(!exe)await page.screenshot({path:path.join(folder,file),animations:'disabled',timeout:20000});};
const run=async(name,fn)=>{await fn();checks.push(name);console.log('PASS '+name);};
const resize=async(width,height)=>{await app.evaluate(({BrowserWindow},size)=>BrowserWindow.getAllWindows()[0].setSize(size.width,size.height),{width,height});};
const size=async page=>Number.parseFloat(await page.locator('html').evaluate(el=>getComputedStyle(el).fontSize));
const layout=async page=>page.evaluate(()=>{
 const rect=selector=>{const el=document.querySelector(selector),r=el.getBoundingClientRect();return {width:r.width,height:r.height,top:r.top,bottom:r.bottom,clientWidth:el.clientWidth,scrollWidth:el.scrollWidth};};
 return {viewport:{width:innerWidth,height:innerHeight},body:rect('body'),sidebar:rect('.sidebar'),bottom:rect('.sidebar-bottom'),main:rect('.main-content'),inspector:document.querySelector('.inspector')?rect('.inspector'):null,font:parseFloat(getComputedStyle(document.querySelector('html')).fontSize)};
});
const library=async page=>page.locator('.sidebar nav').getByRole('button',{name:/^Library/}).first().click();
try{
 app=await electron.launch({...(exe?{executablePath:exe,args:[]}:{args:[root]}),cwd:root,env:{...process.env,CITOGRAPH_DATA_DIR:folder,CITOGRAPH_BRIDGE_PORT:'0',CITOGRAPH_TEST:'1'},timeout:45000});
 const page=await app.firstWindow();page.on('pageerror',e=>errors.push(e.message));await expect(page.locator('.reference-row')).toHaveCount(10,{timeout:45000});
 await run('existing libraries receive the comfortable default and readable abstracts',async()=>{
  expect(await size(page)).toBe(18);
  for(const selector of ['.reference-summary h3','.inspector .abstract'])expect(await page.locator(selector).first().evaluate(el=>parseFloat(getComputedStyle(el).fontSize))).toBeGreaterThanOrEqual(18);
  await page.getByRole('button',{name:'Settings',exact:true}).click();await expect(page.getByLabel('Text size',{exact:true})).toHaveValue('18');
 });
 await run('four text sizes preview immediately and persist after reload',async()=>{
  for(const value of ['16','18','20','22']){await page.getByLabel('Text size',{exact:true}).selectOption(value);await expect.poll(()=>size(page)).toBe(Number(value));}
  await page.keyboard.press('Control+s');const before=await page.evaluate(()=>window.citograph.load());expect(before.state.settings.textSize).toBe(22);
  await page.reload();await expect(page.locator('.reference-row')).toHaveCount(10);await expect.poll(()=>size(page)).toBe(22);
 });
 await run('keyboard controls resize, stay within bounds and reset',async()=>{
  await page.keyboard.press('Control+-');await expect.poll(()=>size(page)).toBe(20);
  await page.keyboard.press('Control+=');await expect.poll(()=>size(page)).toBe(22);
  await page.keyboard.press('Control+=');expect(await size(page)).toBe(22);
  for(let i=0;i<5;i++)await page.keyboard.press('Control+-');await expect.poll(()=>size(page)).toBe(16);
  await page.keyboard.press('Control+0');await expect.poll(()=>size(page)).toBe(18);
 });
 await run('dark library and reference inspector fit at desktop size',async()=>{
  await page.getByRole('button',{name:'Settings',exact:true}).click();await page.getByRole('button',{name:'Midnight dark',exact:true}).click();await library(page);await resize(1920,1030);
  const m=await layout(page);metrics.push(m);expect(m.body.scrollWidth).toBeLessThanOrEqual(m.viewport.width);expect(m.bottom.bottom).toBeLessThanOrEqual(m.viewport.height);
  await page.getByRole('button',{name:'Settings',exact:true}).click();await expect(page.getByLabel('Text size')).toBeVisible();await library(page);
  await capture(page,'comfortable-dark.png');
 });
 await run('extra large text remains usable in the smallest supported window',async()=>{
  await page.getByRole('button',{name:'Settings',exact:true}).click();await page.getByLabel('Text size').selectOption('22');await library(page);await resize(1060,720);
  const m=await layout(page);metrics.push(m);expect(m.body.scrollWidth).toBeLessThanOrEqual(m.viewport.width);expect(m.bottom.bottom).toBeLessThanOrEqual(m.viewport.height);expect(m.main.width).toBeGreaterThan(300);
  await page.getByRole('button',{name:'Settings',exact:true}).click();await expect(page.getByLabel('Text size')).toBeVisible();
  await capture(page,'extra-large-settings-small.png');
  await page.getByLabel('Text size').selectOption('18');await library(page);
  await page.getByRole('button',{name:'Import library',exact:false}).click();await expect(page.getByRole('dialog')).toBeVisible();const modal=await page.getByRole('dialog').boundingBox();expect(modal.x).toBeGreaterThanOrEqual(0);expect(modal.x+modal.width).toBeLessThanOrEqual((await layout(page)).viewport.width);
  await page.getByRole('button',{name:'Close dialog',exact:true}).click();
 });
 await run('light layout, enlarged notes and Style Studio remain accessible',async()=>{
  await resize(1536,980);await page.getByRole('button',{name:'Settings',exact:true}).click();await page.getByRole('button',{name:'Paper light',exact:true}).click();await page.getByLabel('Text size').selectOption('20');await library(page);
  await page.getByRole('button',{name:'Notes',exact:true}).click();await page.getByLabel('Research notes',{exact:true}).fill('Readable notes preserved through a display change.');await page.keyboard.press('Control+s');await expect(page.getByLabel('Research notes')).toHaveValue('Readable notes preserved through a display change.');
  await page.getByRole('button',{name:'Style Studio',exact:true}).click();expect(await size(page)).toBe(20);await expect(page.locator('.main-content')).toBeVisible();await capture(page,'large-style-studio.png');
  await page.getByRole('tab',{name:'Python Lab',exact:true}).click();await expect(page.locator('.style-code-editor textarea')).toBeVisible();expect(await page.locator('.style-code-editor textarea').evaluate(el=>parseFloat(getComputedStyle(el).fontSize))).toBeGreaterThanOrEqual(18);await capture(page,'large-python-editor.png');
  await page.getByRole('button',{name:'Settings',exact:true}).click();await page.getByLabel('Text size').selectOption('18');await library(page);await capture(page,'comfortable-light.png');
 });
 if(errors.length)throw new Error(errors.join('; '));
 await fs.writeFile(path.join(folder,'readability-report.json'),JSON.stringify({passed:true,checks,metrics,errors,executable:exe||'development production build'},null,2));console.log('Report: '+folder);
}catch(error){process.exitCode=1;console.error(error);await fs.writeFile(path.join(folder,'readability-report.json'),JSON.stringify({passed:false,checks,error:String(error),metrics,errors},null,2));if(app&&!exe)try{await(await app.firstWindow()).screenshot({path:path.join(folder,'failure.png'),timeout:10000});}catch{}}
finally{if(app){await app.evaluate(({BrowserWindow})=>BrowserWindow.getAllWindows().forEach(w=>w.destroy())).catch(()=>{});await app.close().catch(()=>{});}}
