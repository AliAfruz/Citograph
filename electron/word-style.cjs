const path=require('node:path');const {processResult}=require('./style-compiler.cjs');
async function wordStyle(command,{descriptor,root,styleId,target}){
 if(!['inspect','apply'].includes(command))throw new Error('Invalid Word command.');
 const token=typeof target==='string'?target:target?.token,handle=target?.window;
 if(handle!==undefined&&(!Number.isInteger(handle)||handle<=0||handle>4294967295))throw new Error('Invalid Word window.');
 if(command==='apply'&&(!/^[a-zA-Z0-9-]+$/.test(styleId)||!/^\w{64}$/.test(token)))throw new Error('Invalid style or Word target.');
 const exe=path.join(root,'word-addin/bin/Citograph.StyleHost.exe');
 const r=await processResult(exe,[command,descriptor,...(command==='apply'?[styleId,token]:[]),...(handle!==undefined?[String(handle)]:[])],{},60000);
 if(r.code!==0)throw new Error(r.stderr.trim()||'Word could not apply the style.');
 return JSON.parse(r.stdout);
}
async function wordMigration(command,{descriptor,root,styleId,target,output}){
 if(!['windows','migration-inspect','migrate'].includes(command))throw new Error('Invalid Word migration command.');
 const handle=target?.window;if(handle!==undefined&&(!Number.isInteger(handle)||handle<=0||handle>4294967295))throw new Error('Invalid Word window.');
 if(command==='migrate'&&(!/^[a-zA-Z0-9-]+$/.test(styleId)||! /^[a-f0-9]{64}$/.test(target?.token)||typeof output!=='string'||!path.isAbsolute(output)||!/\.doc[xm]$/i.test(output)||handle===undefined))throw new Error('Invalid migration target.');
 const args=[command,descriptor,...(command==='migrate'?[output,styleId,target.token]:[]),...(handle!==undefined?[String(handle)]:[])];
 const r=await processResult(path.join(root,'word-addin/bin/Citograph.StyleHost.exe'),args,{},180000);if(r.code!==0)throw new Error(r.stderr.trim()||'Word migration could not finish.');return JSON.parse(r.stdout);
}
module.exports={wordStyle,wordMigration};
