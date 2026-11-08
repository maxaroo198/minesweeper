import assert from 'node:assert/strict';
import { readFileSync, mkdtempSync, writeFileSync, rmSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { pathToFileURL } from 'node:url';
import ts from 'typescript';

// Transpile the engine modules into a scratch folder so they can import each other.
const dir = mkdtempSync(join(tmpdir(), 'minefield-engine-'));
const load = async (name) => {
  const source = readFileSync(new URL(`../src/${name}.ts`, import.meta.url), 'utf8');
  const js = ts.transpileModule(source, { compilerOptions: { target: ts.ScriptTarget.ES2020, module: ts.ModuleKind.ESNext } })
    .outputText.replace(/from '\.\/([a-z]+)'/g, "from './$1.mjs'");
  writeFileSync(join(dir, `${name}.mjs`), js);
  return import(pathToFileURL(join(dir, `${name}.mjs`)).href);
};
const game = await load('game');
const contract = await load('contract');
const riptide = await load('riptide');
process.on('exit', () => rmSync(dir, { recursive: true, force: true }));

const {
  freshGame, plantBoard, reveal, toggleFlag, neighbors, seededRandom, DIFFICULTIES, DAILY_TWISTS,
  dailyBoard, dailyTwist, applyFog, fogChance, scanPatch, clampCustom, boardConfig, MODE_DIFFICULTIES, NIGHTFALL_MINES,
} = game;
const { dealObjectives, rateObjectives, contractStars } = contract;
const { driftBoard, TIDE_SECONDS } = riptide;

let checks = 0;
for (const mode of ['classic', 'blitz', 'zen', 'daily']) {
  for (const difficulty of ['easy', 'medium', 'hard']) {
    for (let attempt = 0; attempt < 20; attempt++) {
      const board = freshGame(mode, difficulty);
      const first = Math.floor(Math.random() * board.cells.length);
      const { state: started, change: opening } = reveal(board, first);
      assert.ok(['playing', 'won'].includes(started.status), 'a safe opening may finish an exceptionally lucky board');
      assert.equal(started.cells.filter(c => c.mine).length, DIFFICULTIES[difficulty].mines);
      assert.ok(started.cells[first].revealed);
      assert.ok(opening.opened.includes(first), 'the clicked tile is reported as opened');
      assert.ok(opening.opened.every(i => !started.cells[i].mine || started.cells[i].exploded), 'opened tiles are safe unless the game was lost');
      assert.ok(!started.cells[first].mine);
      for (const i of [first, ...neighbors(first, started.rows, started.cols)]) assert.ok(!started.cells[i].mine, 'first-click safety');
      started.cells.forEach((c, i) => {
        if (!c.mine) assert.equal(c.adjacent, neighbors(i, started.rows, started.cols).filter(n => started.cells[n].mine).length);
      });
      let next = started;
      for (let i = 0; i < next.cells.length && next.status === 'playing'; i++) {
        if (!next.cells[i].mine) next = reveal(next, i).state;
      }
      assert.equal(next.status, 'won', 'revealing every safe square must win');
      assert.equal(next.cells.filter(c => c.revealed && !c.mine).length, next.cells.length - next.mines);
      assert.equal(reveal(next, 0).state, next, 'a finished game is immutable');
      checks++;
    }
  }
}
for (const difficulty of ['easy', 'medium', 'hard']) {
  const first = freshGame('daily', difficulty);
  const a = plantBoard(first, 40), b = plantBoard(first, 40);
  assert.deepEqual(a.cells, b.cells, 'daily puzzles must be deterministic');
  const r = seededRandom('minefield-v1');
  const second = seededRandom('minefield-v1');
  assert.equal(r(), second());
}
const board = freshGame('classic', 'easy');
const flagged = toggleFlag(board, 0);
assert.ok(flagged.cells[0].flagged);
assert.equal(toggleFlag(flagged, 0).cells[0].flagged, false);
assert.equal(reveal(flagged, 0).state, flagged, 'cannot reveal a flag');
// Flood fill must report the full cascade and a non-decreasing wave distance.
const cascadeBoard = plantBoard(freshGame('classic', 'easy'), 0);
const cascade = reveal(cascadeBoard, 0);
assert.ok(cascade.change.opened.length >= 1);
assert.equal(cascade.change.opened[0], 0);
assert.equal(cascade.change.wave[0], 0);
assert.ok(Object.values(cascade.change.wave).every(d => d >= 0 && Number.isInteger(d)));
assert.equal(plantBoard(board, 0).cells.filter(c => c.mine).length, 10);

assert.deepEqual(MODE_DIFFICULTIES.daily, ['medium']);

// Daily twists: same puzzle for everyone, rotating day by day, mines scaled to match.
for (let day = 0; day < 8; day++) {
  const twist = dailyTwist(day);
  for (const difficulty of ['easy', 'medium', 'hard']) {
    const board = dailyBoard(difficulty, day);
    assert.equal(board.difficulty, 'medium', 'Daily never offers a hard/easy variant');
    const base = DIFFICULTIES.medium.mines;
    const expected = twist.mineScale ? Math.round(base * twist.mineScale) : base;
    assert.equal(board.mines, expected, `day ${day} ${difficulty} carries the twist's mine count`);
    assert.ok(board.mines <= board.cells.length - 9, 'the safe opening always has room');
    assert.equal(board.cells.filter(c => c.mine).length, 0, 'mines are planted on the first move, never before');
    const planted = plantBoard(board, 40);
    assert.equal(planted.cells.filter(c => c.mine).length, expected, 'the planted board matches the twist');
    assert.deepEqual(plantBoard(board, 40).cells, planted.cells, 'the daily stays deterministic with a twist');
  }
}
assert.equal(new Set([0, 1, 2, 3].map(d => dailyTwist(d).id)).size, 4, 'four days, four different twists');
assert.equal(dailyTwist(0).id, dailyTwist(DAILY_TWISTS.length).id, 'the twist cycle repeats on schedule');
assert.ok(DAILY_TWISTS.some(t => t.noFlags) && DAILY_TWISTS.some(t => t.seconds), 'twists include a flag-free day and a timed day');
/* --- Board shapes: the new sizes, Nightfall's lock, and Custom clamps --- */
assert.deepEqual([DIFFICULTIES.easy.rows, DIFFICULTIES.medium.rows, DIFFICULTIES.hard.rows], [9, 11, 16], 'medium is 11 × 11 and hard is 16 × 16');
assert.equal(DIFFICULTIES.medium.cols, 11);
assert.equal(DIFFICULTIES.hard.cols, 16);
assert.deepEqual([DIFFICULTIES.easy.mines, DIFFICULTIES.medium.mines, DIFFICULTIES.hard.mines], [10, 18, 42], 'mine counts keep the density gentle');
for (const rung of MODE_DIFFICULTIES.nightfall) {
  const board = freshGame('nightfall', rung);
  assert.equal(board.rows, 12, 'Nightfall is locked to 12 × 12');
  assert.equal(board.cols, 12);
  assert.equal(board.mines, NIGHTFALL_MINES[rung], `nightfall ${rung} carries its own mine count`);
  assert.ok(board.mines < board.cells.length / 4, 'nightfall stays readable');
}
assert.ok(MODE_DIFFICULTIES.nightlight === undefined);
assert.ok(MODE_DIFFICULTIES.nightfall.includes('blackout'), 'Blackout sits beside the other Nightfall difficulties');
assert.ok(!MODE_DIFFICULTIES.classic.includes('blackout'), 'Blackout only exists inside Nightfall');
for (const bad of [{ rows: 1, cols: 100, mines: 9999 }, { rows: -4, cols: 0, mines: -2 }, {}]) {
  const sized = clampCustom(bad);
  assert.ok(sized.rows >= 1 && sized.cols >= 1, 'custom dimensions stay positive without fixed size caps');
  assert.ok(sized.mines >= 0 && sized.mines < sized.rows * sized.cols, 'custom always leaves squares to clear');
}
const customBoard = freshGame('custom', 'custom', { rows: 7, cols: 21, mines: 20 });
assert.deepEqual([customBoard.rows, customBoard.cols, customBoard.mines], [7, 21, 20], 'custom plays the size asked for');
assert.deepEqual(customBoard.custom, { rows: 7, cols: 21, mines: 20 }, 'the size travels with the board for a restart');
assert.equal(freshGame('classic', 'hard').custom, undefined, 'only custom boards carry a size');
console.log(`Boards: 9×9 / ${DIFFICULTIES.medium.rows}×${DIFFICULTIES.medium.cols} / ${DIFFICULTIES.hard.rows}×${DIFFICULTIES.hard.cols}, nightfall 12×12`);

/* --- Nightfall: fog never touches fog, and the chance climbs with the clock --- */
const fogSeed = (values) => { let i = 0; return () => values[i++ % values.length]; };
const fogBoard = plantBoard(freshGame('nightfall', 'medium'), 40);
const numbered = fogBoard.cells.map((c, i) => (!c.mine && c.adjacent > 0 ? i : -1)).filter(i => i >= 0);
const always = applyFog(fogBoard.cells, numbered, fogBoard.rows, fogBoard.cols, 1, () => 0);
const hidden = always.flatMap((c, i) => (c.hidden ? [i] : []));
assert.ok(hidden.length >= 10, 'a certain mist takes a lot of numbers');
assert.equal(always.filter((c, i) => c.revealed !== fogBoard.cells[i].revealed).length, 0, 'fog never opens a square');
assert.equal(hidden.length, numbered.length, 'touching numbered squares can all be hidden');
assert.equal(applyFog(fogBoard.cells, numbered, 12, 12, 0.1, () => 0.99).filter(c => c.hidden).length, 0, 'a polite roll leaves the board alone');
assert.equal(applyFog(fogBoard.cells, fogBoard.cells.map((c, i) => (!c.mine && c.adjacent === 0 ? i : -1)).filter(i => i >= 0), 12, 12, 1, () => 0).filter(c => c.hidden).length, 0, 'empty squares are never fogged');
const fogClock = (seconds, difficulty = 'medium') => fogChance({ ...fogBoard, mode: 'nightfall', difficulty, startedAt: Date.now() - seconds * 1000 });
assert.ok(Math.abs(fogClock(0) - 0.1) < 1e-9, 'nightfall starts at one in ten');
assert.ok(fogClock(5) > fogClock(0) && fogClock(10) > fogClock(5), 'the chance climbs every five seconds');
assert.equal(fogClock(24), .7, 'Nightfall reaches 70 percent after 24 seconds');
assert.ok(fogClock(2) > fogClock(0), 'fog grows every two seconds');
assert.ok(fogClock(0, 'blackout') > 0.32 && fogClock(0, 'blackout') < 0.34, 'Blackout starts at one in three');
assert.equal(fogClock(100, 'blackout'), 1, 'Blackout reaches 100 percent');
assert.ok(fogClock(40, 'blackout') > 2 / 3, 'Blackout passes the old cap');
assert.equal(fogChance({ ...fogBoard, mode: 'classic' }), 0, 'other modes never lose a number');
const foggedState = { ...fogBoard, status: 'playing', startedAt: Date.now(), cells: fogBoard.cells.map((c, i) => (i === numbered[0] ? { ...c, revealed: true, hidden: true } : c)) };
assert.equal(reveal(foggedState, numbered[0]).state, foggedState, 'a fogged square cannot be chorded');
let revealedFog = 0;
for (let attempt = 0; attempt < 40; attempt++) {
  const { state } = reveal(freshGame('nightfall', 'blackout'), Math.floor(Math.random() * 144));
  revealedFog += state.cells.filter(c => c.hidden).length;
  state.cells.forEach(c => { if (c.hidden) assert.ok(!c.mine && c.adjacent > 0, 'only numbered safe tiles hide'); });
}
assert.ok(revealedFog > 0, 'Blackout actually fogs numbers when playing');

/* --- Riptide: the tide moves mines, never onto an opened square --- */
{
  let board = reveal(freshGame('riptide', 'medium'), 40).state;
  for (let i = 0; i < board.cells.length; i++) if (!board.cells[i].mine && !board.cells[i].revealed) board = reveal(board, i).state;
  const openBefore = board.cells.flatMap((c, i) => (c.revealed ? [i] : []));
  const minesBefore = board.cells.filter(c => c.mine).length;
  let board2 = { ...board, status: 'playing', cells: board.cells.map((c, i) => (openBefore.includes(i) ? c : { ...c, revealed: false })) };
  for (let turn = 0; turn < 25; turn++) {
    const drift = driftBoard(board2, seededRandom(`tide-${turn}`));
    assert.equal(drift.state.cells.filter(c => c.mine).length, minesBefore, 'the tide never changes the mine count');
    drift.state.cells.forEach((cell, i) => {
      if (cell.revealed) assert.ok(!cell.mine, 'a mine never slides under an opened square');
      assert.equal(cell.adjacent, cell.mine ? cell.adjacent : neighbors(i, drift.state.rows, drift.state.cols).filter(n => drift.state.cells[n].mine).length, 'numbers are recounted after the tide');
    });
    board2 = drift.state;
  }
  assert.equal(driftBoard({ ...board2, status: 'won' }, seededRandom('x')).changed, false, 'a finished Riptide board holds still');
  assert.equal(TIDE_SECONDS, 8, 'the tide runs every eight seconds');
  console.log('Riptide: 25 tides, mine count steady, nothing landed on an open square');
}

/* --- Scan costs, uncertainty and anti-reroll/flag-farming rules --- */
{
  const board = reveal(freshGame('scan', 'easy'), 40).state;
  assert.equal(board.charges, 6);
  const safe = board.cells.findIndex(c => !c.mine && !c.revealed);
  const mine = board.cells.findIndex(c => c.mine);
  const known = scanPatch(board, safe, () => .9);
  assert.equal(known.charges, 4); assert.equal(known.cells[safe].scanned, board.cells[safe].adjacent);
  const unknown = scanPatch(board, safe, () => .1);
  assert.equal(unknown.charges, 5); assert.equal(unknown.cells[safe].scanned, -1);
  assert.equal(scanPatch(unknown, safe, () => .9), unknown, 'unknown cannot be rerolled');
  const mined = scanPatch(board, mine, () => .9);
  assert.equal(mined.charges, 5); assert.equal(mined.cells[mine].scanned, -1);
  const last = scanPatch({ ...board, charges: 1 }, safe, () => .9);
  assert.equal(last.charges, 0); assert.equal(last.cells[safe].scanned, -1);
  assert.equal(scanPatch(last, mine).charges, 0);
  const flagged = toggleFlag(board, mine);
  assert.equal(flagged.charges, 7);
  assert.equal(toggleFlag(toggleFlag(flagged, mine), mine).charges, 7, 'repeat flags cannot farm charges');
  assert.equal(scanPatch(flagged, mine), flagged, 'flagged squares cannot be scanned');
  assert.equal(scanPatch({ ...board, status: 'won' }, safe).scans, board.scans);
}

/* --- Contract: three objectives, stars only on a win --- */
{
  const ids = dealObjectives('board-a');
  assert.equal(ids.length, 3, 'three objectives are dealt');
  assert.equal(new Set(ids).size, 3, 'and all three are different');
  assert.deepEqual(dealObjectives('board-a'), ids, 'the same board always deals the same contract');
  assert.notDeepEqual(dealObjectives('board-b'), ids, 'a different board deals a different one');
  let board = freshGame('contract', 'easy');
  board = { ...board, objectives: ids };
  assert.equal(contractStars(ids, board, 10), 0, 'a lost board pays no stars');
  let won = reveal(board, 40).state;
  for (let i = 0; i < won.cells.length && won.status === 'playing'; i++) if (!won.cells[i].mine) won = reveal(won, i).state;
  assert.equal(won.status, 'won');
  const rated = rateObjectives(ids, won, 30);
  assert.equal(rated.length, 3);
  const stars = contractStars(ids, won, 30);
  assert.ok(stars >= 0 && stars <= 3, 'stars are counted out of three');
  assert.equal(stars, rated.filter(o => o.done).length);
  console.log(`Contract: dealt ${ids.join(', ')} → ${stars}/3 stars on a win`);
}


// Expanded Contract invariants and deterministic replay.
assert.equal(contract.OBJECTIVE_POOL.length, 24);
for (let n = 0; n < 200; n++) {
  const ids = dealObjectives(`variety-${n}`);
  assert.ok(!(ids.includes('allflags') && (ids.includes('flagless') || ids.includes('minimalist'))));
  assert.ok(!(ids.includes('chorder') && ids.includes('chordless')));
  const flagGoals=['allflags','flag-discipline','safe-border','corners','marked-corners'];
  const flagLimits=['flagless','minimalist','half-flags','perfect-tech'];
  assert.ok(!(ids.some(x=>flagGoals.includes(x)) && ids.some(x=>flagLimits.includes(x))));
  assert.ok(!(ids.some(x=>['chorder','precise-chords','chord-sprint'].includes(x)) && ids.some(x=>['chordless','no-chord-sprint','perfect-tech','flagless'].includes(x))));
  const b = { ...freshGame('contract', 'easy'), id: `variety-${n}`, objectives: ids };
  const bonus = contract.bonusObjectives(b, 0);
  assert.equal(bonus.length, 2);
  assert.ok(bonus.every(o => !ids.includes(o.id)));
  assert.deepEqual(plantBoard(b, 40).cells, plantBoard(b, 40).cells, 'same code and first click replay exactly');
}
{
  const b = { ...freshGame('contract', 'easy'), status: 'won', rescues: 1 };
  assert.equal(contractStars(['flagless', 'chordless', 'unassisted'], b, 10), 1, 'rescue forfeits unassisted objective and deducts one star');
  let playing = reveal(freshGame('contract', 'easy'), 40).state;
  const safe = playing.cells.findIndex(c => !c.mine && !c.revealed);
  playing = toggleFlag(toggleFlag(playing, safe), safe);
  assert.equal(rateObjectives(['accuracy'], { ...playing, status: 'won' }, 10)[0].done, false, 'removing a wrong flag does not restore accuracy');
}
console.log(`Daily twists: ${DAILY_TWISTS.map(t => t.name).join(' → ')}`);
console.log(`Passed ${checks} randomized, full-game engine tests plus daily, flags, and safety checks.`);

// Tides must not move a correctly flagged mine or conceal a revealed square.
{
  let b = reveal(freshGame('riptide', 'medium'), 40).state;
  const i = b.cells.findIndex(c => c.mine);
  b = toggleFlag(b, i);
  for (let n = 0; n < 40; n++) {
    const result = driftBoard(b, seededRandom(`anchor-${n}`));
    assert.ok(result.state.cells[i].mine && result.state.cells[i].flagged);
    assert.equal(result.state.cells.filter(c => c.mine).length, b.mines);
    result.state.cells.forEach((c, index) => { if (b.cells[index].revealed) assert.ok(c.revealed && !c.mine && !c.hidden); });
    b = result.state;
  }
}
const daily = await load('dailyProgress');
const oldWins = [{ mode: 'daily', won: true, date: '2026-11-05T12:00:00Z' }];
const savedDays = daily.mergeDailyWins(['2026-11-04'], oldWins);
assert.deepEqual(savedDays, ['2026-11-04', '2026-11-05']);
assert.deepEqual(daily.mergeDailyWins(savedDays, []), savedDays, 'history eviction cannot erase daily dates');
assert.equal(daily.streakFor(savedDays, '2026-11-06'), 2);
assert.equal(daily.streakFor(savedDays, '2026-11-07'), 0);
const branch = await load('branch');
const failedRoot = branch.failArea(branch.newWorld(), '0');
assert.equal(failedRoot.world.areas['0'].state, 'open', 'root failure leaves playable fallback');
console.log('Expanded rules passed: Scan costs/unknowns, anchored tides, 24 contracts, persistent daily dates, Branch fallback.');

// Branch regression: fail both forward tips, replay the root, then keep growing.
{
  const initial = branch.newWorld(); const frozen = JSON.stringify(initial);
  let w = branch.clearArea(initial, '0');
  assert.equal(JSON.stringify(initial), frozen, 'clearing must not mutate React state');
  const before = JSON.stringify(w);
  const failedA = branch.failArea(w, '0.0');
  assert.equal(JSON.stringify(w), before, 'failing must not mutate the input');
  assert.deepEqual(branch.failArea(w, '0.0'), failedA, 'replayed StrictMode calculation has identical results');
  assert.equal(failedA.world.areas['0.1'].state, 'open', 'one failure cannot close its sibling');
  const failedB = branch.failArea(failedA.world, '0.1');
  assert.equal(failedB.fallback, '0');
  w = branch.clearArea(failedB.world, '0');
  assert.deepEqual(branch.openAreaIds(w), ['0.0','0.1'], 're-clearing reopens existing locked children');
  assert.equal(Object.keys(w.areas).length,3,'no duplicate or discarded nodes');
  w = branch.clearArea(w, '0.0');
  assert.equal(w.areas['0.0'].children.length,3,'growth continues beyond recovered tips');
  const board = branch.boardFromArea(w,'0.1');
  const shifted = {...w,current:'0.0.0'};
  const synced = branch.syncArea(shifted,game.toggleFlag(board,0));
  assert.deepEqual(synced.areas['0.1'].flagged,[0], 'move is tied to its board, not a changed current pointer');
  assert.deepEqual(synced.areas['0.0.0'].flagged,[]);
  const store = new Map();
  globalThis.localStorage = {getItem:k=>store.get(k)??null,setItem:(k,v)=>store.set(k,v)};
  const stuck = branch.clearArea(branch.newWorld(),'0');
  stuck.areas['0.0'].state='locked';stuck.areas['0.1'].state='locked';
  branch.saveWorld(stuck);
  const recovered=branch.loadWorld();
  assert.deepEqual(branch.openAreaIds(recovered),['0.0','0.1'],'legacy dead-end save is repaired in place');
  assert.equal(recovered.createdAt,stuck.createdAt);
  assert.deepEqual(recovered.areas['0'].children,stuck.areas['0'].children);
  console.log('Branch regressions passed: isolated failure, immutable/repeatable transitions, parent replay, deeper growth, board identity, legacy save recovery.');
}
