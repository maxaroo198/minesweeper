/**
 * Riptide: every eight seconds the tide runs through every row and column,
 * carrying the mines along with it and rewriting the numbers on the squares
 * you've already opened. Nothing a mine can do is hidden from you — the swap
 * only ever happens among covered squares, so an open square never becomes a
 * mine — but every deduction has a shelf life.
 */
import { neighbors } from './game';
import type { BoardState, Cell } from './game';

export const TIDE_SECONDS = 8;

function recount(cells: Cell[], rows: number, cols: number) {
  cells.forEach((cell, i) => {
    if (!cell.mine) cell.adjacent = neighbors(i, rows, cols).filter(n => cells[n].mine).length;
  });
}

/**
 * Cyclically shift the mine/empty values among covered squares of one line.
 * The number of mines on the line never changes, so the board's total never does.
 */
function cycleLine(cells: Cell[], indexes: number[]): boolean {
  if (indexes.length < 2) return false;
  const mines = indexes.map(i => cells[i].mine);
  if (mines.every(m => m === mines[0])) return false;
  const shifted = [mines[mines.length - 1], ...mines.slice(0, -1)];
  indexes.forEach((i, k) => { cells[i].mine = shifted[k]; });
  return true;
}

export interface Drift {
  state: BoardState;
  row: number;
  col: number;
  changed: boolean;
  /** Covered squares whose status just changed, for the animation. */
  moved: number[];
}

/** Shift every row and every column. Never touches an opened square. */
export function driftBoard(state: BoardState, rng: () => number = Math.random): Drift {
  if (state.status !== 'playing') return { state, row: -1, col: -1, changed: false, moved: [] };
  const cells = state.cells.map(c => ({ ...c }));
  const row = -1, col = -1;
  let changed = false;
  for (let r = 0; r < state.rows; r++) {
    const indexes = cells.flatMap((c, i) => !(c.flagged && c.mine) && !c.revealed && Math.floor(i / state.cols) === r ? [i] : []);
    if (rng() < 0.5) indexes.reverse();
    changed = cycleLine(cells, indexes) || changed;
  }
  for (let c = 0; c < state.cols; c++) {
    const indexes = cells.flatMap((cell, i) => !(cell.flagged && cell.mine) && !cell.revealed && i % state.cols === c ? [i] : []);
    if (rng() < 0.5) indexes.reverse();
    changed = cycleLine(cells, indexes) || changed;
  }
  if (!changed) return { state, row, col, changed: false, moved: [] };
  recount(cells, state.rows, state.cols);
  cells.forEach(c => { c.hidden = false; c.scanned = null; });
  const moved = cells.flatMap((c, i) => c.mine !== state.cells[i].mine || c.adjacent !== state.cells[i].adjacent ? [i] : []);
  return { state: { ...state, cells }, row, col, changed, moved };
}
