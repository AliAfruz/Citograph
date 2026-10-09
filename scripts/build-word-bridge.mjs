import {build} from 'esbuild';
await build({entryPoints:['bridge/citations.cjs'],bundle:true,platform:'node',target:'node24',format:'cjs',outfile:'electron/citation-engine.cjs',legalComments:'inline'});
console.log('Bundled Word citation bridge');
