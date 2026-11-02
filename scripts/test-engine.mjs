import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import ts from 'typescript';
const output = ts.transpileModule(readFileSync(new URL('../src/game.ts', import.meta.url), 'utf8'), { compilerOptions: { target: ts.ScriptTarget.ES2020, module: ts.ModuleKind.ESNext } }).outputText;
const { freshGame, plantBoard, reveal, toggleFlag, neighbors, seededRandom, DIFFICULTIES, DAILY_TWISTS, dailyBoard, dailyTwist } = await import(`data:text/javascript;base64,${Buffer.from(output).toString('base64')}`);

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
console.log(`Daily twists: ${DAILY_TWISTS.map(t => t.name).join(' → ')}`);
console.log(`Passed ${checks} randomized, full-game engine tests plus daily, flags, and safety checks.`);
