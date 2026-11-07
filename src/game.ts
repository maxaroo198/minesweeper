export type Difficulty = 'easy' | 'medium' | 'hard' | 'blackout' | 'custom';
export type Mode = 'classic' | 'blitz' | 'zen' | 'daily' | 'nightfall' | 'custom' | 'riptide' | 'contract' | 'scan';
export type Status = 'ready' | 'playing' | 'won' | 'lost';
/** Contract objective ids. Labels and rules live in contract.ts. */
export type ObjectiveId = 'speed' | 'flagless' | 'chordless' | 'accuracy' | 'corners' | 'allflags' | 'minimalist' | 'chorder' | 'sprint' | 'patient' | 'unassisted' | 'efficient' | 'expert-speed' | 'clean-sprint' | 'no-tools-speed' | 'precise-chords' | 'flag-discipline' | 'half-flags' | 'economical' | 'no-chord-sprint' | 'safe-border' | 'marked-corners' | 'perfect-tech' | 'chord-sprint';

export interface Cell {
  mine: boolean;
  adjacent: number;
  revealed: boolean;
  flagged: boolean;
  exploded: boolean;
  /** Revealed, but Nightfall kept the number to itself. */
  hidden: boolean;
  /** The honest count a Scan charge paid for, or null. */
  scanned: number | null;
  chargeEarned?: boolean;
}
export interface CustomConfig { rows: number; cols: number; mines: number }
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
  /** Chords used this game — the Contract board counts them. */
  chords: number;
  /** Flags planted this game, even if they were taken back off. */
  flagsPlaced: number;
  /** Scan charges left. */
  charges: number;
  /** Scans spent this game. */
  scans: number;
  /** Contract objectives dealt for this game. */
  objectives: ObjectiveId[];
  mistakes?: number;
  rescues?: number;
  reveals?: number;
  /** The size picked in Custom mode, kept so a restart rebuilds the same board. */
  dailyDay?: string;
  custom?: CustomConfig;
}
export interface GameRecord {
  id: string;
  mode: Mode;
  difficulty: Difficulty;
  won: boolean;
  seconds: number;
  date: string;
  /** Contract stars (0–3). */
  stars?: number;
  /** Custom board size, so a leaderboard row can show what was played. */
  dailyDay?: string;
  custom?: CustomConfig;
}
export const DIFFICULTIES: Record<Difficulty, { label: string; rows: number; cols: number; mines: number }> = {
  // Square boards, sized so density grows gently: 12%, 17%, 18%.
  easy: { label: 'Easy', rows: 9, cols: 9, mines: 10 },
  medium: { label: 'Medium', rows: 12, cols: 12, mines: 24 },
  hard: { label: 'Hard', rows: 20, cols: 20, mines: 70 },
  // Nightfall's extra rung: same 12 × 12 board, far less trustworthy.
  blackout: { label: 'Blackout', rows: 12, cols: 12, mines: 22 },
  // Custom borrows this shape until the player picks their own.
  custom: { label: 'Custom', rows: 14, cols: 14, mines: 30 },
};
/** Which difficulties each mode offers. Nightfall adds Blackout; Custom has one. */
export const MODE_DIFFICULTIES: Record<Mode, Difficulty[]> = {
  classic: ['easy', 'medium', 'hard'],
  blitz: ['easy', 'medium', 'hard'],
  zen: ['easy'],
  daily: ['easy', 'medium', 'hard'],
  nightfall: ['easy', 'medium', 'hard', 'blackout'],
  custom: ['custom'],
  riptide: ['easy', 'medium', 'hard'],
  contract: ['easy', 'medium', 'hard'],
  scan: ['easy', 'medium', 'hard'],
};
/** Nightfall is always 12 × 12; the difficulty only changes how many mines are in it. */
export const NIGHTFALL_MINES: Record<string, number> = { easy: 14, medium: 24, hard: 32, blackout: 22 };
export const CUSTOM_LIMITS = { min: 5, max: 40, minMines: 1, maxDensity: 0.45 };
export const MODE_NAMES: Record<Mode, string> = {
  classic: 'Classic', blitz: 'Blitz', zen: 'Branch', daily: 'Daily challenge',
  nightfall: 'Nightfall', custom: 'Custom', riptide: 'Riptide', contract: 'Contract', scan: 'Scan',
};
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
/** Clamp a player's custom size into something the board can actually draw. */
export function clampCustom(config: Partial<CustomConfig> = {}): CustomConfig {
  const clamp = (value: unknown, fallback: number) => {
    const n = Math.round(Number(value));
    return Number.isFinite(n) ? Math.min(CUSTOM_LIMITS.max, Math.max(CUSTOM_LIMITS.min, n)) : fallback;
  };
  const rows = clamp(config.rows, DIFFICULTIES.custom.rows);
  const cols = clamp(config.cols, DIFFICULTIES.custom.cols);
  const ceiling = Math.max(CUSTOM_LIMITS.minMines, Math.floor(rows * cols * CUSTOM_LIMITS.maxDensity));
  const wanted = Math.round(Number(config.mines));
  const mines = Number.isFinite(wanted) ? Math.min(ceiling, Math.max(CUSTOM_LIMITS.minMines, wanted)) : Math.min(ceiling, DIFFICULTIES.custom.mines);
  return { rows, cols, mines };
}
/** The shape a mode + difficulty plays on, custom sizes included. */
export function boardConfig(mode: Mode, difficulty: Difficulty, custom?: CustomConfig) {
  if (mode === 'custom') return { ...DIFFICULTIES.custom, ...clampCustom(custom) };
  if (mode === 'nightfall') {
    const rung = difficulty === 'custom' || !NIGHTFALL_MINES[difficulty] ? 'medium' : difficulty;
    return { ...DIFFICULTIES.medium, label: DIFFICULTIES[difficulty]?.label ?? 'Nightfall', rows: 12, cols: 12, mines: NIGHTFALL_MINES[rung] };
  }
  return DIFFICULTIES[difficulty] ?? DIFFICULTIES.easy;
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
export function freshGame(mode: Mode, difficulty: Difficulty, custom?: CustomConfig): BoardState {
  const config = boardConfig(mode, difficulty, custom);
  return {
    cells: Array.from({ length: config.rows * config.cols }, () => ({ mine: false, adjacent: 0, revealed: false, flagged: false, exploded: false, hidden: false, scanned: null })),
    rows: config.rows, cols: config.cols, mines: config.mines, status: 'ready', startedAt: null, finishedAt: null, mode, difficulty,
    id: typeof crypto.randomUUID === 'function' ? crypto.randomUUID() : `${Date.now()}-${Math.random()}`,
    chords: 0, flagsPlaced: 0, charges: mode === 'scan' ? 6 : 0, scans: 0, objectives: [],
    custom: mode === 'custom' ? { rows: config.rows, cols: config.cols, mines: config.mines } : undefined,
  };
}
export function plantBoard(state: BoardState, first: number): BoardState {
  const { rows, cols, mines } = state;
  const cells = state.cells.map(c => ({ ...c, mine: false, adjacent: 0 }));
  const safe = new Set([first, ...neighbors(first, rows, cols)]);
  const candidates = cells.map((_, i) => i).filter(i => !safe.has(i));
  const random = state.mode === 'daily' ? seededRandom(`minefield-v1-${state.dailyDay ?? dayKey()}-${state.difficulty}`) : state.mode === 'contract' ? seededRandom(`contract-board-${state.id}-${state.difficulty}`) : Math.random;
  for (let i = candidates.length - 1; i > 0; i--) {
    const j = Math.floor(random() * (i + 1));
    [candidates[i], candidates[j]] = [candidates[j], candidates[i]];
  }
  candidates.slice(0, mines).forEach(i => { cells[i].mine = true; });
  cells.forEach((cell, i) => {
    if (!cell.mine) cell.adjacent = neighbors(i, rows, cols).filter(n => cells[n].mine).length;
  });
  return { ...state, cells, mistakes: (state.mistakes ?? 0) + cells.filter(c => c.flagged && !c.mine).length };
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
/* --- Nightfall: a board that forgets its own numbers --- */

export interface FogRule { base: number; step: number; everySeconds: number; cap: number }
/** Base chance is 1 in 10, then it climbs 5% every two seconds. Blackout starts at 1 in 3. */
export const FOG_RULES: Record<'nightfall' | 'blackout', FogRule> = {
  nightfall: { base: 0.1, step: 0.05, everySeconds: 2, cap: 0.7 },
  blackout: { base: 1 / 3, step: 0.05, everySeconds: 2, cap: 1 },
};
/** How likely the mist is to take a number right now, given how long you have been playing. */
export function fogChance(state: BoardState, now = Date.now()): number {
  if (state.mode !== 'nightfall') return 0;
  const rule = FOG_RULES[state.difficulty === 'blackout' ? 'blackout' : 'nightfall'];
  const elapsed = state.startedAt === null ? 0 : Math.max(0, (now - state.startedAt) / 1000);
  const steps = Math.floor(elapsed / rule.everySeconds);
  return Math.min(rule.cap, rule.base + rule.step * steps);
}
/** Hidden numbered tiles may touch; empty tiles still flood normally. */
export function applyFog(cells: Cell[], opened: number[], _rows: number, _cols: number, chance: number, rng: () => number = Math.random): Cell[] {
  if (chance <= 0) return cells;
  let next = cells;
  for (const i of opened) {
    const cell = next[i];
    if (!cell || cell.mine || cell.adjacent === 0 || cell.hidden) continue;
    if (rng() >= chance) continue;
    if (next === cells) next = cells.map(c => ({ ...c }));
    next[i] = { ...next[i], hidden: true };
  }
  return next;
}

export function reveal(state: BoardState, index: number): { state: BoardState; change: RevealChange } {
  const unchanged: RevealChange = { opened: [], wave: {}, hit: null };
  if (state.status === 'won' || state.status === 'lost' || state.cells[index]?.flagged) return { state, change: unchanged };
  let next = state;
  const now = Date.now();
  if (state.status === 'ready') next = { ...plantBoard(state, index), status: 'playing', startedAt: now };
  let indexes = [index];
  let chords = next.chords;
  if (next.cells[index].revealed) {
    // A fogged number cannot be trusted, so it cannot be chorded either.
    if (next.cells[index].hidden) return { state: next, change: unchanged };
    const around = neighbors(index, next.rows, next.cols);
    if (!next.cells[index].adjacent || around.filter(i => next.cells[i].flagged).length !== next.cells[index].adjacent) return { state: next, change: unchanged };
    indexes = around.filter(i => !next.cells[i].revealed && !next.cells[i].flagged);
    chords += 1;
  }
  const result = openCells(next.cells, indexes, next.rows, next.cols, index);
  const cells = applyFog(result.cells, result.change.opened, next.rows, next.cols, fogChance(next, now));
  const won = result.change.hit === null && cells.every(c => c.mine || c.revealed);
  return {
    state: { ...next, cells, chords, reveals: (next.reveals ?? 0) + 1, status: result.change.hit !== null ? 'lost' : won ? 'won' : 'playing', finishedAt: result.change.hit !== null || won ? now : null },
    change: result.change,
  };
}
export function toggleFlag(state: BoardState, index: number): BoardState {
  if (state.status === 'won' || state.status === 'lost' || state.cells[index].revealed) return state;
  const cell = state.cells[index];
  if (!cell.flagged && state.cells.filter(c => c.flagged).length >= state.mines) return state;
  // Flagging a real mine is how Scan mode earns another charge.
  const earned = !cell.flagged && state.mode === 'scan' && cell.mine && !cell.chargeEarned ? 1 : 0;
  return {
    ...state,
    mistakes: (state.mistakes ?? 0) + (!cell.flagged && !cell.mine && state.status !== 'ready' ? 1 : 0),
    charges: state.charges + earned,
    flagsPlaced: cell.flagged ? state.flagsPlaced : state.flagsPlaced + 1,
    cells: state.cells.map((c, i) => i === index ? { ...c, flagged: !c.flagged, chargeEarned: c.chargeEarned || earned > 0 } : c),
  };
}
/** A scan is permanent: -1 means unknown, so retrying cannot reroll it. */
export function scanPatch(state: BoardState, index: number, rng: () => number = Math.random): BoardState {
  const cell = state.cells[index];
  if (state.mode !== 'scan' || state.charges <= 0 || state.status === 'won' || state.status === 'lost' || !cell || cell.revealed || cell.flagged || cell.scanned !== null) return state;
  const now = Date.now();
  const next = state.status === 'ready' ? { ...plantBoard(state, index), status: 'playing' as Status, startedAt: now } : state;
  const target = next.cells[index];
  const unknown = next.charges === 1 || target.mine || rng() < 0.4;
  const cost = unknown ? 1 : 2;
  return {
    ...next, charges: Math.max(0, next.charges - cost), scans: next.scans + 1,
    cells: next.cells.map((c, i) => i === index ? { ...c, scanned: unknown ? -1 : c.adjacent } : c),
  };
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
    const modes: string[] = ['classic', 'blitz', 'zen', 'daily', 'nightfall', 'custom', 'riptide', 'contract', 'scan'];
    const rungs: string[] = ['easy', 'medium', 'hard', 'blackout', 'custom'];
    return data.filter((r): r is GameRecord => !!r && typeof r.id === 'string' && typeof r.seconds === 'number' && typeof r.won === 'boolean' && modes.includes(r.mode) && rungs.includes(r.difficulty) && typeof r.date === 'string');
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
  const board = { ...freshGame('daily', difficulty), dailyDay: dayKey() };
  if (twist.mineScale) {
    // Keep at least one safe ring around the opening move plantable.
    board.mines = Math.min(Math.round(board.mines * twist.mineScale), board.cells.length - 9);
  }
  return board;
}
