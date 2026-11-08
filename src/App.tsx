import CustomBoardFields from './CustomBoardFields';
import AdditionalModesPanel from './AdditionalModesPanel';
import type {ExtraMode} from './extraModes';
import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import type { CSSProperties, ReactNode, RefObject } from 'react';
import {
  ArrowDownToLine, ArrowRight, ArrowUpRight, BarChart3, BookOpen, Check,
  ChevronDown, ChevronLeft, ChevronRight, Clock3, Flag, Flame, Grid2X2, Infinity as InfinityIcon,
  Leaf, Lightbulb, Menu, Moon, MousePointer2, Play, RotateCcw, Settings2,
  ShieldCheck, Smartphone, Sparkles, Sun, Target, Trophy, Volume2, VolumeX, X, Zap,
  Expand, Minimize2, Trash2, Heart, CheckCircle2, GitBranch, Waves, ClipboardCheck,
  ScanSearch, Ruler,
} from 'lucide-react';
import {
  BLITZ_OPTIONS, DIFFICULTIES, MODE_DIFFICULTIES, MODE_NAMES, blitzLabel, clampCustom,
  dailyBoard, dailyNumber, dailyTwist, dayKey, fogChance, formatTime, freshGame, previewBoard,
  readRecords, reveal, scanPatch, toggleFlag,
} from './game';
import type { BoardState, CustomConfig, DailyTwist, Difficulty, GameRecord, Mode } from './game';
import { bonusObjectives, contractStars, dealObjectives, rateObjectives, starLabel } from './contract';
import { TIDE_SECONDS, driftBoard } from './riptide';
import Installers from './Installers';
import BootScreen from './BootScreen';
import SourceDownload from './SourceDownload';
import { sense, testAudio, unlockAudio, readSoundVolume, setSoundVolume } from './sensory';
import type { Sense } from './sensory';
import { layoutWorld, loadWorld, newWorld, openAreaIds, saveWorld } from './branch';
import type { BranchWorld } from './branch';
import BranchExpeditionPanel, {BranchAbilityBar} from './BranchExpeditionPanel';
import BranchRouteMap, { RouteIcon } from './BranchRouteMap';
import type { ExpeditionAction } from './BranchExpeditionPanel';
import { unifyBranch, claimReward, enterExpedition, expeditionBoard, routeFor, stopFor, inExpedition, rulesFor, chooseStop, startEncounter, finishStop, buyItem, bankCoins, equipItem, toggleProtection, useRation, discardItem, recoverStoredItem, deliverParcel, cacheKey, useAbility, settleMove, saveBoard, continueAfterLoss } from './branchAdventure';
import type { ItemId, StopKind } from './branchAdventure';
import { playerName, publicBoardEnabled, setPlayerName, submitPublicScore, topPublicScores, lastPublicPostError, latestPublicSubmission } from './publicBoard';
import type { PublicScore } from './publicBoard';
import { mergeDailyWins, readDailyWins, saveDailyWins, streakFor } from './dailyProgress';
import '@fontsource-variable/dm-sans';
import '@fontsource/ibm-plex-mono/400.css';
import '@fontsource/ibm-plex-mono/500.css';

type View = 'play' | 'daily' | 'leaderboard' | 'guide' | 'stats';
type ModalName = 'android' | 'help' | 'settings' | 'confirm' | 'reset-stats' | 'profile' | 'custom' | null;
interface PendingGame { mode: Mode; difficulty: Difficulty; custom?: CustomConfig }
/** Read the last custom size the player chose. */
function readCustom(): CustomConfig {
  try { return clampCustom(JSON.parse(localStorage.getItem('minefield-custom') || '{}')); } catch { return clampCustom({}); }
}
type Theme = 'light' | 'dark';
const THEME_COLOR: Record<Theme, string> = { light: '#fafbf8', dark: '#191b1f' };
const ANDROID_BRIDGE = 'MinefieldAndroid';
const MODES: { id: Mode; description: string; tag: string; icon: typeof Grid2X2 }[] = [
  { id: 'classic', description: 'The original. At your own pace.', tag: 'THE ORIGINAL', icon: Grid2X2 },
  { id: 'blitz', description: 'Beat the clock — anywhere from 15 seconds to 5 minutes.', tag: 'BEAT THE CLOCK', icon: Zap },
  { id: 'zen', description: 'Clear a square, grow a new limb. The tree never ends.', tag: 'ENDLESS BRANCHES', icon: Leaf },
  { id: 'daily', description: 'One puzzle, one shared seed, one fresh twist each day.', tag: 'FRESH EVERY DAY', icon: Sun },
  { id: 'nightfall', description: 'The numbers go missing as you play. Trust your memory.', tag: 'FADING CLUES', icon: Moon },
  { id: 'custom', description: 'Pick the width, the height and the mines. Any board you like.', tag: 'YOUR RULES', icon: Ruler },
  { id: 'riptide', description: 'Every 8 seconds the tide shifts every row and column.', tag: 'SHIFTING BOARD', icon: Waves },
  { id: 'scan', description: 'Six charges to read a patch of board. Flag true to earn more.', tag: 'DETECTIVE WORK', icon: ScanSearch },
];
/** The tag that sits beside the mode name in the board header. */
const MODE_TAG: Record<Mode, string> = {
  classic: 'THE CLASSIC', blitz: 'BEAT THE CLOCK', zen: 'GROWING BRANCHES', daily: 'DAILY',
  nightfall: 'FADING CLUES', custom: 'YOUR RULES', riptide: 'THE TIDE RUNS', contract: 'ON CONTRACT', scan: 'DETECTIVE WORK',
};
/** Short line under the mode name in the sidebar flyout. */
const FLYOUT_HINT: Record<Mode, string> = {
  classic: '9 × 9 · 11 × 11 · 16 × 16', blitz: '15s – 5 min', zen: 'Grow a tree, no clock', daily: 'One shared board a day',
  nightfall: '12 × 12, numbers fade', custom: 'Any size you like', riptide: 'Every line shifts every 8 seconds', contract: 'Harder contracts, three stars', scan: 'Six charges, uncertain clues',
};
const MODE_BLURB: Record<Mode, string> = {
  classic: 'A timeless test of deduction.',
  blitz: 'Trust your instincts and beat the clock.',
  zen: 'Choose a path, build your kit, and defeat the boss to grow the tree.',
  daily: 'The same board for every curious mind.',
  nightfall: 'Numbers go missing as the clock runs. One in ten to start, rising every two seconds — and hidden tiles can touch.',
  custom: 'Your board, your size, your mine count.',
  riptide: 'Every eight seconds the tide shifts every row and column, and the numbers you trust move with it.',
  contract: 'Three objectives ride along with this board. Keep them all for three stars.',
  scan: 'Six charges: known clues cost two, unknowns cost one. Mines always show ?, and the final charge always returns ?.',
};
/** The paragraph each mode gets in "Find your mode". */
const GUIDE_COPY: Record<Mode, string> = {
  classic: 'The game you know, with three ways to challenge yourself. Easy: 9 × 9, 10 mines. Medium: 11 × 11, 18 mines. Hard: 16 × 16, 42 mines. Turn on optional challenges for objectives and bonus goals, separate from standard leaderboards.',
  blitz: 'One timer, any length from 15 seconds to five minutes. Clear the board before it runs out. Easy is a good place to warm up; Hard is a real test of speed and strategy.',
  zen: 'One saved, endless adventure tree. Every open limb leads through the route map: minefields, danger paths, shops, events, bank shelters and a phased boss. Complete the boss to grow the next limbs. Crystal caches burst safe seams; relic choices and equipment shape your build. Inventory is always available. A totem protects a mine hit; otherwise you drop 10–100% of carried coins. Banked coins stay safe.',
  daily: 'The same seeded puzzle for every player, updated at midnight UTC. Always Medium, with no Hard variant. Come back tomorrow for something new.',
  nightfall: 'A 12 × 12 board where the numbers are not guaranteed. Every square you open has a chance of coming up blank — one in ten at the start, another 5% every two seconds, up to 70%. Hidden tiles can touch. Blackout starts at one in three and keeps rising to 100%, with no lower gameplay cap. A number you have earned never comes back, and a fogged square cannot be chorded.',
  custom: 'No fixed width, height or mine-density cap; leave at least one safe cell. Large boards depend on device memory. Your last size is remembered, results stay in your local statistics, and the first click is always safe.',
  riptide: 'Every eight seconds the tide slides every row and column, carrying the mines with it and rewriting the numbers on squares you have already opened. Mines only ever move among covered squares, so an open square can never become a mine — but a deduction you made ten seconds ago may already be wrong.',
  contract: 'Three compatible objectives are dealt from a pool of twenty-four, plus two optional bonus badges. A rescue reveals one safe tile but costs one final star. Replay a contract code with the same difficulty and first click to retry the same board. Stars are saved in your local statistics; Contract has no leaderboard.',
  scan: 'Start with six charges. A safe tile has a 40% chance of an unknown result; mines always read ?. Known clues cost two charges, unknowns cost one. With one charge left, the result is always ?. Each tile can only be scanned once, and each correctly flagged mine earns one charge once.',
};
function BrandMark({ className = '' }: { className?: string }) {
  return <span className={`brand-mark ${className}`} aria-hidden="true"><svg viewBox="0 0 32 32" fill="none"><path d="M13.2 4h5.6v7.2l5.1-5.1 4 4-5.1 5.1H30v5.6h-7.2l5.1 5.1-4 4-5.1-5.1V32h-5.6v-7.2l-5.1 5.1-4-4 5.1-5.1H2v-5.6h7.2L4.1 10.2l4-4 5.1 5.1V4Z" transform="translate(2 0) scale(.87)" fill="currentColor"/><circle cx="16" cy="16" r="3.2" fill="var(--orange)"/></svg></span>;
}
function ModeIcon({ mode, size = 21 }: { mode: Mode; size?: number }) {
  const Icon = MODES.find(m => m.id === mode)!.icon;
  return <Icon size={size} strokeWidth={1.7} />;
}
function TileArt({ small = false }: { small?: boolean }) {
  return <div className={`tile-art ${small ? 'small' : ''}`} aria-hidden="true">{Array.from({ length: 9 }, (_, i) => <span key={i} className={i === 4 ? 'art-orange' : i === 2 || i === 6 ? 'art-open' : ''}>{i === 4 ? <BrandMark /> : i === 2 ? '1' : i === 6 ? '2' : ''}</span>)}</div>;
}
function Modal({ title, eyebrow, children, close, className = '' }: { title: string; eyebrow?: string; children: ReactNode; close: () => void; className?: string }) {
  const panel = useRef<HTMLDivElement>(null);
  useEffect(() => {
    const previous = document.activeElement as HTMLElement | null;
    const bodyOverflow = document.body.style.overflow;
    document.body.style.overflow = 'hidden';
    panel.current?.focus();
    return () => { document.body.style.overflow = bodyOverflow; previous?.focus(); };
  }, []);
  return <div className="modal-backdrop" onClick={close}><div className={`modal ${className}`} role="dialog" aria-modal="true" aria-label={title} tabIndex={-1} ref={panel} onClick={e => e.stopPropagation()} onKeyDown={e => {
    if (e.key === 'Escape') close();
    if (e.key === 'Tab') {
      const items = panel.current?.querySelectorAll<HTMLElement>('button:not(:disabled), a[href], input, select, [tabindex="0"]');
      if (!items?.length) return;
      const first = items[0], last = items[items.length - 1];
      if (e.shiftKey && (document.activeElement === first || document.activeElement === panel.current)) { e.preventDefault(); last.focus(); }
      if (!e.shiftKey && document.activeElement === last) { e.preventDefault(); first.focus(); }
    }
  }}><button className="icon-button modal-close" onClick={close} aria-label="Close dialog"><X size={19} /></button>{eyebrow && <div className="eyebrow">{eyebrow}</div>}<h2>{title}</h2>{children}</div></div>;
}
function HelpContent({ compact = false }: { compact?: boolean }) {
  return <div className={`help-content ${compact ? 'compact' : ''}`}>
    <p className="modal-intro">A little logic is all you need. Uncover every safe square, and leave the mines alone.</p>
    <div className="howto-steps">
      <div className="help-step"><span className="step-number">01</span><div><h3>Make the first move</h3><p>Tap any square to start. Your first move is always safe, with a little breathing room around it.</p></div><MousePointer2 size={23} /></div>
      <div className="help-step"><span className="step-number">02</span><div><h3>Let the numbers guide you</h3><p>Each number tells you how many mines touch that square — including diagonally. A <b className="number-1">1</b> means one mine in its eight neighbors.</p></div><span className="example-number number-1">1</span></div>
      <div className="help-step"><span className="step-number">03</span><div><h3>Flag it. Clear it. Win it.</h3><p>Suspect a mine? Right-click or turn on Flag mode, then tap it. Reveal every safe square to win. Flags aren’t required to finish!</p></div><Flag size={23} className="orange-text" /></div>
    </div>
    <div className="help-example"><div className="mini-grid">{['', '1', '', '1', 'flag', '1', '', '1', ''].map((x, i) => <span key={i} className={x === 'flag' ? 'mini-flag' : x ? 'number-1' : ''}>{x === 'flag' ? <Flag size={15} fill="currentColor" /> : x}</span>)}</div><div><b>Eight neighbors. One little clue.</b><p>This 1 touches just one mine. That makes the flag a pretty good guess.</p></div></div>
    <div className="help-tips"><Lightbulb size={18} /><p><b>A handy shortcut:</b> tap a revealed number when you’ve flagged all its neighboring mines to clear the remaining squares. Be sure your flags are right!</p></div>
    <div className="keyboard-guide"><span><kbd>N</kbd> New game</span><span><kbd>F</kbd> Flag mode</span><span><kbd>?</kbd> Help</span><span><MousePointer2 size={14} /> Long press to flag</span></div>
  </div>;
}
function BranchTreeMap({ world, game, act, onJump, onClose, onRoute, onContinue }: { game:BoardState;act:(action:ExpeditionAction,value?:string,replace?:ItemId[])=>void;world: BranchWorld; onJump: (id: string) => void; onClose: () => void; onRoute:()=>void; onContinue:()=>void }) {
  const { nodes, edges, width, height } = useMemo(() => layoutWorld(world), [world]);
  const pos = useMemo(() => new Map(nodes.map(n => [n.area.id, n])), [nodes]);
  const viewportRef = useRef<HTMLDivElement>(null);
  const [view, setView] = useState({ x: 0, y: 0, scale: 1 });
  const pointers = useRef(new Map<number, { x: number; y: number }>());
  const drag = useRef<{ moved: boolean; pinchDist: number } | null>(null);

  // Center the tree in the viewport on open / when the world changes.
  useEffect(() => {
    const el = viewportRef.current;
    if (!el) return;
    const scale = Math.min(1, (el.clientWidth - 60) / width, (el.clientHeight - 60) / height);
    setView({ x: (el.clientWidth - width * scale) / 2, y: (el.clientHeight - height * scale) / 2, scale });
  }, [width, height]);

  const clampScale = (s: number) => Math.min(3, Math.max(0.2, s));
  // Native non-passive wheel listener so the page doesn't scroll while zooming.
  useEffect(() => {
    const el = viewportRef.current;
    if (!el) return;
    const onWheel = (e: WheelEvent) => {
      e.preventDefault();
      const rect = el.getBoundingClientRect();
      const cx = e.clientX - rect.left, cy = e.clientY - rect.top;
      setView(v => {
        const scale = clampScale(v.scale * (e.deltaY < 0 ? 1.12 : 1 / 1.12));
        const k = scale / v.scale;
        return { scale, x: cx - (cx - v.x) * k, y: cy - (cy - v.y) * k };
      });
    };
    el.addEventListener('wheel', onWheel, { passive: false });
    return () => el.removeEventListener('wheel', onWheel);
  }, []);
  const onPointerDown = (e: React.PointerEvent) => {
    (e.target as HTMLElement).setPointerCapture?.(e.pointerId);
    pointers.current.set(e.pointerId, { x: e.clientX, y: e.clientY });
    drag.current = { moved: false, pinchDist: 0 };
  };
  const onPointerMove = (e: React.PointerEvent) => {
    const active = pointers.current.get(e.pointerId);
    if (!active || !drag.current) return;
    const dx = e.clientX - active.x, dy = e.clientY - active.y;
    if (Math.abs(dx) + Math.abs(dy) > 4 && drag.current) drag.current.moved = true;
    pointers.current.set(e.pointerId, { x: e.clientX, y: e.clientY });
    if (pointers.current.size === 2) {
      // Pinch zoom.
      const [a, b] = [...pointers.current.values()];
      const dist = Math.hypot(a.x - b.x, a.y - b.y);
      if (drag.current && drag.current.pinchDist > 0) {
        setView(v => ({ ...v, scale: clampScale(v.scale * (dist / drag.current!.pinchDist)) }));
      }
      if (drag.current) drag.current.pinchDist = dist;
    } else {
      setView(v => ({ ...v, x: v.x + dx, y: v.y + dy }));
    }
  };
  const endPointer = (e: React.PointerEvent) => {
    const wasTap = drag.current && !drag.current.moved && pointers.current.size <= 1;
    pointers.current.delete(e.pointerId);
    drag.current = null;
    // Tap on a node (click) is handled by the node's own onClick; taps on empty
    // space just stop panning.
    void wasTap;
  };
  return <div className="modal-backdrop" onClick={onClose}><div className="modal zen-map-modal branch-full-tree" role="dialog" aria-modal="true" aria-label="Branch map" onClick={e => e.stopPropagation()}>
    <button className="icon-button modal-close" onClick={onClose} aria-label="Close map"><X size={19} /></button>
    <div className="eyebrow">BRANCH · YOUR TREE SO FAR</div>
    <nav className="route-map-tabs" aria-label="Map view"><button onClick={onRoute}>Inside limb</button><button aria-current="page">Full tree</button></nav>
    {world.expeditions?.pendingLoss && <div className="tree-return-banner"><p>Travel is waiting for you to continue after the mine hit. Your saved open limbs are still available.</p><button className="primary-button" onClick={onContinue}>Continue after the mine hit</button></div>}
    <h2>Every clear grows the tree<span className="heading-dot">.</span></h2>
    <p className="modal-intro">Cleared squares are filled. Glowing tips are open to grow. Dim squares are still locked — clear the square before them to unlock the next limb. Drag to pan, scroll or pinch to zoom.</p>
    <div className="tree-navigation-body"><aside className="tree-navigation-actions"><BranchExpeditionPanel world={world} game={game} act={act} mapContent onContinue={onContinue} openMap={onRoute}/></aside><div className="tree-navigation-map"><div className="zen-map-viewport" ref={viewportRef} onPointerDown={onPointerDown} onPointerMove={onPointerMove} onPointerUp={endPointer} onPointerCancel={endPointer}>
      <svg width={width} height={height} viewBox={`0 0 ${width} ${height}`} role="img" aria-label="Branch map of your tree" style={{ transform: `translate(${view.x}px, ${view.y}px) scale(${view.scale})`, transformOrigin: '0 0' }} className="zen-map-canvas">
        {edges.map(({ from, to }) => {
          const a = pos.get(from.area.id)!, b = pos.get(to.area.id)!;
          const x1 = a.x + 46, y1 = a.y + 40, x2 = b.x - 14, y2 = b.y + 40;
          const midX = (x1 + x2) / 2;
          return <path key={`${from.area.id}-${to.area.id}`} d={`M ${x1} ${y1} C ${midX} ${y1}, ${midX} ${y2}, ${x2} ${y2}`} fill="none" className={`zen-edge ${to.area.state}`} strokeWidth={to.area.state === 'locked' ? 2 : 3.5} />;
        })}
        {nodes.map(n => {
          const x = n.x + 40, y = n.y + 40;
          const clickable = n.area.state === 'open' && !world.expeditions?.pendingLoss;
          return <g key={n.area.id} role="button" aria-label={`Limb ${n.area.id} · ${n.area.state}`} tabIndex={clickable?0:-1} onKeyDown={e=>{if(clickable&&(e.key==='Enter'||e.key===' ')){e.preventDefault();onJump(n.area.id);}}} className={`zen-node ${n.area.state} ${clickable ? 'clickable' : ''}`} onClick={() => clickable && onJump(n.area.id)} transform={`translate(${x},${y})`}>
            <path d="M0-24 21-12 21 12 0 24-21 12-21-12Z" className="zen-node-circle" />
            <g transform="translate(-12,-12)"><RouteIcon kind="limb" size={24}/></g>

            {n.area.state === 'cleared' && <Check size={15} strokeWidth={2.5} className="zen-node-check" />}
            <title>{`Branch ${n.area.id} — ${n.area.state}`}</title>
          </g>;
        })}
      </svg>
    </div>
    <div className="zen-map-legend"><span><i className="dot cleared" />Cleared</span><span><i className="dot open" />Open — tap to play</span><span><i className="dot locked" />Locked</span></div></div></div>
  </div></div>;
}
/**
 * Sizes the board so a perfectly square grid fits the space it has. The old
 * layout pinned tiles at 25px and let the board scroll inside a 430px window,
 * which meant hunting for rows with the mouse. Now the tile size is measured
 * from the container, so every board fits with no scrolling.
 */
function useBoardFit(ref: RefObject<HTMLDivElement | null>, rows: number, cols: number, extraDeps: unknown[] = []) {
  const [tile, setTile] = useState(34);
  useEffect(() => {
    const el = ref.current;
    if (!el) return;
    const measure = () => {
      const width = el.clientWidth - 28;                        // board padding + slack
      // Measured against the document, not the scroll position, so panning the
      // page never resizes the grid under your cursor.
      const top = el.getBoundingClientRect().top + window.scrollY;
      // Reserve the row below the grid: controls, the little status line, padding.
      const panel = el.closest('.game-panel');
      const reserve = panel
        ? (panel.querySelector('.game-controls')?.clientHeight ?? 44) + (panel.querySelector('.board-message')?.clientHeight ?? 48) + (panel.querySelector('.expedition-abilities')?.clientHeight ?? 0) + 30
        : 110;
      const height = Math.min(Math.max(window.innerHeight - top - reserve, 240), 1000);
      const byWidth = (width - (cols - 1) * 3 - 10) / cols;
      const byHeight = (height - (rows - 1) * 3 - 10) / rows;
      // Width drives the size so the board fills its column; height trims it back so
      // the whole grid stays on screen. If the grid cannot fit legibly (a 30 × 30 on
      // a short window), keep 17px tiles and let the page scroll instead of handing
      // back a 9px grid nobody can tap.
      const fitted = byHeight >= 15 ? byHeight : 17;
      setTile(Math.max(24, Math.min(46, Math.floor(Math.min(byWidth, fitted)))));
    };
    const frame = requestAnimationFrame(measure);
    let pending = 0;
    const schedule = () => { cancelAnimationFrame(pending); pending = requestAnimationFrame(measure); };
    const observer = new ResizeObserver(schedule);
    observer.observe(el);
    window.addEventListener('resize', schedule);
    return () => { cancelAnimationFrame(frame); cancelAnimationFrame(pending); observer.disconnect(); window.removeEventListener('resize', schedule); };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [rows, cols, ...extraDeps]);
  return tile;
}
interface DailyWeekDay { key: string; label: string; status: string; today: boolean }
function DailyHub({ idx, dateLabel, twist, countdown, finished, streak, best, solved, week, lockNote }: {
  idx: number; dateLabel: string; twist: DailyTwist; countdown: string; finished: boolean;
  streak: number; best: number; solved: number; week: DailyWeekDay[]; lockNote: string;
}) {
  return <section className="daily-hub" aria-label="Today’s daily challenge">
    <div className="daily-hub-head">
      <div className="daily-seal" aria-hidden="true"><span>{idx}</span><i>DAILY</i></div>
      <div className="daily-hub-copy">
        <div className="daily-hub-title"><b>{dateLabel}’s puzzle</b></div>
        <span className={`daily-twist-chip twist-${twist.id}`}>{twist.name}</span>
      </div>
    </div>
    <p className="daily-hub-blurb">{twist.blurb} One seeded board, the same for everyone.</p>
    <p className="daily-hub-lock"><Target size={11} />{lockNote}</p>
    <div className="daily-hub-meta">
      <span className="daily-countdown"><Clock3 size={13} /><b>{countdown}</b><i>until the next one</i></span>
      <span className={`daily-status ${finished ? 'complete' : ''}`}>{finished ? <><CheckCircle2 size={14} /> Attempt recorded</> : 'Your move awaits'}</span>
    </div>
    <div className="daily-week" aria-label="Your last seven dailies">{week.map(day => <span key={day.key} className={`daily-day ${day.status} ${day.today ? 'today' : ''}`} title={`${day.key} · ${day.status === 'won' ? 'cleared' : day.status === 'lost' ? 'a mine' : 'not played'}`}><i>{day.label}</i><b>{day.status === 'won' ? <Check size={11} strokeWidth={3} /> : day.status === 'lost' ? <X size={11} strokeWidth={3} /> : '·'}</b></span>)}</div>
    <div className="daily-records">
      <span><Flame size={13} /><b>{streak}</b>day streak</span>
      <span><Clock3 size={13} /><b>{Number.isFinite(best) ? formatTime(best) : '—'}</b>best daily</span>
      <span><Trophy size={13} /><b>{solved}</b>solved</span>
    </div>
  </section>;
}
function App() {
  const [extraMode,setExtraMode]=useState<ExtraMode|null>(null);
  const [view, setView] = useState<View>('play');
  const [game, setGame] = useState<BoardState>(() => previewBoard());
  const [classicChallenges,setClassicChallenges]=useState(()=>{try{return localStorage.getItem('minefield-classic-challenges')==='true';}catch{return false;}});
  useEffect(()=>{try{localStorage.setItem('minefield-classic-challenges',String(classicChallenges));}catch{}},[classicChallenges]);
  const hasChallenges=(game.mode==='classic'||game.mode==='contract')&&game.objectives.length>0;
  const [showPreview, setShowPreview] = useState(true);
  const [now, setNow] = useState(Date.now());
  const [flagMode, setFlagMode] = useState(false);
  const [modal, setModal] = useState<ModalName>(null);
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [customInputValid,setCustomInputValid]=useState(true);
  const [focusMode, setFocusMode] = useState(false);
  const [focusTile,setFocusTile]=useState(44);
  const touchOrigin=useRef<{x:number;y:number}|null>(null),touchMoved=useRef(false);
  const [records, setRecords] = useState<GameRecord[]>(readRecords);
  const [dailyDays, setDailyDays] = useState(() => readDailyWins(readRecords()));
  const [branchReturn, setBranchReturn] = useState<string | null>(null);
  const [publicError, setPublicError] = useState('');
  const [publicRefresh, setPublicRefresh] = useState(0);
  const [resultVisible, setResultVisible] = useState(false);
  const [pendingGame, setPendingGame] = useState<PendingGame | null>(null);
  const [toast, setToast] = useState('');
  const [branchWorld, setBranchWorld] = useState<BranchWorld | null>(null);
  const [mapOpen, setMapOpen] = useState(false);
  const [treeMapOpen, setTreeMapOpen] = useState(false);
  const [publicRows, setPublicRows] = useState<PublicScore[]>([]);
  const [nameDraft, setNameDraft] = useState(() => playerName());
  const [publicQueue, setPublicQueue] = useState<GameRecord[]>(() => {
    try {
      const saved = JSON.parse(localStorage.getItem('minefield-pending-public-v1') || 'null');
      return (Array.isArray(saved) ? saved : saved ? [saved] : []).filter(r => r?.won && !r.challenge && ['classic', 'blitz'].includes(r.mode));
    } catch { return []; }
  });
  const pendingPublic = publicQueue[0] ?? null;
  const setPendingPublic = (record: GameRecord | null) => setPublicQueue(previous => record ? previous.some(r => r.id === record.id) ? previous : [...previous, record] : previous.slice(1));
  const [postingPublic, setPostingPublic] = useState(false);
  const publicPostBusy = useRef(false);
  const [postError, setPostError] = useState('');
  useEffect(() => { try { localStorage.setItem('minefield-pending-public-v1', JSON.stringify(publicQueue)); } catch { /* session-only retry */ } }, [publicQueue]);
  const [blitzSeconds, setBlitzSeconds] = useState(() => { try { const v = parseInt(localStorage.getItem('minefield-blitz') || '60', 10); return BLITZ_OPTIONS.includes(v) ? v : 60; } catch { return 60; } });
  const [customConfig, setCustomConfig] = useState<CustomConfig>(readCustom);
  const [customDraft, setCustomDraft] = useState<CustomConfig>(readCustom);
  const [scanArmed, setScanArmed] = useState(false);
  const [tideLeft, setTideLeft] = useState(TIDE_SECONDS);
  const [tideFx, setTideFx] = useState<{ nonce: number; moved: number[] } | null>(null);
  const [helpTab, setHelpTab] = useState<'basics' | 'modes'>('basics');
  const [leaderMode, setLeaderMode] = useState<Mode>('classic');
  const [leaderDifficulty, setLeaderDifficulty] = useState<Difficulty>('easy');
  const [sound, setSound] = useState(() => { try { return localStorage.getItem('minefield-sound') !== 'false'; } catch { return true; } });
  const [volume, setVolume] = useState(readSoundVolume);
  useEffect(() => {
    setSoundVolume(volume);
    try { localStorage.setItem('minefield-volume', String(volume)); } catch { /* session-only volume */ }
  }, [volume]);
  const [haptics, setHaptics] = useState(() => { try { return localStorage.getItem('minefield-haptics') !== 'false'; } catch { return true; } });
  const [booted, setBooted] = useState(false);
  const [revealFx, setRevealFx] = useState<{ opened: number[]; wave: Record<number, number>; origin: number; nonce: number } | null>(null);
  const [theme, setTheme] = useState<Theme>(() => {
    try {
      const saved = localStorage.getItem('minefield-theme');
      if (saved === 'light' || saved === 'dark') return saved;
      return 'dark';
    } catch { return 'dark'; }
  });
  const [reducedMotion, setReducedMotion] = useState(() => { try { return localStorage.getItem('minefield-motion') === 'true'; } catch { return false; } });
  const [highContrast, setHighContrast] = useState(() => { try { return localStorage.getItem('minefield-contrast') === 'true'; } catch { return false; } });
  const isDesktopApp = typeof (window as Window & { __TAURI__?: unknown }).__TAURI__ !== 'undefined';
  const isAndroidApp = useMemo(() => /MinefieldAndroid\//.test(navigator.userAgent) || typeof (window as Window & { MinefieldAndroid?: unknown }).MinefieldAndroid === 'object' || (/Android/i.test(navigator.userAgent) && !/wv/i.test(navigator.userAgent) && window.matchMedia?.('(display-mode: standalone)').matches), []);
  const longPress = useRef<ReturnType<typeof setTimeout> | null>(null);
  const longPressed = useRef(false);
  const recorded = useRef<string>('');
  const boardRef = useRef<HTMLDivElement>(null);
  const gameRef = useRef(game);
  const tideDeadline = useRef(0);
  const isFinished = game.status === 'won' || game.status === 'lost';
  const elapsed = game.startedAt === null ? 0 : Math.max(0, Math.floor(((game.finishedAt ?? now) - game.startedAt) / 1000));
  const flags = game.cells.filter(c => c.flagged).length;
  const revealed = game.cells.filter(c => c.revealed && !c.mine).length;
  const progress = Math.round(revealed / (game.cells.length - game.mines) * 100);
  const previewCells = useMemo(() => previewBoard().cells, []);
  const displayCells = showPreview ? previewCells : game.cells;
  const fittedTileSize = useBoardFit(boardRef, game.rows, game.cols, [view, focusMode, showPreview, game.mode, game.id]);
  const tileSize=focusMode?focusTile:fittedTileSize;
  const fitFullscreenBoard=()=>{const el=boardRef.current;if(el)setFocusTile(Math.max(1,Math.min(96,Math.floor(Math.min((el.clientWidth-28-(game.cols-1)*3-10)/game.cols,(el.clientHeight-22-(game.rows-1)*3-10)/game.rows)))));};
  const wins = records.filter(r => r.won);
  const best = wins.filter(r => !r.challenge && r.mode === 'classic' && r.difficulty === 'easy').reduce((min, r) => Math.min(min, r.seconds), Infinity);
  const winRate = records.length ? Math.round(wins.length / records.length * 100) : 0;
  const todayKey = dayKey();
  const dailyDate = new Date(`${dayKey()}T12:00:00`);
  const dailyFinished = records.some(r => r.mode === 'daily' && (r.dailyDay ?? r.date.slice(0, 10)) === todayKey);
  const dailyIdx = dailyNumber();
  const twist: DailyTwist = dailyTwist(dailyIdx);
  const dailyAllowed: Difficulty[] = ['medium'];
  const dailyDefault: Difficulty = 'medium';
  // Flag-free day: the daily twist can take flags away entirely.
  const flagsLocked = game.mode === 'daily' && !!twist.noFlags && !showPreview;
  // Blitz always has a limit; a Sprint daily borrows one.
  const timeLimit = game.mode === 'blitz' ? blitzSeconds : game.mode === 'daily' ? twist.seconds ?? null : null;
  const timeLeft = timeLimit === null ? null : timeLimit - elapsed;
  const runningOut = timeLimit !== null && game.status === 'playing' && (timeLeft ?? 0) <= 15;
  const dailyWins = wins.filter(r => r.mode === 'daily');
  const dailySolved = dailyDays.length;
  const dailyBest = dailyWins.reduce((min, r) => Math.min(min, r.seconds), Infinity);
  const dailyWeek = useMemo(() => {
    const today = new Date();
    return Array.from({ length: 7 }, (_, i) => {
      const day = new Date(Date.UTC(today.getUTCFullYear(), today.getUTCMonth(), today.getUTCDate() - (6 - i)));
      const key = day.toISOString().slice(0, 10);
      const result = records.find(r => r.mode === 'daily' && (r.dailyDay ?? r.date.slice(0, 10)) === key);
      if (dailyDays.includes(key)) return { key, label: 'SMTWTFS'[day.getUTCDay()], status: 'won', today: i === 6 };
      return { key, label: 'SMTWTFS'[day.getUTCDay()], status: result ? (result.won ? 'won' : 'lost') : 'none', today: i === 6 };
    });
  }, [records, dailyDays, todayKey]);
  // Countdown to the next daily (midnight UTC) — ticked separately from the game clock.
  const [dailyTick, setDailyTick] = useState(() => Date.now());
  useEffect(() => {
    if (view !== 'daily') return;
    const id = setInterval(() => setDailyTick(Date.now()), 1000);
    return () => clearInterval(id);
  }, [view]);
  const nextDaily = useMemo(() => {
    const midnight = new Date(dailyTick);
    midnight.setUTCHours(24, 0, 0, 0);
    const left = Math.max(0, Math.floor((midnight.getTime() - dailyTick) / 1000));
    return `${String(Math.floor(left / 3600)).padStart(2, '0')}:${String(Math.floor(left % 3600 / 60)).padStart(2, '0')}:${String(left % 60).padStart(2, '0')}`;
  }, [dailyTick]);
  const dailyStreak = useMemo(() => streakFor(dailyDays, todayKey), [dailyDays, todayKey]);
  useEffect(() => {
    setDailyDays(previous => {
      const merged = mergeDailyWins(previous, records);
      saveDailyWins(merged);
      return merged.join(',') === previous.join(',') ? previous : merged;
    });
  }, [records]);
  const navName: Record<View, string> = { play: 'Play', daily: 'Daily challenge', leaderboard: 'Leaderboard', guide: 'How to play', stats: 'My statistics' };

  const notify = useCallback((message: string) => setToast(message), []);
  useEffect(() => { if (!toast) return; const timeout = setTimeout(() => setToast(''), 3500); return () => clearTimeout(timeout); }, [toast]);
  // Clear the reveal ripple once it has played, so no stale outline is left behind.
  useEffect(() => {
    if (!revealFx) return;
    const timeout = setTimeout(() => setRevealFx(null), 1500);
    return () => clearTimeout(timeout);
  }, [revealFx]);
  useEffect(() => { try { localStorage.setItem('minefield-games-v1', JSON.stringify(records)); } catch { /* Private browsing can disable storage. */ } }, [records]);
  useEffect(() => {
    try { localStorage.setItem('minefield-sound', String(sound)); localStorage.setItem('minefield-haptics', String(haptics)); localStorage.setItem('minefield-motion', String(reducedMotion)); localStorage.setItem('minefield-contrast', String(highContrast)); } catch { /* Settings remain available for this session. */ }
    try { localStorage.setItem('minefield-theme', theme); } catch { /* The theme still applies for this session. */ }
    try { localStorage.setItem('minefield-blitz', String(blitzSeconds)); } catch { /* ignore */ }
    document.documentElement.dataset.theme = theme;
    document.querySelector('meta[name="theme-color"]')?.setAttribute('content', THEME_COLOR[theme]);
    (window as Window & { MinefieldAndroid?: { setSystemBars: (dark: boolean) => void } })[ANDROID_BRIDGE]?.setSystemBars(theme === 'dark');
  }, [sound, haptics, reducedMotion, highContrast, theme]);
  useEffect(() => { try { localStorage.setItem('minefield-custom', JSON.stringify(customConfig)); } catch { /* Private browsing can disable storage. */ } }, [customConfig]);
  useEffect(() => {
    if (game.status !== 'playing') return;
    const clock = setInterval(() => setNow(Date.now()), 1000);
    return () => clearInterval(clock);
  }, [game.status]);
  useEffect(() => {
    if (game.status === 'playing' && timeLimit !== null && game.startedAt && now - game.startedAt >= timeLimit * 1000) {
      setGame(g => g.status === 'playing' ? { ...g, status: 'lost', finishedAt: g.startedAt! + timeLimit * 1000 } : g);
    }
  }, [game.mode, game.status, game.startedAt, now, timeLimit]);
  useEffect(() => {
    if (!isFinished || recorded.current === game.id) return;
    recorded.current = game.id;
    const record: GameRecord = {
      id: hasChallenges || game.mode === 'zen' ? `${game.id}-${game.startedAt}` : game.id, mode: game.mode, difficulty: game.difficulty, won: game.status === 'won', seconds: elapsed, date: new Date().toISOString(),
      ...(game.mode === 'daily' ? { dailyDay: game.dailyDay ?? todayKey } : {}),
      ...(hasChallenges ? { challenge:true, stars: contractStars(game.objectives, game, elapsed) } : {}),
      ...(game.mode === 'custom' && game.custom ? { custom: game.custom } : {}),
    };
    setRecords(previous => previous.some(r => r.id === record.id) ? previous : [record, ...previous].slice(0, 200));
    // Classic and Blitz wins always ask for a leaderboard name.
    if (record.won && !record.challenge && (record.mode === 'classic' || record.mode === 'blitz')) setPendingPublic(record);
    setResultVisible(true);
  }, [isFinished, game.id, game.mode, game.difficulty, game.status, elapsed]);


  useEffect(()=>{if(game.mode==='zen'&&game.status==='won'){setResultVisible(false);setTreeMapOpen(false);setMapOpen(true);}},[game.id,game.status,game.mode]);

  // Keep the latest board reachable from timers without re-subscribing them.
  useEffect(() => { gameRef.current = game; }, [game]);
  // Riptide: reset the tide whenever a board starts, then let it run every 15 s.
  useEffect(() => {
    if (game.mode !== 'riptide' || game.status !== 'playing') return;
    tideDeadline.current = Date.now() + TIDE_SECONDS * 1000;
    setTideLeft(TIDE_SECONDS);
  }, [game.mode, game.status, game.id]);
  useEffect(() => {
    if (game.mode !== 'riptide' || game.status !== 'playing') return;
    const id = setInterval(() => {
      const left = Math.max(0, Math.ceil((tideDeadline.current - Date.now()) / 1000));
      setTideLeft(left);
      if (left > 0) return;
      const current = gameRef.current;
      if (current.mode !== 'riptide' || current.status !== 'playing') return;
      const drift = driftBoard(current);
      tideDeadline.current = Date.now() + TIDE_SECONDS * 1000;
      setTideLeft(TIDE_SECONDS);
      if (!drift.changed) return;
      setGame(drift.state);
      setTideFx({ nonce: Date.now(), moved: drift.moved });
      setRevealFx(null);
      setNow(Date.now());
    }, 250);
    return () => clearInterval(id);
  }, [game.mode, game.status, game.id]);

  useEffect(() => {
    if (!tideFx) return;
    const id = setTimeout(() => setTideFx(null), 750);
    return () => clearTimeout(id);
  }, [tideFx]);

  const sensory = useMemo(() => ({ sound, haptics }), [sound, haptics]);
  const feel = useCallback((kind: Sense) => sense(kind, sensory), [sensory]);
  useEffect(() => {
    // Browsers need a gesture before audio can start; the first touch unlocks it.
    const unlock = () => { unlockAudio(); };
    window.addEventListener('pointerdown', unlock, { once: true });
    return () => { window.removeEventListener('pointerdown', unlock); window.removeEventListener('keydown', unlock); };
  }, []);

  /** Build the board a mode/difficulty plays on, twists and dealt objectives included. */
  const boardFor = useCallback((mode: Mode, difficulty: Difficulty, custom?: CustomConfig) => {
    const board = mode === 'daily' ? dailyBoard('medium') : freshGame(mode, difficulty, custom);
    if (mode === 'contract' || (mode === 'classic'&&classicChallenges)) return { ...board, objectives: dealObjectives(board.id) };
    return board;
  }, [classicChallenges]);
  const startGame = (mode: Mode, difficulty: Difficulty, custom?: CustomConfig) => {
    if (mode === 'zen') {
      const world = unifyBranch(newWorld());
      saveWorld(world);
      setBranchWorld(world);
      setGame(expeditionBoard(world) ?? expeditionWaitingBoard());
      setTreeMapOpen(false); setMapOpen(true);
    } else {
      const size = mode === 'custom' ? clampCustom(custom ?? customConfig) : undefined;
      if (size) { setCustomConfig(size); setCustomDraft(size); }
      try{const next=boardFor(mode,difficulty,size);setBranchWorld(null);setGame(next);}catch{notify('This device could not allocate that board. Your current game was kept. Try a smaller size.');return;}
    }
    setBranchReturn(null); recorded.current = '';
    setShowPreview(false); setFlagMode(false); setResultVisible(false); setNow(Date.now());
    setScanArmed(false); setTideLeft(TIDE_SECONDS); setTideFx(null);
    setView(mode === 'daily' ? 'daily' : 'play'); setModal(null); setSidebarOpen(false); boardRef.current?.scrollTo({ top: 0, left: 0 });
  };
  const continueBranch = () => {
    // Entering Branch resumes the saved tree if there is one.
    let saved = loadWorld();
    if (saved) {
      saved = unifyBranch(enterExpedition(saved, saved.current));
      saveWorld(saved); // Persist any legacy dead-end repair without replacing the tree.
      setBranchWorld(saved);
      setGame(expeditionBoard(saved) ?? expeditionWaitingBoard());
      if(!expeditionBoard(saved)){setTreeMapOpen(false);setMapOpen(true);}
    } else {
      startGame('zen', 'easy');
      return;
    }
    setBranchReturn(null); recorded.current = '';
    setShowPreview(false); setFlagMode(false); setResultVisible(false); setNow(Date.now());
    setView('play'); setModal(null); setSidebarOpen(false);
  };
  const expeditionWaitingBoard = () => ({ ...freshGame('zen', 'easy'), id: 'exp:waiting' });
  const applyAdventureWorld = (world: BranchWorld, board?: BoardState) => {
    saveWorld(world); setBranchWorld(world);
    const next = board ?? expeditionBoard(world) ?? expeditionWaitingBoard();
    if (next.id !== game.id) recorded.current = '';
    setGame(next); setShowPreview(false); setNow(Date.now());
  };
  const adventureAction = (action: ExpeditionAction, value?: string, replace:ItemId[]=[]) => {
    if (!branchWorld) return;
    let world = branchWorld;
    if (action === 'reward') world = claimReward(world, value ?? 'coins',replace);
    else if (action === 'choose') world = chooseStop(world, value as StopKind);
    else if (action === 'start') world = startEncounter(world);
    else if (action === 'leave' || action === 'gift' || action === 'coins') world = finishStop(world, action,replace);
    else if (action === 'buy') world = buyItem(world, value as ItemId,replace);
    else if (action === 'deposit' || action === 'withdraw') world = bankCoins(world, action,value===undefined?undefined:Number(value));
    else if (action === 'equip') world = equipItem(world, value?.split('|')[0] as ItemId,value?.split('|')[1] as ItemId);
    else if(action==='discard'&&value) world=discardItem(world,value.replace('reserve:','') as ItemId,value.startsWith('reserve:'));
    else if(action==='recover'&&value) world=recoverStoredItem(world,value as ItemId);
    else if(action==='deliver') world=deliverParcel(world);
    else if (action === 'protect') world = toggleProtection(world);
    else if (action === 'ration') world = useRation(world);
    else if (action === 'ability') {
      const result = useAbility(world, game, value as 'pathfinder' | 'survey' | 'blast');
      applyAdventureWorld(result.world, result.board); if (result.notice) notify(result.notice); return;
    }
    applyAdventureWorld(world);
    if (['reward','choose','start','leave','gift','coins'].includes(action)) setResultVisible(false);
    if (action === 'start') setMapOpen(false);
  };
  const continueAdventure = () => {
    if (!branchWorld) return;
    if (branchWorld.expeditions?.pendingLoss) {const next=continueAfterLoss(branchWorld);applyAdventureWorld(next);setMapOpen(!expeditionBoard(next));setTreeMapOpen(false);setBranchReturn(null);}
    else if (branchWorld.expeditions?.reward) {setTreeMapOpen(false);setMapOpen(true);}
    else if (routeFor(branchWorld)?.complete) { const next = openAreaIds(branchWorld)[0]; if (next) jumpToArea(next); }
    else { setTreeMapOpen(false); setMapOpen(true); }
    setResultVisible(false);
  };
  const jumpToArea = (id: string) => {
    if (branchWorld?.expeditions?.pendingLoss) { notify('Continue from the mine-hit screen before travelling.'); return; }
    if (!branchWorld || !branchWorld.areas[id] || branchWorld.areas[id].state === 'locked') return;
    const next = unifyBranch(enterExpedition({ ...branchWorld, current: id }, id));
    applyAdventureWorld(next);
    recorded.current = ''; setBranchReturn(null);
    setTreeMapOpen(false);setMapOpen(!expeditionBoard(next)); setResultVisible(false);
  };
  /** One place to switch modes, shared by the mode cards and the sidebar flyout. */
  const pickMode = (mode: Mode) => {
    // Custom opens its size picker instead of dropping straight into a board.
    if (mode === 'custom') { setCustomDraft(customConfig); setModal('custom'); return; }
    if (mode === game.mode) { if (mode === 'daily') setView('daily'); return; }
    if (mode === 'zen' && loadWorld()) { continueBranch(); return; }
    requestGame(mode, mode === 'daily' ? dailyDefault : MODE_DIFFICULTIES[mode][0]);
  };
  const requestGame = (mode = game.mode, difficulty = game.difficulty, custom?: CustomConfig) => {
    if (mode === 'zen' && branchWorld?.expeditions) { notify('Your expedition tree is saved. Use the route controls or map to continue; New game will not erase it.'); return; }
    if (game.status === 'playing') { setPendingGame({ mode, difficulty, custom }); setModal('confirm'); }
    else startGame(mode, difficulty, custom);
  };
  const navigate = (next: View) => {
    setSidebarOpen(false); setFocusMode(false);
    if (next === 'daily' && game.mode !== 'daily') { requestGame('daily', dailyDefault); return; }
    setView(next);
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };
  const handleReveal = (index: number) => {
    if (isFinished || modal) return;
    if (game.mode === 'zen' && branchWorld) {
      if (branchWorld.expeditions?.reward) {notify('Choose your reward on the map first.');setMapOpen(true);return;}
      if (!inExpedition(branchWorld)) return;
      if (!stopFor(branchWorld)?.board) { notify('Choose a route stop and enter its minefield first.'); return; }
      if (game.cells[index]?.revealed && rulesFor(branchWorld).noChord) { notify('This encounter seals chording.'); return; }
    }
    if (timeLimit !== null && game.startedAt !== null && Date.now() >= game.startedAt + timeLimit * 1000) { setGame({ ...game, status: 'lost', finishedAt: game.startedAt + timeLimit * 1000 }); feel('lose'); return; }
    if (handleScan(index)) return;
    if (flagMode) { handleFlag(index); return; }
    setShowPreview(false);
    const chording = game.cells[index]?.revealed === true;
    const base = game.status === 'ready' && showPreview ? boardFor(game.mode, game.difficulty, game.custom) : game;
    const { state: next, change } = reveal(base, index);
    if (!change.opened.length) return;
    setGame(next); setNow(Date.now());
    setRevealFx({ opened: change.opened, wave: change.wave, origin: index, nonce: Date.now() });
    if (next.mode === 'zen' && branchWorld && inExpedition(branchWorld)) {
      const result = settleMove(branchWorld, game, next);
      applyAdventureWorld(result.world, result.board);
      const opened=result.board.cells.flatMap((c,i)=>c.revealed&&!game.cells[i].revealed?[i]:[]);
      if(opened.length>change.opened.length)setRevealFx({opened,wave:Object.fromEntries(opened.map(i=>[i,0])),origin:index,nonce:Date.now()});
    }
    if (change.hit !== null) {
      feel('mine');
    } else if (next.status === 'won') {
      feel('win');
    } else if (chording) {
      feel('chord');
    } else if (change.opened.length > 2) {
      feel('expand');
    } else {
      feel('tap');
    }
  };
  const postPendingScore = async (id?: string) => {
    const record = id ? publicQueue.find(r => r.id === id) : pendingPublic;
    if (!record || publicPostBusy.current) return;
    setPlayerName(nameDraft);
    if (!publicBoardEnabled()) { setPublicQueue(previous => previous.filter(r => r.id !== record.id)); notify('Name saved on this device.'); return; }
    publicPostBusy.current = true; setPostingPublic(true); setPostError('');
    try {
      if (await submitPublicScore(record)) {
        setPublicQueue(previous => previous.filter(r => r.id !== record.id)); setPublicRefresh(n => n + 1);
        notify('Score confirmed by the server. See your latest submission on the public board.');
      } else { setPostError(lastPublicPostError()); }
    } finally { publicPostBusy.current = false; setPostingPublic(false); }
  };
  const handleScan = (index: number) => {
    if (isFinished || modal || game.mode !== 'scan' || !scanArmed) return false;
    if (game.cells[index]?.revealed) return true;
    const next = scanPatch(game, index);
    if (next === game) { notify('Pick an unflagged, unscanned covered tile.'); return true; }
    setShowPreview(false); setScanArmed(false); setGame(next); setNow(Date.now());
    feel('tap');
    return true;
  };
  const handleFlag = (index: number) => {
    if (isFinished || modal) return;
    if(game.mode==='zen' && branchWorld?.expeditions?.reward)return;
    if (game.mode === 'zen' && branchWorld && inExpedition(branchWorld)) {
      if (!stopFor(branchWorld)?.board) return;
      const rules = rulesFor(branchWorld);
      if (rules.noFlags) { notify('This encounter seals flags.'); return; }
      if (rules.halfFlags && !game.cells[index].flagged && flags >= Math.floor(game.mines / 2)) { notify('This boss phase permits only half the mine count in flags.'); return; }
    }
    if (flagsLocked) { notify('No flags today — this daily is pure deduction.'); return; }
    if (game.cells[index].revealed) return;
    if (!game.cells[index].flagged && flags >= game.mines) { notify('All your flags are in use. Move one to keep going.'); return; }
    const next = toggleFlag(game, index);
    if (next === game) return;
    setShowPreview(false); setGame(next);
    if (next.mode === 'zen' && branchWorld) {
      const updated = saveBoard(branchWorld, next);
      saveWorld(updated); setBranchWorld(updated);
    }
    feel(game.cells[index].flagged ? 'unflag' : 'flag');
  };
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (modal || extraMode || /INPUT|TEXTAREA|SELECT/.test((e.target as HTMLElement)?.tagName)) return;
      if (e.key.toLowerCase() === 'n' && !e.ctrlKey && !e.metaKey) { e.preventDefault(); requestGame(); }
      if (e.key.toLowerCase() === 'f' && !e.ctrlKey && !e.metaKey) { e.preventDefault(); setFlagMode(f => !f); }
      if (e.key === '?') setModal('help');
      if (e.key === 'Escape') { setFocusMode(false); setSidebarOpen(false); }
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  });
  useEffect(() => () => { if (longPress.current) clearTimeout(longPress.current); }, []);

  const shareResult = async () => {
    // Daily results get a spoiler-free progress grid plus the shared puzzle number.
    const filled = Math.max(0, Math.min(10, Math.round(progress / 10)));
    const grid = `${'🟧'.repeat(filled)}${'⬜'.repeat(10 - filled)}`;
    const rows = game.rows, cols = game.cols;
    const headline = game.mode === 'daily'
      ? `Minefield Daily #${dailyIdx} · ${rows}×${cols} · ${twist.name}`
      : hasChallenges
      ? `Minefield Classic challenges · ${rows}×${cols} · ${starLabel(contractStars(game.objectives, game, elapsed))}`
      : game.mode === 'custom'
      ? `Minefield Custom · ${cols}×${rows} · ${game.mines} mines`
      : `Minefield ${MODE_NAMES[game.mode]} · ${DIFFICULTIES[game.difficulty].label}`;
    const body = game.mode === 'daily'
      ? `${grid} ${progress}%\n${game.status === 'won' ? '✅ Cleared' : '💥 A mine'} in ${formatTime(elapsed)} · ${dailyStreak} day streak`
      : `${game.status === 'won' ? '🟧 All clear!' : 'A fresh start is one move away.'} ${formatTime(elapsed)}`;
    const message = `${headline}\n${body}\nA little logic. A lot of possibility.${isAndroidApp ? '' : `\n${window.location.origin}`}`;
    const android = (window as Window & { MinefieldAndroid?: { share: (text: string) => void } }).MinefieldAndroid;
    try {
      if (android) { android.share(message); return; }
      if (navigator.share) { await navigator.share({ title: 'A little win on Minefield', text: message }); return; }
      if (navigator.clipboard?.writeText) { await navigator.clipboard.writeText(message); notify('Your result is copied. Share a little brainpower.'); return; }
      const text = document.createElement('textarea');
      text.value = message; text.style.position = 'fixed'; text.style.opacity = '0';
      document.body.appendChild(text); text.select();
      const copied = document.execCommand('copy'); text.remove();
      if (copied) { notify('Your result is copied. Share a little brainpower.'); return; }
      const url = URL.createObjectURL(new Blob([message], { type: 'text/plain;charset=utf-8' }));
      const link = document.createElement('a'); link.href = url; link.download = 'my-minefield-result.txt'; link.click();
      setTimeout(() => URL.revokeObjectURL(url), 1000);
      notify('Your result was saved as a note, ready to share.');
    } catch (error) {
      if (!(error instanceof DOMException && error.name === 'AbortError')) notify('Your browser couldn’t share this time. Your result is saved in your stats.');
    }
  };
  const leaderRungs = MODE_DIFFICULTIES[leaderMode];
  useEffect(() => { if (!leaderRungs.includes(leaderDifficulty)) setLeaderDifficulty(leaderRungs[0]); }, [leaderMode]);
  const leaderboardRows = useMemo(() => records
    .filter(r => !r.challenge && r.mode === leaderMode && (leaderRungs.length === 1 || r.difficulty === leaderDifficulty) && r.won)
    .sort((a, b) => (leaderMode === 'contract' ? (b.stars ?? 0) - (a.stars ?? 0) || a.seconds - b.seconds : a.seconds - b.seconds))
    .slice(0, 20), [records, leaderMode, leaderDifficulty]);
  useEffect(() => {
    if (!publicBoardEnabled() || view !== 'leaderboard') { setPublicRows([]); return; }
    setPublicRows([]); setPublicError('');
    let cancelled = false;
    topPublicScores(leaderMode, leaderDifficulty, 20, leaderMode === 'blitz').then(rows => { if (!cancelled) setPublicRows(rows); }).catch(error => { if (!cancelled) setPublicError(String(error?.message || error)); });
    return () => { cancelled = true; };
  }, [leaderMode, leaderDifficulty, view, records, publicRefresh]);
  const totalSafe = game.cells.length - game.mines;
  const pageDescription = game.mode === 'blitz' ? `Trust your instincts. Beat the clock — ${blitzLabel(blitzSeconds)} on the timer.`
    : game.mode === 'daily' ? `Today’s twist: ${twist.name.toLowerCase()}. ${twist.blurb}`
    : MODE_BLURB[game.mode];
  // Contract objectives are rated live, so the panel ticks as you play.
  const objectives = useMemo(() => hasChallenges ? rateObjectives(game.objectives, game, elapsed) : [], [game, elapsed]);
  const objectivesDone = objectives.filter(o => o.done).length;
  const fogNow = game.mode === 'nightfall' ? fogChance(game, now) : 0;

  return <div className={`app ${reducedMotion ? 'reduce-motion' : ''} ${highContrast ? 'high-contrast' : ''} ${isAndroidApp ? 'native-app' : ''}`}>{!booted && <BootScreen onDone={() => setBooted(true)} compact={isAndroidApp} />}
    {sidebarOpen && <button className="sidebar-scrim" aria-label="Close navigation" onClick={() => setSidebarOpen(false)} />}
    <aside className={`sidebar ${sidebarOpen ? 'is-open' : ''}`}>
      <button className="brand" onClick={() => navigate('play')} aria-label="Minefield home"><BrandMark /><span>minefield<span className="brand-period">.</span></span></button>
      <div className="sidebar-intro">Small squares. Big possibilities.</div>
      <nav className="main-nav" aria-label="Main navigation">
        <div className="nav-label">YOUR PLAYGROUND</div>
        <div className="nav-flyout">
          <button className={`nav-item ${view === 'play' ? 'active' : ''}`} onClick={() => navigate('play')} aria-haspopup="true"><Grid2X2 size={18} /><span>Let’s play</span>{view === 'play' ? <span className="nav-active-dot" /> : <ChevronRight size={13} className="nav-flyout-caret" />}</button>
          <div className="nav-flyout-panel" role="group" aria-label="Choose a game mode">
            <div className="nav-flyout-eyebrow">PICK A MODE</div>
            {MODES.filter(m => m.id !== 'daily').map(mode => <button key={mode.id} className={`nav-flyout-item ${game.mode === mode.id ? 'selected' : ''}`} onClick={() => pickMode(mode.id)} aria-pressed={game.mode === mode.id}>
              <span className={`mode-icon mode-${mode.id}`}><ModeIcon mode={mode.id} size={16} /></span>
              <span className="nav-flyout-copy"><b>{MODE_NAMES[mode.id]}</b><i>{FLYOUT_HINT[mode.id]}</i></span>
              {game.mode === mode.id ? <Check size={13} /> : <ArrowUpRight size={13} className="nav-flyout-arrow" />}
            </button>)}
            <div className="nav-flyout-divider" />
            <button className={`nav-flyout-item daily ${view === 'daily' ? 'selected' : ''}`} onClick={() => navigate('daily')}>
              <span className="mode-icon mode-daily"><Sun size={16} /></span>
              <span className="nav-flyout-copy"><b>Daily challenge</b><i>#{dailyIdx} · {twist.name}</i></span>
              <span className="new-badge">NEW</span>
            </button>
          </div>
        </div>
        <button className={`nav-item ${view === 'daily' ? 'active' : ''}`} onClick={() => navigate('daily')}><Sun size={19} /><span>Daily challenge</span><span className="new-badge">NEW</span></button>
        <button className={`nav-item ${view === 'leaderboard' ? 'active' : ''}`} onClick={() => navigate('leaderboard')}><Trophy size={18} /><span>Leaderboard</span></button>
        <button className={`nav-item ${view === 'stats' ? 'active' : ''}`} onClick={() => navigate('stats')}><BarChart3 size={18} /><span>My statistics</span></button>
        <div className="nav-divider" />
        <div className="nav-label">A LITTLE KNOW-HOW</div>
        <button className={`nav-item ${view === 'guide' ? 'active' : ''}`} onClick={() => navigate('guide')}><BookOpen size={18} /><span>How to play</span><ArrowUpRight size={14} className="nav-end-icon" /></button>
        <button className="nav-item" onClick={() => setModal('settings')}><Settings2 size={18} /><span>Preferences</span></button>
        {!isAndroidApp && !isDesktopApp && <SourceDownload />}
      </nav>
      <div className="sidebar-bottom">
        <div className="sidebar-promo"><TileArt small /><div className="promo-copy"><h3>A little less scrolling.<br />A little more sweeping.</h3><p>Your next good break is here.</p></div><span className="promo-spark">✳</span></div>
        {!isAndroidApp && !isDesktopApp && <button className="sidebar-android" onClick={() => setModal('android')}><Smartphone size={17} /><span>Get Android / desktop</span><ArrowDownToLine size={15} /></button>}
        <button className="profile" onClick={() => setModal('profile')}><div className="avatar">Y<span /></div><div className="profile-text"><b>You, the player</b><span>Just here for a good game</span></div><ChevronDown size={15} /></button>
      </div>
    </aside>

    <div className="main-shell">
      <header className="topbar">{isAndroidApp ? <>{view !== 'play' && <button className="icon-button native-back" aria-label="Back to the playground" onClick={() => navigate('play')}><ChevronLeft size={21} /></button>}<button className="native-brand" onClick={() => setSidebarOpen(true)} aria-label="Open menu"><BrandMark /><span>minefield<span className="brand-period">.</span></span><span className="native-mode-pill">{view === 'play' ? 'PLAYGROUND' : view === 'daily' ? 'DAILY' : view === 'leaderboard' ? 'BEST TIMES' : view === 'stats' ? 'YOUR STATS' : 'HOW TO PLAY'}</span></button></> : <div className="breadcrumb"><button className="icon-button mobile-menu" aria-label="Open navigation" onClick={() => setSidebarOpen(true)}><Menu size={20} /></button><span className="desktop-breadcrumb">Playground<ChevronRight size={14} /></span><span>{navName[view]}</span></div>}<div className="topbar-actions"><span className="local-status"><i />A little play goes a long way</span><div className="topbar-divider" /><button className="icon-button sound-button" onClick={() => { setSound(!sound); notify(sound ? 'Sound is off. Enjoy the quiet.' : 'Sound is on. A little audio, a little joy.'); }} aria-label={sound ? 'Mute sounds' : 'Enable sounds'} title={sound ? 'Sound on' : 'Sound off'}>{sound ? <Volume2 size={18} /> : <VolumeX size={18} />}</button><button className="icon-button theme-button" onClick={() => { const next = theme === 'dark' ? 'light' : 'dark'; setTheme(next); notify(next === 'dark' ? 'Night mode is on. Your eyes will thank you.' : 'Daylight mode is on. Bright and breezy.'); }} aria-label={theme === 'dark' ? 'Switch to light mode' : 'Switch to dark mode'} title={theme === 'dark' ? 'Light mode' : 'Dark mode'} data-theme-state={theme}>{theme === 'dark' ? <Sun size={18} /> : <Moon size={18} />}</button>{!isAndroidApp && !isDesktopApp && <button className="download-button" onClick={() => setModal('android')}><Smartphone size={16} /><span>Download apps</span><ArrowDownToLine size={14} /></button>}</div></header>

      <main className={`main-content ${focusMode ? 'focus-mode' : ''}`}>
        {(view === 'play' || view === 'daily') && <>
          <section className="page-heading"><div><div className="eyebrow"><span className="tiny-spark">✳</span>{view === 'daily' ? 'A FRESH CHALLENGE, EVERY SINGLE DAY' : 'MINESWEEPER'}</div><h1>{view === 'daily' ? 'A new day. A new little win.' : 'Make your next move'}<span className="heading-dot">.</span></h1><p>{view === 'daily' ? 'The same board for every curious mind. Make today’s yours.' : <><span className="desktop-copy">Choose a mode and clear the board.</span><span className="mobile-copy">Choose a mode and clear the board.</span></>}</p></div><div className="heading-note"><div className="note-doodle"><Sparkles size={25} strokeWidth={1.3} /></div><div>No rush. No noise.<br /><b>Just one good move.</b></div></div></section>


          <nav className="mode-bar" aria-label="Game modes">{MODES.map(mode => <button key={mode.id} className={`mode-card mode-card-${mode.id} ${game.mode === mode.id ? 'selected' : ''}`} onClick={() => pickMode(mode.id)} aria-pressed={game.mode === mode.id} title={mode.description}><ModeIcon mode={mode.id} size={16} /><span>{MODE_NAMES[mode.id]}</span></button>)}</nav>
          <nav className="extra-mode-picker" aria-label="Additional game modes"><button onClick={()=>setExtraMode('puzzle')}><strong>Puzzle challenges</strong><span>Six seeded positions & goals</span></button><button onClick={()=>setExtraMode('survival')}><strong>Survival</strong><span>Three lives · rising difficulty</span></button></nav>
          <div className="play-layout">
            <section className="game-panel" aria-label={`${MODE_NAMES[game.mode]} Minesweeper game`}>
              {game.mode==='classic'&&<div className="classic-challenges-control"><label><input type="checkbox" checked={classicChallenges} onChange={e=>{const enabled=e.target.checked;if(game.status==='playing'&&!window.confirm('Start a fresh Classic board with this challenge setting?'))return;setClassicChallenges(enabled);const board=freshGame('classic',game.difficulty);setGame({...board,objectives:enabled?dealObjectives(board.id):[]});recorded.current='';setShowPreview(false);setResultVisible(false);setRevealFx(null);setNow(Date.now());}}/>Optional challenges</label><span>{hasChallenges?'Local challenge history only · no leaderboard':'Contract objectives, now inside Classic'}</span></div>}
              {hasChallenges && !showPreview && <details className="classic-challenge-details"><summary>Objectives and optional bonuses</summary><section className="contract-panel" aria-label="Contract objectives"><div className="contract-head"><div><div className="eyebrow">CLASSIC CHALLENGES</div><h3>Optional objectives</h3></div><span className={`contract-score ${objectivesDone === 3 ? 'full' : ''}`}>{starLabel(contractStars(game.objectives, game, elapsed))}</span></div><p className="contract-code">Code: {game.id} · Replay uses the same difficulty and first click.</p><ul>{objectives.map(o => <li key={o.id} className={o.done ? 'done' : ''}><span className="contract-check">{o.done ? <Check size={12} strokeWidth={3} /> : null}</span><span><b>{o.label}</b><i>{o.blurb}</i></span></li>)}</ul>{game.status === 'won' && <p className="contract-footer">{objectivesDone} of 3 kept — {objectivesDone === 3 ? 'a perfect contract.' : 'this run is saved to local history.'}</p>}<div className="contract-extras"><h4>Optional bonus badges</h4>{bonusObjectives(game, elapsed).map(o => <p key={o.id}>{o.done ? '✓' : '◇'} {o.label} — {o.blurb}</p>)}<p>Rescue reveals one safe square, but deducts one final star.</p><button className="secondary-button" disabled={game.status !== 'playing' || !!game.rescues} onClick={() => { const i = game.cells.findIndex(c => !c.mine && !c.revealed && !c.flagged); if (i < 0) return; const result = reveal({ ...game, rescues: 1 }, i); setGame(result.state); setNow(Date.now()); }}>Use rescue {game.rescues ? '(used)' : '(−1 star)'}</button><button className="secondary-button" onClick={() => { const code = window.prompt('Challenge code to replay (same difficulty + first click reproduces board):', game.id)?.trim(); if (!code) return; if (code.length > 100) { notify('Code must be at most 100 characters.'); return; } if (game.status === 'playing' && !window.confirm('Leave this board and replay these challenges?')) return; const board = freshGame('classic', game.difficulty); recorded.current = ''; setRevealFx(null); setGame({ ...board, id: code, objectives: dealObjectives(code) }); setShowPreview(false); setResultVisible(false); setNow(Date.now()); }}>Replay / enter code</button>{!!game.rescues && <p>Rescue used: final rating has a one-star deduction.</p>}</div></section></details>}
              {game.mode === 'zen' && branchWorld && <BranchExpeditionPanel world={branchWorld} game={game} act={adventureAction} openMap={()=>{setTreeMapOpen(false);setMapOpen(true);}} onContinue={continueAdventure} />}
              <div className="game-panel-head"><div className="game-title"><div className={`mode-icon mode-${game.mode}`}><ModeIcon mode={game.mode} size={20} /></div><div><h2>{MODE_NAMES[game.mode]}<span className={`game-mode-tag ${game.mode === 'blitz' ? 'purple' : ''} ${game.mode === 'nightfall' || game.mode === 'riptide' || hasChallenges || game.mode === 'scan' || game.mode === 'custom' ? 'mint' : ''}`}>{game.mode === 'daily' ? 'DAILY #' + dailyIdx + (twist.id === 'standard' ? '' : ' · ' + twist.name.toUpperCase()) : MODE_TAG[game.mode]}</span></h2><p>{pageDescription}</p></div></div><div style={{ display: 'flex', gap: 6 }}>{game.mode === 'zen' && <button className="icon-button" onClick={() => {setTreeMapOpen(false);setMapOpen(true);}} aria-label="Open branch map" title="Branch map — zoom out"><GitBranch size={17} /></button>}<button className="icon-button" onClick={() => setFocusMode(!focusMode)} aria-label={focusMode ? 'Exit focus mode' : 'Enter focus mode'} title={focusMode ? 'Exit focus mode' : 'Focus mode'}>{focusMode ? <Minimize2 size={17} /> : <Expand size={17} />}</button></div></div>
              <div className="difficulty-row">
                {game.mode === 'custom' ? <button className="resize-button" onClick={() => { setCustomDraft(customConfig); setModal('custom'); }}><Ruler size={14} />{game.cols} × {game.rows}<span>· {game.mines} mines · change size</span></button>
                  : <div className="difficulty-tabs" role="group" aria-label="Difficulty">{MODE_DIFFICULTIES[game.mode].map(diff => <button key={diff} className={`${game.difficulty === diff ? 'selected' : ''} ${diff === 'blackout' ? 'blackout-tab' : ''}`} aria-pressed={game.difficulty === diff} disabled={game.mode === 'daily' && !dailyAllowed.includes(diff)} title={game.mode === 'daily' && !dailyAllowed.includes(diff) ? `Today’s daily is locked to ${dailyAllowed.map(d => DIFFICULTIES[d].label).join(' / ')}` : diff === 'blackout' ? 'Blackout: a 1 in 3 chance a number goes missing, and it only gets worse' : undefined} onClick={() => { if (diff !== game.difficulty) requestGame(game.mode, diff); }}><span className={`difficulty-dot dot-${diff}`} />{DIFFICULTIES[diff].label}</button>)}</div>}
                <span className="board-dimensions">{game.cols} × {game.rows}<span> · </span>{game.mines} mines</span>
                {game.mode === 'nightfall' && <span className={`fog-chip ${game.status === 'playing' ? 'live' : ''}`} title="Chance a freshly opened number goes missing. It climbs 5% every two seconds."><Moon size={12} />{Math.round(fogNow * 100)}% hiding</span>}
                {game.mode === 'riptide' && <span className={`tide-chip ${game.status === 'playing' ? 'live' : ''}`} title="Every eight seconds the tide shifts every row and column."><Waves size={12} />{game.status === 'playing' ? `Tide in ${tideLeft}s` : 'Tide waits'}</span>}
                {hasChallenges && <span className={`contract-chip ${objectivesDone === 3 ? 'full' : ''}`} title="Objectives kept this board"><ClipboardCheck size={12} />{objectivesDone}/3 kept</span>}
                {game.mode === 'scan' && <span className="scan-chip" title="Scan charges left — flag a real mine to earn one back"><ScanSearch size={12} />{game.charges} charges</span>}
              </div>
              <div className="board-area" key={game.id}>
                <div className="board-toolbar"><div className="board-stat"><span>{timeLimit !== null ? 'TIME LEFT' : 'YOUR TIME'}</span><div className={runningOut ? 'timer-urgent' : ''}><Clock3 size={16} /><b>{game.mode === 'zen' ? <InfinityIcon size={26} /> : formatTime(timeLimit !== null ? Math.max(0, timeLeft ?? 0) : elapsed)}</b>{game.mode === 'blitz' && game.status !== 'lost' && <select className="blitz-time" aria-label="Blitz time limit" value={blitzSeconds} onChange={e => { const next = parseInt(e.target.value, 10); setBlitzSeconds(next); if (game.status !== 'ready') notify(`Blitz limit set to ${blitzLabel(next)}. Your next game starts fresh.`); }}>{BLITZ_OPTIONS.map(t => <option key={t} value={t}>{blitzLabel(t)}</option>)}</select>}</div></div><button className={`reset-button ${game.status === 'lost' ? 'lost' : ''}`} title="New game (N)" onClick={() => requestGame()} aria-label="Start a new game"><RotateCcw size={18} /></button><div className="board-stat mines-stat"><span>MINES LEFT</span><div><Flag size={15} /><b>{String(game.mines - flags).padStart(3, '0')}</b></div></div></div>
                {focusMode&&<div className="board-zoom-controls" aria-label="Fullscreen board controls"><button aria-label="Zoom board out" disabled={focusTile<=20} onClick={()=>setFocusTile(n=>Math.max(20,n-8))}>−</button><span>{focusTile}px tiles</span><button aria-label="Zoom board in" disabled={focusTile>=96} onClick={()=>setFocusTile(n=>Math.min(96,n+8))}>+</button><button onClick={fitFullscreenBoard}>Fit board</button><button onClick={()=>setFocusTile(44)}>Comfort size</button><button aria-label="Toggle fullscreen flag mode" aria-pressed={flagMode} onClick={()=>setFlagMode(v=>!v)}><Flag size={16}/> {flagMode?'Flagging':'Revealing'}</button><div className="board-pan-controls">{([{label:'left',x:-220,y:0,text:'←'},{label:'up',x:0,y:-220,text:'↑'},{label:'down',x:0,y:220,text:'↓'},{label:'right',x:220,y:0,text:'→'}]).map(p=><button key={p.label} aria-label={`Pan board ${p.label}`} onClick={()=>boardRef.current?.scrollBy({left:p.x,top:p.y,behavior:'smooth'})}>{p.text}</button>)}</div></div>}
                <div className={`board-scroll ${game.cols > 16 ? 'wide-board' : ''}`} ref={boardRef}>
                  <div className={`mine-board ${game.status === 'playing' ? 'playing' : ''} ${isFinished ? 'is-finished' : ''} ${game.cols > 9 ? 'dense-board' : ''} ${revealFx ? 'has-reveal-fx' : ''} ${revealFx && revealFx.opened.length > 2 ? 'has-expansion-fx' : ''}`} style={{ '--columns': game.cols, '--tile-size': `${tileSize}px` } as CSSProperties} role="group" aria-label={`${game.rows} by ${game.cols} minefield. Click to reveal. Right-click or long press to flag.`}>
                    {displayCells.map((cell, index) => {
                      // On a loss we reveal nothing — only the mine you hit shows.
                      const exposedMine = cell.exploded;
                      const wrongFlag = false;
                      const wave = revealFx?.wave[index];
                      const isFresh = !!revealFx && Object.prototype.hasOwnProperty.call(revealFx.wave, index) && !showPreview;
                      const delay = isFresh ? Math.min(wave ?? 0, 12) * 34 : 0;
                      const campClue = game.mode==='zen'&&branchWorld&&!cell.revealed&&!cell.flagged&&stopFor(branchWorld)?.campClues?.includes(index);
                      const safeCache = game.mode==='zen' && branchWorld && !cell.revealed && !cell.flagged && stopFor(branchWorld)?.caches?.includes(index) && !branchWorld.expeditions?.paid.includes(cacheKey(branchWorld,stopFor(branchWorld)!.caches!.indexOf(index)));
                      const expanding = isFresh && revealFx!.opened.length > 2;
                      return <button key={index} className={`tile ${cell.revealed ? 'revealed' : 'covered'} ${cell.flagged ? 'flagged' : ''} ${cell.exploded ? 'exploded' : ''} ${exposedMine ? 'mine-visible' : ''} ${wrongFlag ? 'wrong-flag' : ''} ${cell.hidden ? 'fogged' : ''} ${cell.scanned !== null && !cell.revealed ? 'scanned' : ''} ${tideFx && tideFx.moved.includes(index) ? 'tide-moved' : ''} ${isFresh ? (expanding ? 'tile-expanded' : 'tile-popped') : ''} number-${cell.hidden ? 0 : cell.adjacent}`} style={isFresh ? { animationDelay: `${delay}ms`, '--wave': wave ?? 0 } as CSSProperties : undefined} aria-label={`Row ${Math.floor(index / game.cols) + 1}, column ${index % game.cols + 1}: ${campClue ? `camp-supplied clue, ${cell.adjacent} adjacent mines` : safeCache ? 'safe crystal cache, open for coins and a safe burst' : cell.flagged ? 'flagged' : exposedMine ? 'mine' : cell.hidden ? 'open, number lost to the mist' : cell.revealed ? `${cell.adjacent || (game.mode === 'riptide' ? '0 adjacent mines' : 'empty')}${cell.adjacent ? ' adjacent mines' : ''}` : cell.scanned !== null ? cell.scanned === -1 ? 'scanned, unknown' : `scanned, ${cell.scanned} adjacent mines` : 'covered'}`} onClick={() => { if (longPressed.current||touchMoved.current) { longPressed.current=false;touchMoved.current=false;return; } handleReveal(index); }} onContextMenu={e => { e.preventDefault();if(!longPressed.current)handleFlag(index); }} onPointerDown={e => {if(e.pointerType==='mouse'){longPressed.current=false;touchMoved.current=false;} if (e.pointerType !== 'mouse' && !isFinished) { longPressed.current = false;touchMoved.current=false;touchOrigin.current={x:e.clientX,y:e.clientY};longPress.current = setTimeout(() => { handleFlag(index); longPressed.current = true; }, 420); } }} onPointerMove={e=>{if(touchOrigin.current&&e.pointerType!=='mouse'&&Math.hypot(e.clientX-touchOrigin.current.x,e.clientY-touchOrigin.current.y)>8){touchMoved.current=true;if(longPress.current)clearTimeout(longPress.current);}}} onPointerUp={() => { touchOrigin.current=null;if (longPress.current) clearTimeout(longPress.current); }} onPointerCancel={() => {touchMoved.current=true;touchOrigin.current=null;if (longPress.current) clearTimeout(longPress.current); }} onPointerLeave={() => { if (longPress.current) clearTimeout(longPress.current); }} onKeyDown={e => { if (e.key.toLowerCase() === 'f' && !e.ctrlKey && !e.metaKey) { e.stopPropagation(); handleFlag(index); } }} disabled={isFinished}>{campClue ? <span className="camp-clue" title="Camp supply, not an activated ability">{cell.adjacent}</span> : safeCache ? <span className="branch-crystal" title="Safe crystal cache — open to burst nearby safe tiles">◆</span> : cell.flagged ? <span className="flag-marker"><Flag size={15} fill="currentColor" /></span> : exposedMine ? <span className="mine-marker"><BrandMark /></span> : cell.revealed && cell.hidden ? <span className="fog-marker"><Moon size={13} /></span> : cell.revealed && cell.adjacent > 0 ? <span className="number-marker">{cell.adjacent}</span> : !cell.revealed && cell.scanned !== null ? <span className="scan-marker"><ScanSearch size={11} />{cell.scanned === -1 ? '?' : cell.scanned}</span> : wrongFlag ? <X size={17} /> : null}{isFresh && expanding && <span className="tile-ripple" aria-hidden="true" />}</button>;
                    })}
                  </div>
                </div>

                {isFinished && resultVisible && <div className={`result-overlay ${game.status === 'won' ? 'won' : ''}`}><div className="result-card"><div className="result-icon">{game.status === 'won' ? <Trophy size={30} /> : <BrandMark />}</div><div className="eyebrow">{game.status === 'won' ? 'A LITTLE WIN. A BIG FEELING.' : timeLimit !== null && elapsed >= timeLimit ? 'TIME’S UP, NOT GAME OVER' : 'THERE’S ALWAYS ANOTHER SQUARE'}</div><h3>{game.status === 'won' ? 'Beautifully swept.' : 'A mine. Not the end.'}</h3><p>{game.status === 'won' ? `You cleared all ${totalSafe} safe squares. Nicely done.` : game.mode === 'daily' ? 'Today’s board is still out there until midnight. One more go?' : game.mode === 'zen' ? branchWorld?.expeditions?.pendingLoss ? branchWorld.expeditions.notice : 'You hit the marked mine. Your progress is saved; continue when you are ready to return to an open branch.' : 'Take a breath. Your next great game is one click away.'}</p>{game.mode === 'daily' && <div className="daily-result-tag"><span className={`daily-twist-chip twist-${twist.id}`}>{twist.name}</span><span>Daily #{dailyIdx}</span>{game.status === 'won' && <span><Flame size={11} />{dailyStreak} day streak</span>}</div>}<div className="result-stats"><span><Clock3 size={15} />{formatTime(elapsed)}</span><span><Target size={15} />{progress}% cleared</span>{hasChallenges && <span className="result-stars">{starLabel(contractStars(game.objectives, game, elapsed))}</span>}{game.mode === 'scan' && <span>{game.scans} scans used</span>}</div><button className="primary-button" onClick={() => { if (game.mode === 'zen' && game.id.startsWith('exp:') && branchWorld) { continueAdventure(); } else if (game.mode === 'zen' && game.status === 'lost' && branchReturn) { jumpToArea(branchReturn); } else if (game.mode === 'zen' && game.status === 'won' && branchWorld) { const next = openAreaIds(branchWorld)[0]; if (next) jumpToArea(next); else setMapOpen(true); } else startGame(game.mode, game.difficulty); }}><RotateCcw size={16} />{game.mode === 'zen' && game.id.startsWith('exp:') ? branchWorld?.expeditions?.pendingLoss ? 'Continue after the mine hit' : branchWorld?.expeditions?.reward ? 'Choose your reward' : routeFor(branchWorld)?.complete ? 'Grow the next limb' : 'Continue expedition' : game.mode === 'zen' && game.status === 'lost' ? 'Continue at the earlier branch' : game.mode === 'zen' && game.status === 'won' ? 'Continue the branch' : game.status === 'won' ? 'One more good game' : 'Let’s try again'}</button><div className="result-secondary"><button onClick={() => setResultVisible(false)}>See the board</button><span>·</span><button onClick={shareResult}>{game.mode === 'daily' ? 'Share your grid' : 'Share result'} <ArrowUpRight size={13} /></button></div>{game.status === 'won' && publicQueue.some(r => r.id === game.id) && <div className="public-post"><label htmlFor="win-name">What name should go on your leaderboard?</label><div className="public-post-row"><input id="win-name" value={nameDraft} maxLength={24} disabled={postingPublic} onChange={e => setNameDraft(e.target.value)} onKeyDown={e => { if (e.key === 'Enter') void postPendingScore(game.id); }} /><button className="primary-button" disabled={postingPublic} onClick={() => void postPendingScore(game.id)}>{postingPublic ? 'Posting…' : publicBoardEnabled() ? 'Post / retry' : 'Save name'}</button><button className="secondary-button" disabled={postingPublic} onClick={() => { setPlayerName(nameDraft); setPublicQueue(previous => previous.filter(r => r.id !== game.id)); setPostError(''); }}>Skip</button></div>{postError && <p role="alert">{postError}</p>}</div>}</div></div>}
                {timeLimit !== null && game.status === 'playing' && <div className="blitz-progress"><span style={{ width: `${Math.max(0, Math.min(1, (timeLeft ?? 0) / timeLimit)) * 100}%` }} /></div>}
              </div>
              {game.mode==='zen'&&branchWorld&&<BranchAbilityBar world={branchWorld} game={game} act={adventureAction}/> }
              <div className="game-controls">{game.mode === 'scan' && <button className={`scan-toggle ${scanArmed ? 'enabled' : ''}`} disabled={game.charges === 0 || isFinished} aria-pressed={scanArmed} onClick={() => setScanArmed(a => !a)}><ScanSearch size={15} /><span>{scanArmed ? 'Pick a square' : 'Scan'}</span><b>{game.charges}</b></button>}{flagsLocked ? <span className="flag-toggle locked" title="Today’s twist removes flags"><Flag size={15} /><span>No flags today</span></span> : <button className={`flag-toggle ${flagMode ? 'enabled' : ''}`} onClick={() => setFlagMode(!flagMode)} aria-pressed={flagMode}><Flag size={15} fill={flagMode ? 'currentColor' : 'none'} /><span>Flag mode</span><span className="toggle-track"><i /></span></button>}<span className="board-tip"><MousePointer2 size={13} /><span>{flagsLocked ? 'Every square is a guess worth making' : 'Right-click to flag'}</span></span><button className="new-game-text" onClick={() => requestGame()}><RotateCcw size={14} />New game</button></div>
              <div className={`board-message ${isFinished ? 'finished' : ''}`}>{isFinished ? <><Check size={13} />{game.status === 'won' ? 'A little victory, saved to your stats.' : 'Every game is a chance to get a little better.'}</> : <><ShieldCheck size={14} />{game.status === 'ready' ? 'Your first move is always safe. Go on, pick a square.' : flagMode ? 'Flag mode is on. Tap a square to mark a possible mine.' : `${game.cells.filter(c => c.revealed && !c.mine).length} safe squares found. You’ve got this.`}</>}</div>
            </section>

            {view === 'daily' && <aside className="mode-column"><DailyHub idx={dailyIdx} dateLabel={dailyDate.toLocaleDateString('en-US', { month: 'long', day: 'numeric' })} twist={twist} countdown={nextDaily} finished={dailyFinished} streak={dailyStreak} best={dailyBest} solved={dailySolved} week={dailyWeek} lockNote="Locked to Medium every day" /></aside>}
          </div>
          {mapOpen && branchWorld && (treeMapOpen ? <BranchTreeMap world={branchWorld} game={game} act={adventureAction} onJump={jumpToArea} onClose={()=>setMapOpen(false)} onRoute={()=>setTreeMapOpen(false)} onContinue={()=>{continueAdventure();setTreeMapOpen(false);}}/> : <BranchRouteMap world={branchWorld} game={game} act={adventureAction} onClose={()=>setMapOpen(false)} onTree={()=>setTreeMapOpen(true)} onContinue={continueAdventure}/>)}

          <section className="progress-strip" aria-label="Your personal progress"><div className="progress-intro"><span className="progress-icon"><Flame size={21} strokeWidth={1.5} /></span><div><h3>Little games. Little wins.</h3><p>Your progress, one square at a time.</p></div></div><div className="progress-stat"><span>GAMES PLAYED</span><b>{String(records.length).padStart(2, '0')}</b></div><div className="progress-stat"><span>WIN RATE</span><b>{records.length ? winRate : '—'}<small>{records.length ? '%' : ''}</small></b></div><div className="progress-stat"><span>BEST TIME · EASY</span><b>{Number.isFinite(best) ? formatTime(best) : '—'}</b></div><button className="icon-button" onClick={() => navigate('stats')} title="View your statistics" aria-label="View your statistics"><ArrowUpRight size={19} /></button></section>
          <footer className="page-footer"><span><Heart size={12} />A classic game. A calmer kind of play.</span><span>Made for your next little break.<span className="footer-dot">✳</span></span></footer>
        </>}

        {view === 'leaderboard' && <><section className="page-heading"><div><div className="eyebrow"><Trophy size={14} />PERSONAL BESTS, NOT PEER PRESSURE</div><h1>Your own kind of first place<span className="heading-dot">.</span></h1><p>The only person to beat? Yesterday’s you. All scores stay on this device.</p></div><span className="view-decoration"><Trophy size={39} strokeWidth={1.2} /></span></section><section className="leaderboard-panel"><div className="leaderboard-heading"><h2>Your best sweeps</h2><span className="local-badge"><ShieldCheck size={13} />Local leaderboard</span></div><div className="leaderboard-filters"><div className="difficulty-tabs">{MODES.filter(m => m.id === 'classic' || m.id === 'blitz').map(mode => <button key={mode.id} className={leaderMode === mode.id ? 'selected' : ''} onClick={() => setLeaderMode(mode.id)}>{MODE_NAMES[mode.id]}</button>)}</div>{leaderRungs.length > 1 && <select aria-label="Leaderboard difficulty" value={leaderDifficulty} onChange={e => setLeaderDifficulty(e.target.value as Difficulty)}>{leaderRungs.map(d => <option key={d} value={d}>{DIFFICULTIES[d].label}</option>)}</select>}</div>{leaderboardRows.length ? <div className="table-scroll"><table className="score-table"><thead><tr><th>RANK</th><th>PLAYER</th>{leaderMode === 'contract' && <th>STARS</th>}{leaderMode === 'custom' && <th>BOARD</th>}{leaderRungs.length > 1 && leaderMode !== 'contract' && <th>DIFFICULTY</th>}<th>DATE</th><th>TIME</th><th>RESULT</th></tr></thead><tbody>{leaderboardRows.map((r, i) => <tr key={r.id}><td><span className={`rank rank-${i}`}>{i === 0 ? <Trophy size={17} /> : String(i + 1).padStart(2, '0')}</span></td><td><span className="table-player"><span className="avatar tiny">Y</span>You, the player{i === 0 && <span className="best-label">PERSONAL BEST</span>}</span></td>{leaderMode === 'contract' && <td className="mono stars-cell">{starLabel(r.stars ?? 0)}</td>}{leaderMode === 'custom' && <td>{r.custom ? `${r.custom.cols} × ${r.custom.rows} · ${r.custom.mines} mines` : 'Custom'}</td>}{leaderRungs.length > 1 && leaderMode !== 'contract' && <td><span className={`difficulty-badge dot-${r.difficulty}`}>{DIFFICULTIES[r.difficulty]?.label ?? r.difficulty}</span></td>}<td>{new Date(r.date).toLocaleDateString('en-US', { month: 'short', day: 'numeric' })}</td><td className="mono">{formatTime(r.seconds)}</td><td><span className="win-badge"><CheckCircle2 size={13} />All clear</span></td></tr>)}</tbody></table></div> : <div className="empty-state"><div className="empty-illustration"><TileArt /><span><Trophy size={25} /></span></div><h3>Your name belongs here.</h3><p>Finish a {DIFFICULTIES[leaderDifficulty].label.toLowerCase()} {MODE_NAMES[leaderMode].toLowerCase()} game to set your first personal best.<br />There’s a little champion in every square.</p><button className="primary-button" onClick={() => requestGame(leaderMode, leaderDifficulty)}>Make your first mark <ArrowRight size={16} /></button></div>}{<div className={`public-board ${publicBoardEnabled() ? '' : 'not-connected'}`}><div className="leaderboard-heading"><h2>Public leaderboard · fastest 20{leaderMode === 'blitz' && <span className="board-sub">every difficulty · sorted by time</span>}</h2><span className="local-badge"><Trophy size={13} />Everyone’s best</span></div>{latestPublicSubmission(leaderMode) && <div className="leaderboard-note" role="status">Your latest confirmed submission: {latestPublicSubmission(leaderMode)!.name} · {formatTime(latestPublicSubmission(leaderMode)!.seconds)} · {latestPublicSubmission(leaderMode)!.difficulty} · {new Date(latestPublicSubmission(leaderMode)!.date).toLocaleString()}. A slower/new score may be outside the fastest 20; it does not replace an older faster score.</div>}{pendingPublic && <div className="public-post"><p>{publicQueue.length} unposted win(s). Next: {MODE_NAMES[pendingPublic.mode]} · {formatTime(pendingPublic.seconds)}. Kept on this device until posted or skipped.</p><button className="primary-button" disabled={postingPublic} onClick={() => void postPendingScore()}>{postingPublic ? 'Posting…' : 'Post saved win / retry'}</button>{postError && <p role="alert">{postError}</p>}</div>}<div className="name-row"><label htmlFor="player-name">Shown as</label><input id="player-name" value={nameDraft} maxLength={24} onChange={e => { setNameDraft(e.target.value); setPlayerName(e.target.value); }} /><span className="name-hint">Saved on this device, sent with your wins.</span></div>{!publicBoardEnabled() ? <div className="empty-state small"><h3>The public board isn’t connected yet.</h3><p>Add your Firebase config to <code>.env</code> then choose Post after a Classic or Blitz win. <b>FIREBASE-SETUP.md</b> in the project root walks through it in about five minutes.</p></div> : publicError ? <div className="public-error" role="alert"><b>Could not load public scores.</b><p>{publicError}</p><p>If an index is requested, open the Firebase link above to create it, then retry.</p><button className="secondary-button" onClick={() => setPublicRefresh(n => n + 1)}>Retry public leaderboard</button></div> : publicRows.length ? <div className="table-scroll"><table className="score-table"><thead><tr><th>RANK</th><th>PLAYER</th><th>DIFFICULTY</th><th>DATE</th><th>TIME</th></tr></thead><tbody>{publicRows.map((r, i) => <tr key={i}><td><span className={`rank rank-${i}`}>{i === 0 ? <Trophy size={17} /> : String(i + 1).padStart(2, '0')}</span></td><td><span className="table-player">{r.name}</span>{r.name === playerName() && <span className="you-label">YOU</span>}</td><td><span className={`difficulty-badge dot-${r.difficulty}`}>{DIFFICULTIES[r.difficulty]?.label ?? r.difficulty}</span></td><td>{new Date(r.date).toLocaleDateString('en-US', { month: 'short', day: 'numeric' })}</td><td className="mono">{formatTime(r.seconds)}</td></tr>)}</tbody></table></div> : <div className="empty-state small"><h3>No public marks yet.</h3><p>Be the first name on the board — win a game and choose Post on the result screen.</p></div>}</div>}<div className="leaderboard-note"><ShieldCheck size={15} />Your best 20 wins are shown locally. Public scores need a Firebase project configured in <code>.env</code> — see README.</div></section></>}

        {view === 'stats' && <><section className="page-heading"><div><div className="eyebrow"><BarChart3 size={14} />SMALL STEPS. REAL PROGRESS.</div><h1>Look how far you’ve swept<span className="heading-dot">.</span></h1><p>Your little victories, all in one place. Saved right here on your device.</p></div><button className="secondary-button" onClick={() => setModal('reset-stats')}><Trash2 size={15} />Reset statistics</button></section><div className="stats-grid">{[{ label: 'GAMES PLAYED', value: records.length, icon: Grid2X2, detail: 'Every game is a little brain break.' }, { label: 'BOARDS CLEARED', value: wins.length, icon: Trophy, detail: 'A very good use of your free time.' }, { label: 'WIN RATE', value: `${winRate}%`, icon: Target, detail: 'Progress, not perfection.' }, { label: 'BEST CLASSIC · EASY', value: Number.isFinite(best) ? formatTime(best) : '—', icon: Clock3, detail: 'Your quickest little victory.' }].map(stat => <div className="stat-card" key={stat.label}><div><span>{stat.label}</span><stat.icon size={19} /></div><h2>{stat.value}</h2><p>{stat.detail}</p></div>)}</div><section className="history-panel"><div className="section-title"><h2>Recently in your playground</h2><span>{records.length} GAMES</span></div>{records.length ? <div className="history-list">{records.slice(0, 10).map(r => <div className="history-row" key={r.id}><span className={`mode-icon mode-${r.mode}`}><ModeIcon mode={r.mode} size={18} /></span><div><b>{MODE_NAMES[r.mode]}</b><span>{DIFFICULTIES[r.difficulty].label} · {new Date(r.date).toLocaleDateString('en-US', { month: 'short', day: 'numeric' })}</span></div><span className={r.won ? 'history-win' : 'history-loss'}>{r.won ? <CheckCircle2 size={14} /> : <Flag size={14} />}{r.won ? 'Board cleared' : 'Next time’s yours'}</span><span className="mono">{formatTime(r.seconds)}</span></div>)}</div> : <div className="empty-state small"><BarChart3 size={40} strokeWidth={1.2} /><h3>A clean slate. A world of possibilities.</h3><p>Your game history will appear here. Let’s make a little progress.</p><button className="primary-button" onClick={() => navigate('play')}>Head to the playground <ArrowRight size={16} /></button></div>}</section></>}

        {view === 'guide' && <><section className="page-heading"><div><div className="eyebrow"><BookOpen size={14} />A LITTLE KNOW-HOW GOES A LONG WAY</div><h1>Easy to learn. Lovely to master<span className="heading-dot">.</span></h1><p>A few simple rules. An endless supply of “aha” moments.</p></div><span className="view-decoration"><Lightbulb size={40} strokeWidth={1.2} /></span></section><section className="guide-panel"><div className="guide-tabs"><button className={helpTab === 'basics' ? 'selected' : ''} onClick={() => setHelpTab('basics')}>The basics</button><button className={helpTab === 'modes' ? 'selected' : ''} onClick={() => setHelpTab('modes')}>Find your mode</button></div>{helpTab === 'basics' ? <HelpContent /> : <div className="mode-guide-grid">{MODES.map(mode => <div key={mode.id} className={`mode-guide-card mode-card-${mode.id}`}><div className={`mode-icon mode-${mode.id}`}><ModeIcon mode={mode.id} size={22} /></div><h3>{MODE_NAMES[mode.id]}</h3><p>{GUIDE_COPY[mode.id]}</p><button onClick={() => requestGame(mode.id, mode.id === 'daily' ? 'hard' : 'easy')}>Give it a go <ArrowRight size={15} /></button></div>)}</div>}<div className="guide-bottom"><span><Heart size={15} />You don’t need to be an expert. Just a little curious.</span><button className="primary-button" onClick={() => navigate('play')}>I’m ready to play <Play size={15} fill="currentColor" /></button></div></section></>}
      </main>
    </div>

    <nav className="mobile-bottom-nav" aria-label="Mobile navigation"><button className={view === 'play' ? 'active' : ''} onClick={() => navigate('play')}><Grid2X2 size={20} /><span>Play</span></button><button className={view === 'daily' ? 'active' : ''} onClick={() => navigate('daily')}><Sun size={20} /><span>Daily</span></button><button className={view === 'leaderboard' ? 'active' : ''} onClick={() => navigate('leaderboard')}><Trophy size={19} /><span>Best times</span></button><button className={view === 'stats' ? 'active' : ''} onClick={() => navigate('stats')}><BarChart3 size={19} /><span>My stats</span></button><button className={view === 'guide' ? 'active' : ''} onClick={() => navigate('guide')}><BookOpen size={19} /><span>How to play</span></button></nav>

    {modal === 'help' && <Modal title="A little logic goes a long way." eyebrow="HOW TO PLAY" close={() => setModal(null)} className="help-modal"><HelpContent /><button className="primary-button full-width" onClick={() => setModal(null)}>Got it. Let’s make a move. <ArrowRight size={16} /></button></Modal>}
    {modal === 'settings' && <Modal title="Make yourself at home." eyebrow="YOUR PLAYGROUND, YOUR WAY" close={() => setModal(null)}><p className="modal-intro">A few small adjustments for your kind of play.</p><div className="settings-list"><div className="setting-row"><span className="setting-icon">{theme === 'dark' ? <Moon size={20} /> : <Sun size={20} />}</span><div><b>Night mode</b><p>Switch between warm daylight and calm dark mode.</p></div><button className={`switch ${theme === 'dark' ? 'on' : ''}`} role="switch" aria-checked={theme === 'dark'} aria-label="Night mode" onClick={() => setTheme(theme === 'dark' ? 'light' : 'dark')}><span /></button></div><div className="setting-row"><span className="setting-icon"><Volume2 size={20} /></span><div><b>Little sounds</b><p>A subtle note for every good move.</p></div><button className={`switch ${sound ? 'on' : ''}`} role="switch" aria-checked={sound} aria-label="Game sound" onClick={() => setSound(!sound)}><span /></button></div><div className="setting-row volume-setting"><span className="setting-icon"><Volume2 size={20} /></span><div><label htmlFor="sound-volume"><b>Sound volume</b></label><p>{sound ? 'Adjust all game sounds.' : 'Sound is muted; your volume is kept.'}</p><div className="volume-control"><input id="sound-volume" type="range" min="0" max="100" step="1" value={Math.round(volume * 100)} aria-valuetext={`${Math.round(volume * 100)} percent`} onChange={e => { const next = Number(e.target.value) / 100; setSoundVolume(next); setVolume(next); }} /><output htmlFor="sound-volume">{Math.round(volume * 100)}%</output></div></div></div><div className="setting-row"><span className="setting-icon"><Zap size={20} /></span><div><b>Little vibrations</b><p>Gentle haptic blips for flags, taps and mines.</p></div><button className={`switch ${haptics ? 'on' : ''}`} role="switch" aria-checked={haptics} aria-label="Haptic feedback" onClick={() => setHaptics(!haptics)}><span /></button></div><div className="setting-row"><span className="setting-icon"><Sparkles size={20} /></span><div><b>Reduce motion</b><p>Keep things still and easy on the eyes.</p></div><button className={`switch ${reducedMotion ? 'on' : ''}`} role="switch" aria-checked={reducedMotion} aria-label="Reduce motion" onClick={() => setReducedMotion(!reducedMotion)}><span /></button></div><div className="setting-row"><span className="setting-icon"><Target size={20} /></span><div><b>Higher contrast</b><p>Make numbers and board edges clearer.</p></div><button className={`switch ${highContrast ? 'on' : ''}`} role="switch" aria-checked={highContrast} aria-label="Higher contrast" onClick={() => setHighContrast(!highContrast)}><span /></button></div></div><button className="secondary-button full-width" onClick={() => { setSound(true); setSoundVolume(volume); void testAudio().then(notify); }}>Test sound</button><div className="settings-note"><ShieldCheck size={16} />These preferences are saved on this device.</div><button className="primary-button full-width" onClick={() => setModal(null)}>Just right <Check size={16} /></button></Modal>}
    {modal === 'confirm' && <Modal title="A fresh board, a fresh start?" eyebrow="ONE LITTLE THING" close={() => setModal(null)}><p className="modal-intro">You’re in the middle of a game. Starting a new one will leave this round behind — your previous results stay safe.</p><div className="confirm-preview"><span className={`mode-icon mode-${pendingGame?.mode || game.mode}`}><ModeIcon mode={pendingGame?.mode || game.mode} /></span><div><b>{MODE_NAMES[pendingGame?.mode || game.mode]}</b><span>{DIFFICULTIES[pendingGame?.difficulty || game.difficulty].label} · {formatTime(elapsed)} played</span></div></div><div className="modal-actions"><button className="secondary-button" onClick={() => setModal(null)}>Keep playing</button><button className="primary-button" onClick={() => { if (pendingGame) startGame(pendingGame.mode, pendingGame.difficulty); setPendingGame(null); }}><RotateCcw size={15} />Start fresh</button></div></Modal>}
    {modal === 'custom' && <Modal title="How big should the field be?" eyebrow="CUSTOM · YOUR RULES" close={() => setModal(null)} className="custom-modal">
      <p className="modal-intro">No fixed width, height or mine-density limit. Use positive whole-number dimensions and leave at least one safe cell. Zero mines is allowed. Extremely large boards can exhaust device memory or freeze the app.</p>
      <div className="custom-presets">{[{ label: 'Tiny', rows: 6, cols: 6, mines: 6 }, { label: 'Wide', rows: 10, cols: 24, mines: 40 }, { label: 'Monster', rows: 30, cols: 30, mines: 120 }].map(preset => <button key={preset.label} className="custom-preset" onClick={() => setCustomDraft(clampCustom(preset))}><b>{preset.label}</b><span>{preset.cols} × {preset.rows}</span></button>)}</div>
      <CustomBoardFields value={customDraft} onChange={setCustomDraft} onValidity={setCustomInputValid}/>
      <div className="custom-summary"><span>{customDraft.rows * customDraft.cols} squares</span><span>{Math.round(customDraft.mines / (customDraft.rows * customDraft.cols) * 100)}% mines</span><span>{(customDraft.rows * customDraft.cols - customDraft.mines)} to clear</span></div>
      <div className="modal-actions"><button className="secondary-button" onClick={() => setModal(null)}>Not now</button><button className="primary-button" disabled={!customInputValid} onClick={() => { const size = clampCustom(customDraft); if(!Number.isSafeInteger(size.rows*size.cols)){notify('That cell count cannot be represented exactly by this device.');return;} if(size.rows*size.cols>100000&&!window.confirm('This is a very large board and may freeze or exhaust memory. Build it anyway?'))return;setCustomConfig(size); setModal(null); requestGame('custom', 'custom', size); }}><Play size={15} fill="currentColor" />Build this board</button></div>
    </Modal>}
    {modal === 'reset-stats' && <Modal title="A completely clean slate?" eyebrow="RESET YOUR STATISTICS" close={() => setModal(null)}><p className="modal-intro">This will permanently clear {records.length} game records and all your personal bests from this device. Your preferences and current game won’t change.</p><div className="modal-actions"><button className="secondary-button" onClick={() => setModal(null)}>Keep my progress</button><button className="primary-button danger" onClick={() => { setRecords([]); setDailyDays([]); saveDailyWins([]); recorded.current = game.id; setModal(null); notify('A clean slate. Here’s to your next little win.'); }}><Trash2 size={15} />Clear my stats</button></div></Modal>}
    {modal === 'profile' && <Modal title="Hey there, curious mind." eyebrow="NO ACCOUNT. JUST A GOOD GAME." close={() => setModal(null)}><div className="profile-summary"><div className="avatar big">Y</div><div><h3>You, the player</h3><p>Local player · All your progress stays with you.</p></div></div><div className="profile-numbers"><span><b>{records.length}</b>games played</span><span><b>{wins.length}</b>little victories</span><span><b>{winRate}%</b>win rate</span></div><div className="settings-note"><ShieldCheck size={17} /><span>No sign-ups, no cloud, no tracking. Your Android app and browser keep separate local saves.</span></div><button className="primary-button full-width" onClick={() => { setModal(null); navigate('stats'); }}>See your little wins <ArrowRight size={16} /></button></Modal>}
    {modal === 'android' && <Modal title="Your next break. Anywhere." eyebrow="ANDROID · WINDOWS · LINUX" close={() => setModal(null)} className="android-modal"><Installers />{!isAndroidApp && !isDesktopApp && <SourceDownload className="secondary-button full-width source-download-inline" />}</Modal>}
    {extraMode&&<AdditionalModesPanel key={extraMode} kind={extraMode} onClose={()=>setExtraMode(null)}/>}
    {toast && <div className="toast" role="status"><CheckCircle2 size={18} /><span>{toast}</span><button onClick={() => setToast('')} aria-label="Dismiss notification"><X size={15} /></button></div>}
  </div>;
}

export default App;
