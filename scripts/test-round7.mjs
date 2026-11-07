import { chromium } from '@playwright/test';
import assert from 'node:assert/strict';
const BASE=`http://127.0.0.1:${process.env.TEST_PORT || 4182}`;
const browser=await chromium.launch({headless:true,args:['--no-sandbox']});
try {
  const p=await browser.newPage({viewport:{width:1400,height:1100}});
  const errors=[];p.on('pageerror',e=>errors.push(e.message));
  await p.addInitScript(()=>{Math.random=()=>.5;});
  await p.goto(BASE,{waitUntil:'networkidle'}); await p.waitForTimeout(2700);
  const startArea=async()=>{await p.locator('.tile').nth(40).click();};
  // Legacy dead-end trees migrate into one route flow without losing IDs.
  await p.evaluate(()=>{
    const area=(id,state,parent,children)=>({id,state,parent,children,depth:parent?1:0,mines:null,revealed:[],flagged:[]});
    localStorage.setItem('minefield-zen-v1',JSON.stringify({version:1,current:'0',createdAt:12345,areas:{'0':area('0','cleared',null,['0.0','0.1']),'0.0':area('0.0','locked','0',[]),'0.1':area('0.1','locked','0',[])}}));
  });
  await p.locator('.mode-card-zen').click();
  const w=await p.evaluate(()=>JSON.parse(localStorage.getItem('minefield-zen-v1')));
  assert.equal(w.createdAt,12345);assert.equal(w.areas['0.0'].state,'open');assert.equal(w.areas['0.1'].state,'open');
  assert.ok(w.expeditions.routes[w.current]);
  assert.equal(await p.getByRole('button',{name:'Begin expedition in this limb',exact:true}).count(),0);
  await p.getByRole('button',{name:'Close map',exact:true}).click();
  // Fresh Riptide: blanks are blank; numbered clues remain visible.
  if(await p.getByRole('button',{name:'See the board',exact:true}).isVisible()) await p.getByRole('button',{name:'See the board',exact:true}).click();
  await p.locator('.mode-card-riptide').click(); await startArea();
  const zeros=await p.locator('.tile.revealed.number-0').allTextContents();
  assert.ok(zeros.length>0);assert.ok(zeros.every(s=>s===''),'zero labels are hidden');
  const clues=await p.locator('.tile.revealed:not(.number-0)').allTextContents();
  assert.ok(clues.some(s=>/^[1-8]$/.test(s)),'numbered clues still show');
  // Queue survives app restart, and boards expose only the two permitted modes.
  const queued=[1,2].map(n=>({id:`queued-${n}`,won:true,mode:'blitz',difficulty:'easy',seconds:n*10,date:'2026-11-07T12:00:00Z'}));
  await p.evaluate(q=>localStorage.setItem('minefield-pending-public-v1',JSON.stringify(q)),queued);
  await p.reload({waitUntil:'networkidle'});await p.waitForTimeout(2700);
  await p.getByRole('button',{name:'Leaderboard',exact:true}).click();
  assert.deepEqual(await p.locator('.leaderboard-filters .difficulty-tabs button').allTextContents(),['Classic','Blitz']);
  assert.ok((await p.locator('.public-post').innerText()).includes('2 unposted win(s)'));
  await p.getByRole('button',{name:'Post saved win / retry',exact:true}).click();
  await p.waitForFunction(()=>JSON.parse(localStorage.getItem('minefield-pending-public-v1')).length===1);
  assert.equal(await p.evaluate(()=>JSON.parse(localStorage.getItem('minefield-pending-public-v1'))[0].id),'queued-2');
  await p.getByRole('button',{name:'Preferences',exact:true}).click();
  assert.equal(await p.getByRole('slider',{name:'Sound volume',exact:true}).inputValue(),'50');
  await p.getByRole('slider',{name:'Sound volume',exact:true}).fill('73');
  await p.waitForFunction(()=>localStorage.getItem('minefield-volume')==='0.73');
  assert.equal(await p.locator('.volume-control output').innerText(),'73%');
  await p.getByRole('switch',{name:'Game sound',exact:true}).click();
  assert.equal(await p.getByRole('slider',{name:'Sound volume',exact:true}).inputValue(),'73','mute preserves chosen volume');
  await p.reload({waitUntil:'networkidle'});await p.waitForTimeout(2700);
  await p.getByRole('button',{name:'Preferences',exact:true}).click();
  assert.equal(await p.getByRole('slider',{name:'Sound volume',exact:true}).inputValue(),'73','volume survives restart');
  assert.equal(await p.getByRole('switch',{name:'Game sound',exact:true}).getAttribute('aria-checked'),'false','mute survives restart independently');
  await p.getByRole('slider',{name:'Sound volume',exact:true}).fill('0');
  await p.getByRole('button',{name:'Test sound',exact:true}).click();
  await p.getByText('Volume is at 0%. Raise the volume slider to hear the test sound.',{exact:true}).waitFor();
  await p.setViewportSize({width:390,height:844});
  assert.ok(await p.getByRole('slider',{name:'Sound volume',exact:true}).isVisible());
  assert.deepEqual(errors,[]);
  console.log('Round 7 UI passed: unified legacy-save repair; blank Riptide zeros/visible numbers; Classic/Blitz-only boards; persisted submission queue.');
} finally {await browser.close();}
