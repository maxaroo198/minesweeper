import assert from 'node:assert/strict';
import ts from 'typescript';
import {readFileSync,writeFileSync,mkdtempSync,rmSync} from 'node:fs';
import {tmpdir} from 'node:os';import {join} from 'node:path';import {pathToFileURL} from 'node:url';
const dir=mkdtempSync(join(tmpdir(),'branch-unified-'));
const originalRandom=Math.random,originalNow=Date.now;Math.random=()=>.5;Date.now=()=>1794070000000;
try{
 for(const n of ['game','branch','branchAdventure'])writeFileSync(join(dir,`${n}.mjs`),ts.transpileModule(readFileSync(new URL(`../src/${n}.ts`,import.meta.url),'utf8'),{compilerOptions:{target:ts.ScriptTarget.ES2020,module:ts.ModuleKind.ESNext}}).outputText.replace(/from '\.\/([A-Za-z]+)'/g,"from './$1.mjs'"));
 const load=n=>import(pathToFileURL(join(dir,`${n}.mjs`)).href);const g=await load('game'),b=await load('branch'),a=await load('branchAdventure');
 const start=w=>a.startEncounter(a.chooseStop(w,'board'));
 const initial=b.newWorld(),snapshot=JSON.stringify(initial);let w=a.unifyBranch(initial);assert.equal(JSON.stringify(initial),snapshot);assert.ok(a.routeFor(w));assert.equal(w.createdAt,initial.createdAt);
 const again=a.unifyBranch(w);assert.deepEqual(again,w,'reentering does not duplicate starter kit or reset route');
 // Carry forward an old genuinely played board with flag and reveal progress.
 let legacy=b.newWorld(),old=g.reveal(b.boardFromArea(legacy,'0'),40).state;
 const flag=old.cells.findIndex(c=>c.mine);old=g.toggleFlag(old,flag);legacy=b.syncArea(legacy,old);
 const imported=a.unifyBranch(legacy),adopted=a.expeditionBoard(imported);
 assert.deepEqual(adopted.cells,old.cells.map(({chargeEarned,...cell})=>cell));assert.equal(imported.areas['0'].id,'0');assert.equal(imported.createdAt,legacy.createdAt);
 assert.ok(adopted.id.startsWith('exp:'));
 const preflag=b.newWorld();preflag.areas['0'].flagged=[3];assert.equal(a.expeditionBoard(a.unifyBranch(preflag)).cells[3].flagged,true,'pre-opening flags also migrate');
 // First board contains safe caches after the protected opening.
 w=start(w);let board=a.expeditionBoard(w),next=g.reveal(board,40).state;let out=a.settleMove(w,board,next);w=out.world;board=out.board;
 const stop=a.stopFor(w);assert.equal(stop.variant,'crystal');assert.ok(stop.caches.length>0);assert.ok(stop.caches.every(i=>!board.cells[i].mine));
 w.expeditions.inventory.magnet=1;w.expeditions.inventory.surveyor=1;w=a.equipItem(w,'magnet');w=a.equipItem(w,'surveyor');
 const coins=w.expeditions.coins,charges=w.expeditions.surveyCharges;
 const cache=a.stopFor(w).caches.find(i=>!board.cells[i].revealed);out=a.settleMove(w,board,g.reveal(board,cache).state);w=out.world;board=out.board;
 assert.ok(w.expeditions.coins>=coins+12);assert.ok(w.expeditions.surveyCharges>charges);
 assert.ok(board.cells.filter(c=>c.revealed).length>next.cells.filter(c=>c.revealed).length);
 const before=w.expeditions.coins;const flagCell=board.cells.findIndex(c=>!c.revealed&&!c.flagged);
 const saved=a.saveBoard(w,g.toggleFlag(board,flagCell));assert.equal(saved.expeditions.coins,before,'flag/save cannot farm caches');
 // Complete a real crystal board and choose exactly one relic, auto-equipped.
 for(let i=0;i<board.cells.length&&board.status==='playing';i++)if(!board.cells[i].mine&&!board.cells[i].flagged){out=a.settleMove(w,board,g.reveal(board,i).state);w=out.world;board=out.board;}
 assert.equal(board.status,'won');assert.ok(w.expeditions.reward);
 const waiting=JSON.stringify(w);assert.equal(JSON.stringify(a.chooseStop(w,'shop')),waiting,'must claim first-clear reward before moving on');
 const item=w.expeditions.reward.options[0];w=a.claimReward(w,item);assert.equal(w.expeditions.reward,undefined);assert.ok(w.expeditions.inventory[item]);
 assert.ok(w.expeditions.active.includes(item)||w.expeditions.passive.includes(item));assert.equal(JSON.stringify(a.claimReward(w,item)),JSON.stringify(w),'draft cannot be claimed twice');
 // Previewed board mechanics really affect the grid, not just names.
 for(const variant of ['surveyed','bounty','narrow']){
  let v=start(a.unifyBranch(b.newWorld())),s=a.stopFor(v);s.variant=variant;
  // Narrow's dimensions are set at creation; verify generation across several real routes below.
  let x=s.board,n=g.reveal(x,40).state;const r=a.settleMove(v,x,n);v=r.world;x=r.board;
  if(variant==='surveyed'){assert.ok(a.stopFor(v).campClues.length>0);assert.ok(x.cells.every(c=>c.scanned===null),'camp clues are distinct from active Lantern scans');};
  if(variant==='bounty')assert.equal(a.stopFor(v).moves,1);
 }
 let rectangular=false;
 for(let n=0;n<30;n++){
  let v=a.unifyBranch({...b.newWorld(),createdAt:n}),r=a.routeFor(v);r.cursor=2;r.stops[2].kind='board';v=a.startEncounter(v);
  if(a.stopFor(v).variant==='narrow'){rectangular=true;assert.ok(a.expeditionBoard(v).cols>a.expeditionBoard(v).rows);}
 }
 assert.ok(rectangular);
 // Optional objectives pay for swift clears and correct flags, but never impose a loss.
 for(const variant of ['bounty','narrow']){
  let v=start(a.unifyBranch(b.newWorld()));a.stopFor(v).variant=variant;let x=a.expeditionBoard(v);let r=a.settleMove(v,x,g.reveal(x,40).state);v=r.world;x=r.board;
  for(const i of x.cells.flatMap((c,i)=>c.mine?[i]:[]).slice(0,3))x=g.toggleFlag(x,i);
  v=a.saveBoard(v,x);a.stopFor(v).moves=0;
  const won={...x,status:'won',finishedAt:Date.now(),cells:x.cells.map(c=>c.mine?c:{...c,revealed:true})};
  const money=v.expeditions.coins;r=a.settleMove(v,x,won);assert.equal(r.world.expeditions.coins-money,variant==='bounty'?40:32);
 }
 // Stronger skills are usable and consume/recharge their own state.
 let skill=start(a.unifyBranch(b.newWorld()));a.stopFor(skill).variant=undefined;
 let x=a.expeditionBoard(skill);out=a.settleMove(skill,x,g.reveal(x,40).state);skill=out.world;x=out.board;
 const count=x.cells.filter(c=>c.revealed).length;out=a.useAbility(skill,x,'pathfinder');assert.ok(out.board.cells.filter(c=>c.revealed).length>=count+Math.min(3,x.cells.filter(c=>!c.mine&&!c.revealed&&!c.flagged).length));
 let kit=out.world;kit.expeditions.inventory.blast=1;kit=a.equipItem(kit,'blast');
 if(out.board.status==='playing'){const burst=a.useAbility(kit,out.board,'blast');assert.ok(burst.board.cells.filter(c=>c.exploded).length===0);assert.ok((burst.world.expeditions.blastCooldown??0)>0||burst.board.status==='won');}
 // Regression: active Survey clues never reapply on a protected or unprotected retry.
 for(const protectedRun of [true,false]){
  let v=start(a.unifyBranch(b.newWorld()));a.stopFor(v).variant=undefined;v.expeditions.autoTotem=protectedRun;v.expeditions.inventory.survey=1;v.expeditions.surveyCharges=3;v=a.equipItem(v,'survey');
  let x=a.expeditionBoard(v),r=a.settleMove(v,x,g.reveal(x,40).state);v=r.world;x=r.board;
  r=a.useAbility(v,x,'survey');v=r.world;x=r.board;assert.equal(v.expeditions.surveyCharges,2);assert.ok(x.cells.some(c=>c.scanned!==null));
  const mine=x.cells.findIndex(c=>c.mine);r=a.settleMove(v,x,g.reveal(x,mine).state,()=>.5);v=r.world;
  v=a.continueAfterLoss(JSON.parse(JSON.stringify(v)),()=>.5);if(!protectedRun)v=a.startEncounter(v);
  x=a.expeditionBoard(v);assert.ok(x);assert.equal(v.expeditions.surveyCharges,2);assert.equal(x.cells.filter(c=>c.scanned!==null).length,0,'no free or restored active scans after Continue');
  const saved=JSON.parse(JSON.stringify(v));assert.equal(a.expeditionBoard(a.unifyBranch(saved)).cells.filter(c=>c.scanned!==null).length,0,'reload also cannot reapply a tool');
 }
 // Event outcomes are saved once, and bank money never enters an event gamble.
 for(const event of ['shrine','chest']){
  let ev=a.unifyBranch(b.newWorld());ev.expeditions.coins=20;ev.expeditions.bank=100;let r=a.routeFor(ev);r.cursor=1;r.stops[1].kind='event';r.stops[1].event=event;
  ev=a.finishStop(ev,'gift');assert.equal(ev.expeditions.bank,100);const balance=ev.expeditions.coins;r=a.routeFor(ev);r.cursor=1;ev=a.finishStop(ev,'gift');assert.equal(ev.expeditions.coins,balance);
 }
 assert.equal(g.freshGame('classic','easy').cells.length,81,'Classic engine remains standard');
 console.log('Unified Branch engine passed: automatic entry, idempotent migration, exact legacy-board preservation, safe crystal chains/build synergies, one-time relic drafts, supplied clues, rectangular fields, stronger skills and one-time varied events.');
}finally{Math.random=originalRandom;Date.now=originalNow;rmSync(dir,{recursive:true,force:true});}
