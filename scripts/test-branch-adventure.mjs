import assert from 'node:assert/strict';
import ts from 'typescript';
import {readFileSync,writeFileSync,mkdtempSync,rmSync} from 'node:fs';
import {tmpdir} from 'node:os';
import {join} from 'node:path';
import {pathToFileURL} from 'node:url';
const dir=mkdtempSync(join(tmpdir(),'branch-adventure-'));
try {
  for(const name of ['game','branch','branchEvents','branchAdventure']) {
    const source=readFileSync(new URL(`../src/${name}.ts`,import.meta.url),'utf8');
    const js=ts.transpileModule(source,{compilerOptions:{target:ts.ScriptTarget.ES2020,module:ts.ModuleKind.ESNext}}).outputText.replace(/from '\.\/([A-Za-z]+)'/g,"from './$1.mjs'");
    writeFileSync(join(dir,`${name}.mjs`),js);
  }
  const load=name=>import(pathToFileURL(join(dir,`${name}.mjs`)).href);
  const game=await load('game'),branch=await load('branch'),a=await load('branchAdventure');
  const copy=w=>JSON.parse(JSON.stringify(w));
  // Keep the original economy regression fixture neutral; the new mechanics have a separate suite.
  const begin=input=>{const w=a.beginExpedition(input);for(const stop of a.routeFor(w).stops)stop.event='trailkeeper';return w;};
  const boardStop=(w,kind='board')=>{w=a.startEncounter(a.chooseStop(w,kind));a.stopFor(w).variant=undefined;return w;};
  const completeBoard=w=>{
    let b=a.expeditionBoard(w);
    if(b.status==='ready') {const next=game.reveal(b,40).state;const out=a.settleMove(w,b,next,()=>.9);w=out.world;b=out.board;}
    for(let i=0;i<b.cells.length && b.status==='playing';i++) if(!b.cells[i].mine && !b.cells[i].revealed){const next=game.reveal(b,i).state;const out=a.settleMove(w,b,next,()=>.9);w=out.world;b=out.board;}
    assert.equal(b.status,'won');w.expeditions.reward=undefined;return w;
  };
  const fresh=branch.newWorld(),saved=JSON.stringify(fresh);
  let w=begin(fresh);
  assert.equal(JSON.stringify(fresh),saved,'starting never mutates the input tree');
  assert.equal(w.createdAt,fresh.createdAt);assert.deepEqual(w.areas,fresh.areas);
  assert.equal(a.routeFor(w).stops.length,5);
  assert.ok(a.routeLength(20)>a.routeLength(2));assert.ok(a.phaseCount(20)>a.phaseCount(0));
  assert.equal(w.expeditions.inventory.totem,1);assert.deepEqual(w.expeditions.active,['pathfinder']);
  w=boardStop(w);let b=a.expeditionBoard(w),next=game.reveal(b,40).state;
  w=a.settleMove(w,b,next).world;b=next;
  const mine=b.cells.findIndex(c=>c.mine);
  const original=JSON.stringify(w);
  let out=a.settleMove(w,b,game.reveal(b,mine).state,()=>.999);
  assert.equal(JSON.stringify(w),original,'settlement is immutable');
  assert.equal(out.board.status,'lost','mine hit remains visible');
  assert.equal(out.world.expeditions.inventory.totem,0);
  assert.equal(out.world.areas['0'].state,'open');
  assert.equal(out.world.expeditions.pendingLoss.protected,true);
  w=a.continueAfterLoss(out.world);
  b=a.expeditionBoard(w);assert.equal(b.status,'playing');assert.ok(b.cells[mine].flagged);
  w.expeditions.coins=200;w.expeditions.bank=500;
  const mine2=b.cells.findIndex(c=>c.mine && !c.flagged);
  const lost=game.reveal(b,mine2).state;
  out=a.settleMove(w,b,lost,()=>0);
  assert.equal(out.world.expeditions.coins,180,'minimum loss is exactly 10%');assert.equal(out.world.expeditions.bank,500);
  assert.match(out.notice,/You dropped some money!/);
  assert.equal(out.world.expeditions.drops[0].amount,20);
  assert.equal(a.routeFor(out.world).attempt,1);
  let rolls=0;
  let returned=a.continueAfterLoss(out.world,()=>{rolls++;return .099;});
  assert.equal(rolls,0,'retired root pouches do not recover into the new tree');assert.equal(returned.expeditions.coins,180);assert.ok(!returned.expeditions.drops[0].recovered);assert.notEqual(returned.createdAt,out.world.createdAt);
  returned=a.enterExpedition(returned,'0',()=>{rolls++;return 0;});assert.equal(rolls,0,'same return/reload cannot reroll or duplicate recovered money');
  const max=a.settleMove(w,b,lost,()=>.99999);
  assert.equal(max.world.expeditions.coins,0,'maximum loss is 100%');assert.equal(max.world.expeditions.bank,500);
  const miss=a.continueAfterLoss(max.world,()=>.1);
  assert.equal(miss.expeditions.coins,0,'10% threshold is exclusive');
  let missRolls=0;a.enterExpedition(miss,'0',()=>{missRolls++;return 0;});assert.equal(missRolls,0,'failed recovery cannot be rerolled by map hopping');
  // Complete a real five-stop route, including multiple boss phases.
  w=boardStop(begin(branch.newWorld()));
  w=completeBoard(w);assert.equal(a.routeFor(w).cursor,1);assert.ok(w.expeditions.coins>0);
  w=a.finishStop(a.chooseStop(w,'event'),'gift');assert.equal(w.expeditions.surveyCharges,2);
  w=a.equipItem(w,'survey');assert.equal(w.expeditions.active.length,2);
  w=boardStop(w,'danger');w=completeBoard(w);
  w=a.chooseStop(w,'bank');const earned=w.expeditions.coins;
  w=a.bankCoins(w,'deposit');assert.equal(w.expeditions.coins,0);assert.equal(w.expeditions.bank,earned);
  w=a.finishStop(w);w=a.chooseStop(w,'boss');
  assert.match(a.phaseDescription(w),/Phase 1 \/ 2/);
  w=a.startEncounter(w);w=completeBoard(w);
  assert.equal(a.stopFor(w).phase,1);assert.equal(a.stopFor(w).board,undefined,'next phase waits for explicit start');
  assert.equal(w.areas['0'].state,'open','first boss phase must not unlock children');
  w=a.startEncounter(w);w=completeBoard(w);
  assert.ok(a.routeFor(w).complete);assert.equal(w.areas['0'].state,'cleared');
  assert.deepEqual(branch.openAreaIds(w),['0.0','0.1']);assert.equal(w.expeditions.bank,earned);
  assert.ok(a.routeFor(w).stops.every(s=>!s.board),'completed encounters do not bloat the save');
  assert.equal(a.expeditionBoard(w).status,'won','compact trophy restores the completed boss board');
  // Exhausting child tips reopens a completed expedition ancestor for replay.
  let fallback=branch.failArea(w,'0.0').world;fallback=branch.failArea(fallback,'0.1').world;
  fallback={...fallback,current:'0'};fallback=a.enterExpedition(fallback,'0');
  assert.equal(a.routeFor(fallback).complete,false);
  assert.equal(a.routeFor(fallback).cursor,0);
  assert.equal(a.routeFor(fallback).attempt,1);
  assert.deepEqual(fallback.expeditions.paid,w.expeditions.paid);
  assert.equal(fallback.expeditions.bank,w.expeditions.bank);
  // Shop pricing, permanent upgrades and charges survive retries; owned items cannot be duplicated.
  let shop=begin(branch.newWorld());shop.expeditions.coins=1000;
  shop.expeditions.routes['0'].cursor=1;shop=a.chooseStop(shop,'shop');
  shop=a.buyItem(shop,'survey');assert.equal(shop.expeditions.surveyCharges,2);
  shop=a.buyItem(shop,'purse');shop=a.buyItem(shop,'boots');shop=a.buyItem(shop,'charm');
  for(const id of ['purse','boots','charm'])shop=a.equipItem(shop,id);
  assert.equal(shop.expeditions.passive.length,3);assert.equal(a.priceFor(shop,'totem'),48);
  for(let n=0;n<4;n++)shop=a.buyItem(shop,'pouch-upgrade');
  assert.equal(shop.expeditions.inventory['pouch-upgrade'],3);
  const coins=shop.expeditions.coins;shop=a.buyItem(shop,'purse');assert.equal(shop.expeditions.coins,coins);
  shop=a.finishStop(shop);const outside=shop.expeditions.bank;shop=a.bankCoins(shop,'deposit');assert.equal(shop.expeditions.bank,outside,'no banking outside shelter');
  // Replay ledger stops reward and event farming.
  let replay=boardStop(begin(branch.newWorld()));replay=completeBoard(replay);
  const balance=replay.expeditions.coins;
  replay.expeditions.routes['0'].cursor=0;replay.expeditions.routes['0'].stops[0].board=undefined;replay=a.startEncounter(replay);a.stopFor(replay).variant=undefined;replay=completeBoard(replay);
  assert.equal(replay.expeditions.coins,balance,'replaying a paid board gives no extra money');
  replay=a.finishStop(a.chooseStop(replay,'event'),'coins');const gift=replay.expeditions.coins;
  replay.expeditions.routes['0'].cursor=1;replay=a.finishStop(replay,'coins');assert.equal(replay.expeditions.coins,gift,'event gift is once per stop');
  // All three boss rules have real, distinct phase mechanics.
  for(let boss=0;boss<3;boss++){
    let test=begin(branch.newWorld()),r=a.routeFor(test);r.cursor=r.stops.length-1;r.boss=boss;
    test=a.chooseStop(test,'boss');a.stopFor(test).phase=1;
    const rules=a.rulesFor(test);
    if(boss===0)assert.ok(rules.noFlags);if(boss===1)assert.equal(rules.fog,.5);if(boss===2)assert.ok(rules.noChord&&rules.halfFlags);
  }
  const storage=new Map();globalThis.localStorage={getItem:k=>storage.get(k)??null,setItem:(k,v)=>storage.set(k,v)};
  branch.saveWorld(w);const loaded=branch.loadWorld();assert.deepEqual(loaded.expeditions,JSON.parse(JSON.stringify(w.expeditions)),'same storage key preserves inventory, bank, routes and reward ledger');
  console.log('Branch adventure engine passed: growth, real board/boss clears, starter equipment, totems, 10–100% losses, protected bank, exact 10% recovery, no reload rerolls, shops, equipment, upgrades, anti-farming and persistence.');
}finally{rmSync(dir,{recursive:true,force:true});}
