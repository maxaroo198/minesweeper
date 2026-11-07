import type {ItemId} from './branchAdventure';
import type {BranchWorld} from './branch';

export interface EncounterModifier {
  label:string; clues?:number; noFlags?:boolean; noChord?:boolean; fog?:number;
  bonus?:number; maxMoves?:number; flags?:number; noAbilities?:boolean; minChords?:number;
  pathfinderPower?:number; surveyPower?:number;
  goals?:Array<Pick<EncounterModifier,'bonus'|'maxMoves'|'flags'|'noAbilities'|'minChords'>>;
}
export interface EventChoice {
  label:string; cost?:number; coins?:number; items?:ItemId[]; charges?:number;
  consume?:{id:ItemId;count:number}; pathRecharge?:number; blastRecharge?:number;
  modifier?:EncounterModifier; coupon?:number; path?:'bank'|'event'; gamble?:boolean;
}
export const EVENT_IDS=['trailkeeper','shrine','chest','courier','cartographer','silent','sealed','wager','glassworks','workshop','carver','quartermaster','archivist','supplies','flagmaster','tinkerer','coupon','crossroads','chording'] as const;
export type EventId=typeof EVENT_IDS[number];
export interface BranchEvent {name:string;description:string;choices:[EventChoice,EventChoice]}
/** Each event has a different mechanical consequence, not a reskinned random payout. */
export function eventFor(id:EventId|undefined,world:BranchWorld):BranchEvent {
 const depth=world.areas[world.current]?.depth??0;
 const events:Record<EventId,BranchEvent>={
 trailkeeper:{name:'Trailkeeper',description:'Take a Lantern with two charges, or keep the gift as carried coins.',choices:[{label:'Take Survey Lantern + 2 charges',items:['survey']},{label:`Take ${25+depth*3} carried coins`,coins:25+depth*3}]},
 shrine:{name:'Roadside shrine',description:'Protection costs carried coins. Rest restores cooldowns, not spent Lantern charges.',choices:[{label:'Offer 10 coins · receive a Return Totem',cost:10,items:['totem']},{label:'Rest · fully recharge both abilities',pathRecharge:999,blastRecharge:999}]},
 chest:{name:'Sealed chest',description:'The risky compartment is 65% to pay 60 coins; otherwise it takes up to 15 carried coins. Its result is fixed for this route, including after reload.',choices:[{label:'Risk the chest · 65% +60, otherwise lose up to 15',gamble:true},{label:'Take 15 safe coins',coins:15}]},
 courier:{name:'Courier depot',description:'A parcel occupies one backpack space until you deliver it at a bank for 60 banked coins. Or take a smaller payment now.',choices:[{label:'Carry a parcel · deliver at a bank for 60',items:['parcel']},{label:'Take 12 carried coins now',coins:12}]},
 cartographer:{name:'Survey desk',description:'Prepare one-time supplied clues for your next combat, or add stored Lantern charges. Supplied clues are not active-tool uses.',choices:[{label:'Next combat · 5 supplied safe clues',modifier:{label:'Survey desk: 5 supplied clues',clues:5}},{label:'Store 2 Lantern charges',charges:2}]},
 silent:{name:'Flag-free passage',description:'Accept no manual flags on the next combat for an extra clear reward, or take coins without a restriction. A totem can still mark its mine.',choices:[{label:'Next combat · no flags, +35 on clear',modifier:{label:'Flag-free passage: no flags, +35 clear coins',noFlags:true,bonus:35}},{label:'Take 8 coins · no restriction',coins:8}]},
 sealed:{name:'Sealed tools gate',description:'Accept a no-chording restriction for the next combat, or get two supplied clues instead.',choices:[{label:'Next combat · no chording, +30 on clear',modifier:{label:'Sealed gate: no chording, +30 clear coins',noChord:true,bonus:30}},{label:'Next combat · 2 supplied safe clues',modifier:{label:'Gate survey: 2 supplied clues',clues:2}}]},
 wager:{name:'Clear-action wager',description:'Stake 20 coins on finishing your next combat within 24 reveal actions. Missing the optional goal does not fail the board. The stake is not refunded.',choices:[{label:'Stake 20 · earn +55 if next clear uses ≤24 actions',cost:20,modifier:{label:'Wager: +55 if cleared within 24 reveal actions',bonus:55,maxMoves:24}},{label:'Take 8 coins · no wager',coins:8}]},
 glassworks:{name:'Smoked-glass tunnel',description:'New numbered clues in your next combat have a 25% fog chance for an extra reward. Already visible clues never vanish. Or take a ration.',choices:[{label:'Next combat · 25% fog, +35 on clear',modifier:{label:'Smoked glass: 25% new-clue fog, +35 clear coins',fog:.25,bonus:35}},{label:'Take 1 Trail Ration',items:['ration']}]},
 workshop:{name:'Tool repair bench',description:'Choose which cooldown to shorten. This restores readiness; it never activates a tool.',choices:[{label:'Reduce Pathfinder cooldown by 2 clears',pathRecharge:2},{label:'Reduce Seam Breaker cooldown by 2 clears',blastRecharge:2}]},
 carver:{name:'Totem carver',description:'Exchange two stored rations for protection, or purchase a discounted totem. Individual consumables each use a backpack space.',choices:[{label:'Trade 2 rations · receive 1 totem',consume:{id:'ration',count:2},items:['totem']},{label:'Buy a totem for 45 coins',cost:45,items:['totem']}]},
 quartermaster:{name:'Quartermaster',description:'Choose physical supplies or a charge refill. Lantern charges do not use backpack spaces; you still need an equipped Lantern to use them.',choices:[{label:'25 coins · take 2 rations',cost:25,items:['ration','ration']},{label:'20 coins · store 4 Lantern charges',cost:20,charges:4}]},
 archivist:{name:'Unassisted-clear record',description:'Your next combat awards an extra 30 coins if you use no active tools. Tools remain usable, but using one forfeits only this bonus.',choices:[{label:'Next combat · +30 for no active-tool uses',modifier:{label:'Unassisted goal: +30 if no active tools are used',bonus:30,noAbilities:true}},{label:'Take 10 coins · no goal',coins:10}]},
 supplies:{name:'Abandoned supplies',description:'Take one totem or two rations. Protection and recharge solve different problems; rations also take twice the backpack space.',choices:[{label:'Take 1 Return Totem',items:['totem']},{label:'Take 2 Trail Rations',items:['ration','ration']}]},
 flagmaster:{name:'Mine-marking challenge',description:'Your next combat offers an optional bonus for at least three correctly flagged mines. Wrong guesses do not count. Or choose information instead.',choices:[{label:'Next combat · +30 for 3 correctly flagged mines',modifier:{label:'Marking goal: +30 with 3 correctly flagged mines',bonus:30,flags:3}},{label:'Next combat · 2 supplied safe clues',modifier:{label:'Marking survey: 2 supplied clues',clues:2}}]},
 tinkerer:{name:'Tool tuning bench',description:'Temporarily improve one tool in your next combat. It still requires a click, normal cooldown or charges, and an equipment slot.',choices:[{label:'Next combat · Pathfinder opens up to 5 safe cells',modifier:{label:'Pathfinder tuning: up to 5 safe cells per activation',pathfinderPower:5}},{label:'Next combat · Lantern marks up to 8 safe clues',modifier:{label:'Lantern tuning: up to 8 clues per charge',surveyPower:8}}]},
 coupon:{name:'Trader’s offer',description:'A voucher reduces your next shop purchase by 30%, on top of Trader Charm. It does not stack with other vouchers or occupy backpack space.',choices:[{label:'Take a one-purchase 30% shop voucher',coupon:.3},{label:'Take 12 carried coins now',coins:12}]},
 crossroads:{name:'Route survey',description:'Change the next undecided optional stop. Boss gates and the guaranteed bank shelter cannot be removed.',choices:[{label:'Next optional stop · bank or minefield',path:'bank'},{label:'Next optional stop · event or danger route',path:'event'}]},
 chording:{name:'Chording lesson',description:'Aim for two successful chords on the next combat for a bonus. If that encounter forbids chording, choose the charge refill instead.',choices:[{label:'Next combat · +30 if you use 2 successful chords',modifier:{label:'Chording goal: +30 with at least 2 chords',bonus:30,minChords:2}},{label:'Store 1 Lantern charge',charges:1}]},
 };
 return events[id??'trailkeeper']??events.trailkeeper;
}
