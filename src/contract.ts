/**
 * Contract mode: every board deals three objectives worth one star each.
 * A win with all three is a three-star clear, which is what the leaderboard
 * sorts on first. The rules are all checkable from the finished board alone, so
 * nothing extra has to be persisted to replay or verify a result.
 */
import { seededRandom } from './game';
import type { BoardState, Difficulty, ObjectiveId } from './game';

export const OBJECTIVE_POOL: ObjectiveId[] = ['speed', 'flagless', 'chordless', 'accuracy', 'corners'];

export interface Objective {
  id: ObjectiveId;
  label: string;
  blurb: string;
  done: boolean;
}

/** How long "quickly" means on each board. */
export function speedLimit(difficulty: Difficulty): number {
  if (difficulty === 'hard') return 240;
  if (difficulty === 'medium') return 120;
  if (difficulty === 'easy') return 60;
  return 120;
}

function clock(seconds: number) {
  return `${Math.floor(seconds / 60)}:${String(seconds % 60).padStart(2, '0')}`;
}

/** Three distinct objectives, stable for a given board id so a restart re-deals. */
export function dealObjectives(seed: string): ObjectiveId[] {
  const random = seededRandom(`contract-${seed}`);
  const pool = [...OBJECTIVE_POOL];
  for (let i = pool.length - 1; i > 0; i--) {
    const j = Math.floor(random() * (i + 1));
    [pool[i], pool[j]] = [pool[j], pool[i]];
  }
  return pool.slice(0, 3);
}

/** Rate the dealt objectives against the board as it stands right now. */
export function rateObjectives(ids: ObjectiveId[], state: BoardState, seconds: number): Objective[] {
  const won = state.status === 'won';
  const limit = speedLimit(state.difficulty);
  const wrongFlags = state.cells.filter(c => c.flagged && !c.mine).length;
  const corners = [0, state.cols - 1, (state.rows - 1) * state.cols, state.cells.length - 1];
  const cornersOpen = corners.every(i => state.cells[i]?.revealed);
  return ids.map(id => {
    switch (id) {
      case 'speed':
        return { id, label: `Clear it in under ${clock(limit)}`, blurb: 'A contract with a deadline on it.', done: won && seconds < limit };
      case 'flagless':
        return { id, label: 'Win without planting a flag', blurb: 'Every mine stays a thought, not a marker.', done: won && state.flagsPlaced === 0 };
      case 'chordless':
        return { id, label: 'Win without chording', blurb: 'No tapping numbers to open their neighbours.', done: won && state.chords === 0 };
      case 'accuracy':
        return { id, label: 'Never flag a safe square', blurb: 'One wrong flag and this star is gone.', done: won && wrongFlags === 0 };
      case 'corners':
      default:
        return { id, label: 'Open all four corners', blurb: 'The edges are part of the job.', done: won ? cornersOpen : cornersOpen };
    }
  });
}

/** Stars earned: only a cleared board pays out. */
export function contractStars(ids: ObjectiveId[], state: BoardState, seconds: number): number {
  if (state.status !== 'won') return 0;
  return rateObjectives(ids, state, seconds).filter(o => o.done).length;
}

export function starLabel(stars: number): string {
  return `${'★'.repeat(stars)}${'☆'.repeat(Math.max(0, 3 - stars))}`;
}
