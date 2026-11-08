import {useEffect,useState} from 'react';
import type {CustomConfig} from './game';
export default function CustomBoardFields({value,onChange,onValidity}:{value:CustomConfig;onChange:(v:CustomConfig)=>void;onValidity:(valid:boolean)=>void}){
 const [fields,setFields]=useState({cols:String(value.cols),rows:String(value.rows),mines:String(value.mines)});
 useEffect(()=>setFields({cols:String(value.cols),rows:String(value.rows),mines:String(value.mines)}),[value.cols,value.rows,value.mines]);
 const cols=Number(fields.cols),rows=Number(fields.rows),mines=Number(fields.mines),cells=cols*rows;
 const valid=[fields.cols,fields.rows,fields.mines].every(v=>/^\d+$/.test(v))&&Number.isSafeInteger(cols)&&Number.isSafeInteger(rows)&&Number.isSafeInteger(mines)&&Number.isSafeInteger(cells)&&cols>=1&&rows>=1&&mines>=0&&mines<cells;
 useEffect(()=>{onValidity(valid);},[valid,onValidity]);
 function change(key:keyof typeof fields,text:string){const next={...fields,[key]:text};setFields(next);const c=Number(next.cols),r=Number(next.rows),m=Number(next.mines);if(Object.values(next).every(v=>/^\d+$/.test(v))&&Number.isSafeInteger(c)&&Number.isSafeInteger(r)&&Number.isSafeInteger(m)&&Number.isSafeInteger(c*r)&&c>=1&&r>=1&&m>=0&&m<c*r)onChange({cols:c,rows:r,mines:m});}
 return <><div className="custom-fields">{([{key:'cols',label:'Width'},{key:'rows',label:'Height'},{key:'mines',label:'Mines'}] as const).map(f=><label key={f.key} htmlFor={`custom-${f.key}`}><span>{f.label}</span><input id={`custom-${f.key}`} type="number" inputMode="numeric" min={f.key==='mines'?0:1} step="1" max={f.key==='mines'&&cells>=1?cells-1:undefined} value={fields[f.key]} onChange={e=>change(f.key,e.target.value)}/></label>)}</div>{!valid&&<p role="alert">Use positive whole-number width and height, and zero or more mines with at least one safe cell. Values and the cell count must be representable exactly by this browser.</p>}</>;
}
