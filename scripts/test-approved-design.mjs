import assert from 'node:assert/strict';
import {chromium} from '@playwright/test';
import ts from 'typescript';import {readFileSync,writeFileSync,mkdtempSync,rmSync} from 'node:fs';import {join} from 'node:path';import {tmpdir} from 'node:os';import {pathToFileURL} from 'node:url';
const dir=mkdtempSync(join(tmpdir(),'design-ui-'));let browser;
try{
 for(const n of ['game','branch','branchAdventure'])writeFileSync(join(dir,`${n}.mjs`),ts.transpileModule(readFileSync(new URL(`../src/${n}.ts`,import.meta.url),'utf8'),{compilerOptions:{target:ts.ScriptTarget.ES2020,module:ts.ModuleKind.ESNext}}).outputText.replace(/from '\.\/([A-Za-z]+)'/g,"from './$1.mjs'"));
 const load=n=>import(pathToFileURL(join(dir,`${n}.mjs`)).href),a=await load('branchAdventure'),b=await load('branch');
 let fixture=a.startEncounter(a.chooseStop(a.unifyBranch(b.newWorld()),'board'));a.stopFor(fixture).variant=undefined;fixture.expeditions.inventory.survey=1;fixture.expeditions.surveyCharges=3;fixture=a.equipItem(fixture,'survey');
 browser=await chromium.launch({args:['--no-sandbox']});const p=await browser.newPage({viewport:{width:1440,height:1100}}),errors=[];
 p.on('pageerror',e=>errors.push(e.message));await p.addInitScript(w=>{Math.random=()=>.5;if(!localStorage.getItem('design-fixture')){localStorage.setItem('minefield-zen-v1',JSON.stringify(w));localStorage.setItem('design-fixture','yes');}},fixture);
 await p.goto(`http://127.0.0.1:${process.env.TEST_PORT||4182}`,{waitUntil:'networkidle'});await p.waitForTimeout(2700);
 assert.equal(await p.evaluate(()=>document.documentElement.dataset.theme),'dark');
 assert.deepEqual(await p.locator('.mode-bar .mode-card').allTextContents(),['Classic','Blitz','Branch','Daily challenge','Nightfall','Custom','Riptide','Scan']);
 await p.getByRole('checkbox',{name:'Optional challenges',exact:true}).check();assert.equal(await p.locator('.contract-panel li').count(),3);await p.getByRole('checkbox',{name:'Optional challenges',exact:true}).uncheck();assert.equal(await p.locator('.contract-panel').count(),0);
 await p.setViewportSize({width:390,height:844});for(const el of await p.locator('.mode-bar .mode-card').all()){const r=await el.boundingBox();assert.ok(r.x>=0&&r.x+r.width<=390,'every mode is inside the mobile screen, no clipped horizontal bar');}
 await p.setViewportSize({width:1440,height:1100});await p.getByRole('button',{name:'Medium',exact:true}).click();assert.equal(await p.locator('.tile').count(),121);await p.getByRole('button',{name:'Hard',exact:true}).click();assert.equal(await p.locator('.tile').count(),256);
 await p.locator('.mode-card-zen').click();await p.locator('.tile').nth(40).click();await p.getByRole('button',{name:'Survey Lantern · 3 charges',exact:true}).click();assert.ok(await p.locator('.tile.scanned').count()>0);
 await p.getByRole('button',{name:'Enter focus mode',exact:true}).click();await p.locator('.expedition-abilities').scrollIntoViewIfNeeded();let r=await p.getByRole('button',{name:'Survey Lantern · 2 charges',exact:true}).boundingBox();assert.ok(r.y>=0&&r.y+r.height<=1100,'active control visible in fullscreen');
 const w=await p.evaluate(()=>JSON.parse(localStorage.getItem('minefield-zen-v1'))),route=w.expeditions.routes[w.current],mine=route.stops[route.cursor].board.cells.findIndex(c=>c.mine);
 await p.locator('.tile').nth(mine).click();await p.locator('.result-card').waitFor();await p.getByRole('button',{name:'See the board',exact:true}).click();await p.locator('.expedition-hud').getByRole('button',{name:'Continue after the mine hit',exact:true}).click();
 assert.equal(await p.locator('.tile.scanned').count(),0);assert.ok(await p.getByRole('button',{name:'Survey Lantern · 2 charges',exact:true}).isVisible());
 await p.reload({waitUntil:'networkidle'});await p.waitForTimeout(2700);await p.locator('.mode-card-zen').click();assert.equal(await p.locator('.tile.scanned').count(),0);assert.ok(await p.getByRole('button',{name:'Survey Lantern · 2 charges',exact:true}).isVisible());
 await p.setViewportSize({width:390,height:844});await p.getByRole('button',{name:'Enter focus mode',exact:true}).click();await p.locator('.expedition-abilities').scrollIntoViewIfNeeded();r=await p.getByRole('button',{name:'Survey Lantern · 2 charges',exact:true}).boundingBox();assert.ok(r.y>=0&&r.y+r.height<=844,'mobile fullscreen controls visible');assert.equal(await p.evaluate(()=>document.documentElement.scrollWidth>innerWidth),false);
 await p.screenshot({path:'.screenshots/approved-fullscreen-tools-mobile.png',animations:'disabled'});assert.deepEqual(errors,[]);
 console.log('Approved design passed: dark default, eight visible mobile modes, optional Classic goals, compact sizes, desktop/mobile fullscreen tools, explicit charged use, no free scans after totem Continue or restart.');
}finally{if(browser)await browser.close();rmSync(dir,{recursive:true,force:true});}
