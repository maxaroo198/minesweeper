import {freshGame,neighbors,reveal,seededRandom,toggleFlag} from './game';
import type {BoardState} from './game';
export type ExtraMode='puzzle'|'survival';
export interface Deduction {kind:'safe'|'mine';index:number;reason:string}
export const PUZZLES=[
 {name:'Open ground',description:'Clear the board without placing flags.',rule:'flagless'},
 {name:'Mark the perimeter',description:'Correctly flag every mine. No incorrect flags may remain.',rule:'allflags'},
 {name:'One click at a time',description:'Clear the board without chording.',rule:'chordless'},
 {name:'Light touch',description:'Clear within 24 reveal actions. Flood fills count as one action.',rule:'efficient'},
 {name:'Three markers',description:'Clear while keeping at most three flags on the board.',rule:'threeflags'},
 {name:'Final deduction',description:'Clear the final position using deduction. Hints explain visible clues.',rule:'standard'},
] as const;
/** Uses only visible clues and flags: no mine-position access in deduction. */
export function deduction(board:BoardState):Deduction|null {
 const groups=board.cells.flatMap((c,i)=>{
  if(!c.revealed)return [];
  const around=neighbors(i,board.rows,board.cols),unknown=around.filter(n=>!board.cells[n].revealed&&!board.cells[n].flagged);
  const remaining=c.adjacent-around.filter(n=>board.cells[n].flagged).length;
  return unknown.length&&remaining>=0&&remaining<=unknown.length?[{unknown,remaining,origin:i}]:[];
 });
 const position=(i:number)=>`row ${Math.floor(i/board.cols)+1}, column ${i%board.cols+1}`;
 for(const g of groups){
  if(g.remaining===0)return {kind:'safe',index:g.unknown[0],reason:`The clue at ${position(g.origin)} already has all its mines flagged. Its other covered neighbors are safe.`};
  if(g.remaining===g.unknown.length)return {kind:'mine',index:g.unknown[0],reason:`The clue at ${position(g.origin)} needs ${g.remaining} more mines and has exactly ${g.unknown.length} covered neighbors. Each is a mine.`};
 }
 for(const a of groups)for(const b of groups){
  if(a.unknown.length>=b.unknown.length||!a.unknown.every(i=>b.unknown.includes(i)))continue;
  const rest=b.unknown.filter(i=>!a.unknown.includes(i)),count=b.remaining-a.remaining;
  if(count===0||count===rest.length)return {kind:count===0?'safe':'mine',index:rest[0],reason:`Compare the overlapping clues at ${position(a.origin)} and ${position(b.origin)}. The extra ${rest.length} covered cells contain ${count} mines.`};
 }
 return null;
}
export function solvedByDeduction(input:BoardState){
 let board=input;
 for(let i=0;i<input.cells.length*3;i++){
  if(board.status==='won')return true;
  const step=deduction(board);if(!step)return false;
  board=step.kind==='mine'?toggleFlag(board,step.index):reveal(board,step.index).state;
  if(board.status==='lost')return false;
 }
 return false;
}
/** Bounded, seeded generation. A board is returned only after the visible-clue solver clears it. */
export function puzzleBoard(seed:string):BoardState {
 const rows=7,cols=rows,mines=7,center=Math.floor(rows*cols/2);
 const excluded=new Set([center,...neighbors(center,rows,cols)]);
 for(let attempt=0;attempt<400;attempt++){
  const random=seededRandom(`${seed}:${attempt}`),candidates=Array.from({length:rows*cols},(_,i)=>i).filter(i=>!excluded.has(i));
  for(let i=candidates.length-1;i>0;i--){const j=Math.floor(random()*(i+1));[candidates[i],candidates[j]]=[candidates[j],candidates[i]];}
  const positions=new Set(candidates.slice(0,mines));
  let board=freshGame('custom','custom',{rows,cols,mines});
  board={...board,id:`${seed}:${attempt}`,mode:'classic',status:'playing',startedAt:Date.now(),cells:board.cells.map((c,i)=>({...c,mine:positions.has(i),adjacent:neighbors(i,rows,cols).filter(n=>positions.has(n)).length}))};
  board=reveal(board,center).state;
  if(board.status!=='won'&&solvedByDeduction(board))return board;
 }
 throw new Error('Could not verify a deduction-only board. Please try a different seed.');
}
export interface ExtraRun {version:1;kind:ExtraMode;board:BoardState;stage:number;lives:number;cleared:number;seed:number;completed:number[];hint:string;hintCell:number|null}
export function newExtraRun(kind:ExtraMode,stage=0,seed=Date.now()):ExtraRun {
 const size=9+Math.min(4,Math.floor(stage/3));
 return {version:1,kind,stage,lives:3,cleared:0,seed,completed:[],hint:'',hintCell:null,board:kind==='survival'?freshGame('custom','custom',{rows:size,cols:size,mines:Math.min(Math.floor(size*size*.25),10+stage*2)}):puzzleBoard(`puzzle-v1-${stage}`)};
}
export function extraMove(input:ExtraRun,index:number,flag=false):ExtraRun {
 const s=JSON.parse(JSON.stringify(input)) as ExtraRun,b=s.board;if(index<0||index>=b.cells.length||b.status==='lost'||b.status==='won')return s;
 const rule=s.kind==='puzzle'?PUZZLES[s.stage%PUZZLES.length].rule:'standard';
 if(flag&&rule==='flagless'){s.hint='This puzzle is flag-free. Use the revealed clues to find safe squares.';return s;}
 if(flag&&rule==='threeflags'&&!b.cells[index].flagged&&b.cells.filter(c=>c.flagged).length>=3){s.hint='This puzzle allows at most three flags at a time. Remove one before placing another.';return s;}
 if(!flag&&rule==='chordless'&&b.cells[index].revealed){s.hint='Chording is disabled for this puzzle. Reveal covered squares individually.';return s;}
 s.board=flag?toggleFlag(b,index):reveal(b,index).state;s.hint='';s.hintCell=null;
 if(rule==='allflags'){
  const complete=s.board.cells.every(c=>c.flagged===c.mine);
  if(complete)s.board={...s.board,status:'won',finishedAt:Date.now()};
  else if(s.board.status==='won')s.board={...s.board,status:'playing',finishedAt:null};
 }
 if(s.board.status==='lost'&&s.kind==='survival')s.lives=Math.max(0,s.lives-1);
 if(s.kind==='puzzle'&&s.board.status==='won'&&puzzlePassed(s)&&!s.completed.includes(s.stage))s.completed.push(s.stage);
 return s;
}
export function puzzlePassed(s:ExtraRun){return s.board.status==='won'&&(s.kind!=='puzzle'||PUZZLES[s.stage%PUZZLES.length].rule!=='efficient'||(s.board.reveals??0)<=24);}
export function nextExtra(input:ExtraRun):ExtraRun {
 if(input.board.status!=='won'||!puzzlePassed(input))return input;
 const stage=input.stage+1;
 if(input.kind==='puzzle'&&stage>=PUZZLES.length)return input;
 const next=newExtraRun(input.kind,stage,input.seed+1);
 return {...next,lives:input.lives,cleared:input.cleared+1,completed:input.completed};
}
export function retryExtra(input:ExtraRun):ExtraRun {
 if(input.kind==='survival'&&input.lives===0)return newExtraRun('survival');
 const next=newExtraRun(input.kind,input.stage,input.kind==='puzzle'?input.seed:input.seed+1);
 return {...next,lives:input.lives,cleared:input.cleared,completed:input.completed};
}
