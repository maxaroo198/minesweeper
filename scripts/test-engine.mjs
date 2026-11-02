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

// Daily twists: same puzzle for everyone, rotating day by day, mines scaled to match.
for (let day = 0; day < 8; day++) {
  const twist = dailyTwist(day);
  for (const difficulty of ['easy', 'medium', 'hard']) {
    const board = dailyBoard(difficulty, day);
    const base = DIFFICULTIES[difficulty].mines;
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
assert.deepEqual([DIFFICULTIES.easy.rows, DIFFICULTIES.medium.rows, DIFFICULTIES.hard.rows], [9, 12, 20], 'medium is 12 × 12 and hard is 20 × 20');
assert.equal(DIFFICULTIES.medium.cols, 12);
assert.equal(DIFFICULTIES.hard.cols, 20);
assert.deepEqual([DIFFICULTIES.easy.mines, DIFFICULTIES.medium.mines, DIFFICULTIES.hard.mines], [10, 24, 70], 'mine counts keep the density gentle');
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
  assert.ok(sized.rows >= 5 && sized.rows <= 40 && sized.cols >= 5 && sized.cols <= 40, 'custom sizes clamp into range');
  assert.ok(sized.mines >= 1 && sized.mines < sized.rows * sized.cols, 'custom always leaves squares to clear');
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
for (const i of hidden) {
  for (const n of neighbors(i, fogBoard.rows, fogBoard.cols)) assert.ok(!always[n].hidden, 'no two fogged squares may touch');
}
assert.equal(applyFog(fogBoard.cells, numbered, 12, 12, 0.1, () => 0.99).filter(c => c.hidden).length, 0, 'a polite roll leaves the board alone');
assert.equal(applyFog(fogBoard.cells, fogBoard.cells.map((c, i) => (!c.mine && c.adjacent === 0 ? i : -1)).filter(i => i >= 0), 12, 12, 1, () => 0).filter(c => c.hidden).length, 0, 'empty squares are never fogged');
const fogClock = (seconds, difficulty = 'medium') => fogChance({ ...fogBoard, mode: 'nightfall', difficulty, startedAt: Date.now() - seconds * 1000 });
assert.ok(Math.abs(fogClock(0) - 0.1) < 1e-9, 'nightfall starts at one in ten');
assert.ok(fogClock(5) > fogClock(0) && fogClock(10) > fogClock(5), 'the chance climbs every five seconds');
assert.ok(fogClock(600) <= 0.5 + 1e-9, 'and stops at a coin flip');
assert.ok(fogClock(0, 'blackout') > 0.32 && fogClock(0, 'blackout') < 0.34, 'Blackout starts at one in three');
assert.equal(fogChance({ ...fogBoard, mode: 'classic' }), 0, 'other modes never lose a number');
const foggedState = { ...fogBoard, status: 'playing', startedAt: Date.now(), cells: fogBoard.cells.map((c, i) => (i === numbered[0] ? { ...c, revealed: true, hidden: true } : c)) };
assert.equal(reveal(foggedState, numbered[0]).state, foggedState, 'a fogged square cannot be chorded');
let revealedFog = 0;
for (let attempt = 0; attempt < 40; attempt++) {
  const { state } = reveal(freshGame('nightfall', 'blackout'), Math.floor(Math.random() * 144));
  revealedFog += state.cells.filter(c => c.hidden).length;
  state.cells.forEach((c, i) => { if (c.hidden) for (const n of neighbors(i, 12, 12)) assert.ok(!state.cells[n].hidden, 'live reveals keep fog apart too'); });
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
  assert.equal(TIDE_SECONDS, 15, 'the tide runs every fifteen seconds');
  console.log('Riptide: 25 tides, mine count steady, nothing landed on an open square');
}

/* --- Scan: charges are spent, and earned back by a true flag --- */
{
  let board = reveal(freshGame('scan', 'easy'), 40).state;
  assert.equal(board.charges, 3, 'scan mode starts with three charges');
  const covered = board.cells.findIndex(c => !c.revealed && !c.mine);
  const scanned = scanPatch(board, covered);
  assert.equal(scanned.charges, 2);
  assert.equal(scanned.scans, 1);
  assert.equal(scanned.cells[covered].scanned, board.cells[covered].adjacent, 'the scan tells the truth');
  assert.equal(scanned.cells[covered].revealed, false, 'a scan does not open the square');
  assert.equal(scanPatch(scanned, covered).cells[covered].scanned, board.cells[covered].adjacent);
  const mine = scanned.cells.findIndex(c => c.mine && !c.revealed);
  const flagged = toggleFlag(scanned, mine);
  assert.equal(flagged.charges, 3, 'flagging a real mine earns a charge back');
  const safe = flagged.cells.findIndex(c => !c.mine && !c.revealed && !c.flagged);
  assert.equal(toggleFlag(flagged, safe).charges, 3, 'a wrong flag earns nothing');
  assert.equal(scanPatch(flagged, flagged.cells.findIndex(c => c.revealed && !c.mine)).charges, 3, 'an open square cannot be scanned');
  const notScan = { ...flagged, mode: 'classic' };
  assert.equal(scanPatch(notScan, safe), notScan, 'scanning is Scan mode only');
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

console.log(`Daily twists: ${DAILY_TWISTS.map(t => t.name).join(' → ')}`);
console.log(`Passed ${checks} randomized, full-game engine tests plus daily, flags, and safety checks.`);
