import assert from 'node:assert/strict';import ts from 'typescript';import {readFileSync,writeFileSync,mkdtempSync,rmSync} from 'node:fs';import {tmpdir} from 'node:os';import {join} from 'node:path';import {pathToFileURL} from 'node:url';
const dir=mkdtempSync(join(tmpdir(),'extra-modes-'));
try{
 for(const n of ['game','branch','branchEvents','branchAdventure','extraModes'])writeFileSync(join(dir,`${n}.mjs`),ts.transpileModule(readFileSync(new URL(`../src/${n}.ts`,import.meta.url),'utf8'),{compilerOptions:{target:ts.ScriptTarget.ES2020,module:ts.ModuleKind.ESNext}}).outputText.replace(/from '\.\/([A-Za-z]+)'/g,"from './$1.mjs'"));
 const load=n=>import(pathToFileURL(join(dir,`${n}.mjs`))),e=await load('extraModes'),a=await load('branchAdventure'),b=await load('branch'),g=await load('game');
 for(let i=0;i<100;i++){const board=e.puzzleBoard(`regression-${i}`);assert.ok(e.solvedByDeduction(board));assert.equal(board.cells.filter(c=>c.mine).length,7);assert.ok(board.cells.some(c=>c.revealed));assert.equal(board.status,'playing');const twice=e.puzzleBoard(`regression-${i}`);assert.deepEqual(twice.cells,board.cells,'seed fixes the verified starting position');}
 for(let stage=0;stage<6;stage++){
  let s=e.newExtraRun('puzzle',stage);assert.ok(e.solvedByDeduction(s.board));
  if(stage===0){const i=s.board.cells.findIndex(c=>!c.revealed);s=e.extraMove(s,i,true);assert.equal(s.board.flagsPlaced,0,'flag-free restriction enforced');}
  if(stage===2){const i=s.board.cells.findIndex(c=>c.revealed);s=e.extraMove(s,i);assert.equal(s.board.chords,0,'chord-free restriction enforced');}
  for(let i=0;i<300&&s.board.status==='playing';i++){
   if(stage===1&&s.board.cells.every(c=>c.mine||c.revealed)){for(const m of s.board.cells.flatMap((c,i)=>c.mine&&!c.flagged?[i]:[]))s=e.extraMove(s,m,true);break;}
   const d=e.deduction(s.board);if(stage!==0&&stage!==4)assert.ok(d,`puzzle ${stage} has a next deduction`);
   if(stage===0||stage===4){
    // Flag-free/limited-flag puzzles can use deduction in memory without planting flags.
    const i=s.board.cells.findIndex(c=>!c.mine&&!c.revealed);s=e.extraMove(s,i);
   }else s=e.extraMove(s,d.index,d.kind==='mine');
  }
  assert.equal(s.board.status,'won');assert.ok(e.puzzlePassed(s),`puzzle ${stage} goal can be completed`);
 }
 let s=e.newExtraRun('survival');const first=g.reveal(s.board,40).state;s={...s,board:first};const mine=first.cells.findIndex(c=>c.mine);const lost=e.extraMove(s,mine);assert.equal(lost.board.status,'lost');assert.equal(lost.lives,2);assert.equal(e.extraMove(lost,mine).lives,2,'a visible loss cannot consume another life');let retry=e.retryExtra(lost);assert.equal(retry.lives,2);assert.equal(retry.stage,0);assert.equal(retry.board.status,'ready');
 let cleared={...s,board:{...first,status:'won'}};let next=e.nextExtra(cleared);assert.equal(next.stage,1);assert.equal(next.board.mines,12);assert.equal(next.lives,3);assert.equal(next.cleared,1);
 let w=a.unifyBranch(b.newWorld());a.routeFor(w).stops[0].kind='bank';w.expeditions.coins=135;w.expeditions.bank=240;
 for(const amount of [-1,0,1.5,136,NaN,Infinity]){const r=a.bankCoins(w,'deposit',amount);assert.equal(r.expeditions.coins,135);assert.equal(r.expeditions.bank,240);}
 const deposited=a.bankCoins(w,'deposit',35);assert.equal(deposited.expeditions.coins,100);assert.equal(deposited.expeditions.bank,275);const withdrawn=a.bankCoins(deposited,'withdraw',70);assert.equal(withdrawn.expeditions.coins,170);assert.equal(withdrawn.expeditions.bank,205);assert.equal(a.bankCoins(withdrawn,'deposit').expeditions.coins,0);
 assert.equal(a.routeLength(0),9);assert.ok(a.routeLength(8)>9);console.log('Extra modes and navigation engine passed: 100 verified seeded deduction-solvable Puzzle boards, 6 puzzle positions/restrictions, survival lives/progression, atomic amount banking, longer routes.');
}finally{rmSync(dir,{recursive:true,force:true});}
