import {Backpack,BatteryCharging,BadgePercent,Coins,Compass,Footprints,Magnet,Package,Pickaxe,ScanEye,Shield,Sandwich} from 'lucide-react';
import type {LucideIcon} from 'lucide-react';
import type {ItemId} from './branchAdventure';
const ICONS:Record<ItemId,LucideIcon>={blast:Pickaxe,magnet:Magnet,surveyor:BatteryCharging,pathfinder:Compass,survey:ScanEye,totem:Shield,ration:Sandwich,purse:Coins,boots:Footprints,charm:BadgePercent,'pouch-upgrade':Backpack,parcel:Package};
/** Local vectors, same silhouette everywhere an item is shown; no image downloads. */
export default function BranchItemIcon({id,size=23}:{id:ItemId;size?:number}){const Icon=ICONS[id];return <span className="branch-item-icon" data-item-icon={id} aria-hidden="true"><Icon size={size} strokeWidth={1.8}/></span>;}
