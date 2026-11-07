import { useEffect, useState } from 'react';
import type { BoardState } from './game';
import type { BranchWorld } from './branch';
import { BOSSES, ITEMS, ITEM, phaseDescription, phaseCount, encounterDescription, priceFor, routeFor, stopFor, backpackItems, eventFor } from './branchAdventure';
import type { ItemId, StopKind } from './branchAdventure';
import BranchBank from './BranchBank';
import BranchBackpack,{ItemInfo,PassiveItems} from './BranchBackpack';
export type ExpeditionAction = 'reward'|'choose'|'start'|'leave'|'gift'|'coins'|'buy'|'deposit'|'withdraw'|'equip'|'protect'|'ration'|'ability'|'discard'|'recover'|'deliver';
const LABEL:Record<StopKind,string>={board:'Minefield',danger:'Danger route',event:'Trail event',shop:'Trading post',bank:'Bank shelter',boss:'Boss gate'};
interface Props {world:BranchWorld;game:BoardState;act:(action:ExpeditionAction,value?:string,replace?:ItemId[])=>void;mapContent?:boolean;openMap:()=>void;onContinue:()=>void}
export default function BranchExpeditionPanel({world,game,act,mapContent=false,openMap,onContinue}:Props) {
  const [inventoryOpen,setInventoryOpen]=useState(false);
  const state=world.expeditions,route=routeFor(world),stop=stopFor(world);
  const bag=backpackItems(world),bagKey=bag.join(','),[replace,setReplace]=useState<number[]>([]);
  useEffect(()=>setReplace([]),[bagKey,route?.cursor,world.current]);
  const selected=replace.map(i=>bag[i]).filter(Boolean);
  const take=(action:ExpeditionAction,value?:string)=>act(action,value,selected);
  const event=eventFor(stop?.event,world);
  const replacement=<details className="loot-replacement"><summary>Full backpack? Choose stored items to replace permanently</summary><p>Only removed if needed and the new items fit. Failed purchases remove nothing. Each checked item is one space. Equipped items cannot be replaced here.</p>{bag.map((id,i)=><label key={i}><input type="checkbox" checked={replace.includes(i)} onChange={()=>setReplace(v=>v.includes(i)?v.filter(n=>n!==i):[...v,i])}/>{ITEM[id].name} · space {i+1}</label>)}</details>;
  const pending=state?.pendingLoss;
  const boss=route?BOSSES[route.boss]:null;
  return <section className={`expedition-panel ${mapContent?'expedition-map-content':'expedition-hud'}`} aria-label="Branch expedition">
    <div className="expedition-heading"><div><div className="eyebrow">BRANCH · YOUR JOURNEY</div><h3>{route?`Limb ${route.area} · depth ${route.depth}`:'A little adventure in every limb.'}</h3></div>{<button className="secondary-button" aria-expanded={inventoryOpen} onClick={()=>setInventoryOpen(v=>!v)}>Backpack · {bag.length}/6 · {state?.active.length??0}/2 active · {state?.passive.length??0}/3 passive</button>}</div>
    <div className="expedition-wallet"><span>Carried <b>{state?.coins??0}</b></span><span>Banked <b>{state?.bank??0}</b> · safe</span><span>Totems <b>{state?.inventory.totem??0}</b></span></div>
    {mapContent&&<button className="secondary-button" onClick={()=>setInventoryOpen(true)}>Open backpack · {bag.length}/6</button>}
    <PassiveItems world={world}/>
    {state?.notice && (mapContent || pending) && <p className={`expedition-notice ${pending&&!pending.protected?'money-drop':''}`} role="status">{state.notice}</p>}
    {pending && <button className="primary-button expedition-persistent-return" onClick={onContinue}>Continue after the mine hit</button>}
    {mapContent && state?.reward && <div className="branch-reward" aria-label="Choose a relic reward"><div className="eyebrow">FIRST-CLEAR LOOT · CHOOSE ONE</div><h3>Build something powerful.</h3><p>Take one item, or take coins. Equipment stays with you across limbs. A free equipment slot equips your pick immediately; otherwise it uses backpack space. A full backpack can permanently replace selected stored items.</p>{replacement}<div className="expedition-shop">{state.reward.options.map(id=><article key={id}><span className="eyebrow">{ITEM[id].kind}</span><h4>{ITEM[id].name}</h4><p>{ITEM[id].description}</p><button className="primary-button" onClick={()=>take('reward',id)}>Take {ITEM[id].name}</button></article>)}</div><button className="secondary-button" onClick={()=>act('reward','coins')}>Take {state.reward.coins} coins instead</button></div>}
    {!mapContent && !pending && (!route || !stop?.board || game.status==='won') && <button className="secondary-button expedition-open-map" onClick={openMap}>{state?.reward?'Choose your reward →':'Choose your path on the map →'}</button>}
    {route?.prepared&&<p className="event-modifier">Next combat: {route.prepared.label}</p>}
    {mapContent && route && !route.complete && !pending && !state?.reward && stop && <div className="expedition-stop">
      <div className="expedition-stop-title"><h4>Stop {route.cursor+1} of {route.stops.length} · {stop.kind?(stop.kind==='event'?event.name:LABEL[stop.kind]):'Choose your path'}</h4><span>Attempt {route.attempt+1} · progress saved</span></div>
      {(stop.kind==='board'||stop.kind==='danger') && <p className="branch-preview">{encounterDescription(world)}</p>}
      {stop.kind==='boss' && <div className="expedition-boss"><b>{boss!.name}</b><p>{boss!.intro}</p><p>{phaseDescription(world)}</p><p>{phaseCount(route.depth)} phases. Each must be cleared to unlock harder limbs. This first pass has 3 implemented bosses; the full 50+ twist roster is not included yet.</p></div>}
      {['board','danger','boss'].includes(stop.kind??'') && !stop.board && <button className="primary-button" onClick={()=>act('start')}>{stop.kind==='boss'?`Start announced phase ${stop.phase+1}`:'Enter minefield'}</button>}
      {stop.board && ['ready','playing'].includes(game.status) && <p className="expedition-small">Clear every safe tile to advance. Coins and cooldown recovery pay once per board/phase in this generated route. A failed unprotected retry generates a new route.</p>}
      {stop.kind==='event' && <><p>{event.description} This event resolves once per generated route; reopening or reloading cannot pay it twice.</p>{replacement}<div className="expedition-choices">{event.choices.map((choice,i)=><button key={i} className={i?'secondary-button':'primary-button'} onClick={()=>take(i?'coins':'gift')}>{choice.label}</button>)}</div><button className="secondary-button" onClick={()=>act('leave')}>Move on without taking an offer</button></>}
      {stop.kind==='shop' && <><p>Spend carried coins. Equipment, consumables and upgrades persist between limbs.{state?.shopCoupon?" Your next purchase has a 30% voucher discount.":""}</p>{replacement}<div className="expedition-shop">{ITEMS.filter(item=>item.id!=='parcel').map(item=><article key={item.id}><span className="eyebrow">{item.kind}</span><h4>{item.name}</h4><p>{item.description}</p><button className="secondary-button" disabled={(state?.coins??0)<priceFor(world,item.id) || ((['active','passive'].includes(item.kind)&&item.id!=='survey')&&!!state?.inventory[item.id]) || (item.id==='pouch-upgrade'&&(state?.inventory[item.id]??0)>=3)} onClick={()=>take('buy',item.id)}>Buy · {priceFor(world,item.id)} coins{item.id==='pouch-upgrade'?` · level ${state?.inventory[item.id]??0}/3`:''}</button></article>)}</div><button className="primary-button" onClick={()=>act('leave')}>Leave trading post</button></>}
      {stop.kind==='bank' && <><p>Choose how much gold to protect. You can also withdraw a specific amount.</p><BranchBank carried={state?.coins??0} banked={state?.bank??0} act={act}/><div className="expedition-choices">{!!state?.inventory.parcel&&<button className="secondary-button" onClick={()=>act('deliver')}>Deliver one parcel · +60 banked coins</button>}<button className="primary-button" onClick={()=>act('leave')}>Continue from shelter</button></div></>}
    </div>}
    {!mapContent && stop?.board && !pending && <div className="branch-board-brief">{state?.notice.startsWith('Crystal ')&&<strong role="status" className="branch-cache-info">{state.notice}</strong>}<p>{stop.kind==='boss' ? phaseDescription(world) : encounterDescription(world)}</p>{stop.modifier&&<p className="event-modifier">{stop.modifier.label}</p>}{stop.variant==='bounty'||stop.variant==='narrow'?<b>Reveal actions: {stop.moves??0} / 24 for the optional bonus</b>:null}</div>}
    {mapContent && route?.complete && <p className="expedition-complete">Expedition complete. The boss is defeated and the next, harder limbs are open on your saved tree.</p>}
    {inventoryOpen&&<BranchBackpack world={world} act={act} onClose={()=>setInventoryOpen(false)}/>}

  </section>;
}

/** The only control which activates equipped tools; kept beside the board in focus mode. */
export function BranchAbilityBar({world,game,act}:Pick<Props,'world'|'game'|'act'>){
 const state=world.expeditions,stop=stopFor(world);if(!state)return null;
 return <section className="expedition-abilities" aria-label="Equipped abilities"><div className="ability-bar-heading"><b>ACTIVE TOOLS</b><span>Click to use · never automatic</span></div><div className="ability-buttons">{state.active.map(id=>{
 const status=id==='pathfinder'?(state.cooldown?`${state.cooldown} clears to recharge`:'ready'):id==='blast'?(state.blastCooldown?`${state.blastCooldown} clears to recharge`:'ready'):`${state.surveyCharges} charges`;
 const disabled=game.status!=='playing'||!stop?.board||!!state.pendingLoss||!!state.reward||(id==='pathfinder'?state.cooldown>0:id==='blast'?(state.blastCooldown??0)>0:state.surveyCharges<1);
 return <div key={id} className="item-with-info active-tool-with-info"><button className="branch-active-tool" aria-label={`${ITEM[id].name} · ${status}`} disabled={disabled} onClick={()=>act('ability',id)}><span aria-hidden="true" className="active-tool-icon">{id==='survey'?'⌕':id==='blast'?'✦':'⌁'}</span><span><strong>{ITEM[id].name}</strong><small>{status}</small></span></button><ItemInfo id={id}/></div>;
 })}{!state.active.length&&<p>Equip an active tool from your backpack.</p>}</div></section>;
}
