/**
 * Branch mode: an infinite, branching minefield.
 *
 * The world is a tree of 9×9 / 10-mine areas. The root starts open; clearing an
 * area unlocks its children (a depth-0 area has 2 children, depth-1 has 3,
 * depth-2 has 4, and so on — the branch widens as you go). Hitting a mine locks
 * that area and re-randomizes it; if no open areas remain, the nearest ancestor
 * re-opens so you can replay it and re-unlock the branch. The whole world is
 * persisted to localStorage, so closing the app (including the Android WebView
 * shell) keeps your progress.
 */
import type { BoardState, Cell } from './game';
import { DIFFICULTIES, freshGame, neighbors } from './game';

export type BranchAreaState = 'locked' | 'open' | 'cleared';

export interface BranchArea {
  id: string;            // path id, e.g. "0", "0.2", "0.2.1"
  depth: number;
  parent: string | null;
  children: string[];
  state: BranchAreaState;
  mines: number[] | null;   // null until first move plants them
  revealed: number[];
  flagged: number[];
}

export interface BranchWorld {
  version: 1;
  areas: Record<string, BranchArea>;
  current: string;
  createdAt: number;
}

const STORAGE_KEY = 'minefield-zen-v1';

/** Branch factor grows with depth: root → 2 children, then 3, 4, 5… */
export function childrenCount(depth: number) {
  return depth + 2;
}

export function newWorld(): BranchWorld {
  const root: BranchArea = { id: '0', depth: 0, parent: null, children: [], state: 'open', mines: null, revealed: [], flagged: [] };
  return { version: 1, areas: { '0': root }, current: '0', createdAt: Date.now() };
}

function childId(parent: BranchArea, index: number) {
  return `${parent.id}.${index}`;
}

/** Attach (or reveal) an area's children. Called when the area is cleared. */
function growChildren(world: BranchWorld, area: BranchArea): BranchWorld {
  if (area.children.length) {
    for (const id of area.children) {
      const child = world.areas[id];
      if (child?.state === 'locked') child.state = 'open';
    }
    return world;
  }
  const count = childrenCount(area.depth);
  const children: string[] = [];
  for (let i = 0; i < count; i++) {
    const id = childId(area, i);
    children.push(id);
    world.areas[id] = { id, depth: area.depth + 1, parent: area.id, children: [], state: 'open', mines: null, revealed: [], flagged: [] };
  }
  world.areas[area.id] = { ...area, children };
  return world;
}

export function loadWorld(): BranchWorld | null {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return null;
    const data = JSON.parse(raw) as BranchWorld;
    if (!data || data.version !== 1 || !data.areas || !data.areas[data.current]) return null;
    // Repair the older dead-end save: a cleared parent with no playable tips.
    if (!openAreaIds(data).length) {
      const parent = Object.values(data.areas).find(a => a.state === 'cleared' && a.children.some(id => data.areas[id]?.state === 'locked'));
      if (parent) growChildren(data, parent);
      else {
        const root = data.areas['0'];
        if (!root) return null;
        data.areas['0'] = { ...root, state: 'open', mines: null, revealed: [], flagged: [] };
      }
    }
    if (data.areas[data.current].state === 'locked') data.current = openAreaIds(data)[0] ?? data.current;
    return data;
  } catch {
    return null;
  }
}

export function saveWorld(world: BranchWorld) {
  try { localStorage.setItem(STORAGE_KEY, JSON.stringify(world)); } catch { /* storage unavailable */ }
}

export function wipeWorld() {
  try { localStorage.removeItem(STORAGE_KEY); } catch { /* ignore */ }
}

/** Sync an area's progress from the board the player just moved on. */
export function syncArea(world: BranchWorld, board: BoardState): BranchWorld {
  const id = board.id.startsWith('zen-') ? board.id.slice(4) : world.current;
  world = copyWorld(world);
  const area = world.areas[id];
  if (!area || area.state !== 'open') return world;
  const mines = board.cells.flatMap((c, i) => (c.mine ? [i] : []));
  world.areas[id] = {
    ...area,
    mines: mines.length ? mines : area.mines,
    revealed: board.cells.flatMap((c, i) => (c.revealed && !c.mine ? [i] : [])),
    flagged: board.cells.flatMap((c, i) => (c.flagged ? [i] : [])),
  };
  return world;
}

/** Rebuild a playable board for an area. */
export function boardFromArea(world: BranchWorld, id: string): BoardState {
  const area = world.areas[id];
  const base = freshGame('zen', 'easy');
  if (!area) return base;
  const config = DIFFICULTIES.easy;
  const cells: Cell[] = Array.from({ length: config.rows * config.cols }, () => ({ mine: false, adjacent: 0, revealed: false, flagged: false, exploded: false, hidden: false, scanned: null }));
  (area.mines ?? []).forEach(i => { cells[i].mine = true; });
  cells.forEach((cell, i) => { if (!cell.mine) cell.adjacent = neighbors(i, config.rows, config.cols).filter(n => cells[n].mine).length; });
  area.revealed.forEach(i => { if (!cells[i].mine) cells[i].revealed = true; });
  area.flagged.forEach(i => { cells[i].flagged = true; });
  const won = area.mines !== null && cells.every(c => c.mine || c.revealed);
  return { ...base, cells, status: won ? 'won' : area.mines === null ? 'ready' : 'playing', startedAt: area.mines === null ? null : Date.now(), id: `zen-${area.id}` };
}

/** Clearing an area unlocks the branch behind it. */
export function clearArea(world: BranchWorld, id: string): BranchWorld {
  world = copyWorld(world);
  const area = world.areas[id];
  if (!area) return world;
  world.areas[id] = { ...area, state: 'cleared' };
  return growChildren(world, world.areas[id]);
}

/**
 * Hitting a mine locks the area and re-randomizes it. If that leaves no open
 * areas anywhere, the nearest ancestor re-opens: replay it to re-unlock the
 * branch. Returns { world, fallback } where fallback is the re-opened area id.
 */
export function failArea(world: BranchWorld, id: string): { world: BranchWorld; fallback: string | null; next: string } {
  world = copyWorld(world);
  const area = world.areas[id];
  if (!area || area.state !== 'open') return { world, fallback: null, next: openAreaIds(world)[0] ?? world.current };
  if (area) {
    world.areas[id] = { ...area, state: 'locked', mines: null, revealed: [], flagged: [] };
  }
  const openIds = Object.values(world.areas).filter(a => a.state === 'open').map(a => a.id);
  let fallback: string | null = null;
  if (!openIds.length && area) {
    // Walk up to the nearest ancestor and re-open it ("redo the area before").
    let cursor: BranchArea | undefined = area.parent ? world.areas[area.parent] : undefined;
    while (cursor && cursor.state === 'locked') cursor = cursor.parent ? world.areas[cursor.parent] : undefined;
    if (!cursor && area.parent === null) cursor = world.areas[id];
    if (cursor) {
      world.areas[cursor.id] = { ...cursor, state: 'open', mines: null, revealed: [], flagged: [] };
      fallback = cursor.id;
      openIds.push(cursor.id);
    }
  }
  const next = openIds[0] ?? world.current;
  return { world, fallback, next };
}

export function openAreaIds(world: BranchWorld): string[] {
  return Object.values(world.areas).filter(a => a.state === 'open').map(a => a.id);
}

/* --- Tidy horizontal tree layout for the zoomed-out branch map --- */

export interface MapNode {
  area: BranchArea;
  x: number;
  y: number;
}

/** Assign x by depth, y by a leaf-ordering walk (root on the left, branches to the right). */
export function layoutWorld(world: BranchWorld, xGap = 170, yGap = 64): { nodes: MapNode[]; edges: { from: MapNode; to: MapNode }[]; width: number; height: number } {
  const nodes: MapNode[] = [];
  const edges: { from: MapNode; to: MapNode }[] = [];
  let leaf = 0;
  const maxDepth = Math.max(...Object.values(world.areas).map(a => a.depth));
  const walk = (id: string): number => {
    const area = world.areas[id];
    const kids = area.children.filter(c => world.areas[c]);
    let y: number;
    if (!kids.length) {
      y = leaf++;
    } else {
      const ys = kids.map(k => walk(k));
      y = (Math.min(...ys) + Math.max(...ys)) / 2;
    }
    const node: MapNode = { area, x: area.depth * xGap, y: y * yGap };
    nodes.push(node);
    for (const k of kids) {
      const child = nodes.find(n => n.area.id === k)!;
      edges.push({ from: node, to: child });
    }
    return y;
  };
  if (world.areas['0']) walk('0');
  const width = (maxDepth + 1) * xGap + 80;
  const height = Math.max(leaf, 1) * yGap + 80;
  return { nodes, edges, width, height };
}

/** Helpers never mutate React state or another saved-world snapshot. */
function copyWorld(world: BranchWorld): BranchWorld {
  return { ...world, areas: Object.fromEntries(Object.entries(world.areas).map(([id, a]) => [id, { ...a, children: [...a.children], mines: a.mines ? [...a.mines] : null, revealed: [...a.revealed], flagged: [...a.flagged] }])) };
}
