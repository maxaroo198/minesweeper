// Unit tests with mocked Firebase and AudioContext: never contact live services.
import assert from 'node:assert/strict';
import ts from 'typescript';
import { readFileSync, mkdtempSync, writeFileSync, rmSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { pathToFileURL } from 'node:url';
const dir = mkdtempSync(join(tmpdir(), 'minefield-services-'));
const compile = name => ts.transpileModule(readFileSync(new URL(`../src/${name}.ts`, import.meta.url), 'utf8'), { compilerOptions: { target: ts.ScriptTarget.ES2020, module: ts.ModuleKind.ESNext } }).outputText;
try {
  writeFileSync(join(dir,'game.mjs'),compile('game'));
  const store = new Map([['minefield-player-name','Test sweeper']]);
  globalThis.localStorage = { getItem: k => store.get(k) ?? null, setItem: (k,v) => store.set(k,v) };
  globalThis.__publicEnv = { VITE_FIREBASE_API_KEY: 'test', VITE_FIREBASE_PROJECT_ID:'test', VITE_FIREBASE_APP_ID:'test' };
  const data = ['easy','medium','hard'].flatMap((difficulty,d) => Array.from({length:35}, (_,i) => ({ name:`${difficulty}-${i}`, mode:'blitz', difficulty, seconds:i*3+d+1, date:'2026-11-06' })));
  const queries = []; let fail = false; let posted;
  globalThis.__firebaseMock = {
    initializeApp: () => ({}), getApps: () => [], getFirestore: () => ({}), collection: (_,name) => name,
    addDoc: async (_, value) => { posted = value; },
    where: (field,op,value) => ({kind:'where',field,value}), orderBy: field => ({kind:'order',field}), limit: n => ({kind:'limit',n}), query: (...args) => args,
    getDocs: async args => {
      queries.push(args);
      if (fail) throw new Error('failed-precondition: create the index');
      const filters=args.filter(a => a.kind==='where');
      const rows=data.filter(r => filters.every(f => r[f.field]===f.value)).sort((a,b)=>a.seconds-b.seconds).slice(0,args.find(a=>a.kind==='limit').n);
      return { docs: rows.map(row => ({ data:()=>row })) };
    },
  };
  let source=compile('publicBoard').replace(/^import .*from 'firebase\/(app|firestore)';\r?$/gm,'').replace("from './game'", "from './game.mjs'").replace(/import\.meta\.env/g,'globalThis.__publicEnv');
  source='const { initializeApp, getApps, getFirestore, collection, addDoc, query, where, orderBy, limit, getDocs } = globalThis.__firebaseMock;\n'+source;
  writeFileSync(join(dir,'publicBoard.mjs'),source);
  const pub=await import(pathToFileURL(join(dir,'publicBoard.mjs')).href);
  const actual=await pub.topPublicScores('blitz','easy',20,true);
  assert.deepEqual(actual,data.toSorted ? data.toSorted((a,b)=>a.seconds-b.seconds).slice(0,20) : [...data].sort((a,b)=>a.seconds-b.seconds).slice(0,20));
  assert.equal(queries.length,3);
  assert.ok(queries.every(q => q.some(f=>f.kind==='where' && f.field==='difficulty')), 'Blitz reuses per-difficulty query/index');
  fail=true; const warn=console.warn; console.warn=()=>{};
  try { await assert.rejects(pub.topPublicScores('blitz','easy',20,true), /failed-precondition/); } finally { console.warn=warn; }
  await pub.submitPublicScore({won:true,mode:'blitz',difficulty:'easy',seconds:15,date:'2026-11-06'});
  assert.equal(posted.name,'Test sweeper'); assert.equal(posted.mode,'blitz');
  console.log('Public-board unit tests passed: exact global Blitz top 20, three indexed difficulty queries, errors propagated, posting fields preserved (mock Firebase).');

  let starts=0;
  const param={value:0,setValueAtTime(){},exponentialRampToValueAtTime(){}};
  class Audio {
    state='suspended';currentTime=0;sampleRate=1000;destination={};
    resume(){return new Promise(resolve=>queueMicrotask(()=>{this.state='running';resolve();}));}
    createGain(){return {gain:{...param},connect(){}};}
    createOscillator(){const context=this;return {frequency:{...param},connect(){},start(){assert.equal(context.state,'running'); starts++;},stop(){}};}
  }
  globalThis.window={AudioContext:Audio};
  const sound=await import(`data:text/javascript;base64,${Buffer.from(compile('sensory')).toString('base64')}`);
  sound.sense('win',{sound:true,haptics:false});
  await new Promise(resolve=>setImmediate(resolve));
  assert.ok(starts>0,'sounds wait for AudioContext resume');
  assert.ok((await sound.testAudio()).startsWith('Audio engine running'));
  console.log('Audio startup unit test passed: suspended context resumes before tones start (mock audio, not audible hardware validation).');
} finally { rmSync(dir,{recursive:true,force:true}); }
