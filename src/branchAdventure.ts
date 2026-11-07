import type { BoardState } from './game';
import { freshGame, neighbors, reveal, seededRandom } from './game';
import type { BranchWorld } from './branch';
import { boardFromArea, openAreaIds, clearArea, failArea, newWorld } from './branch';

import {EVENT_IDS,eventFor} from './branchEvents';
import type {EventId,EncounterModifier} from './branchEvents';
export {EVENT_IDS,eventFor} from './branchEvents';

export type StopKind = 'board' | 'danger' | 'event' | 'shop' | 'bank' | 'boss';
export type ItemId = 'pathfinder' | 'survey' | 'totem' | 'ration' | 'purse' | 'boots' | 'charm' | 'pouch-upgrade' | 'blast' | 'magnet' | 'surveyor' | 'parcel';
export interface Item { id: ItemId; name: string; kind: 'active' | 'passive' | 'consumable' | 'upgrade'; price: number; description: string }
export const ITEMS: Item[] = [
  {id:'parcel',name:'Courier Parcel',kind:'consumable',price:0,description:'Takes one backpack space. Deliver at a bank for 60 banked coins. Cannot be used as an active tool.'},
  {id:'blast',name:'Seam Breaker',kind:'active',price:80,description:'Safely open the unflagged safe tiles in a 3×3 patch. Recharges after 3 first-clear boards.'},
  {id:'magnet',name:'Treasure Magnet',kind:'passive',price:60,description:'Double the coins from crystal caches. Combines with a Crystal Dynamo.'},
  {id:'surveyor',name:'Crystal Dynamo',kind:'passive',price:70,description:'Each new crystal cache grants 1 Survey charge, even while Lantern is unequipped. Charges persist.'},
  { id:'pathfinder',name:'Pathfinder',kind:'active',price:60,description:'Reveal three safe covered squares (and their cascades). Recharges after 2 first-clear boards; Trail Boots reduce that to 1.' },
  { id:'survey',name:'Survey Lantern',kind:'active',price:30,description:'Mark five covered safe squares with their exact clues. Each purchase adds 2 charges. Does not reveal squares.' },
  { id:'totem',name:'Return Totem',kind:'consumable',price:60,description:'With protection enabled, absorbs one mine hit, marks that mine, and preserves this board and your money.' },
  { id:'ration',name:'Trail Ration',kind:'consumable',price:20,description:'Use from inventory to remove 1 board from both rechargeable abilities.' },
  { id:'purse',name:'Lucky Purse',kind:'passive',price:70,description:'While equipped, gain 25% extra coins from first-clear boards.' },
  { id:'boots',name:'Trail Boots',kind:'passive',price:75,description:'While equipped when Pathfinder is used, it recharges after 1 first-clear board instead of 2.' },
  { id:'charm',name:'Trader Charm',kind:'passive',price:70,description:'While equipped, shop purchases cost 20% less.' },
  { id:'pouch-upgrade',name:'Reward Pouch Upgrade',kind:'upgrade',price:85,description:'Permanently add 10% to first-clear coin rewards per level, up to 3 levels.' },
];
export const ITEM = Object.fromEntries(ITEMS.map(i=>[i.id,i])) as Record<ItemId,Item>;
export const BOSSES = [
  {id:'warden',name:'The Thorn Warden',intro:'The first phase permits flags. Later phases seal your flag tools; from phase three, chording is also sealed.'},
  {id:'storm',name:'The Mist Shepherd',intro:'Newly revealed numbered clues can vanish: 25% in phase one, 50% in phase two, then 60%. Existing visible clues stay visible.'},
  {id:'locksmith',name:'The Copper Locksmith',intro:'Chording is sealed. From phase two, you may keep only half the mine count in flags at once.'},
] as const;
export type BoardVariant = 'crystal'|'surveyed'|'bounty'|'narrow';
export interface RouteStop { options: StopKind[]; kind: StopKind | null; phase: number; board?: BoardState; bought: string[]; variant?:BoardVariant; caches?:number[]; campClues?:number[]; moves?:number; event?:EventId; modifier?:EncounterModifier; abilityUses?:number }
export interface BoardTrophy { rows:number; cols:number; mines:number[]; flags:number[]; hidden:number[]; id:string; startedAt:number|null; finishedAt:number|null }
export interface AdventureRoute { area: string; depth: number; cursor: number; stops: RouteStop[]; attempt: number; complete: boolean; boss: number; needsReroll?:boolean; prepared?:EncounterModifier; trophy?:BoardTrophy }
export interface DroppedPouch { id: string; area: string; amount: number; recovered: boolean; checkedAttempt: number; tree?:number }
export interface Expeditions {
  packVersion?:1; reserve?:Partial<Record<ItemId,number>>; treesReset?:number; shopCoupon?:number;
  version: 1; coins: number; bank: number; inventory: Partial<Record<ItemId,number>>; active: ItemId[]; passive: ItemId[];
  cooldown: number; blastCooldown?:number; reward?:{area:string;stop:number;options:ItemId[];coins:number}; surveyCharges: number; autoTotem: boolean; routes: Record<string,AdventureRoute>; paid: string[];
  drops: DroppedPouch[]; notice: string;
  pendingLoss?: { board: BoardState; returnTo: string; protected: boolean; resetTree?:boolean; failedArea?:string };
}
const clone = (world: BranchWorld): BranchWorld => JSON.parse(JSON.stringify(world));
function initialise(world: BranchWorld): Expeditions {
  const state=world.expeditions ??= { version:1,coins:0,bank:0,inventory:{pathfinder:1,totem:1},active:['pathfinder'],passive:[],cooldown:0,surveyCharges:0,autoTotem:true,routes:{},paid:[],drops:[],notice:'Starter kit: Pathfinder and one Return Totem. Banked coins are never lost.' };
  migrateBackpack(state);return state;
}
export function routeLength(depth: number) { return 9 + Math.floor(depth / 2); }
export function phaseCount(depth: number) { return 2 + Math.floor(depth / 4); }
function makeRoute(world: BranchWorld, area: string,attempt=0,oldBoss?:number): AdventureRoute {
  const depth=world.areas[area].depth,length=routeLength(depth),random=seededRandom(`expedition-${world.createdAt}-${area}-${attempt}`);
  const deck=[...EVENT_IDS];for(let i=deck.length-1;i>0;i--){const j=Math.floor(random()*(i+1));[deck[i],deck[j]]=[deck[j],deck[i]];}
  const choices:StopKind[][]=[['board','danger'],['event','danger'],['shop','board'],['event','shop'],['bank','danger']];
  const stops:RouteStop[]=Array.from({length},(_,i)=>{
    let event=deck[i%deck.length];if(event==='crossroads'&&i>=length-3)event='cartographer';
    return {options:i===0?['board']:i===length-1?['boss']:i===length-2?['bank']:attempt===0&&depth===0&&!world.expeditions?.treesReset&&i<=2?(i===1?['event','shop']:['board','danger']):[...choices[Math.floor(random()*choices.length)]],kind:null,phase:0,bought:[],event};
  });
  const boss=oldBoss===undefined?Math.floor(random()*BOSSES.length):(oldBoss+1+Math.floor(random()*(BOSSES.length-1)))%BOSSES.length;
  return {area,depth,cursor:0,stops,attempt,complete:false,boss};
}
export function runPrefix(route:AdventureRoute){return route.attempt?`${route.area}@${route.attempt}`:route.area;}
export function cacheKey(world:BranchWorld,slot:number){const route=routeFor(world);return route?`${runPrefix(route)}:${route.cursor}:cache:${slot}`:'';}
export function routeFor(world: BranchWorld | null): AdventureRoute | undefined { return world?.expeditions?.routes[world.current]; }
export function stopFor(world: BranchWorld | null): RouteStop | undefined { const route=routeFor(world);return route?.stops[route.cursor]; }
export function inExpedition(world: BranchWorld | null): boolean { const route=routeFor(world);return !!route && !route.complete; }
export function beginExpedition(input: BranchWorld): BranchWorld {
  const world=clone(input),area=world.areas[world.current];
  if(!area || area.state!=='open' || world.expeditions?.pendingLoss) return world;
  const state=initialise(world);
  state.routes[area.id] ??= makeRoute(world,area.id);
  return enterExpedition(world,area.id);
}
/** One Branch flow. Adopt old partial boards rather than resetting them. */
export function unifyBranch(input:BranchWorld):BranchWorld {
  let world=clone(input);
  if(world.expeditions)initialise(world);
  if(world.expeditions?.pendingLoss)return world;
  if(world.areas[world.current]?.state==='cleared' && !world.expeditions?.routes[world.current])world.current=openAreaIds(world)[0]??world.current;
  const area=world.areas[world.current];
  if(!area || area.state!=='open')return world;
  const existed=!!world.expeditions?.routes[world.current];
  world=beginExpedition(world);
  if(!existed && (area.mines!==null || area.flagged.length>0 || area.revealed.length>0)) {
    const route=routeFor(world)!,stop=route.stops[0];stop.kind='board';
    stop.board={...boardFromArea(world,area.id),id:`exp:${area.id}:0:0:0`};
    if(stop.board.status==='won') {
      const won=stop.board;stop.board={...won,status:'playing'};
      world=settleMove(world,stop.board,won).world;
    }
    world.expeditions!.notice='Your unfinished minefield was carried forward into this route. The revealed cells, mines and flags are unchanged.';
  }
  return world;
}
export function variantFor(world:BranchWorld,kind?:StopKind):BoardVariant {
  const r=routeFor(world);if(!r)return 'crystal';
  if(r.cursor===0&&r.depth===0&&!r.attempt&&!world.expeditions?.treesReset)return 'crystal';
  return (['crystal','surveyed','bounty','narrow'] as const)[Math.floor(seededRandom(`variant:${world.createdAt}:${r.area}:${r.attempt}:${r.cursor}:${kind??stopFor(world)?.kind}`)()*4)];
}
export function encounterDescription(world:BranchWorld,kind?:StopKind) {
  const variant=stopFor(world)?.variant??variantFor(world,kind);
  return ({crystal:'Crystal seams · marked caches are safe. Opening a new cache bursts nearby safe tiles and grants coins. Magnet doubles cache coins; Dynamo grants Lantern charges.',surveyed:'Survey camp · one-time camp supplies mark up to five safe clues after your opening. These are camp clues, not a Lantern activation.',bounty:'Bounty field · clear in 24 reveal actions for +12 coins, plus +8 if at least three mines are correctly flagged at the finish. Bonuses are optional.',narrow:'Long crossing · a rectangular field changes the geometry. Clear it in 24 reveal actions for +12 coins; there is no timer.'})[variant];
}
export function claimReward(input:BranchWorld,choice:string,replace:ItemId[]=[]):BranchWorld {
 const w=clone(input),s=w.expeditions,reward=s?.reward;if(!s||!reward)return w;
 if(choice==='coins'){s.coins+=reward.coins;s.notice=`Reward taken: +${reward.coins} carried coins.`;}
 else if(reward.options.includes(choice as ItemId)){
  if(!receiveItems(s,[choice as ItemId],replace,true))return w;
  s.notice=`Reward claimed: ${ITEM[choice as ItemId].name}. Equipped slots do not use backpack space.`;
 }else return w;
 s.reward=undefined;return w;
}
/** Recovery is rolled once per dropped pouch per failed attempt, never on render/reload. */
export function enterExpedition(input: BranchWorld, area: string, random=Math.random): BranchWorld {
  const world=clone(input),state=world.expeditions;let route=state?.routes[area];
  if(!route || !state || state.pendingLoss || world.areas[area]?.state==='locked') return world;
  world.current=area;
  if(route.needsReroll || (route.complete&&world.areas[area].state==='open')) {
    route=state.routes[area]=makeRoute(world,area,route.attempt+(route.needsReroll?0:1),route.boss);
    state.notice='Fresh route generated: new encounters, choices, minefields and boss. Your tree and kit are preserved.';
  }
  let recovered=0, checked=0;
  for(const drop of state.drops) if((drop.tree===undefined||drop.tree===world.createdAt) && drop.area===area && !drop.recovered && drop.checkedAttempt<route.attempt) {
    drop.checkedAttempt=route.attempt;checked++;
    if(random()<.1) {drop.recovered=true;state.coins+=drop.amount;recovered+=drop.amount;}
  }
  if(checked && !recovered) state.notice='You returned to this limb, but no dropped pouch was found this time (10% chance). Reopening or reloading does not reroll this return.';
  if(recovered) state.notice=`You found your dropped money! Picked up ${recovered} coins on this limb.`;
  return world;
}
export function expeditionBoard(world: BranchWorld): BoardState | undefined {
  if(world.expeditions?.pendingLoss) return world.expeditions.pendingLoss.board;
  const route=routeFor(world);
  if(route?.complete && route.trophy) {
    const t=route.trophy,base=freshGame('zen','easy'),mines=new Set(t.mines),flags=new Set(t.flags),hidden=new Set(t.hidden);
    const cells=Array.from({length:t.rows*t.cols},(_,i)=>({mine:mines.has(i),adjacent:mines.has(i)?0:neighbors(i,t.rows,t.cols).filter(n=>mines.has(n)).length,revealed:!mines.has(i),flagged:flags.has(i),exploded:false,hidden:hidden.has(i),scanned:null}));
    return {...base,cells,rows:t.rows,cols:t.cols,mines:t.mines.length,id:t.id,status:'won',startedAt:t.startedAt,finishedAt:t.finishedAt};
  }
  return route?.complete ? route.stops[route.stops.length-1].board : stopFor(world)?.board;
}
export function rulesFor(world: BranchWorld) {
  const route=routeFor(world),stop=stopFor(world);
  const boss=route ? BOSSES[route.boss] : null;
  const isBoss=stop?.kind==='boss';
  return {
    noFlags:!!stop?.modifier?.noFlags || !!(isBoss && boss?.id==='warden' && stop.phase>=1),
    noChord:!!stop?.modifier?.noChord || !!(isBoss && (boss?.id==='locksmith' || (boss?.id==='warden' && stop.phase>=2))),
    halfFlags:!!(isBoss && boss?.id==='locksmith' && stop.phase>=1),
    fog:Math.max(stop?.modifier?.fog??0,isBoss&&boss?.id==='storm'?(stop.phase===0?.25:stop.phase===1?.5:.6):0),
  };
}
export function phaseDescription(world: BranchWorld): string {
  const route=routeFor(world),stop=stopFor(world);if(!route || !stop) return '';
  const rules=rulesFor(world);
  return [`Phase ${stop.phase+1} / ${phaseCount(route.depth)}`,rules.noFlags?'No flags':'Flags allowed',rules.noChord?'No chording':'Chording allowed',rules.halfFlags?'Flag budget: half the mines':'',rules.fog?`${Math.round(rules.fog*100)}% of newly opened numbered clues become fogged`:'',`Every phase is a fresh board; depth ${route.depth} increases board size and mine density.`].filter(Boolean).join(' · ');
}
export function chooseStop(input: BranchWorld, kind: StopKind): BranchWorld {
  const world=clone(input),stop=stopFor(world);
  if(!stop || stop.kind || !stop.options.includes(kind) || (world.expeditions?.pendingLoss || world.expeditions?.reward)) return world;
  stop.kind=kind;return world;
}
export function startEncounter(input: BranchWorld): BranchWorld {
  const world=clone(input),route=routeFor(world),stop=stopFor(world);
  if(!route || !stop || stop.board || !['board','danger','boss'].includes(stop.kind??'') || (world.expeditions?.pendingLoss || world.expeditions?.reward)) return world;
  stop.modifier=stop.phase===0?route.prepared:undefined;if(stop.phase===0)route.prepared=undefined;stop.abilityUses=0;
  stop.variant=stop.kind==='boss'?undefined:variantFor(world);stop.moves=0;stop.caches=undefined;stop.campClues=undefined;
  world.expeditions!.notice=stop.kind==='boss'?phaseDescription(world):encounterDescription(world);
  const size=9+Math.min(11,Math.floor(route.depth/2));
  const density=Math.min(.26,.12+route.depth*.005)+(stop.kind==='danger'?.04:0)+(stop.kind==='boss'?Math.min(.04,stop.phase*.01):0);
  const mines=Math.floor(size*size*density);
  const cols=stop.kind!=='boss'&&stop.variant==='narrow'?Math.min(24,size+4):size;
  const board=freshGame('custom','custom',{rows:size,cols,mines:Math.floor(mines*cols/size)});
  stop.board={...board,mode:'zen',difficulty:'easy',custom:undefined,id:`exp:${runPrefix(route)}:${route.cursor}:${stop.phase}:${route.attempt}`};
  return world;
}
function nextStop(world: BranchWorld) {
  const route=routeFor(world);if(!route)return;
  route.cursor++;
  if(route.cursor>=route.stops.length) route.complete=true;
}
/** Non-combat stops cannot pay or grant gifts twice, even after a failed retry. */
export function finishStop(input:BranchWorld,choice:'leave'|'gift'|'coins'='leave',replace:ItemId[]=[]):BranchWorld {
 let world=clone(input);const state=world.expeditions,route=routeFor(world),stop=stopFor(world);
 if(!state||!route||!stop||!['shop','bank','event'].includes(stop.kind??'')||state.pendingLoss||state.reward)return world;
 if(stop.kind==='event'){
  const key=`${runPrefix(route)}:${route.cursor}:event`;
  if(choice==='leave'){if(!state.paid.includes(key))state.paid.push(key);state.notice='You passed on the event offers. No coins or items were spent.';}
  else if(!state.paid.includes(key)){
   const offer=eventFor(stop.event,world).choices[choice==='gift'?0:1];
   if(state.coins<(offer.cost??0)){state.notice='Not enough carried coins for this choice.';return world;}
   if(offer.consume&&(state.inventory[offer.consume.id]??0)<offer.consume.count){state.notice=`This choice requires ${offer.consume.count} ${ITEM[offer.consume.id].name}.`;return world;}
   if(offer.path&&(!route.stops[route.cursor+1]||route.cursor+1>=route.stops.length-2||route.stops[route.cursor+1].kind)){state.notice='There is no undecided optional stop to change. Choose a different event option.';return world;}
   const trial=clone(world),ts=trial.expeditions!;
   if(offer.consume)ts.inventory[offer.consume.id]=(ts.inventory[offer.consume.id]??0)-offer.consume.count;
   if(!receiveItems(ts,offer.items??[],replace)){state.notice=ts.notice;return world;}
   ts.coins-=(offer.cost??0);ts.coins+=(offer.coins??0);ts.surveyCharges+=(offer.charges??0);
   ts.cooldown=Math.max(0,ts.cooldown-(offer.pathRecharge??0));ts.blastCooldown=Math.max(0,(ts.blastCooldown??0)-(offer.blastRecharge??0));
   if(offer.coupon)ts.shopCoupon=offer.coupon;
   const tr=routeFor(trial)!;
   if(offer.modifier)tr.prepared=mergeModifier(tr.prepared,offer.modifier);
   if(offer.path)tr.stops[tr.cursor+1].options=offer.path==='bank'?['bank','board']:['event','danger'];
   if(offer.gamble){const win=seededRandom(`chest:${world.createdAt}:${runPrefix(route)}:${route.cursor}`)()<.65;ts.coins+=win?60:-Math.min(15,ts.coins);ts.notice=win?'Risky chest: +60 carried coins.':'Chest trap: lost up to 15 carried coins. Your bank is safe.';}
   else ts.notice=`${eventFor(stop.event,world).name}: ${offer.label}.`;
   ts.paid.push(key);world=trial;
  }else state.notice='This saved event has already paid. Reloading cannot grant it again.';
 }
 nextStop(world);return world;
}
function mergeModifier(a:EncounterModifier|undefined,b:EncounterModifier):EncounterModifier {
 if(!a)return {...b};return {...a,...b,goals:[...(a.goals??[a]),...(b.goals??[b])],label:`${a.label}; ${b.label}`,bonus:(a.bonus??0)+(b.bonus??0),clues:Math.max(a.clues??0,b.clues??0),noFlags:a.noFlags||b.noFlags,noChord:a.noChord||b.noChord,fog:Math.max(a.fog??0,b.fog??0),maxMoves:a.maxMoves===undefined?b.maxMoves:b.maxMoves===undefined?a.maxMoves:Math.min(a.maxMoves,b.maxMoves),flags:Math.max(a.flags??0,b.flags??0),noAbilities:a.noAbilities||b.noAbilities,minChords:Math.max(a.minChords??0,b.minChords??0)};
}
export function priceFor(world:BranchWorld,id:ItemId){return Math.ceil(ITEM[id].price*(world.expeditions?.passive.includes('charm')?.8:1)*(1-(world.expeditions?.shopCoupon??0)));}
export function buyItem(input:BranchWorld,id:ItemId,replace:ItemId[]=[]):BranchWorld {
 const world=clone(input),s=world.expeditions,stop=stopFor(world);if(!s||stop?.kind!=='shop'||s.pendingLoss||s.reward||id==='parcel'||!ITEM[id])return world;
 const price=priceFor(world,id),item=ITEM[id];
 if(s.coins<price){s.notice='Not enough carried coins. Bank withdrawals are available at bank stops.';return world;}
 if(['active','passive'].includes(item.kind)&&id!=='survey'&&s.inventory[id]){s.notice='You already own this item.';return world;}
 if(id==='pouch-upgrade'&&(s.inventory[id]??0)>=3){s.notice='Reward Pouch is already level 3.';return world;}
 if(!receiveItems(s,[id],replace))return world;
 s.coins-=price;s.shopCoupon=0;stop.bought.push(id);s.notice=`Bought ${item.name} for ${price} coins.`;return world;
}
export function bankCoins(input:BranchWorld,direction:'deposit'|'withdraw',amount?:number):BranchWorld {
  const world=clone(input),s=world.expeditions;if(!s || stopFor(world)?.kind!=='bank' || s.pendingLoss || s.reward)return world;
  const balance=direction==='deposit'?s.coins:s.bank,value=amount===undefined?balance:amount;
  if(!Number.isSafeInteger(value)||value<=0||value>balance){s.notice='Choose a positive whole amount within your available gold balance. Nothing was transferred.';return world;}
  if(direction==='deposit'){s.bank+=value;s.coins-=value;s.notice=`Deposited ${value} gold. Banked gold is safe from failure.`;}
  else{s.coins+=value;s.bank-=value;s.notice=`Withdrew ${value} gold. Carried gold is at risk again.`;}return world;
}
export function equipItem(input:BranchWorld,id:ItemId,swap?:ItemId):BranchWorld {
 const world=clone(input),s=world.expeditions,item=ITEM[id];if(!s||!item||!s.inventory[id]||!['active','passive'].includes(item.kind))return world;
 const slots=item.kind==='active'?s.active:s.passive,limit=item.kind==='active'?2:3;
 if(slots.includes(id)){
  if(backpackItems(world).length>=6){s.notice='Backpack full. Swap equipment with a stored item, or make room first.';return world;}
  slots.splice(slots.indexOf(id),1);s.notice=`${item.name} moved to your backpack.`;
 }else if(!backpackItems(world).includes(id))return world;
 else if(slots.length<limit){slots.push(id);s.notice=`${item.name} equipped.`;}
 else if(swap&&slots.includes(swap)){slots[slots.indexOf(swap)]=id;s.notice=`${item.name} equipped; ${ITEM[swap].name} moved to the freed backpack space.`;}
 else s.notice=`All ${limit} ${item.kind} slots are filled. Choose which equipped item to swap.`;
 return world;
}
export function toggleProtection(input:BranchWorld):BranchWorld {const w=clone(input);if(w.expeditions)w.expeditions.autoTotem=!w.expeditions.autoTotem;return w;}
export function useRation(input:BranchWorld):BranchWorld {const w=clone(input),s=w.expeditions;if(!s || s.pendingLoss || s.reward || !s.inventory.ration || (!s.cooldown&&!s.blastCooldown))return w;s.inventory.ration--;s.cooldown=Math.max(0,s.cooldown-1);s.blastCooldown=Math.max(0,(s.blastCooldown??0)-1);s.notice='Trail ration used: both rechargeable abilities reduced by 1 board.';return w;}

export interface MoveOutcome { world:BranchWorld; board:BoardState; notice:string }
/** One atomic settlement owns loss penalties, rewards and boss phase progression. */
export function settleMove(input:BranchWorld,previous:BoardState,board:BoardState,random=Math.random):MoveOutcome {
  if(board===previous)return {world:input,board,notice:''};
  let world=clone(input);const s=world.expeditions,route=routeFor(world),stop=stopFor(world);
  if(!s || !route || !stop || !stop.board || stop.board.id!==board.id || s.pendingLoss || s.reward || stop.board.status==='won')return {world:input,board:previous,notice:''};
  stop.moves=(stop.moves??0)+1;
  let cacheNotice='',cacheCoins=0,cacheCount=0,cacheCharges=0;
  if(board.status!=='lost' && stop.kind!=='boss') {
    const variant=stop.variant;
    if((variant==='surveyed'||stop.modifier?.clues) && previous.status==='ready' && !s.paid.includes(`${runPrefix(route)}:${route.cursor}:camp`)) {
      const safe=board.cells.flatMap((c,i)=>!c.mine&&!c.revealed&&!c.flagged?[i]:[]).slice(0,Math.max(variant==='surveyed'?5:0,stop.modifier?.clues??0));
      stop.campClues=safe;s.paid.push(`${runPrefix(route)}:${route.cursor}:camp`);
    }
    if(variant==='crystal') {
      if(!stop.caches) {
        const safe=board.cells.flatMap((c,i)=>!c.mine&&!c.revealed&&!c.flagged?[i]:[]);
        const randomCache=seededRandom(`caches:${board.id}`);
        for(let i=safe.length-1;i>0;i--){const j=Math.floor(randomCache()*(i+1));[safe[i],safe[j]]=[safe[j],safe[i]];}
        stop.caches=safe.slice(0,3);
      }
      // Each cache pays once per saved stop, even when a retry reshuffles mines.
      for(let pass=0;pass<3;pass++)for(let slot=0;slot<stop.caches.length;slot++) {
        const i=stop.caches[slot],key=`${runPrefix(route)}:${route.cursor}:cache:${slot}`;
        if(board.cells[i]?.revealed && !board.cells[i].mine && !s.paid.includes(key)) {
          s.paid.push(key);const amount=s.passive.includes('magnet')?12:6;s.coins+=amount;
          if(s.passive.includes('surveyor')){s.surveyCharges++;cacheCharges++;}
          const targets=neighbors(i,board.rows,board.cols).filter(n=>!board.cells[n].mine&&!board.cells[n].flagged&&!board.cells[n].revealed);
          for(const target of targets)if(board.status==='playing')board=reveal(board,target).state;
          cacheCoins+=amount;cacheCount++;
        }
      }
    }
  }
  if(cacheCount)cacheNotice=`Crystal ${cacheCount>1?`chain ×${cacheCount}`:'cache'} · +${cacheCoins} coins! Safe seams burst.${cacheCharges?` +${cacheCharges} Lantern charge(s).`:''} `;
  const fog=rulesFor(world).fog;
  if(fog && board.status!=='lost')board={...board,cells:board.cells.map((c,i)=>({...c,hidden:c.hidden || (!previous.cells[i].revealed && c.revealed && c.adjacent>0 && random()<fog)}))};
  stop.board=board;
  if(board.status==='lost') {
    if(s.autoTotem && (s.inventory.totem??0)>0) {
      s.inventory.totem!--;
      const protectedCells=previous.cells.map((c,i)=>({...c,flagged:c.flagged || !!board.cells[i].exploded}));
      if(protectedCells.filter(c=>c.flagged).length>previous.mines) {
        const wrong=protectedCells.find(c=>c.flagged&&!c.mine);if(wrong)wrong.flagged=false;
      }
      stop.board={...previous,cells:protectedCells};
      s.notice='Return Totem broke! The marked mine is visible; Continue restores this board. You kept your money.';
      s.pendingLoss={board,returnTo:route.area,protected:true};
    } else {
      const percent=10+Math.floor(Math.max(0,Math.min(.999999999,random()))*91);
      const lost=Math.ceil(s.coins*percent/100);s.coins-=lost;
      if(lost)s.drops.push({id:`${route.area}:${route.attempt}`,area:route.area,amount:lost,recovered:false,checkedAttempt:route.attempt,tree:world.createdAt});
      s.notice=lost?`You dropped some money! Lost ${lost} coins (rolled ${percent}%, rounded up). Banked ${s.bank} coins stayed safe. On returning to this limb after a failed attempt, each lost pouch has a 10% recovery chance.`:'The limb locked. You had no carried money to drop; your bank is safe.';
      const failure=failArea(world,route.area);world={...failure.world,current:failure.next};
      route.attempt++;route.cursor=0;route.complete=false;route.needsReroll=true;
      for(const node of route.stops){node.board=undefined;node.phase=0;}
      s.pendingLoss={board,returnTo:failure.next,protected:false,resetTree:route.area==='0',failedArea:route.area};
      s.notice+=route.area==='0'?' Continue will generate a new overall tree; your remaining money, bank and kit stay saved.':' On retry, this limb will have a newly generated route and boss.';
    }
  } else if(board.status==='won') {
    const key=`${runPrefix(route)}:${route.cursor}:${stop.phase}:board`;
    if(!s.paid.includes(key)) {
      s.paid.push(key);
      const base=(stop.kind==='boss'?45:stop.kind==='danger'?35:20)+route.depth*3;
      const amount=Math.floor(base*(1+(s.passive.includes('purse')?.25:0)+(s.inventory['pouch-upgrade']??0)*.1));
      const bonus=(stop.variant==='bounty'||stop.variant==='narrow')&&(stop.moves??0)<=24?12:0;
      const flags=stop.variant==='bounty'&&board.cells.filter(c=>c.mine&&c.flagged).length>=3?8:0;
      const m=stop.modifier;
      const eventBonus=(m?(m.goals??[m]):[]).reduce((sum,goal)=>{
        const passed=(goal.maxMoves===undefined||(stop.moves??0)<=goal.maxMoves)&&(goal.flags===undefined||board.cells.filter(c=>c.mine&&c.flagged).length>=goal.flags)&&(!goal.noAbilities||!(stop.abilityUses??0))&&(goal.minChords===undefined||board.chords>=goal.minChords);
        return sum+(passed?(goal.bonus??0):0);
      },0);
      s.coins+=amount+bonus+flags+eventBonus;s.cooldown=Math.max(0,s.cooldown-1);s.blastCooldown=Math.max(0,(s.blastCooldown??0)-1);
      s.notice=`First clear: +${amount} coins${bonus?` · swift clear +${bonus}`:''}${flags?' · mine bounty +8':''}${eventBonus?` · event goal +${eventBonus}`:''}.`;
      if((route.cursor===0||stop.kind==='danger'||(stop.kind==='boss'&&stop.phase+1===phaseCount(route.depth)))&&!s.reward) {
        const pool=((route.cursor===0&&route.depth===0?['magnet','surveyor','blast']:['magnet','surveyor','blast','purse','boots','charm','survey']) as ItemId[]).filter(id=>!s.inventory[id]);
        if(!pool.length)pool.push('totem','ration','survey');
        const randomGift=seededRandom(`relic:${runPrefix(route)}:${route.cursor}:${world.createdAt}`);
        for(let i=pool.length-1;i>0;i--){const j=Math.floor(randomGift()*(i+1));[pool[i],pool[j]]=[pool[j],pool[i]];}
        s.reward={area:route.area,stop:route.cursor,options:pool.slice(0,3),coins:15+route.depth*2};
      }
    } else s.notice='Board cleared again. First-clear rewards and cooldown recharge cannot be farmed.';
    if(stop.kind==='boss' && stop.phase+1<phaseCount(route.depth)){stop.phase++;stop.board=undefined;s.notice+=' Next boss phase is announced before you start.';}
    else {
      // Retain only the current combat board. Finished routes store a compact
      // trophy rather than every full cell object from every encounter.
      stop.board=undefined;nextStop(world);
      if(route.complete){
        route.trophy={rows:board.rows,cols:board.cols,mines:board.cells.flatMap((c,i)=>c.mine?[i]:[]),flags:board.cells.flatMap((c,i)=>c.flagged?[i]:[]),hidden:board.cells.flatMap((c,i)=>c.hidden?[i]:[]),id:board.id,startedAt:board.startedAt,finishedAt:board.finishedAt};
        world=clearArea(world,route.area);s.notice+=' Boss defeated! Harder limbs are now open.';
      }
    }
  }
  if(cacheNotice && board.status!=='lost')s.notice=cacheNotice+(board.status==='won'?s.notice:'');
  return {world,board,notice:s.notice};
}
export function saveBoard(input:BranchWorld,board:BoardState):BranchWorld {const w=clone(input),stop=stopFor(w);if(stop?.board?.id===board.id && !w.expeditions?.pendingLoss)stop.board=board;return w;}
export function continueAfterLoss(input:BranchWorld,random=Math.random):BranchWorld {
  const world=clone(input),s=world.expeditions;if(!s?.pendingLoss)return world;
  const area=s.pendingLoss.returnTo;
  if(s.pendingLoss.resetTree&&!s.pendingLoss.protected){
    for(const drop of s.drops)drop.tree??=world.createdAt;
    const fresh=newWorld();fresh.createdAt=Math.max(Date.now(),world.createdAt+1);fresh.expeditions={...s,routes:{},paid:[],reward:undefined,pendingLoss:undefined,treesReset:(s.treesReset??0)+1,notice:'A new tree was generated after root failure. Remaining carried coins, bank, backpack, equipment and charges are preserved.'};
    return unifyBranch(fresh);
  }
  // Clues bought by an active tool do not silently reappear after a mine hit.
  for(const route of Object.values(s.routes))for(const stop of route.stops)if(stop.board?.id===s.pendingLoss.board.id){stop.board={...stop.board,cells:stop.board.cells.map(c=>({...c,scanned:null}))};stop.campClues=undefined;}
  s.pendingLoss=undefined;
  if(world.areas[area]?.state!=='locked')world.current=area;
  return unifyBranch(enterExpedition(world,world.current,random));
}
export function useAbility(input:BranchWorld,previous:BoardState,id:'pathfinder'|'survey'|'blast'):MoveOutcome {
  const world=clone(input),s=world.expeditions,stop=stopFor(world);
  if(!s || !s.active.includes(id) || previous.status!=='playing' || stop?.board?.id!==previous.id || s.pendingLoss || s.reward)return {world:input,board:previous,notice:'Equip the ability and open this board first.'};
  const safe=previous.cells.flatMap((c,i)=>!c.mine && !c.revealed && !c.flagged?[i]:[]);
  if(!safe.length)return {world:input,board:previous,notice:'No unflagged safe square is available.'};
  if(id==='pathfinder') {
    if(s.cooldown)return {world:input,board:previous,notice:`Pathfinder needs ${s.cooldown} first-clear board(s) to recharge.`};
    s.cooldown=s.passive.includes('boots')?1:2;
    stop.abilityUses=(stop.abilityUses??0)+1;
    let board=previous;for(const i of safe.slice(0,stop.modifier?.pathfinderPower??3))if(board.status==='playing')board=reveal(board,i).state;
    return settleMove(world,previous,board);
  }
  if(id==='blast') {
    if(s.blastCooldown)return {world:input,board:previous,notice:`Seam Breaker needs ${s.blastCooldown} first-clear boards.`};
    stop.abilityUses=(stop.abilityUses??0)+1;const center=safe[Math.floor(safe.length/2)];let board=previous;s.blastCooldown=3;
    for(const i of [center,...neighbors(center,board.rows,board.cols)])if(board.status==='playing'&&!board.cells[i].mine&&!board.cells[i].flagged)board=reveal(board,i).state;
    return settleMove(world,previous,board);
  }
  if(s.surveyCharges<1)return {world:input,board:previous,notice:'No Survey charges. Find an event or buy a refill.'};
  const targets=safe.filter(i=>previous.cells[i].scanned===null).slice(0,stop.modifier?.surveyPower??5);
  if(!targets.length)return {world:input,board:previous,notice:'All remaining safe squares are already surveyed.'};
  stop.abilityUses=(stop.abilityUses??0)+1;s.surveyCharges--;
  const board={...previous,cells:previous.cells.map((c,i)=>targets.includes(i)?{...c,scanned:c.adjacent}:c)};
  stop.board=board;s.notice='Survey Lantern marked up to five safe clues. It did not move or reveal mines.';
  return {world,board,notice:s.notice};
}

export const BACKPACK_CAPACITY=6;
/** Inventory totals include the equipped copy; permanent upgrades and charges aren't objects. */
export function backpackItems(world:BranchWorld):ItemId[]{return packItems(world.expeditions);}
function packItems(s:Expeditions|undefined):ItemId[]{
 if(!s)return [];return ITEMS.flatMap(item=>item.kind==='upgrade'?[]:Array.from({length:Math.max(0,Math.floor(s.inventory[item.id]??0)-(s.active.includes(item.id)||s.passive.includes(item.id)?1:0))},()=>item.id));
}
function migrateBackpack(s:Expeditions){
 if(s.packVersion===1)return;
 s.active=s.active.filter((id,i,a)=>ITEM[id]?.kind==='active'&&(s.inventory[id]??0)>0&&a.indexOf(id)===i).slice(0,2);
 s.passive=s.passive.filter((id,i,a)=>ITEM[id]?.kind==='passive'&&(s.inventory[id]??0)>0&&a.indexOf(id)===i).slice(0,3);
 for(const r of Object.values(s.routes))if(r.attempt>0&&r.cursor===0&&!r.complete&&!r.stops.some(stop=>stop.board)&&r.stops.some(stop=>stop.kind))r.needsReroll=true;
 const pending=s.pendingLoss;if(pending&&!pending.protected&&pending.resetTree===undefined){const area=pending.board.id.split(':')[1]?.split('@')[0];if(area){pending.failedArea=area;pending.resetTree=area==='0';if(s.routes[area])s.routes[area].needsReroll=true;}}
 const surplus=packItems(s).slice(6);s.reserve??={};
 for(const id of surplus){s.inventory[id]=(s.inventory[id]??0)-1;s.reserve[id]=(s.reserve[id]??0)+1;}
 if(surplus.length)s.notice=`Your old kit was preserved: ${surplus.length} surplus items are in legacy bank storage. Collect them at any bank when there is space.`;
 s.packVersion=1;
}
/** All-or-nothing receipt: failed capacity checks never spend money, remove swaps or clear rewards. */
function receiveItems(s:Expeditions,items:ItemId[],replace:ItemId[]=[],autoEquip=false):boolean {
 const attempt=(swaps:ItemId[])=>{
  const t={...s,inventory:{...s.inventory},active:[...s.active],passive:[...s.passive]};
  for(const id of swaps){if(!packItems(t).includes(id))return null;t.inventory[id]=(t.inventory[id]??0)-1;}
  for(const id of items){
   const item=ITEM[id];if(!item)return null;
   if(item.kind==='upgrade'){if((t.inventory[id]??0)>=3)return null;t.inventory[id]=(t.inventory[id]??0)+1;continue;}
   if(id==='survey'&&(t.inventory.survey??0)>0){t.surveyCharges+=2;continue;}
   const slots=item.kind==='active'?t.active:t.passive,limit=item.kind==='active'?2:3;
   const canEquip=['active','passive'].includes(item.kind)&&!slots.includes(id)&&slots.length<limit;
   if(canEquip&&(autoEquip||packItems(t).length>=6))slots.push(id);
   else if(packItems(t).length>=6)return null;
   t.inventory[id]=(t.inventory[id]??0)+1;if(id==='survey')t.surveyCharges+=2;
  }
  return t;
 };
 const result=attempt([])??(replace.length?attempt(replace):null);
 if(!result){s.notice='Backpack full: six individual items maximum. Equip something, select enough backpack items to replace, or choose coins/another option. Nothing was spent or removed.';return false;}
 s.inventory=result.inventory;s.active=result.active;s.passive=result.passive;s.surveyCharges=result.surveyCharges;return true;
}
export function discardItem(input:BranchWorld,id:ItemId,reserve=false):BranchWorld {
 const w=clone(input),s=w.expeditions;if(!s||stopFor(w)?.kind!=='bank'||s.pendingLoss)return w;
 const storage=reserve?s.reserve:s.inventory;if(!storage||!(storage[id]??0)||(!reserve&&!backpackItems(w).includes(id)))return w;
 storage[id]!--;s.notice=`Permanently removed one ${ITEM[id].name}. No coins paid.`;return w;
}
export function recoverStoredItem(input:BranchWorld,id:ItemId):BranchWorld {
 const w=clone(input),s=w.expeditions;if(!s||stopFor(w)?.kind!=='bank'||s.pendingLoss||!(s.reserve?.[id]??0))return w;
 if(receiveItems(s,[id])){s.reserve![id]!--;s.notice=`Collected one ${ITEM[id].name} from legacy bank storage.`;}return w;
}
export function deliverParcel(input:BranchWorld):BranchWorld {
 const w=clone(input),s=w.expeditions;if(!s||stopFor(w)?.kind!=='bank'||s.pendingLoss||!s.inventory.parcel)return w;
 s.inventory.parcel--;s.bank+=60;s.notice='Parcel delivered: +60 banked coins, safe from failure.';return w;
}
