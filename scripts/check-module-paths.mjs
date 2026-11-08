// Windows resolves extensionless imports case-insensitively. Catch ambiguous .ts/.tsx
// module stems on Linux too, before either web or native builds can succeed incorrectly.
import assert from 'node:assert/strict';
import {readdirSync} from 'node:fs';
import {execFileSync} from 'node:child_process';
import {fileURLToPath} from 'node:url';
import {join} from 'node:path';
const root=fileURLToPath(new URL('../',import.meta.url));
function conflicts(files){
 const groups=new Map();
 for(const path of new Set(files)){
  if(!/\.(?:ts|tsx|js|jsx|mjs|mts|cts)$/i.test(path)||/\.d\.ts$/i.test(path))continue;
  const key=path.replaceAll('\\','/').replace(/\.(?:ts|tsx|js|jsx|mjs|mts|cts)$/i,'').toLowerCase();
  const group=groups.get(key)??[];group.push(path);groups.set(key,group);
 }
 return [...groups.values()].filter(group=>group.length>1);
}
// Regression: this exact pair passed Linux Vite but failed the Windows NSIS job.
assert.equal(conflicts(['src/ExtraModes.tsx','src/extraModes.ts']).length,1);
assert.equal(conflicts(['src/AdditionalModesPanel.tsx','src/extraModes.ts']).length,0);
assert.equal(conflicts(['src/game.ts','src/game.ts']).length,0);
function walk(relative){return readdirSync(join(root,relative),{withFileTypes:true}).flatMap(entry=>entry.isDirectory()?walk(`${relative}/${entry.name}`):[`${relative}/${entry.name}`]);}
const files=walk('src');
// Also inspect Git's index, so a case-insensitive checkout can't hide one of two tracked paths.
try{files.push(...execFileSync('git',['ls-files','-z','--','src'],{cwd:root,encoding:'utf8',stdio:['ignore','pipe','ignore']}).split('\0').filter(Boolean));}catch{/* Downloaded source ZIPs need no Git checkout. */}
const ambiguous=conflicts(files);
assert.equal(ambiguous.length,0,`Ambiguous Windows module paths. Use distinct basenames, not case-only differences:\n${ambiguous.map(group=>group.join(' / ')).join('\n')}`);
console.log('Module paths passed: no case-insensitive extensionless-import collisions (including Windows regression).');
