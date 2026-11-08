import assert from 'node:assert/strict';import ts from 'typescript';import {readFileSync,writeFileSync,mkdtempSync,rmSync} from 'node:fs';import {tmpdir} from 'node:os';import {join} from 'node:path';import {pathToFileURL} from 'node:url';
const dir=mkdtempSync(join(tmpdir(),'playability-'));
try{
 writeFileSync(join(dir,'game.mjs'),ts.transpileModule(readFileSync(new URL('../src/game.ts',import.meta.url),'utf8'),{compilerOptions:{target:ts.ScriptTarget.ES2020,module:ts.ModuleKind.ESNext}}).outputText);const g=await import(pathToFileURL(join(dir,'game.mjs')));
 assert.deepEqual(g.clampCustom({rows:2048,cols:8192,mines:16777215}),{rows:2048,cols:8192,mines:16777215});
 for(const config of [{rows:1,cols:1,mines:0},{rows:1,cols:100,mines:99},{rows:100,cols:1,mines:99},{rows:41,cols:53,mines:2172},{rows:73,cols:61,mines:0}]){
  const before=g.freshGame('custom','custom',config);assert.deepEqual(before.custom,config);const next=g.reveal(before,Math.floor(before.cells.length/2)).state;assert.equal(next.cells.filter(c=>c.mine).length,config.mines,'actual mine count must not drop due to the safe opening');assert.equal(next.status,'won','one safe cell or zero-mine fields can be won');assert.ok(!next.cells[Math.floor(next.cells.length/2)].mine);
 }
 const excessive=g.clampCustom({rows:3,cols:5,mines:15});assert.equal(excessive.mines,14);assert.deepEqual(g.clampCustom({rows:1,cols:1,mines:100}),{rows:1,cols:1,mines:0});
 console.log('Playability engine passed: no fixed Custom size/density caps, zero mines, 1×1/long thin grids, exact high-density mine placement, one-safe-cell wins and large zero-field flood fill.');
}finally{rmSync(dir,{recursive:true,force:true});}
