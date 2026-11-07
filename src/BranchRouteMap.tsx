import {useEffect,useRef,useState} from 'react';
import type {BranchWorld} from './branch';
import type {BoardState} from './game';
import BranchExpeditionPanel from './BranchExpeditionPanel';
import type {ExpeditionAction} from './BranchExpeditionPanel';
import {BOSSES,routeFor,variantFor} from './branchAdventure';
import type {StopKind} from './branchAdventure';

/** Original inline vector icons: no external fonts, art downloads or image dependencies. */
export function RouteIcon({kind,size=32}:{kind:StopKind|'limb';size?:number}) {
  return <svg width={size} height={size} viewBox="0 0 40 40" fill="none" stroke="currentColor" strokeWidth="2.1" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
    {kind==='board'&&<><path d="M7 9h26v24H7zM7 17h26M7 25h26M15 9v24M24 9v24"/><path d="m24 3 3 4-3 4-3-4z" fill="currentColor" stroke="none"/></>}
    {kind==='danger'&&<><path d="m20 5 16 29H4z"/><path d="M20 14v9M20 28h.01" strokeWidth="3.5"/><path d="m5 7 5 3M35 7l-5 3"/></>}
    {kind==='event'&&<><path d="M9 8h23v21H21l-9 7v-7H7V8z"/><path d="M16 14c1-5 11-4 10 1 0 4-6 3-6 7M20 26h.01" strokeWidth="2.7"/><path d="m3 3 2 2M35 3l-2 2"/></>}
    {kind==='shop'&&<><path d="M7 18v16h26V18M5 18l4-12h22l4 12c-3 4-7 4-10 0-3 4-7 4-10 0-3 4-7 4-10 0ZM15 7l-1 11M25 7l1 11M16 34V24h9v10"/><path d="M9 3h22"/></>}
    {kind==='bank'&&<><path d="m4 13 16-9 16 9ZM7 16v15M15 16v15M25 16v15M33 16v15M4 35h32M7 31h26"/><circle cx="20" cy="10" r="1.5" fill="currentColor" stroke="none"/></>}
    {kind==='boss'&&<><path d="m8 9 6 4 6-8 6 8 6-4-2 12H10z"/><path d="M11 22v8l9 7 9-7v-8M16 26h.01M24 26h.01M16 31h8" strokeWidth="3"/><path d="M4 3 1 1M36 3l3-2"/></>}
    {kind==='limb'&&<><path d="M11 34V16c0-8 13-3 13-12M11 24c0-10 20-2 20-13"/><circle cx="11" cy="34" r="3"/><circle cx="24" cy="4" r="3"/><circle cx="31" cy="10" r="3"/></>}
  </svg>;
}
const LABEL:Record<StopKind,string>={board:'Minefield',danger:'Danger route',event:'Trailkeeper',shop:'Trading post',bank:'Bank shelter',boss:'Boss gate'};
interface Props {world:BranchWorld;game:BoardState;act:(action:ExpeditionAction,value?:string)=>void;onClose:()=>void;onTree:()=>void;onContinue:()=>void}
export default function BranchRouteMap({world,game,act,onClose,onTree,onContinue}:Props) {
  const route=routeFor(world),pending=world.expeditions?.pendingLoss;
  const viewport=useRef<HTMLDivElement>(null),close=useRef<HTMLButtonElement>(null),dialog=useRef<HTMLDivElement>(null);
  const [zoom,setZoom]=useState(1);
  useEffect(()=>{const previous=document.activeElement as HTMLElement|null;close.current?.focus();return()=>previous?.focus();},[]);
  useEffect(()=>{if(viewport.current&&route)viewport.current.scrollLeft=Math.max(0,(90+route.cursor*155)*zoom-viewport.current.clientWidth/2);},[route?.cursor,zoom]);
  const count=route?.stops.length??5,width=Math.max(880,count*155+70),height=390;
  const nodes=route?.stops.flatMap((stop,index)=>stop.options.map((kind,lane)=>({kind,index,lane,x:90+index*155,y:stop.options.length===1?190:lane===0?105:275,chosen:stop.kind===kind,done:route.complete||index<route.cursor,available:!pending&&!world.expeditions?.reward&&!route.complete&&index===route.cursor&&(!stop.kind||stop.kind===kind)})))??[];
  const edgeList=nodes.flatMap(node=>nodes.filter(n=>n.index===node.index+1).map(next=>({node,next,visited:node.chosen&&next.chosen&&node.index<route!.cursor})));
  const current=route?.stops[route.cursor];
  return <div className="modal-backdrop route-map-backdrop" onClick={onClose}><div className={`route-map-modal ${world.expeditions?.reward?'has-reward':''}`} role="dialog" aria-modal="true" aria-label="Branch route map" ref={dialog} onClick={e=>e.stopPropagation()} onKeyDown={e=>{
    if(e.key==='Escape'){e.preventDefault();e.stopPropagation();onClose();}
    if(e.key==='Tab'){const all=[...(dialog.current?.querySelectorAll<HTMLElement>('button:not(:disabled),[tabindex="0"],input:not(:disabled)')??[])];const first=all[0],last=all[all.length-1];if(e.shiftKey&&document.activeElement===first){e.preventDefault();last?.focus();}else if(!e.shiftKey&&document.activeElement===last){e.preventDefault();first?.focus();}}
  }}>
    <header className="route-map-header"><div><span className="route-map-kicker">THE BRANCH ATLAS</span><h2>{pending?'A way back awaits':world.expeditions?.reward?'Choose your loot':route?`Limb ${route.area}`:'Choose your next adventure'}</h2><p>{route?`Depth ${route.depth} · ${count} stops · attempt ${route.attempt+1}`:'Select an open limb on the whole tree to continue Branch.'}</p></div><button className="route-map-close" aria-label="Close map" ref={close} onClick={onClose}>×</button></header>
    <nav className="route-map-tabs" aria-label="Map view"><span aria-current="page">Limb route</span><button onClick={onTree}><RouteIcon kind="limb" size={19}/>Whole tree</button><div className="route-map-coins">Carried <b>{world.expeditions?.coins??0}</b><i/>Banked <b>{world.expeditions?.bank??0}</b></div></nav>
    {pending&&<div className="route-return-banner" role="alert"><div><strong>{pending.protected?'Your totem protected this run.':'This limb failed, but your journey is not over.'}</strong><p>{world.expeditions?.notice}</p></div><button onClick={onContinue}>Continue to an open limb →</button></div>}
    <div className="route-map-toolbar"><span>{pending?'Continue above to unlock travel.':world.expeditions?.reward?'Choose your first-clear loot, then the next path opens.':route?.complete?'Boss defeated · new limbs await on the whole tree.':'Select a glowing node. Dim paths are not yet reachable.'}</span><div><button aria-label="Zoom out route" onClick={()=>setZoom(v=>Math.max(.6,v-.2))}>−</button><button aria-label="Reset route zoom" onClick={()=>setZoom(1)}>{Math.round(zoom*100)}%</button><button aria-label="Zoom in route" onClick={()=>setZoom(v=>Math.min(1.8,v+.2))}>+</button></div></div>
    <div className="route-map-canvas" ref={viewport}>
      <svg width={width*zoom} height={height*zoom} viewBox={`0 0 ${width} ${height}`} aria-label="Connected expedition paths" className="route-atlas">
        <defs><pattern id="atlas-grain" width="38" height="38" patternUnits="userSpaceOnUse"><path d="M0 38 38 0M28 38l10-10" stroke="#e8d8a0" strokeOpacity=".025"/><circle cx="10" cy="18" r="1" fill="#e8d8a0" fillOpacity=".055"/></pattern></defs>
        <rect width={width} height={height} fill="url(#atlas-grain)"/>
        <path d={`M20 18 Q${width/2} 2 ${width-20} 18L${width-12} ${height-20}Q${width/2} ${height+3} 20 ${height-18}Z`} fill="none" stroke="#5c6958" strokeOpacity=".35"/>
        {edgeList.map(({node,next,visited})=><path key={`${node.index}-${node.lane}-${next.lane}`} d={`M${node.x+31} ${node.y}C${node.x+85} ${node.y},${next.x-85} ${next.y},${next.x-31} ${next.y}`} className={`atlas-edge ${visited?'visited':''}`} fill="none"/>)}
        {nodes.map(n=>{
          const skipped=!!route!.stops[n.index].kind&&!n.chosen;
          return <g key={`${n.index}-${n.kind}`} role="button" aria-label={`${LABEL[n.kind]} · stop ${n.index+1}${n.available?' · available':n.done&&n.chosen?' · completed':' · locked'}`} aria-disabled={!n.available} tabIndex={n.available?0:-1} className={`atlas-node kind-${n.kind} ${n.available?'available':''} ${n.done&&n.chosen?'completed':''} ${skipped?'skipped':''} ${n.chosen?'chosen':''}`} transform={`translate(${n.x},${n.y})`} onClick={()=>{if(n.available&&!route!.stops[n.index].kind)act('choose',n.kind);}} onKeyDown={e=>{if((e.key==='Enter'||e.key===' ')&&n.available){e.preventDefault();if(!route!.stops[n.index].kind)act('choose',n.kind);}}}>
            <title>{LABEL[n.kind]}{n.kind==='boss'?` · ${BOSSES[route!.boss].name}`:''}</title><path d="M0-37 33-19 33 19 0 37-33 19-33-19Z" className="atlas-hex-shadow"/><path d="M0-31 27-16 27 16 0 31-27 16-27-16Z" className="atlas-hex"/>
            <g transform="translate(-16,-16)"><RouteIcon kind={n.kind}/></g>
            {n.done&&n.chosen&&<g transform="translate(24,-25)"><circle r="9" fill="#d9c894"/><path d="m-4 0 3 3 5-6" stroke="#15221d" strokeWidth="2" fill="none"/></g>}
            {n.available&&<circle r="43" className="atlas-active-ring"/>}
            <text y="62" textAnchor="middle" className="atlas-node-label">{LABEL[n.kind]}</text>{(n.kind==='board'||n.kind==='danger')&&<text y="79" textAnchor="middle" className="atlas-variant-label">{({crystal:'Crystal seams',surveyed:'Survey camp',bounty:'Bounty field',narrow:'Long crossing'})[route!.stops[n.index].variant??variantFor({...world,expeditions:{...world.expeditions!,routes:{...world.expeditions!.routes,[world.current]:{...route!,cursor:n.index}}}},n.kind)]}</text>}
          </g>;
        })}
        {!route&&<g transform={`translate(${width/2},180)`}><g transform="translate(-26,-40)"><RouteIcon kind="limb" size={52}/></g><text textAnchor="middle" y="40" className="atlas-empty">An uncharted limb</text><text textAnchor="middle" y="64" className="atlas-empty-sub">Open the whole tree to find your next limb.</text></g>}
      </svg>
    </div>
    <div className="atlas-legend"><span><i className="available"/>Available</span><span><i className="completed"/>Travelled</span><span><i/>Unreached</span><small>Scroll or swipe to explore · keyboard-accessible nodes</small></div>
    {!pending&&<section className="route-encounter-sheet" aria-label="Selected encounter">
      {current?.board&&['ready','playing'].includes(game.status)&&<button className="route-return-game" onClick={onClose}>Return to minefield →</button>}
      {route?.complete&&!world.expeditions?.reward&&<button className="route-return-game" onClick={onContinue}>Grow the next limb →</button>}
      {route&&!route.complete&&!world.expeditions?.reward&&!current?.kind&&<p className="atlas-select-hint">Choose one of the highlighted icons above to plan your next stop.</p>}
      <BranchExpeditionPanel world={world} game={game} act={act} mapContent onContinue={onContinue} openMap={()=>{}}/>
    </section>}
    <footer className="route-map-footer"><span>Safe banks. Risky paths. One growing tree.</span><button onClick={onClose}>Back to the board</button></footer>
  </div></div>;
}
