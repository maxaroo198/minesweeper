import {chromium} from '@playwright/test';
import assert from 'node:assert/strict';
const browser=await chromium.launch({headless:true,args:['--no-sandbox']});
const BASE=`http://127.0.0.1:${process.env.TEST_PORT||4182}`;
try {
 const p=await browser.newPage({viewport:{width:1440,height:1100}}),errors=[];
 p.on('pageerror',e=>errors.push(e.message));await p.addInitScript(()=>{Math.random=()=>.5;});
 await p.goto(BASE,{waitUntil:'networkidle'});await p.waitForTimeout(2700);
 const world=()=>p.evaluate(()=>JSON.parse(localStorage.getItem('minefield-zen-v1')));
 const clear=async()=>{
  await p.locator('.tile').nth(40).click();let w=await world(),r=w.expeditions.routes[w.current],b=r.stops[r.cursor]?.board;
  if(b)for(const i of b.cells.flatMap((c,i)=>!c.mine?[i]:[]))if(await p.locator('.tile').nth(i).isEnabled())await p.locator('.tile').nth(i).click();
  await p.locator('.route-map-modal').waitFor();
 };
 let mobileLootChecked=false;
 const claim=async()=>{
  if(await p.locator('.branch-reward').isVisible()) {
   if(!mobileLootChecked){await p.setViewportSize({width:390,height:844});assert.equal(await p.locator('.route-map-canvas').isVisible(),false,'loot is prominent instead of below the full graph');assert.equal(await p.evaluate(()=>document.documentElement.scrollWidth>innerWidth),false);await p.screenshot({path:'.screenshots/branch-unified-loot-mobile.png',animations:'disabled'});mobileLootChecked=true;}
   const magnet=p.getByRole('button',{name:'Take Treasure Magnet',exact:true});
   if(await magnet.isVisible())await magnet.click();else await p.getByRole('button',{name:/Take \d+ coins instead/}).click();
   await p.setViewportSize({width:1440,height:1100});
  }
 };
 const advance=async()=>{await claim();};
 await p.locator('.mode-card-zen').click();
 assert.ok(await p.getByRole('dialog',{name:'Branch route map',exact:true}).isVisible(),'Branch is the route, not opt-in');
 assert.equal(await p.getByRole('button',{name:'Begin expedition in this limb',exact:true}).count(),0);
 assert.equal(await p.locator('.atlas-node').count(),7);
 await p.getByRole('button',{name:'Minefield · stop 1 · available',exact:true}).click();
 await p.getByRole('button',{name:'Enter minefield',exact:true}).click();
 await p.getByRole('button',{name:/Backpack ·/}).click();await p.getByRole('checkbox',{name:/Automatically use Return Totems/}).uncheck();await p.getByRole('button',{name:'Close backpack',exact:true}).click();
 await clear();let w=await world();assert.ok(w.expeditions.coins>=20);assert.equal(w.areas['0'].children.length,0);
 await advance();w=await world();assert.ok(w.expeditions.passive.includes('magnet'),'relic auto-equips into a free slot');
 await p.getByRole('button',{name:'Trading post · stop 2 · available',exact:true}).click();
 const shop=p.locator('.expedition-shop article').filter({has:p.getByRole('heading',{name:'Survey Lantern',exact:true})});
 await shop.getByRole('button',{name:'Buy · 30 coins',exact:true}).click();
 assert.equal((await world()).expeditions.surveyCharges,2);
 await p.getByRole('button',{name:'Close map',exact:true}).click();
 await p.getByRole('button',{name:/Backpack ·/}).click();
 await p.locator('.expedition-inventory article').filter({has:p.getByRole('heading',{name:'Survey Lantern',exact:true})}).getByRole('button',{name:'Equip',exact:true}).click();
 await p.getByRole('button',{name:'Close backpack',exact:true}).click();await p.getByRole('button',{name:'Open branch map',exact:true}).click();
 await p.getByRole('button',{name:'Leave trading post',exact:true}).click();
 await p.getByRole('button',{name:'Danger route · stop 3 · available',exact:true}).click();await p.getByRole('button',{name:'Enter minefield',exact:true}).click();
 await p.locator('.tile').nth(40).click();await p.getByRole('button',{name:'Survey Lantern · 2 charges',exact:true}).click();
 assert.ok(await p.locator('.tile.scanned').count()>0);
 w=await world();let r=w.expeditions.routes[w.current],b=r.stops[r.cursor].board;
 for(const i of b.cells.flatMap((c,i)=>!c.mine?[i]:[]))if(await p.locator('.tile').nth(i).isEnabled())await p.locator('.tile').nth(i).click();
 await p.locator('.route-map-modal').waitFor();await advance();
 await p.getByRole('button',{name:'Bank shelter · stop 4 · available',exact:true}).click();
 await p.getByRole('button',{name:'Bank all carried coins',exact:true}).click();const bank=(await world()).expeditions.bank;assert.ok(bank>0);
 await p.getByRole('button',{name:'Continue from shelter',exact:true}).click();await p.getByRole('button',{name:'Boss gate · stop 5 · available',exact:true}).click();
 await p.getByRole('button',{name:'Start announced phase 1',exact:true}).click();await clear();await advance();
 assert.match(await p.locator('.expedition-boss').innerText(),/Phase 2 \/ 2/);
 await p.getByRole('button',{name:'Start announced phase 2',exact:true}).click();await p.locator('.tile').nth(40).click();
 w=await world();r=w.expeditions.routes[w.current];b=r.stops[r.cursor].board;const beforeLoss=w.expeditions.coins;
 await p.locator('.tile').nth(b.cells.findIndex(c=>c.mine)).click();await p.locator('.result-card').waitFor();
 assert.match(await p.locator('.result-card').innerText(),/You dropped some money!/);assert.equal(await p.locator('.tile.exploded.mine-visible').count(),1);
 const carried=beforeLoss-Math.ceil(beforeLoss*.55);assert.equal((await world()).expeditions.coins,carried);assert.equal((await world()).expeditions.bank,bank);
 await p.reload({waitUntil:'networkidle'});await p.waitForTimeout(2700);await p.locator('.mode-card-zen').click();await p.locator('.result-card').waitFor();
 await p.getByRole('button',{name:'See the board',exact:true}).click();await p.locator('.expedition-hud').getByRole('button',{name:'Continue after the mine hit',exact:true}).click();
 assert.equal((await world()).expeditions.pendingLoss,undefined);
 assert.notEqual((await world()).createdAt,w.createdAt,'root failure replaces the overall tree');
 assert.equal((await world()).expeditions.bank,bank);
 // Walk a freshly generated route rather than assuming the failed route is reused.
 for(let step=0;step<24;step++){
  await claim();const current=await world(),route=current.expeditions.routes[current.current];if(route.complete)break;
  const stop=route.stops[route.cursor];
  if(!stop.kind){const kind=['board','danger','shop','bank','event','boss'].find(k=>stop.options.includes(k));const label={board:'Minefield',danger:'Danger route',shop:'Trading post',bank:'Bank shelter',event:'Trail event',boss:'Boss gate'}[kind];await p.getByRole('button',{name:`${label} · stop ${route.cursor+1} · available`,exact:true}).click();continue;}
  if(['board','danger','boss'].includes(stop.kind)){await p.getByRole('button',{name:stop.kind==='boss'?`Start announced phase ${stop.phase+1}`:'Enter minefield',exact:true}).click();await clear();}
  else if(stop.kind==='shop')await p.getByRole('button',{name:'Leave trading post',exact:true}).click();
  else if(stop.kind==='bank')await p.getByRole('button',{name:'Continue from shelter',exact:true}).click();
  else throw new Error('Combat-preferred generator unexpectedly forced an event');
 }
 await claim();
 assert.ok((await world()).expeditions.routes['0'].complete);
 await p.getByRole('button',{name:'Grow the next limb →',exact:true}).click();
 w=await world();assert.equal(w.current,'0.0');assert.ok(w.expeditions.routes['0.0'],'new limbs automatically use the unified flow');assert.equal(w.expeditions.bank,bank);
 await p.getByRole('button',{name:'Close map',exact:true}).click();await p.setViewportSize({width:390,height:844});await p.getByRole('button',{name:/Backpack ·/}).click();
 assert.equal(await p.evaluate(()=>document.documentElement.scrollWidth>innerWidth),false);assert.deepEqual(errors,[]);
 console.log('Unified Branch UI passed: no opt-in/bypass, crystal clear, relic draft/auto-equip, shop, charged skill, banking, phased boss, saved loss, freshly generated root route, automatic child route, mobile kit.');
}finally{await browser.close();}
