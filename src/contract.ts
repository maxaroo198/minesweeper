/**
 * Contract mode: every board deals three objectives worth one star each.
 * A win with all three is a three-star clear, which is what the leaderboard
 * sorts on first. The rules are all checkable from the finished board alone, so
 * nothing extra has to be persisted to replay or verify a result.
 */
import { seededRandom } from './game';
import type { BoardState, Difficulty, ObjectiveId } from './game';

export const OBJECTIVE_POOL: ObjectiveId[] = ['speed', 'flagless', 'chordless', 'accuracy', 'corners', 'allflags', 'minimalist', 'chorder', 'sprint', 'patient', 'unassisted', 'efficient', 'expert-speed', 'clean-sprint', 'no-tools-speed', 'precise-chords', 'flag-discipline', 'half-flags', 'economical', 'no-chord-sprint', 'safe-border', 'marked-corners', 'perfect-tech', 'chord-sprint'];

export interface Objective {
  id: ObjectiveId;
  label: string;
  blurb: string;
  done: boolean;
}

/** How long "quickly" means on each board. */
export function speedLimit(difficulty: Difficulty): number {
  if (difficulty === 'hard') return 200;
  if (difficulty === 'medium') return 100;
  if (difficulty === 'easy') return 45;
  return 100;
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
  // Never deal mutually exclusive flag/chord conditions together.
  const chosen: ObjectiveId[] = [];
  for (const id of pool) {
    const requiresFlags = ['allflags', 'flag-discipline', 'safe-border', 'corners', 'marked-corners'];
    const limitsFlags = ['flagless', 'minimalist', 'half-flags', 'perfect-tech'];
    const needsChords = ['chorder', 'precise-chords', 'chord-sprint'];
    const forbidsChords = ['chordless', 'no-chord-sprint', 'perfect-tech', 'flagless'];
    if ((requiresFlags.includes(id) && chosen.some(x => limitsFlags.includes(x))) ||
        (limitsFlags.includes(id) && chosen.some(x => requiresFlags.includes(x))) ||
        (needsChords.includes(id) && chosen.some(x => forbidsChords.includes(x))) ||
        (forbidsChords.includes(id) && chosen.some(x => needsChords.includes(x)))) continue;
    chosen.push(id);
    if (chosen.length === 3) break;
  }
  return chosen;
}

/** Rate the dealt objectives against the board as it stands right now. */
export function rateObjectives(ids: ObjectiveId[], state: BoardState, seconds: number): Objective[] {
  const won = state.status === 'won';
  const limit = speedLimit(state.difficulty);
  const wrongFlags = state.cells.filter(c => c.flagged && !c.mine).length;
  const corners = [0, state.cols - 1, (state.rows - 1) * state.cols, state.cells.length - 1];
  const cornersOpen = corners.every(i => (state.cells[i]?.revealed || (state.cells[i]?.mine && state.cells[i]?.flagged)));
  return ids.map(id => {
    switch (id) {
      case 'speed':
        return { id, label: `Clear it in under ${clock(limit)}`, blurb: 'A contract with a deadline on it.', done: won && seconds < limit };
      case 'flagless':
        return { id, label: 'Win without planting a flag', blurb: 'Every mine stays a thought, not a marker.', done: won && state.flagsPlaced === 0 };
      case 'chordless':
        return { id, label: 'Win without chording', blurb: 'No tapping numbers to open their neighbours.', done: won && state.chords === 0 };
      case 'accuracy':
        return { id, label: 'Never flag a safe square', blurb: 'One wrong flag and this star is gone.', done: won && wrongFlags === 0 && (state.mistakes ?? 0) === 0 };
      case 'allflags':
        return { id, label: 'Mark every mine', blurb: 'Finish with all mines correctly flagged.', done: won && state.cells.every(c => !c.mine || c.flagged) };
      case 'minimalist':
        return { id, label: 'Travel light', blurb: 'Plant no more than three flags in total.', done: won && state.flagsPlaced <= 3 };
      case 'chorder':
        return { id, label: 'Chain reaction', blurb: 'Use at least three chords and win.', done: won && state.chords >= 3 };
      case 'sprint':
        return { id, label: `Sprint under ${clock(Math.floor(limit * 0.75))}`, blurb: 'A tighter deadline for an extra challenge.', done: won && seconds < limit * 0.75 };
      case 'patient':
        return { id, label: 'Measured pace', blurb: `Win within ${clock(limit * 2)} with no wrong flags.`, done: won && seconds <= limit * 2 && (state.mistakes ?? 0) === 0 && wrongFlags === 0 };
      case 'unassisted':
        return { id, label: 'Self sufficient', blurb: 'Clear the board without using your rescue.', done: won && !state.rescues };
      case 'efficient':
        return { id, label: 'Efficient explorer', blurb: `Win in at most ${Math.ceil(state.rows * state.cols * 0.6)} reveal actions.`, done: won && (state.reveals ?? 0) <= Math.ceil(state.rows * state.cols * 0.6) };
      case 'expert-speed':
        return { id, label: `Expert clear under ${clock(Math.floor(limit / 2))}`, blurb: 'Half the normal deadline.', done: won && seconds < limit / 2 };
      case 'clean-sprint':
        return { id, label: 'Clean sprint', blurb: `Under ${clock(Math.floor(limit * .75))}, with no wrong flags.`, done: won && seconds < limit * .75 && !state.mistakes && wrongFlags === 0 };
      case 'no-tools-speed':
        return { id, label: 'Unaided rush', blurb: `Under ${clock(limit)} without rescue.`, done: won && seconds < limit && !state.rescues };
      case 'precise-chords':
        return { id, label: 'Six clean chords', blurb: 'Win with at least six chords and no wrong flags.', done: won && state.chords >= 6 && !state.mistakes && wrongFlags === 0 };
      case 'flag-discipline':
        return { id, label: 'One marker per mine', blurb: 'Flag every mine, with exactly one placement per mine and no mistakes.', done: won && state.flagsPlaced === state.mines && !state.mistakes && state.cells.every(c => !c.mine || c.flagged) };
      case 'half-flags':
        return { id, label: 'Half a toolkit', blurb: `At most ${Math.floor(state.mines / 2)} total flag placements; no rescue.`, done: won && state.flagsPlaced <= Math.floor(state.mines / 2) && !state.rescues };
      case 'economical':
        return { id, label: 'Master explorer', blurb: `At most ${Math.ceil(state.cells.length * .35)} reveal actions, without rescue.`, done: won && (state.reveals ?? 0) <= Math.ceil(state.cells.length * .35) && !state.rescues };
      case 'no-chord-sprint':
        return { id, label: 'Manual speedrun', blurb: `Win under ${clock(limit)} without any chords.`, done: won && seconds < limit && state.chords === 0 };
      case 'safe-border':
        return { id, label: 'Secure the perimeter', blurb: 'Reveal every safe border tile and flag every border mine.', done: won && state.cells.every((c, i) => !(i < state.cols || i >= (state.rows - 1) * state.cols || i % state.cols === 0 || i % state.cols === state.cols - 1) || (c.mine ? c.flagged : c.revealed)) };
      case 'marked-corners':
        return { id, label: 'Fast corner patrol', blurb: `Secure all four corners under ${clock(Math.floor(limit * .75))}.`, done: won && cornersOpen && seconds < limit * .75 };
      case 'perfect-tech':
        return { id, label: 'Pure deduction', blurb: `No flags, chords or rescue; finish under ${clock(Math.floor(limit * 1.5))}.`, done: won && !state.flagsPlaced && !state.chords && !state.rescues && seconds < limit * 1.5 };
      case 'chord-sprint':
        return { id, label: 'Chain sprint', blurb: `At least three chords, under ${clock(Math.floor(limit * .75))}, no rescue.`, done: won && state.chords >= 3 && seconds < limit * .75 && !state.rescues };
      case 'corners':
      default:
        return { id, label: 'Secure all four corners', blurb: 'Reveal safe corners and flag any mined corners.', done: won ? cornersOpen : cornersOpen };
    }
  });
}

/** Stars earned: only a cleared board pays out. */
export function contractStars(ids: ObjectiveId[], state: BoardState, seconds: number): number {
  if (state.status !== 'won') return 0;
  return Math.max(0, rateObjectives(ids, state, seconds).filter(o => o.done).length - (state.rescues ?? 0));
}

export function starLabel(stars: number): string {
  return `${'★'.repeat(stars)}${'☆'.repeat(Math.max(0, 3 - stars))}`;
}

/** Optional badges do not change the three-star leaderboard rating. */
export function bonusObjectives(state: BoardState, seconds: number): Objective[] {
  const ids = OBJECTIVE_POOL.filter(id => !state.objectives.includes(id));
  const rng = seededRandom(`bonus-${state.id}`);
  for (let i = ids.length - 1; i > 0; i--) { const j = Math.floor(rng() * (i + 1)); [ids[i], ids[j]] = [ids[j], ids[i]]; }
  return rateObjectives(ids.slice(0, 2), state, seconds);
}
