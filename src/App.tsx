import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import type { CSSProperties, ReactNode } from 'react';
import {
  ArrowDownToLine, ArrowRight, ArrowUpRight, BarChart3, BookOpen, Check,
  ChevronDown, ChevronLeft, ChevronRight, Clock3, Flag, Flame, Grid2X2, Infinity as InfinityIcon,
  Leaf, Lightbulb, Menu, Moon, MousePointer2, Play, RotateCcw, Settings2,
  ShieldCheck, Smartphone, Sparkles, Sun, Target, Trophy, Volume2, VolumeX, X, Zap,
  Expand, Minimize2, Trash2, Heart, CheckCircle2,
} from 'lucide-react';
import {
  BLITZ_SECONDS, DIFFICULTIES, MODE_NAMES, dayKey, formatTime, freshGame,
  previewBoard, readRecords, reveal, toggleFlag,
} from './game';
import type { BoardState, Difficulty, GameRecord, Mode } from './game';
import { createAndroidUrls, getAndroidDownloads } from './apkPackage';
import BootScreen from './BootScreen';
import SourceDownload from './SourceDownload';
import { sense, unlockAudio } from './sensory';
import type { Sense } from './sensory';
import '@fontsource-variable/dm-sans';
import '@fontsource/ibm-plex-mono/400.css';
import '@fontsource/ibm-plex-mono/500.css';

type View = 'play' | 'daily' | 'leaderboard' | 'guide' | 'stats';
type ModalName = 'android' | 'help' | 'settings' | 'confirm' | 'reset-stats' | 'profile' | null;
interface PendingGame { mode: Mode; difficulty: Difficulty }
type Theme = 'light' | 'dark';
const THEME_COLOR: Record<Theme, string> = { light: '#fafbf8', dark: '#14160f' };
const ANDROID_BRIDGE = 'MinefieldAndroid';
const MODES: { id: Mode; description: string; tag: string; icon: typeof Grid2X2 }[] = [
  { id: 'classic', description: 'The original. At your own pace.', tag: 'THE ORIGINAL', icon: Grid2X2 },
  { id: 'blitz', description: '60 seconds. Make every move count.', tag: '60-SECOND RUSH', icon: Zap },
  { id: 'zen', description: 'No clock. No pressure. Just flow.', tag: 'TAKE IT SLOW', icon: Leaf },
  { id: 'daily', description: 'One puzzle. A new possibility.', tag: 'FRESH EVERY DAY', icon: Sun },
];

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
function App() {
  const [view, setView] = useState<View>('play');
  const [game, setGame] = useState<BoardState>(() => previewBoard());
  const [showPreview, setShowPreview] = useState(true);
  const [now, setNow] = useState(Date.now());
  const [flagMode, setFlagMode] = useState(false);
  const [modal, setModal] = useState<ModalName>(null);
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [focusMode, setFocusMode] = useState(false);
  const [records, setRecords] = useState<GameRecord[]>(readRecords);
  const [resultVisible, setResultVisible] = useState(false);
  const [pendingGame, setPendingGame] = useState<PendingGame | null>(null);
  const [toast, setToast] = useState('');
  const [helpTab, setHelpTab] = useState<'basics' | 'modes'>('basics');
  const [leaderMode, setLeaderMode] = useState<Mode>('classic');
  const [leaderDifficulty, setLeaderDifficulty] = useState<Difficulty>('easy');
  const [sound, setSound] = useState(() => { try { return localStorage.getItem('minefield-sound') !== 'false'; } catch { return true; } });
  const [haptics, setHaptics] = useState(() => { try { return localStorage.getItem('minefield-haptics') !== 'false'; } catch { return true; } });
  const [booted, setBooted] = useState(false);
  const [revealFx, setRevealFx] = useState<{ opened: number[]; wave: Record<number, number>; origin: number; nonce: number } | null>(null);
  const [theme, setTheme] = useState<Theme>(() => {
    try {
      const saved = localStorage.getItem('minefield-theme');
      if (saved === 'light' || saved === 'dark') return saved;
      return window.matchMedia?.('(prefers-color-scheme: dark)').matches ? 'dark' : 'light';
    } catch { return 'light'; }
  });
  const [reducedMotion, setReducedMotion] = useState(() => { try { return localStorage.getItem('minefield-motion') === 'true'; } catch { return false; } });
  const [highContrast, setHighContrast] = useState(() => { try { return localStorage.getItem('minefield-contrast') === 'true'; } catch { return false; } });
  const isAndroidApp = useMemo(() => /MinefieldAndroid\//.test(navigator.userAgent) || typeof (window as Window & { MinefieldAndroid?: unknown }).MinefieldAndroid === 'object' || (/Android/i.test(navigator.userAgent) && !/wv/i.test(navigator.userAgent) && window.matchMedia?.('(display-mode: standalone)').matches), []);
  const androidPkg = useMemo(() => getAndroidDownloads(), []);
  const [androidUrls, setAndroidUrls] = useState<{ apkUrl: string | null; xapkUrl: string | null; apkDirectDataUrl: string | null }>({ apkUrl: null, xapkUrl: null, apkDirectDataUrl: null });
  const longPress = useRef<ReturnType<typeof setTimeout> | null>(null);
  const longPressed = useRef(false);
  const recorded = useRef<string>('');
  const boardRef = useRef<HTMLDivElement>(null);
  const isFinished = game.status === 'won' || game.status === 'lost';
  const elapsed = game.startedAt === null ? 0 : Math.max(0, Math.floor(((game.finishedAt ?? now) - game.startedAt) / 1000));
  const visibleTime = game.mode === 'blitz' ? BLITZ_SECONDS - elapsed : elapsed;
  const flags = game.cells.filter(c => c.flagged).length;
  const revealed = game.cells.filter(c => c.revealed && !c.mine).length;
  const progress = Math.round(revealed / (game.cells.length - game.mines) * 100);
  const displayCells = showPreview ? previewBoard().cells : game.cells;
  const wins = records.filter(r => r.won);
  const best = wins.filter(r => r.mode === 'classic' && r.difficulty === 'easy').reduce((min, r) => Math.min(min, r.seconds), Infinity);
  const winRate = records.length ? Math.round(wins.length / records.length * 100) : 0;
  const dailyDate = new Date(`${dayKey()}T12:00:00`);
  const dailyFinished = records.some(r => r.mode === 'daily' && r.date.slice(0, 10) === dayKey());
  const navName: Record<View, string> = { play: 'Play', daily: 'Daily challenge', leaderboard: 'Leaderboard', guide: 'How to play', stats: 'My statistics' };

  const notify = useCallback((message: string) => setToast(message), []);
  useEffect(() => { if (!toast) return; const timeout = setTimeout(() => setToast(''), 3500); return () => clearTimeout(timeout); }, [toast]);
  useEffect(() => { try { localStorage.setItem('minefield-games-v1', JSON.stringify(records)); } catch { /* Private browsing can disable storage. */ } }, [records]);
  useEffect(() => {
    try { localStorage.setItem('minefield-sound', String(sound)); localStorage.setItem('minefield-haptics', String(haptics)); localStorage.setItem('minefield-motion', String(reducedMotion)); localStorage.setItem('minefield-contrast', String(highContrast)); } catch { /* Settings remain available for this session. */ }
    try { localStorage.setItem('minefield-theme', theme); } catch { /* The theme still applies for this session. */ }
    document.documentElement.dataset.theme = theme;
    document.querySelector('meta[name="theme-color"]')?.setAttribute('content', THEME_COLOR[theme]);
    (window as Window & { MinefieldAndroid?: { setSystemBars: (dark: boolean) => void } })[ANDROID_BRIDGE]?.setSystemBars(theme === 'dark');
  }, [sound, haptics, reducedMotion, highContrast, theme]);
  useEffect(() => {
    if (game.status !== 'playing') return;
    const clock = setInterval(() => setNow(Date.now()), 200);
    return () => clearInterval(clock);
  }, [game.status]);
  useEffect(() => {
    if (game.status === 'playing' && game.mode === 'blitz' && game.startedAt && now - game.startedAt >= BLITZ_SECONDS * 1000) {
      setGame(g => g.status === 'playing' ? { ...g, status: 'lost', finishedAt: g.startedAt! + BLITZ_SECONDS * 1000 } : g);
    }
  }, [game.mode, game.status, game.startedAt, now]);
  useEffect(() => {
    if (!isFinished || recorded.current === game.id) return;
    recorded.current = game.id;
    const record: GameRecord = { id: game.id, mode: game.mode, difficulty: game.difficulty, won: game.status === 'won', seconds: elapsed, date: new Date().toISOString() };
    setRecords(previous => previous.some(r => r.id === record.id) ? previous : [record, ...previous].slice(0, 200));
    setResultVisible(true);
  }, [isFinished, game.id, game.mode, game.difficulty, game.status, elapsed]);
  useEffect(() => {
    if (isAndroidApp) return;
    const created = createAndroidUrls();
    setAndroidUrls({ apkUrl: created.apkUrl, xapkUrl: created.xapkUrl, apkDirectDataUrl: created.apkDirectDataUrl });
    return () => created.revoke();
  }, [isAndroidApp]);

  const sensory = useMemo(() => ({ sound, haptics }), [sound, haptics]);
  const feel = useCallback((kind: Sense) => sense(kind, sensory), [sensory]);
  useEffect(() => {
    // Browsers need a gesture before audio can start; the first touch unlocks it.
    const unlock = () => { unlockAudio(); window.removeEventListener('pointerdown', unlock); };
    window.addEventListener('pointerdown', unlock, { once: true });
    return () => window.removeEventListener('pointerdown', unlock);
  }, []);

  const startGame = (mode: Mode, difficulty: Difficulty) => {
    setGame(freshGame(mode, difficulty)); setShowPreview(false); setFlagMode(false); setResultVisible(false); setNow(Date.now());
    setView(mode === 'daily' ? 'daily' : 'play'); setModal(null); setSidebarOpen(false); boardRef.current?.scrollTo({ top: 0, left: 0 });
  };
  const requestGame = (mode = game.mode, difficulty = game.difficulty) => {
    if (game.status === 'playing') { setPendingGame({ mode, difficulty }); setModal('confirm'); }
    else startGame(mode, difficulty);
  };
  const navigate = (next: View) => {
    setSidebarOpen(false); setFocusMode(false);
    if (next === 'daily' && game.mode !== 'daily') { requestGame('daily', 'medium'); return; }
    setView(next);
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };
  const handleReveal = (index: number) => {
    if (isFinished || modal) return;
    if (flagMode) { handleFlag(index); return; }
    setShowPreview(false);
    const chording = game.cells[index]?.revealed === true;
    const base = game.status === 'ready' && showPreview ? freshGame(game.mode, game.difficulty) : game;
    const { state: next, change } = reveal(base, index);
    if (!change.opened.length) return;
    setGame(next); setNow(Date.now());
    setRevealFx({ opened: change.opened, wave: change.wave, origin: index, nonce: Date.now() });
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
  const handleFlag = (index: number) => {
    if (isFinished || modal) return;
    if (game.cells[index].revealed) return;
    if (!game.cells[index].flagged && flags >= game.mines) { notify('All your flags are in use. Move one to keep going.'); return; }
    const next = toggleFlag(game, index);
    if (next === game) return;
    setShowPreview(false); setGame(next);
    feel(game.cells[index].flagged ? 'unflag' : 'flag');
  };
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (modal || /INPUT|TEXTAREA|SELECT/.test((e.target as HTMLElement)?.tagName)) return;
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
    const message = `Minefield ${MODE_NAMES[game.mode]} · ${DIFFICULTIES[game.difficulty].label}\n${game.status === 'won' ? '🟧 All clear!' : 'A fresh start is one move away.'} ${formatTime(elapsed)}\nA little logic. A lot of possibility.${isAndroidApp ? '' : `\n${window.location.origin}`}`;
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
  const leaderboardRows = useMemo(() => records.filter(r => r.mode === leaderMode && r.difficulty === leaderDifficulty && r.won).sort((a, b) => a.seconds - b.seconds).slice(0, 20), [records, leaderMode, leaderDifficulty]);
  const totalSafe = game.cells.length - game.mines;
  const pageDescription = game.mode === 'zen' ? 'A little less hurry. A little more headspace.' : game.mode === 'blitz' ? 'Trust your instincts. Beat the clock.' : game.mode === 'daily' ? 'One board for everyone. A new challenge every day.' : 'A timeless test of deduction.';

  return <div className={`app ${reducedMotion ? 'reduce-motion' : ''} ${highContrast ? 'high-contrast' : ''} ${isAndroidApp ? 'native-app' : ''}`}>{!booted && <BootScreen onDone={() => setBooted(true)} compact={isAndroidApp} />}
    {sidebarOpen && <button className="sidebar-scrim" aria-label="Close navigation" onClick={() => setSidebarOpen(false)} />}
    <aside className={`sidebar ${sidebarOpen ? 'is-open' : ''}`}>
      <button className="brand" onClick={() => navigate('play')} aria-label="Minefield home"><BrandMark /><span>minefield<span className="brand-period">.</span></span></button>
      <div className="sidebar-intro">Small squares. Big possibilities.</div>
      <nav className="main-nav" aria-label="Main navigation">
        <div className="nav-label">YOUR PLAYGROUND</div>
        <button className={`nav-item ${view === 'play' ? 'active' : ''}`} onClick={() => navigate('play')}><Grid2X2 size={18} /><span>Let’s play</span>{view === 'play' && <span className="nav-active-dot" />}</button>
        <button className={`nav-item ${view === 'daily' ? 'active' : ''}`} onClick={() => navigate('daily')}><Sun size={19} /><span>Daily challenge</span><span className="new-badge">NEW</span></button>
        <button className={`nav-item ${view === 'leaderboard' ? 'active' : ''}`} onClick={() => navigate('leaderboard')}><Trophy size={18} /><span>Leaderboard</span></button>
        <button className={`nav-item ${view === 'stats' ? 'active' : ''}`} onClick={() => navigate('stats')}><BarChart3 size={18} /><span>My statistics</span></button>
        <div className="nav-divider" />
        <div className="nav-label">A LITTLE KNOW-HOW</div>
        <button className={`nav-item ${view === 'guide' ? 'active' : ''}`} onClick={() => navigate('guide')}><BookOpen size={18} /><span>How to play</span><ArrowUpRight size={14} className="nav-end-icon" /></button>
        <button className="nav-item" onClick={() => setModal('settings')}><Settings2 size={18} /><span>Preferences</span></button>
        {!isAndroidApp && <SourceDownload />}
      </nav>
      <div className="sidebar-bottom">
        <div className="sidebar-promo"><TileArt small /><div className="promo-copy"><h3>A little less scrolling.<br />A little more sweeping.</h3><p>Your next good break is here.</p></div><span className="promo-spark">✳</span></div>
        {!isAndroidApp && <button className="sidebar-android" onClick={() => setModal('android')}><Smartphone size={17} /><span>Download Android APK</span><ArrowDownToLine size={15} /></button>}
        <button className="profile" onClick={() => setModal('profile')}><div className="avatar">Y<span /></div><div className="profile-text"><b>You, the player</b><span>Just here for a good game</span></div><ChevronDown size={15} /></button>
      </div>
    </aside>

    <div className="main-shell">
      <header className="topbar">{isAndroidApp ? <>{view !== 'play' && <button className="icon-button native-back" aria-label="Back to the playground" onClick={() => navigate('play')}><ChevronLeft size={21} /></button>}<button className="native-brand" onClick={() => setSidebarOpen(true)} aria-label="Open menu"><BrandMark /><span>minefield<span className="brand-period">.</span></span><span className="native-mode-pill">{view === 'play' ? 'PLAYGROUND' : view === 'daily' ? 'DAILY' : view === 'leaderboard' ? 'BEST TIMES' : view === 'stats' ? 'YOUR STATS' : 'HOW TO PLAY'}</span></button></> : <div className="breadcrumb"><button className="icon-button mobile-menu" aria-label="Open navigation" onClick={() => setSidebarOpen(true)}><Menu size={20} /></button><span className="desktop-breadcrumb">Playground<ChevronRight size={14} /></span><span>{navName[view]}</span></div>}<div className="topbar-actions"><span className="local-status"><i />A little play goes a long way</span><div className="topbar-divider" /><button className="icon-button sound-button" onClick={() => { setSound(!sound); notify(sound ? 'Sound is off. Enjoy the quiet.' : 'Sound is on. A little audio, a little joy.'); }} aria-label={sound ? 'Mute sounds' : 'Enable sounds'} title={sound ? 'Sound on' : 'Sound off'}>{sound ? <Volume2 size={18} /> : <VolumeX size={18} />}</button><button className="icon-button theme-button" onClick={() => { const next = theme === 'dark' ? 'light' : 'dark'; setTheme(next); notify(next === 'dark' ? 'Night mode is on. Your eyes will thank you.' : 'Daylight mode is on. Bright and breezy.'); }} aria-label={theme === 'dark' ? 'Switch to light mode' : 'Switch to dark mode'} title={theme === 'dark' ? 'Light mode' : 'Dark mode'} data-theme-state={theme}>{theme === 'dark' ? <Sun size={18} /> : <Moon size={18} />}</button>{!isAndroidApp && (androidUrls.apkUrl ? <a className="download-button primary-download" href={androidUrls.apkUrl} download="minefield-android-v1.0.2.apk" onClick={() => { setModal('android'); notify('Downloading minefield-android-v1.0.2.apk…'); }}><Smartphone size={16} /><span>Download APK</span><ArrowDownToLine size={14} /></a> : <button className="download-button" onClick={() => setModal('android')}><Smartphone size={16} /><span>Download APK</span><ArrowDownToLine size={14} /></button>)}</div></header>

      <main className={`main-content ${focusMode ? 'focus-mode' : ''}`}>
        {(view === 'play' || view === 'daily') && <>
          <section className="page-heading"><div><div className="eyebrow"><span className="tiny-spark">✳</span>{view === 'daily' ? 'A FRESH CHALLENGE, EVERY SINGLE DAY' : 'MINESWEEPER, WITH A LITTLE MORE SOUL'}</div><h1>{view === 'daily' ? 'A new day. A new little win.' : 'Make your next move'}<span className="heading-dot">.</span></h1><p>{view === 'daily' ? 'The same board for every curious mind. Make today’s yours.' : <><span className="desktop-copy">Clear the board. Find your flow. A small escape for a curious mind.</span><span className="mobile-copy">A little logic. A lot of possibility.</span></>}</p></div><div className="heading-note"><div className="note-doodle"><Sparkles size={25} strokeWidth={1.3} /></div><div>No rush. No noise.<br /><b>Just one good move.</b></div></div></section>

          {view === 'daily' && <div className="daily-banner"><Sun size={24} /><div><b>{dailyDate.toLocaleDateString('en-US', { month: 'long', day: 'numeric' })}’s daily</b><span>One seeded puzzle, shared across all devices · Resets at midnight UTC</span></div><span className={`daily-status ${dailyFinished ? 'complete' : ''}`}>{dailyFinished ? <><CheckCircle2 size={15} /> Attempt recorded</> : 'Your move awaits'}</span></div>}

          <div className="play-layout">
            <section className="game-panel" aria-label={`${MODE_NAMES[game.mode]} Minesweeper game`}>
              <div className="game-panel-head"><div className="game-title"><div className={`mode-icon mode-${game.mode}`}><ModeIcon mode={game.mode} size={20} /></div><div><h2>{MODE_NAMES[game.mode]}<span className={`game-mode-tag ${game.mode === 'blitz' ? 'purple' : ''}`}>{game.mode === 'classic' ? 'THE CLASSIC' : game.mode === 'blitz' ? 'BEAT THE CLOCK' : game.mode === 'zen' ? 'NO PRESSURE' : 'DAILY #'+Math.floor((Date.now()-new Date('2025-01-01').getTime())/86400000)}</span></h2><p>{pageDescription}</p></div></div><button className="icon-button" onClick={() => setFocusMode(!focusMode)} aria-label={focusMode ? 'Exit focus mode' : 'Enter focus mode'} title={focusMode ? 'Exit focus mode' : 'Focus mode'}>{focusMode ? <Minimize2 size={17} /> : <Expand size={17} />}</button></div>
              <div className="difficulty-row"><div className="difficulty-tabs" role="group" aria-label="Difficulty">{(Object.keys(DIFFICULTIES) as Difficulty[]).map(diff => <button key={diff} className={game.difficulty === diff ? 'selected' : ''} aria-pressed={game.difficulty === diff} onClick={() => { if (diff !== game.difficulty) requestGame(game.mode, diff); }}><span className={`difficulty-dot dot-${diff}`} />{DIFFICULTIES[diff].label}</button>)}</div><span className="board-dimensions">{game.rows} × {game.cols}<span> · </span>{game.mines} mines</span></div>
              <div className="board-area">
                <div className="board-toolbar"><div className="board-stat"><span>{game.mode === 'blitz' ? 'TIME LEFT' : 'YOUR TIME'}</span><div className={game.mode === 'blitz' && visibleTime < 15 ? 'timer-urgent' : ''}><Clock3 size={16} /><b>{game.mode === 'zen' ? <InfinityIcon size={26} /> : formatTime(visibleTime)}</b></div></div><button className={`reset-button ${game.status === 'lost' ? 'lost' : ''}`} title="New game (N)" onClick={() => requestGame()} aria-label="Start a new game"><RotateCcw size={18} /></button><div className="board-stat mines-stat"><span>MINES LEFT</span><div><Flag size={15} /><b>{String(game.mines - flags).padStart(3, '0')}</b></div></div></div>
                <div className={`board-scroll ${game.cols > 16 ? 'wide-board' : ''}`} ref={boardRef}>
                  <div className={`mine-board ${game.status === 'playing' ? 'playing' : ''} ${isFinished ? 'is-finished' : ''} ${game.cols > 9 ? 'dense-board' : ''} ${revealFx ? 'has-reveal-fx' : ''} ${revealFx && revealFx.opened.length > 2 ? 'has-expansion-fx' : ''}`} style={{ '--columns': game.cols, '--tile-size': game.cols > 9 ? '25px' : '34px' } as CSSProperties} role="group" aria-label={`${game.rows} by ${game.cols} minefield. Click to reveal. Right-click or long press to flag.`}>
                    {displayCells.map((cell, index) => {
                      const exposedMine = cell.mine && isFinished;
                      const wrongFlag = cell.flagged && game.status === 'lost' && !cell.mine;
                      const wave = revealFx?.wave[index];
                      const isFresh = !!revealFx && Object.prototype.hasOwnProperty.call(revealFx.wave, index) && !showPreview;
                      const delay = isFresh ? Math.min(wave ?? 0, 12) * 34 : 0;
                      const expanding = isFresh && revealFx!.opened.length > 2;
                      return <button key={index} className={`tile ${cell.revealed ? 'revealed' : 'covered'} ${cell.flagged ? 'flagged' : ''} ${cell.exploded ? 'exploded' : ''} ${exposedMine ? 'mine-visible' : ''} ${wrongFlag ? 'wrong-flag' : ''} ${isFresh ? (expanding ? 'tile-expanded' : 'tile-popped') : ''} number-${cell.adjacent}`} style={isFresh ? { animationDelay: `${delay}ms`, '--wave': wave ?? 0 } as CSSProperties : undefined} aria-label={`Row ${Math.floor(index / game.cols) + 1}, column ${index % game.cols + 1}: ${cell.flagged ? 'flagged' : exposedMine ? 'mine' : cell.revealed ? `${cell.adjacent || 'empty'}${cell.adjacent ? ' adjacent mines' : ''}` : 'covered'}`} onClick={() => { if (longPressed.current) { longPressed.current = false; return; } handleReveal(index); }} onContextMenu={e => { e.preventDefault(); handleFlag(index); }} onPointerDown={e => { if (e.pointerType !== 'mouse' && !isFinished) { longPressed.current = false; longPress.current = setTimeout(() => { handleFlag(index); longPressed.current = true; }, 420); } }} onPointerUp={() => { if (longPress.current) clearTimeout(longPress.current); }} onPointerCancel={() => { if (longPress.current) clearTimeout(longPress.current); }} onPointerLeave={() => { if (longPress.current) clearTimeout(longPress.current); }} onKeyDown={e => { if (e.key.toLowerCase() === 'f' && !e.ctrlKey && !e.metaKey) { e.stopPropagation(); handleFlag(index); } }} disabled={isFinished}>{cell.flagged ? <span className="flag-marker"><Flag size={15} fill="currentColor" /></span> : exposedMine ? <span className="mine-marker"><BrandMark /></span> : cell.revealed && cell.adjacent > 0 ? <span className="number-marker">{cell.adjacent}</span> : wrongFlag ? <X size={17} /> : null}{isFresh && expanding && <span className="tile-ripple" aria-hidden="true" />}</button>;
                    })}
                  </div>
                </div>

                {isFinished && resultVisible && <div className={`result-overlay ${game.status === 'won' ? 'won' : ''}`}><div className="result-card"><div className="result-icon">{game.status === 'won' ? <Trophy size={30} /> : <BrandMark />}</div><div className="eyebrow">{game.status === 'won' ? 'A LITTLE WIN. A BIG FEELING.' : game.mode === 'blitz' && elapsed >= BLITZ_SECONDS ? 'TIME’S UP, NOT GAME OVER' : 'THERE’S ALWAYS ANOTHER SQUARE'}</div><h3>{game.status === 'won' ? 'Beautifully swept.' : 'A mine. Not the end.'}</h3><p>{game.status === 'won' ? `You cleared all ${totalSafe} safe squares. Nicely done.` : 'Take a breath. Your next great game is one click away.'}</p><div className="result-stats"><span><Clock3 size={15} />{formatTime(elapsed)}</span><span><Target size={15} />{progress}% cleared</span></div><button className="primary-button" onClick={() => startGame(game.mode, game.difficulty)}><RotateCcw size={16} />{game.status === 'won' ? 'One more good game' : 'Let’s try again'}</button><div className="result-secondary"><button onClick={() => setResultVisible(false)}>See the board</button><span>·</span><button onClick={shareResult}>Share result <ArrowUpRight size={13} /></button></div></div></div>}
                {game.mode === 'blitz' && game.status === 'playing' && <div className="blitz-progress"><span style={{ width: `${Math.max(0, visibleTime / BLITZ_SECONDS) * 100}%` }} /></div>}
              </div>
              <div className="game-controls"><button className={`flag-toggle ${flagMode ? 'enabled' : ''}`} onClick={() => setFlagMode(!flagMode)} aria-pressed={flagMode}><Flag size={15} fill={flagMode ? 'currentColor' : 'none'} /><span>Flag mode</span><span className="toggle-track"><i /></span></button><span className="board-tip"><MousePointer2 size={13} /><span>Right-click to flag</span></span><button className="new-game-text" onClick={() => requestGame()}><RotateCcw size={14} />New game</button></div>
              <div className={`board-message ${isFinished ? 'finished' : ''}`}>{isFinished ? <><Check size={13} />{game.status === 'won' ? 'A little victory, saved to your stats.' : 'Every game is a chance to get a little better.'}</> : <><ShieldCheck size={14} />{game.status === 'ready' ? 'Your first move is always safe. Go on, pick a square.' : flagMode ? 'Flag mode is on. Tap a square to mark a possible mine.' : `${game.cells.filter(c => c.revealed && !c.mine).length} safe squares found. You’ve got this.`}</>}</div>
            </section>

            <aside className="mode-column"><div className="section-title"><h2>Find your kind of focus.</h2><span>4 MODES</span></div><div className="mode-cards">{MODES.map(mode => <button key={mode.id} className={`mode-card ${game.mode === mode.id ? 'selected' : ''} mode-card-${mode.id}`} onClick={() => { if (mode.id !== game.mode) requestGame(mode.id, mode.id === 'daily' ? 'medium' : 'easy'); }} aria-pressed={game.mode === mode.id}><div className={`mode-icon mode-${mode.id}`}><ModeIcon mode={mode.id} size={21} /></div><div className="mode-card-copy"><div className="mode-card-title"><h3>{MODE_NAMES[mode.id]}</h3>{mode.id === 'daily' && <span className="small-new">NEW</span>}</div><p>{mode.description}</p><span className="mode-tag">{mode.tag}</span></div><span className="mode-select">{game.mode === mode.id ? <Check size={12} strokeWidth={2.5} /> : <ArrowUpRight size={17} />}</span></button>)}</div>
              <div className="gentle-tip"><div className="tip-icon"><Lightbulb size={21} strokeWidth={1.5} /></div><div><h3>Small clues. Clever moves.</h3><p>A number tells you how many mines are nearby. The rest? A little intuition.</p><button onClick={() => setModal('help')}>Meet your new favorite brain break <ArrowRight size={14} /></button></div></div>
              <button className="daily-teaser" onClick={() => { if (game.mode !== 'daily') requestGame('daily', 'medium'); else setView('daily'); }}><span className="daily-teaser-icon"><Sun size={20} /></span><span><b>A fresh start, every day.</b><span>Your daily puzzle is ready when you are.</span></span><ArrowUpRight size={17} /></button>
            </aside>
          </div>

          <section className="progress-strip" aria-label="Your personal progress"><div className="progress-intro"><span className="progress-icon"><Flame size={21} strokeWidth={1.5} /></span><div><h3>Little games. Little wins.</h3><p>Your progress, one square at a time.</p></div></div><div className="progress-stat"><span>GAMES PLAYED</span><b>{String(records.length).padStart(2, '0')}</b></div><div className="progress-stat"><span>WIN RATE</span><b>{records.length ? winRate : '—'}<small>{records.length ? '%' : ''}</small></b></div><div className="progress-stat"><span>BEST TIME · EASY</span><b>{Number.isFinite(best) ? formatTime(best) : '—'}</b></div><button className="icon-button" onClick={() => navigate('stats')} title="View your statistics" aria-label="View your statistics"><ArrowUpRight size={19} /></button></section>
          <footer className="page-footer"><span><Heart size={12} />A classic game. A calmer kind of play.</span><span>Made for your next little break.<span className="footer-dot">✳</span></span></footer>
        </>}

        {view === 'leaderboard' && <><section className="page-heading"><div><div className="eyebrow"><Trophy size={14} />PERSONAL BESTS, NOT PEER PRESSURE</div><h1>Your own kind of first place<span className="heading-dot">.</span></h1><p>The only person to beat? Yesterday’s you. All scores stay on this device.</p></div><span className="view-decoration"><Trophy size={39} strokeWidth={1.2} /></span></section><section className="leaderboard-panel"><div className="leaderboard-heading"><h2>Your best sweeps</h2><span className="local-badge"><ShieldCheck size={13} />Local leaderboard</span></div><div className="leaderboard-filters"><div className="difficulty-tabs">{MODES.map(mode => <button key={mode.id} className={leaderMode === mode.id ? 'selected' : ''} onClick={() => setLeaderMode(mode.id)}>{MODE_NAMES[mode.id]}</button>)}</div><select aria-label="Leaderboard difficulty" value={leaderDifficulty} onChange={e => setLeaderDifficulty(e.target.value as Difficulty)}>{(Object.keys(DIFFICULTIES) as Difficulty[]).map(d => <option key={d} value={d}>{DIFFICULTIES[d].label}</option>)}</select></div>{leaderboardRows.length ? <div className="table-scroll"><table className="score-table"><thead><tr><th>RANK</th><th>PLAYER</th><th>DATE</th><th>TIME</th><th>RESULT</th></tr></thead><tbody>{leaderboardRows.map((r, i) => <tr key={r.id}><td><span className={`rank rank-${i}`}>{i === 0 ? <Trophy size={17} /> : String(i + 1).padStart(2, '0')}</span></td><td><span className="table-player"><span className="avatar tiny">Y</span>You, the player{i === 0 && <span className="best-label">PERSONAL BEST</span>}</span></td><td>{new Date(r.date).toLocaleDateString('en-US', { month: 'short', day: 'numeric' })}</td><td className="mono">{formatTime(r.seconds)}</td><td><span className="win-badge"><CheckCircle2 size={13} />All clear</span></td></tr>)}</tbody></table></div> : <div className="empty-state"><div className="empty-illustration"><TileArt /><span><Trophy size={25} /></span></div><h3>Your name belongs here.</h3><p>Finish a {DIFFICULTIES[leaderDifficulty].label.toLowerCase()} {MODE_NAMES[leaderMode].toLowerCase()} game to set your first personal best.<br />There’s a little champion in every square.</p><button className="primary-button" onClick={() => requestGame(leaderMode, leaderDifficulty)}>Make your first mark <ArrowRight size={16} /></button></div>}<div className="leaderboard-note"><ShieldCheck size={15} />Your best 20 wins are shown. No account, no tracking, just you and your progress.</div></section></>}

        {view === 'stats' && <><section className="page-heading"><div><div className="eyebrow"><BarChart3 size={14} />SMALL STEPS. REAL PROGRESS.</div><h1>Look how far you’ve swept<span className="heading-dot">.</span></h1><p>Your little victories, all in one place. Saved right here on your device.</p></div><button className="secondary-button" onClick={() => setModal('reset-stats')}><Trash2 size={15} />Reset statistics</button></section><div className="stats-grid">{[{ label: 'GAMES PLAYED', value: records.length, icon: Grid2X2, detail: 'Every game is a little brain break.' }, { label: 'BOARDS CLEARED', value: wins.length, icon: Trophy, detail: 'A very good use of your free time.' }, { label: 'WIN RATE', value: `${winRate}%`, icon: Target, detail: 'Progress, not perfection.' }, { label: 'BEST CLASSIC · EASY', value: Number.isFinite(best) ? formatTime(best) : '—', icon: Clock3, detail: 'Your quickest little victory.' }].map(stat => <div className="stat-card" key={stat.label}><div><span>{stat.label}</span><stat.icon size={19} /></div><h2>{stat.value}</h2><p>{stat.detail}</p></div>)}</div><section className="history-panel"><div className="section-title"><h2>Recently in your playground</h2><span>{records.length} GAMES</span></div>{records.length ? <div className="history-list">{records.slice(0, 10).map(r => <div className="history-row" key={r.id}><span className={`mode-icon mode-${r.mode}`}><ModeIcon mode={r.mode} size={18} /></span><div><b>{MODE_NAMES[r.mode]}</b><span>{DIFFICULTIES[r.difficulty].label} · {new Date(r.date).toLocaleDateString('en-US', { month: 'short', day: 'numeric' })}</span></div><span className={r.won ? 'history-win' : 'history-loss'}>{r.won ? <CheckCircle2 size={14} /> : <Flag size={14} />}{r.won ? 'Board cleared' : 'Next time’s yours'}</span><span className="mono">{formatTime(r.seconds)}</span></div>)}</div> : <div className="empty-state small"><BarChart3 size={40} strokeWidth={1.2} /><h3>A clean slate. A world of possibilities.</h3><p>Your game history will appear here. Let’s make a little progress.</p><button className="primary-button" onClick={() => navigate('play')}>Head to the playground <ArrowRight size={16} /></button></div>}</section></>}

        {view === 'guide' && <><section className="page-heading"><div><div className="eyebrow"><BookOpen size={14} />A LITTLE KNOW-HOW GOES A LONG WAY</div><h1>Easy to learn. Lovely to master<span className="heading-dot">.</span></h1><p>A few simple rules. An endless supply of “aha” moments.</p></div><span className="view-decoration"><Lightbulb size={40} strokeWidth={1.2} /></span></section><section className="guide-panel"><div className="guide-tabs"><button className={helpTab === 'basics' ? 'selected' : ''} onClick={() => setHelpTab('basics')}>The basics</button><button className={helpTab === 'modes' ? 'selected' : ''} onClick={() => setHelpTab('modes')}>Find your mode</button></div>{helpTab === 'basics' ? <HelpContent /> : <div className="mode-guide-grid">{MODES.map(mode => <div key={mode.id} className={`mode-guide-card mode-card-${mode.id}`}><div className={`mode-icon mode-${mode.id}`}><ModeIcon mode={mode.id} size={22} /></div><h3>{MODE_NAMES[mode.id]}</h3><p>{mode.id === 'classic' ? 'The game you know, with three ways to challenge yourself. Easy: 9 × 9, 10 mines. Medium: 16 × 16, 40 mines. Hard: 30 × 16, 99 mines.' : mode.id === 'blitz' ? 'One minute on the clock. Clear the board before time runs out. Easy is a good place to warm up; Hard is a real test of speed and strategy.' : mode.id === 'zen' ? 'All the satisfying logic, none of the ticking clock. Take as much time as you like. The game ends when you say it does.' : 'The same seeded puzzle for every player, updated at midnight UTC. Choose your difficulty, compare notes, and come back tomorrow for something new.'}</p><button onClick={() => requestGame(mode.id, mode.id === 'daily' ? 'medium' : 'easy')}>Give it a go <ArrowRight size={15} /></button></div>)}</div>}<div className="guide-bottom"><span><Heart size={15} />You don’t need to be an expert. Just a little curious.</span><button className="primary-button" onClick={() => navigate('play')}>I’m ready to play <Play size={15} fill="currentColor" /></button></div></section></>}
      </main>
    </div>

    <nav className="mobile-bottom-nav" aria-label="Mobile navigation"><button className={view === 'play' ? 'active' : ''} onClick={() => navigate('play')}><Grid2X2 size={20} /><span>Play</span></button><button className={view === 'daily' ? 'active' : ''} onClick={() => navigate('daily')}><Sun size={20} /><span>Daily</span></button><button className={view === 'leaderboard' ? 'active' : ''} onClick={() => navigate('leaderboard')}><Trophy size={19} /><span>Best times</span></button><button className={view === 'stats' ? 'active' : ''} onClick={() => navigate('stats')}><BarChart3 size={19} /><span>My stats</span></button><button className={view === 'guide' ? 'active' : ''} onClick={() => navigate('guide')}><BookOpen size={19} /><span>How to play</span></button></nav>

    {modal === 'help' && <Modal title="A little logic goes a long way." eyebrow="HOW TO PLAY" close={() => setModal(null)} className="help-modal"><HelpContent /><button className="primary-button full-width" onClick={() => setModal(null)}>Got it. Let’s make a move. <ArrowRight size={16} /></button></Modal>}
    {modal === 'settings' && <Modal title="Make yourself at home." eyebrow="YOUR PLAYGROUND, YOUR WAY" close={() => setModal(null)}><p className="modal-intro">A few small adjustments for your kind of play.</p><div className="settings-list"><div className="setting-row"><span className="setting-icon">{theme === 'dark' ? <Moon size={20} /> : <Sun size={20} />}</span><div><b>Night mode</b><p>Switch between warm daylight and calm dark mode.</p></div><button className={`switch ${theme === 'dark' ? 'on' : ''}`} role="switch" aria-checked={theme === 'dark'} aria-label="Night mode" onClick={() => setTheme(theme === 'dark' ? 'light' : 'dark')}><span /></button></div><div className="setting-row"><span className="setting-icon"><Volume2 size={20} /></span><div><b>Little sounds</b><p>A subtle note for every good move.</p></div><button className={`switch ${sound ? 'on' : ''}`} role="switch" aria-checked={sound} aria-label="Game sound" onClick={() => setSound(!sound)}><span /></button></div><div className="setting-row"><span className="setting-icon"><Zap size={20} /></span><div><b>Little vibrations</b><p>Gentle haptic blips for flags, taps and mines.</p></div><button className={`switch ${haptics ? 'on' : ''}`} role="switch" aria-checked={haptics} aria-label="Haptic feedback" onClick={() => setHaptics(!haptics)}><span /></button></div><div className="setting-row"><span className="setting-icon"><Sparkles size={20} /></span><div><b>Reduce motion</b><p>Keep things still and easy on the eyes.</p></div><button className={`switch ${reducedMotion ? 'on' : ''}`} role="switch" aria-checked={reducedMotion} aria-label="Reduce motion" onClick={() => setReducedMotion(!reducedMotion)}><span /></button></div><div className="setting-row"><span className="setting-icon"><Target size={20} /></span><div><b>Higher contrast</b><p>Make numbers and board edges clearer.</p></div><button className={`switch ${highContrast ? 'on' : ''}`} role="switch" aria-checked={highContrast} aria-label="Higher contrast" onClick={() => setHighContrast(!highContrast)}><span /></button></div></div><div className="settings-note"><ShieldCheck size={16} />These preferences are saved on this device.</div><button className="primary-button full-width" onClick={() => setModal(null)}>Just right <Check size={16} /></button></Modal>}
    {modal === 'confirm' && <Modal title="A fresh board, a fresh start?" eyebrow="ONE LITTLE THING" close={() => setModal(null)}><p className="modal-intro">You’re in the middle of a game. Starting a new one will leave this round behind — your previous results stay safe.</p><div className="confirm-preview"><span className={`mode-icon mode-${pendingGame?.mode || game.mode}`}><ModeIcon mode={pendingGame?.mode || game.mode} /></span><div><b>{MODE_NAMES[pendingGame?.mode || game.mode]}</b><span>{DIFFICULTIES[pendingGame?.difficulty || game.difficulty].label} · {formatTime(elapsed)} played</span></div></div><div className="modal-actions"><button className="secondary-button" onClick={() => setModal(null)}>Keep playing</button><button className="primary-button" onClick={() => { if (pendingGame) startGame(pendingGame.mode, pendingGame.difficulty); setPendingGame(null); }}><RotateCcw size={15} />Start fresh</button></div></Modal>}
    {modal === 'reset-stats' && <Modal title="A completely clean slate?" eyebrow="RESET YOUR STATISTICS" close={() => setModal(null)}><p className="modal-intro">This will permanently clear {records.length} game records and all your personal bests from this device. Your preferences and current game won’t change.</p><div className="modal-actions"><button className="secondary-button" onClick={() => setModal(null)}>Keep my progress</button><button className="primary-button danger" onClick={() => { setRecords([]); recorded.current = game.id; setModal(null); notify('A clean slate. Here’s to your next little win.'); }}><Trash2 size={15} />Clear my stats</button></div></Modal>}
    {modal === 'profile' && <Modal title="Hey there, curious mind." eyebrow="NO ACCOUNT. JUST A GOOD GAME." close={() => setModal(null)}><div className="profile-summary"><div className="avatar big">Y</div><div><h3>You, the player</h3><p>Local player · All your progress stays with you.</p></div></div><div className="profile-numbers"><span><b>{records.length}</b>games played</span><span><b>{wins.length}</b>little victories</span><span><b>{winRate}%</b>win rate</span></div><div className="settings-note"><ShieldCheck size={17} /><span>No sign-ups, no cloud, no tracking. Your Android app and browser keep separate local saves.</span></div><button className="primary-button full-width" onClick={() => { setModal(null); navigate('stats'); }}>See your little wins <ArrowRight size={16} /></button></Modal>}
    {modal === 'android' && <Modal title="Your next break. To go." eyebrow="MINEFIELD FOR ANDROID" close={() => setModal(null)} className="android-modal"><div className="android-hero"><div className="app-icon"><BrandMark /></div><div><h3>minefield<span>.</span></h3><p>All your favorite little challenges.<br />Right in your pocket.</p></div><span className="android-version">v1.0.2</span></div><div className="android-features"><span><CheckCircle2 size={17} />All 4 game modes</span><span><CheckCircle2 size={17} />Light & dark themes</span><span><CheckCircle2 size={17} />100% offline play</span><span><CheckCircle2 size={17} />Your scores, saved locally</span></div>{isAndroidApp ? <div className="native-installed"><CheckCircle2 size={18} /><span>You’ve already got the Android app. Happy sweeping!</span></div> : androidUrls.apkUrl ? <div className="android-download-stack"><a className="primary-button full-width android-download" href={androidUrls.apkUrl} download="minefield-android-v1.0.2.apk" onClick={() => notify('Downloading minefield-android-v1.0.2.apk…')}><Smartphone size={19} /><span>Download Android APK ({androidPkg.apkSizeKb} KB)</span><ArrowDownToLine size={18} /></a>{androidUrls.xapkUrl && <a className="secondary-button full-width android-download-xapk" href={androidUrls.xapkUrl} download="minefield-android-v1.0.2.xapk" onClick={() => notify('Downloading minefield-android-v1.0.2.xapk…')}><Smartphone size={17} /><span>Download XAPK Package ({androidPkg.xapkSizeKb} KB)</span><ArrowDownToLine size={16} /></a>}{androidUrls.apkDirectDataUrl && <a className="android-fallback-link" href={androidUrls.apkDirectDataUrl} download="minefield-android-v1.0.2.apk">Having trouble? Use direct data download</a>}</div> : <div className="apk-building"><Smartphone size={20} /><div><b>Preparing Android package…</b><p>In the meantime, enjoy every mode right here in your browser.</p></div></div>}<p className="android-requirements"><Smartphone size={13} />Android 8.0 or newer · Signed APK & XAPK · Free, forever</p>{!isAndroidApp && <SourceDownload className="secondary-button full-width source-download-inline" />}<div className="install-guide"><h4>Three taps to a little more play.</h4><p><span>1</span>If you installed v1.0 earlier, uninstall the old Minefield app first.</p><p><span>2</span>Tap Download Android APK above and open the downloaded v1.0.2 file.</p><p><span>3</span>Tap Install (choose “Install anyway” if Android prompts about an independent app).</p></div><div className="android-security"><ShieldCheck size={16} /><p>This is a direct, self-signed APK — not a Google Play release. Android may show an “unknown app” warning. Only install the package you downloaded here.</p></div></Modal>}
    {toast && <div className="toast" role="status"><CheckCircle2 size={18} /><span>{toast}</span><button onClick={() => setToast('')} aria-label="Dismiss notification"><X size={15} /></button></div>}
  </div>;
}

export default App;
