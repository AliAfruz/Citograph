import {_electron as electron,expect} from '@playwright/test';import fs from 'node:fs/promises';import path from 'node:path';
const root=process.cwd(),folder=path.join(root,'test-results','atlas-'+Date.now()),exe=process.env.CITOGRAPH_SMOKE_EXE;
await fs.mkdir(folder,{recursive:true});const checks=[],errors=[];let app,page;
const run=async(name,fn)=>{await fn();checks.push(name);console.log('PASS '+name);};
const healthy=async()=>{await expect(page.locator('.fatal-error')).toHaveCount(0);await expect(page.locator('.atlas-node')).toHaveCount(10);};
const transform=async(index=0)=>page.locator('.atlas-node').nth(index).getAttribute('transform');
const point=async(index=0)=>{const circle=page.locator('.atlas-node').nth(index).locator('circle');await circle.scrollIntoViewIfNeeded();const b=await circle.boundingBox();const p={x:b.x+b.width/2,y:b.y+b.height/2};expect(await page.evaluate(p=>!!document.elementFromPoint(p.x,p.y)?.closest('.atlas-node'),p)).toBe(true);return p;};
const batchMoves=async(start,{dx=65,dy=25,cancel=false,foreign=false}={})=>page.locator('.atlas-canvas svg').evaluate((svg,p)=>{
 for(let i=1;i<=6;i++)svg.dispatchEvent(new PointerEvent('pointermove',{bubbles:true,pointerId:p.foreign?99:1,clientX:p.start.x+p.dx*i/6,clientY:p.start.y+p.dy*i/6,buttons:1}));
 if(!p.foreign)svg.dispatchEvent(new PointerEvent(p.cancel?'pointercancel':'pointerup',{bubbles:true,pointerId:1,clientX:p.start.x+p.dx,clientY:p.start.y+p.dy,buttons:0}));
},{start,dx,dy,cancel,foreign});
const selectAtlas=async()=>page.getByRole('button',{name:'Research atlas',exact:false}).first().click();
try{
 app=await electron.launch({...(exe?{executablePath:exe,args:[]}:{args:[root]}),cwd:root,env:{...process.env,CITOGRAPH_DATA_DIR:folder,CITOGRAPH_BRIDGE_PORT:'0',CITOGRAPH_TEST:'1'},timeout:45000});page=await app.firstWindow();page.on('pageerror',e=>errors.push(e.message));await expect(page.locator('.reference-row')).toHaveCount(10,{timeout:45000});const original=await page.evaluate(async()=>JSON.stringify((await window.citograph.load()).state.references));await selectAtlas();
 await run('rapid node moves followed by release do not crash a queued React update',async()=>{
  const start=await point(),before=await transform();await page.mouse.move(start.x,start.y);await page.mouse.down();await batchMoves(start);await page.mouse.up();await healthy();await expect.poll(()=>transform()).not.toBe(before);
 });
 await run('real repeated drags preserve selection and connected references',async()=>{
  for(let index=0;index<5;index++){const start=await point(index),before=await transform(index);await page.mouse.move(start.x,start.y);await page.mouse.down();await page.mouse.move(start.x+32,start.y+20,{steps:10});await page.mouse.up();await healthy();await expect.poll(()=>transform(index)).not.toBe(before);const label=await page.locator('.atlas-node').nth(index).getAttribute('aria-label');await expect(page.locator('.inspector-title h2')).toHaveText(label);}
 });
 await run('dragging at a different zoom retains finite node and connection coordinates',async()=>{
  await page.getByRole('button',{name:'Zoom in',exact:true}).click();await page.getByRole('button',{name:'Zoom in',exact:true}).click();const start=await point(1),before=await transform(1);await page.mouse.move(start.x,start.y);await page.mouse.down();await batchMoves(start,{dx:35,dy:20});await page.mouse.up();await healthy();await expect.poll(()=>transform(1)).not.toBe(before);expect(await page.locator('.atlas-canvas svg').evaluate(svg=>[...svg.querySelectorAll('line')].every(line=>['x1','y1','x2','y2'].every(attr=>Number.isFinite(Number(line.getAttribute(attr))))))).toBe(true);
 });
 await run('canvas pan, off-canvas release and lost capture stop movement',async()=>{
  await page.getByRole('button',{name:'Reset map',exact:true}).click();const svg=page.locator('.atlas-canvas svg'),b=await svg.boundingBox(),start={x:b.x+10,y:b.y+10};const before=await svg.locator(':scope > g').getAttribute('transform');await page.mouse.move(start.x,start.y);await page.mouse.down();await page.mouse.move(start.x+40,start.y+20,{steps:4});await page.mouse.up();await expect.poll(()=>svg.locator(':scope > g').getAttribute('transform')).not.toBe(before);
  const nodeStart=await point(2);await page.mouse.move(nodeStart.x,nodeStart.y);await page.mouse.down();await page.mouse.move(b.x+b.width+45,nodeStart.y,{steps:6});await page.mouse.up();await healthy();const stopped=await transform(2);await page.mouse.move(b.x+30,b.y+30);await expect.poll(()=>transform(2)).toBe(stopped);
 });
 await run('canceled drags and unrelated pointers cannot keep moving a paper',async()=>{
  await page.getByRole('button',{name:'Reset map',exact:true}).click();const start=await point(3),before=await transform(3);await page.mouse.move(start.x,start.y);await page.mouse.down();await batchMoves(start,{foreign:true});expect(await transform(3)).toBe(before);await batchMoves(start,{cancel:true});await page.mouse.up();await healthy();const stopped=await transform(3);await page.mouse.move(start.x+90,start.y+65);expect(await transform(3)).toBe(stopped);
 });
 await run('reset, collection filtering, navigation and library persistence still work',async()=>{
  await page.getByRole('button',{name:'Reset map',exact:true}).click();await page.getByLabel('Map collection').selectOption('porous');await expect(page.locator('.atlas-node')).toHaveCount(4);await page.getByLabel('Map collection').selectOption('all');await healthy();await page.getByRole('button',{name:'Settings',exact:true}).click();await expect(page.getByLabel('Text size')).toBeVisible();await page.locator('.sidebar nav').getByRole('button',{name:/^Library/}).first().click();await expect(page.locator('.reference-row')).toHaveCount(10);await page.keyboard.press('Control+s');expect(await page.evaluate(async()=>JSON.stringify((await window.citograph.load()).state.references))).toBe(original);await page.reload();await expect(page.locator('.reference-row')).toHaveCount(10);await selectAtlas();await healthy();
 });
 if(errors.length)throw new Error(errors.join('; '));await fs.writeFile(path.join(folder,'atlas-report.json'),JSON.stringify({passed:true,checks,errors,version:await app.evaluate(({app})=>app.getVersion())},null,2));console.log('Report: '+folder);
}catch(error){process.exitCode=1;console.error(error);await fs.writeFile(path.join(folder,'atlas-report.json'),JSON.stringify({passed:false,checks,error:String(error),errors,fatal:page?await page.locator('.fatal-error').textContent().catch(()=>null):null},null,2));console.log('Report: '+folder);}
finally{if(app){await app.evaluate(({BrowserWindow})=>BrowserWindow.getAllWindows().forEach(w=>w.destroy())).catch(()=>{});await app.close().catch(()=>{});}}
