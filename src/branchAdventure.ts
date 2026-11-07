import type { BoardState } from './game';
import { freshGame, neighbors, reveal, seededRandom } from './game';
import type { BranchWorld } from './branch';
import { clearArea, failArea } from './branch';

export type StopKind = 'board' | 'danger' | 'event' | 'shop' | 'bank' | 'boss';
export type ItemId = 'pathfinder' | 'survey' | 'totem' | 'ration' | 'purse' | 'boots' | 'charm' | 'pouch-upgrade';
export interface Item { id: ItemId; name: string; kind: 'active' | 'passive' | 'consumable' | 'upgrade'; price: number; description: string }
export const ITEMS: Item[] = [
  { id:'pathfinder',name:'Pathfinder',kind:'active',price:35,description:'Reveal one safe covered square. Recharges after 2 first-clear boards; Trail Boots reduce that to 1.' },
  { id:'survey',name:'Survey Lantern',kind:'active',price:20,description:'Mark three covered safe squares with their exact clues. Each purchase adds 2 charges. Does not reveal squares.' },
  { id:'totem',name:'Return Totem',kind:'consumable',price:35,description:'With protection enabled, absorbs one mine hit, marks that mine, and preserves this board and your money.' },
  { id:'ration',name:'Trail Ration',kind:'consumable',price:12,description:'Use from inventory to remove 1 board of Pathfinder cooldown.' },
  { id:'purse',name:'Lucky Purse',kind:'passive',price:40,description:'While equipped, gain 25% extra coins from first-clear boards.' },
  { id:'boots',name:'Trail Boots',kind:'passive',price:45,description:'While equipped when Pathfinder is used, it recharges after 1 first-clear board instead of 2.' },
  { id:'charm',name:'Trader Charm',kind:'passive',price:40,description:'While equipped, shop purchases cost 20% less.' },
  { id:'pouch-upgrade',name:'Reward Pouch Upgrade',kind:'upgrade',price:50,description:'Permanently add 10% to first-clear coin rewards per level, up to 3 levels.' },
];
export const ITEM = Object.fromEntries(ITEMS.map(i=>[i.id,i])) as Record<ItemId,Item>;
export const BOSSES = [
  {id:'warden',name:'The Thorn Warden',intro:'The first phase permits flags. Later phases seal your flag tools; from phase three, chording is also sealed.'},
  {id:'storm',name:'The Mist Shepherd',intro:'Newly revealed numbered clues can vanish: 25% in phase one, 50% in phase two, then 60%. Existing visible clues stay visible.'},
  {id:'locksmith',name:'The Copper Locksmith',intro:'Chording is sealed. From phase two, you may keep only half the mine count in flags at once.'},
] as const;
export interface RouteStop { options: StopKind[]; kind: StopKind | null; phase: number; board?: BoardState; bought: string[] }
export interface BoardTrophy { rows:number; cols:number; mines:number[]; flags:number[]; hidden:number[]; id:string; startedAt:number|null; finishedAt:number|null }
export interface AdventureRoute { area: string; depth: number; cursor: number; stops: RouteStop[]; attempt: number; complete: boolean; boss: number; trophy?:BoardTrophy }
export interface DroppedPouch { id: string; area: string; amount: number; recovered: boolean; checkedAttempt: number }
export interface Expeditions {
  version: 1; coins: number; bank: number; inventory: Partial<Record<ItemId,number>>; active: ItemId[]; passive: ItemId[];
  cooldown: number; surveyCharges: number; autoTotem: boolean; routes: Record<string,AdventureRoute>; paid: string[];
  drops: DroppedPouch[]; notice: string;
  pendingLoss?: { board: BoardState; returnTo: string; protected: boolean };
}
const clone = (world: BranchWorld): BranchWorld => JSON.parse(JSON.stringify(world));
function initialise(world: BranchWorld): Expeditions {
  return world.expeditions ??= { version:1,coins:0,bank:0,inventory:{pathfinder:1,totem:1},active:['pathfinder'],passive:[],cooldown:0,surveyCharges:0,autoTotem:true,routes:{},paid:[],drops:[],notice:'Starter kit: Pathfinder and one Return Totem. Banked coins are never lost.' };
}
export function routeLength(depth: number) { return 5 + Math.floor(depth / 2); }
export function phaseCount(depth: number) { return 2 + Math.floor(depth / 4); }
function makeRoute(world: BranchWorld, area: string): AdventureRoute {
  const depth=world.areas[area].depth, length=routeLength(depth);
  const random=seededRandom(`expedition-${world.createdAt}-${area}`);
  const stops: RouteStop[]=Array.from({length},(_,i)=>({ options:i===0?['board']:i===length-1?['boss']:i===length-2?['bank']:i%3===1?['event','shop']:i%3===2?['board','danger']:['shop','event'],kind:null,phase:0,bought:[] }));
  return {area,depth,cursor:0,stops,attempt:0,complete:false,boss:Math.floor(random()*BOSSES.length)};
}
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
/** Recovery is rolled once per dropped pouch per failed attempt, never on render/reload. */
export function enterExpedition(input: BranchWorld, area: string, random=Math.random): BranchWorld {
  const world=clone(input),state=world.expeditions,route=state?.routes[area];
  if(!route || !state || state.pendingLoss || world.areas[area]?.state==='locked') return world;
  world.current=area;
  // A failed set of child limbs may reopen a previously completed ancestor.
  // Replay that ancestor's saved route, retaining its one-time reward ledger.
  if(route.complete && world.areas[area].state==='open') {
    route.complete=false;route.cursor=0;route.attempt++;
    for(const stop of route.stops){stop.board=undefined;stop.phase=0;}
    state.notice='This earlier limb reopened. Replay its route to regrow failed children; previously paid rewards stay claimed.';
  }
  let recovered=0, checked=0;
  for(const drop of state.drops) if(drop.area===area && !drop.recovered && drop.checkedAttempt<route.attempt) {
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
    noFlags:!!(isBoss && boss?.id==='warden' && stop.phase>=1),
    noChord:!!(isBoss && (boss?.id==='locksmith' || (boss?.id==='warden' && stop.phase>=2))),
    halfFlags:!!(isBoss && boss?.id==='locksmith' && stop.phase>=1),
    fog:isBoss && boss?.id==='storm' ? stop.phase===0?.25:stop.phase===1?.5:.6 : 0,
  };
}
export function phaseDescription(world: BranchWorld): string {
  const route=routeFor(world),stop=stopFor(world);if(!route || !stop) return '';
  const rules=rulesFor(world);
  return [`Phase ${stop.phase+1} / ${phaseCount(route.depth)}`,rules.noFlags?'No flags':'Flags allowed',rules.noChord?'No chording':'Chording allowed',rules.halfFlags?'Flag budget: half the mines':'',rules.fog?`${Math.round(rules.fog*100)}% of newly opened numbered clues become fogged`:'',`Every phase is a fresh board; depth ${route.depth} increases board size and mine density.`].filter(Boolean).join(' · ');
}
export function chooseStop(input: BranchWorld, kind: StopKind): BranchWorld {
  const world=clone(input),stop=stopFor(world);
  if(!stop || stop.kind || !stop.options.includes(kind) || world.expeditions?.pendingLoss) return world;
  stop.kind=kind;return world;
}
export function startEncounter(input: BranchWorld): BranchWorld {
  const world=clone(input),route=routeFor(world),stop=stopFor(world);
  if(!route || !stop || stop.board || !['board','danger','boss'].includes(stop.kind??'') || world.expeditions?.pendingLoss) return world;
  const size=9+Math.min(11,Math.floor(route.depth/2));
  const density=Math.min(.26,.12+route.depth*.005)+(stop.kind==='danger'?.04:0)+(stop.kind==='boss'?Math.min(.04,stop.phase*.01):0);
  const mines=Math.floor(size*size*density);
  const board=freshGame('custom','custom',{rows:size,cols:size,mines});
  stop.board={...board,mode:'zen',difficulty:'easy',custom:undefined,id:`exp:${route.area}:${route.cursor}:${stop.phase}:${route.attempt}`};
  return world;
}
function nextStop(world: BranchWorld) {
  const route=routeFor(world);if(!route)return;
  route.cursor++;
  if(route.cursor>=route.stops.length) route.complete=true;
}
/** Non-combat stops cannot pay or grant gifts twice, even after a failed retry. */
export function finishStop(input: BranchWorld, choice: 'leave'|'gift'|'coins'='leave'): BranchWorld {
  let world=clone(input);const state=world.expeditions,route=routeFor(world),stop=stopFor(world);
  if(!state || !route || !stop || !['shop','bank','event'].includes(stop.kind??'') || state.pendingLoss) return world;
  if(stop.kind==='event') {
    if(choice==='leave')return world;
    const key=`${route.area}:${route.cursor}:event`;
    if(!state.paid.includes(key)) {
      state.paid.push(key);
      if(choice==='gift') {state.inventory.survey=1;state.surveyCharges+=2;state.notice='A trailkeeper gave you a Survey Lantern and 2 charges. Equip it in inventory.';}
      else {state.coins+=25+route.depth*3;state.notice='You collected the trailkeeper’s coin gift.';}
    } else state.notice='This event has already granted its gift. No replay farming.';
  }
  nextStop(world);return world;
}
export function priceFor(world: BranchWorld,id: ItemId) {return Math.ceil(ITEM[id].price*(world.expeditions?.passive.includes('charm')?.8:1));}
export function buyItem(input: BranchWorld,id:ItemId):BranchWorld {
  const world=clone(input),s=world.expeditions,stop=stopFor(world);if(!s || stop?.kind!=='shop' || s.pendingLoss)return world;
  const item=ITEM[id],price=priceFor(world,id);
  if(s.coins<price){s.notice='Not enough carried coins. Bank withdrawals are available at bank stops.';return world;}
  if((item.kind==='passive' || id==='pathfinder') && s.inventory[id]){s.notice='You already own this item.';return world;}
  if(id==='pouch-upgrade' && (s.inventory[id]??0)>=3){s.notice='Reward Pouch is already level 3.';return world;}
  s.coins-=price;
  if(id==='survey'){s.inventory.survey=1;s.surveyCharges+=2;}else s.inventory[id]=(s.inventory[id]??0)+1;
  stop.bought.push(id);s.notice=`Bought ${item.name} for ${price} coins.`;return world;
}
export function bankCoins(input:BranchWorld,direction:'deposit'|'withdraw'):BranchWorld {
  const world=clone(input),s=world.expeditions;if(!s || stopFor(world)?.kind!=='bank' || s.pendingLoss)return world;
  if(direction==='deposit'){s.bank+=s.coins;s.coins=0;s.notice='All carried coins banked. They are safe from failure.';}
  else {s.coins+=s.bank;s.bank=0;s.notice='Bank coins withdrawn. Carried coins are at risk again.';}return world;
}
export function equipItem(input:BranchWorld,id:ItemId):BranchWorld {
  const world=clone(input),s=world.expeditions,item=ITEM[id];if(!s || !s.inventory[id] || !['active','passive'].includes(item.kind))return world;
  const slots=item.kind==='active'?s.active:s.passive,limit=item.kind==='active'?2:3;
  if(slots.includes(id))slots.splice(slots.indexOf(id),1);
  else if(slots.length<limit)slots.push(id);
  else s.notice=`All ${limit} ${item.kind} slots are filled. Unequip something first.`;
  return world;
}
export function toggleProtection(input:BranchWorld):BranchWorld {const w=clone(input);if(w.expeditions)w.expeditions.autoTotem=!w.expeditions.autoTotem;return w;}
export function useRation(input:BranchWorld):BranchWorld {const w=clone(input),s=w.expeditions;if(!s || !s.inventory.ration || !s.cooldown)return w;s.inventory.ration--;s.cooldown--;s.notice='Trail ration used: Pathfinder cooldown reduced by 1 board.';return w;}

export interface MoveOutcome { world:BranchWorld; board:BoardState; notice:string }
/** One atomic settlement owns loss penalties, rewards and boss phase progression. */
export function settleMove(input:BranchWorld,previous:BoardState,board:BoardState,random=Math.random):MoveOutcome {
  let world=clone(input);const s=world.expeditions,route=routeFor(world),stop=stopFor(world);
  if(!s || !route || !stop || !stop.board || stop.board.id!==board.id || s.pendingLoss || stop.board.status==='won')return {world:input,board:previous,notice:''};
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
      if(lost)s.drops.push({id:`${route.area}:${route.attempt}`,area:route.area,amount:lost,recovered:false,checkedAttempt:route.attempt});
      s.notice=lost?`You dropped some money! Lost ${lost} coins (rolled ${percent}%, rounded up). Banked ${s.bank} coins stayed safe. On returning to this limb after a failed attempt, each lost pouch has a 10% recovery chance.`:'The limb locked. You had no carried money to drop; your bank is safe.';
      const failure=failArea(world,route.area);world={...failure.world,current:failure.next};
      route.attempt++;route.cursor=0;route.complete=false;
      for(const node of route.stops){node.board=undefined;node.phase=0;}
      s.pendingLoss={board,returnTo:failure.next,protected:false};
    }
  } else if(board.status==='won') {
    const key=`${route.area}:${route.cursor}:${stop.phase}:board`;
    if(!s.paid.includes(key)) {
      s.paid.push(key);
      const base=(stop.kind==='boss'?45:stop.kind==='danger'?35:20)+route.depth*3;
      const amount=Math.floor(base*(1+(s.passive.includes('purse')?.25:0)+(s.inventory['pouch-upgrade']??0)*.1));
      s.coins+=amount;s.cooldown=Math.max(0,s.cooldown-1);s.notice=`First clear: +${amount} carried coins.`;
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
  return {world,board,notice:s.notice};
}
export function saveBoard(input:BranchWorld,board:BoardState):BranchWorld {const w=clone(input),stop=stopFor(w);if(stop?.board?.id===board.id && !w.expeditions?.pendingLoss)stop.board=board;return w;}
export function continueAfterLoss(input:BranchWorld,random=Math.random):BranchWorld {
  const world=clone(input),s=world.expeditions;if(!s?.pendingLoss)return world;
  const area=s.pendingLoss.returnTo;s.pendingLoss=undefined;
  if(world.areas[area]?.state!=='locked')world.current=area;
  return enterExpedition(world,world.current,random);
}
export function useAbility(input:BranchWorld,previous:BoardState,id:'pathfinder'|'survey'):MoveOutcome {
  const world=clone(input),s=world.expeditions,stop=stopFor(world);
  if(!s || !s.active.includes(id) || previous.status!=='playing' || stop?.board?.id!==previous.id || s.pendingLoss)return {world:input,board:previous,notice:'Equip the ability and open this board first.'};
  const safe=previous.cells.flatMap((c,i)=>!c.mine && !c.revealed && !c.flagged?[i]:[]);
  if(!safe.length)return {world:input,board:previous,notice:'No unflagged safe square is available.'};
  if(id==='pathfinder') {
    if(s.cooldown)return {world:input,board:previous,notice:`Pathfinder needs ${s.cooldown} first-clear board(s) to recharge.`};
    s.cooldown=s.passive.includes('boots')?1:2;
    return settleMove(world,previous,reveal(previous,safe[0]).state);
  }
  if(s.surveyCharges<1)return {world:input,board:previous,notice:'No Survey charges. Find an event or buy a refill.'};
  const targets=safe.filter(i=>previous.cells[i].scanned===null).slice(0,3);
  if(!targets.length)return {world:input,board:previous,notice:'All remaining safe squares are already surveyed.'};
  s.surveyCharges--;
  const board={...previous,cells:previous.cells.map((c,i)=>targets.includes(i)?{...c,scanned:c.adjacent}:c)};
  stop.board=board;s.notice='Survey Lantern marked up to three safe clues. It did not move or reveal mines.';
  return {world,board,notice:s.notice};
}
