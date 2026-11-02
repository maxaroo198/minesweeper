export type Difficulty = 'easy' | 'medium' | 'hard';
export type Mode = 'classic' | 'blitz' | 'zen' | 'daily';
export type Status = 'ready' | 'playing' | 'won' | 'lost';

export interface Cell {
  mine: boolean;
  adjacent: number;
  revealed: boolean;
  flagged: boolean;
  exploded: boolean;
}
export interface BoardState {
  cells: Cell[];
  rows: number;
  cols: number;
  mines: number;
  status: Status;
  startedAt: number | null;
  finishedAt: number | null;
  mode: Mode;
  difficulty: Difficulty;
  id: string;
}
export interface GameRecord {
  id: string;
  mode: Mode;
  difficulty: Difficulty;
  won: boolean;
  seconds: number;
  date: string;
}
export const DIFFICULTIES: Record<Difficulty, { label: string; rows: number; cols: number; mines: number }> = {
  // Every board is a perfect square: 9 × 9, 16 × 16, 30 × 30.
  easy: { label: 'Easy', rows: 9, cols: 9, mines: 10 },
  medium: { label: 'Medium', rows: 16, cols: 16, mines: 40 },
  hard: { label: 'Hard', rows: 30, cols: 30, mines: 99 },
};
export const MODE_NAMES: Record<Mode, string> = { classic: 'Classic', blitz: 'Blitz', zen: 'Branch', daily: 'Daily challenge' };
export const BLITZ_SECONDS = 60;
/** Selectable Blitz limits, shortest first. 15 seconds is a real knife-fight. */
export const BLITZ_OPTIONS = [15, 30, 45, 60, 90, 120, 180, 300];
export function blitzLabel(seconds: number) {
  return seconds >= 60 ? `${seconds / 60} min` : `${seconds}s`;
}

export function dayKey() { return new Date().toISOString().slice(0, 10); }
export function seededRandom(seed: string) {
  let a = 2166136261;
  for (let i = 0; i < seed.length; i++) a = Math.imul(a ^ seed.charCodeAt(i), 16777619);
  return () => {
    a += 0x6D2B79F5;
    let t = a;
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}
export function neighbors(index: number, rows: number, cols: number): number[] {
  const result: number[] = [];
  const r = Math.floor(index / cols), c = index % cols;
  for (let dr = -1; dr <= 1; dr++) for (let dc = -1; dc <= 1; dc++) {
    if (!dr && !dc) continue;
    const nr = r + dr, nc = c + dc;
    if (nr >= 0 && nr < rows && nc >= 0 && nc < cols) result.push(nr * cols + nc);
  }
  return result;
}
export function freshGame(mode: Mode, difficulty: Difficulty): BoardState {
  const config = DIFFICULTIES[difficulty];
  return {
    cells: Array.from({ length: config.rows * config.cols }, () => ({ mine: false, adjacent: 0, revealed: false, flagged: false, exploded: false })),
    rows: config.rows, cols: config.cols, mines: config.mines, status: 'ready', startedAt: null, finishedAt: null, mode, difficulty,
    id: typeof crypto.randomUUID === 'function' ? crypto.randomUUID() : `${Date.now()}-${Math.random()}`,
  };
}
export function plantBoard(state: BoardState, first: number): BoardState {
  const { rows, cols, mines } = state;
  const cells = state.cells.map(c => ({ ...c, mine: false, adjacent: 0 }));
  const safe = new Set([first, ...neighbors(first, rows, cols)]);
  const candidates = cells.map((_, i) => i).filter(i => !safe.has(i));
  const random = state.mode === 'daily' ? seededRandom(`minefield-v1-${dayKey()}-${state.difficulty}`) : Math.random;
  for (let i = candidates.length - 1; i > 0; i--) {
    const j = Math.floor(random() * (i + 1));
    [candidates[i], candidates[j]] = [candidates[j], candidates[i]];
  }
  candidates.slice(0, mines).forEach(i => { cells[i].mine = true; });
  cells.forEach((cell, i) => {
    if (!cell.mine) cell.adjacent = neighbors(i, rows, cols).filter(n => cells[n].mine).length;
  });
  return { ...state, cells };
}
export interface RevealChange {
  /** Every tile that flipped from covered to revealed. */
  opened: number[];
  /** BFS distance from the tile the player touched: drives the reveal ripple. */
  wave: Record<number, number>;
  hit: number | null;
}
export function openCells(cells: Cell[], indexes: number[], rows: number, cols: number, origin = indexes[0]): { cells: Cell[]; change: RevealChange } {
  const next = cells.map(c => ({ ...c }));
  const queue = indexes.map(i => ({ index: i, depth: 0 }));
  const opened: number[] = [];
  const wave: Record<number, number> = {};
  let hit: number | null = null;
  while (queue.length) {
    const { index: i, depth } = queue.shift()!;
    const cell = next[i];
    if (cell.revealed || cell.flagged) continue;
    cell.revealed = true;
    opened.push(i);
    wave[i] = neighbors(i, rows, cols).includes(origin) || i === origin ? depth : depth + 1;
    if (cell.mine) { cell.exploded = true; hit = i; break; }
    if (cell.adjacent === 0) for (const neighbor of neighbors(i, rows, cols)) {
      if (!next[neighbor].revealed && !next[neighbor].flagged) queue.push({ index: neighbor, depth: depth + 1 });
    }
  }
  return { cells: next, change: { opened, wave, hit } };
}
export function reveal(state: BoardState, index: number): { state: BoardState; change: RevealChange } {
  const unchanged: RevealChange = { opened: [], wave: {}, hit: null };
  if (state.status === 'won' || state.status === 'lost' || state.cells[index]?.flagged) return { state, change: unchanged };
  let next = state;
  const now = Date.now();
  if (state.status === 'ready') next = { ...plantBoard(state, index), status: 'playing', startedAt: now };
  let indexes = [index];
  if (next.cells[index].revealed) {
    const around = neighbors(index, next.rows, next.cols);
    if (!next.cells[index].adjacent || around.filter(i => next.cells[i].flagged).length !== next.cells[index].adjacent) return { state: next, change: unchanged };
    indexes = around.filter(i => !next.cells[i].revealed && !next.cells[i].flagged);
  }
  const result = openCells(next.cells, indexes, next.rows, next.cols, index);
  const won = result.change.hit === null && result.cells.every(c => c.mine || c.revealed);
  return {
    state: { ...next, cells: result.cells, status: result.change.hit !== null ? 'lost' : won ? 'won' : 'playing', finishedAt: result.change.hit !== null || won ? now : null },
    change: result.change,
  };
}
export function toggleFlag(state: BoardState, index: number): BoardState {
  if (state.status === 'won' || state.status === 'lost' || state.cells[index].revealed) return state;
  if (!state.cells[index].flagged && state.cells.filter(c => c.flagged).length >= state.mines) return state;
  return { ...state, cells: state.cells.map((c, i) => i === index ? { ...c, flagged: !c.flagged } : c) };
}
export function previewBoard(): BoardState {
  let state = freshGame('classic', 'easy');
  state = { ...state, cells: state.cells.map((cell, i) => ({ ...cell, mine: [5, 8, 15, 28, 39, 45, 55, 64, 73, 77].includes(i) })) };
  state.cells.forEach((cell, i) => { cell.adjacent = neighbors(i, state.rows, state.cols).filter(n => state.cells[n].mine).length; });
  const revealed = [21, 22, 23, 30, 31, 32, 40, 41, 42, 49, 50, 51, 58, 59, 60, 67, 68, 69, 70, 76, 78];
  return { ...state, cells: state.cells.map((cell, i) => ({ ...cell, revealed: revealed.includes(i) && !cell.mine })) };
}
export function formatTime(seconds: number) {
  const value = Math.max(0, Math.floor(seconds));
  return `${String(Math.floor(value / 60)).padStart(2, '0')}:${String(value % 60).padStart(2, '0')}`;
}
export function readRecords(): GameRecord[] {
  try {
    const data: unknown = JSON.parse(localStorage.getItem('minefield-games-v1') || '[]');
    if (!Array.isArray(data)) return [];
    return data.filter((r): r is GameRecord => !!r && typeof r.id === 'string' && typeof r.seconds === 'number' && typeof r.won === 'boolean' && ['classic', 'blitz', 'zen', 'daily'].includes(r.mode) && ['easy', 'medium', 'hard'].includes(r.difficulty) && typeof r.date === 'string');
  } catch { return []; }
}

/* --- Daily challenge: a numbered puzzle with a rotating twist --- */

/** Days since the first daily, 1-based, so every puzzle has a number. */
export function dailyNumber(date = new Date()) {
  const start = Date.UTC(2025, 0, 1);
  const today = Date.UTC(date.getUTCFullYear(), date.getUTCMonth(), date.getUTCDate());
  return Math.floor((today - start) / 86400000) + 1;
}

export interface DailyTwist {
  id: 'standard' | 'packed' | 'noflags' | 'sprint';
  name: string;
  blurb: string;
  /** Multiplier on the difficulty's usual mine count. */
  mineScale?: number;
  /** Flags are not available today. */
  noFlags?: boolean;
  /** Competing against a clock, in seconds. */
  seconds?: number;
}

/** Same twist for every player, rotating once a day. */
export const DAILY_TWISTS: DailyTwist[] = [
  { id: 'standard', name: 'Classic rules', blurb: 'A clean, honest board. Nothing extra.' },
  { id: 'packed', name: 'Packed', blurb: 'A third more mines than usual. Every clue counts.', mineScale: 1.33 },
  { id: 'noflags', name: 'Flag-free', blurb: 'No flags today. Pure deduction, one square at a time.', noFlags: true },
  { id: 'sprint', name: 'Sprint', blurb: 'Two minutes on the clock. Clear it before the timer does.', seconds: 120 },
];

export function dailyTwist(index = dailyNumber()): DailyTwist {
  return DAILY_TWISTS[((index % DAILY_TWISTS.length) + DAILY_TWISTS.length) % DAILY_TWISTS.length];
}

/** A daily board, with today's twist already applied. */
export function dailyBoard(difficulty: Difficulty, index = dailyNumber()): BoardState {
  const twist = dailyTwist(index);
  const board = freshGame('daily', difficulty);
  if (twist.mineScale) {
    // Keep at least one safe ring around the opening move plantable.
    board.mines = Math.min(Math.round(board.mines * twist.mineScale), board.cells.length - 9);
  }
  return board;
}
