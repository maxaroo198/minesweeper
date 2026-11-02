/**
 * Riptide: every fifteen seconds the tide runs through one row and one column,
 * carrying the mines along with it and rewriting the numbers on the squares
 * you've already opened. Nothing a mine can do is hidden from you — the swap
 * only ever happens among covered squares, so an open square never becomes a
 * mine — but every deduction has a shelf life.
 */
import { neighbors } from './game';
import type { BoardState, Cell } from './game';

export const TIDE_SECONDS = 15;

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

/** Slide one row and one column. Never touches an opened square. */
export function driftBoard(state: BoardState, rng: () => number = Math.random): Drift {
  if (state.status !== 'playing') return { state, row: -1, col: -1, changed: false, moved: [] };
  const cells = state.cells.map(c => ({ ...c }));
  const row = Math.floor(rng() * state.rows);
  const col = Math.floor(rng() * state.cols);
  const rowIndexes: number[] = [];
  const colIndexes: number[] = [];
  for (let c = 0; c < state.cols; c++) {
    const i = row * state.cols + c;
    if (!cells[i].revealed) rowIndexes.push(i);
  }
  for (let r = 0; r < state.rows; r++) {
    const i = r * state.cols + col;
    if (!cells[i].revealed) colIndexes.push(i);
  }
  const movedRow = cycleLine(cells, rowIndexes);
  const movedCol = cycleLine(cells, colIndexes);
  const changed = movedRow || movedCol;
  if (!changed) return { state, row, col, changed: false, moved: [] };
  recount(cells, state.rows, state.cols);
  const moved = [...new Set([...rowIndexes, ...colIndexes, ...state.cells.flatMap((c, i) => (c.revealed ? [i] : []))])];
  return { state: { ...state, cells }, row, col, changed, moved };
}
