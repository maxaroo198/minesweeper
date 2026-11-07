/**
 * Public leaderboard backed by Firebase Firestore.
 *
 * Configure with a free Firebase project (https://console.firebase.google.com),
 * enable Firestore, and put the web app config in a `.env` file:
 *
 *   VITE_FIREBASE_API_KEY=...
 *   VITE_FIREBASE_PROJECT_ID=...
 *   VITE_FIREBASE_APP_ID=...
 *
 * Local scores always work. Public read/write failures are surfaced for retry.
 */
import { initializeApp, getApps, type FirebaseApp } from 'firebase/app';
import { getFirestore, collection, doc, setDoc, getDocFromServer, query, where, orderBy, limit, getDocsFromServer, type Firestore } from 'firebase/firestore';
import type { Difficulty, GameRecord, Mode } from './game';
import { MODE_DIFFICULTIES } from './game';

let app: FirebaseApp | null = null;
let db: Firestore | null = null;

function config() {
  const env = import.meta.env as Record<string, string | undefined>;
  if (!env.VITE_FIREBASE_API_KEY || !env.VITE_FIREBASE_PROJECT_ID || !env.VITE_FIREBASE_APP_ID) return null;
  return {
    apiKey: env.VITE_FIREBASE_API_KEY,
    authDomain: env.VITE_FIREBASE_AUTH_DOMAIN ?? `${env.VITE_FIREBASE_PROJECT_ID}.firebaseapp.com`,
    projectId: env.VITE_FIREBASE_PROJECT_ID,
    appId: env.VITE_FIREBASE_APP_ID,
  };
}

export function publicBoardEnabled(): boolean {
  return !!config();
}

function firestore(): Firestore | null {
  const cfg = config();
  if (!cfg) return null;
  if (!db) {
    app = getApps().length ? getApps()[0]! : initializeApp(cfg);
    db = getFirestore(app);
  }
  return db;
}

export function playerName(): string {
  try { return localStorage.getItem('minefield-player-name') || 'Anonymous sweeper'; } catch { return 'Anonymous sweeper'; }
}
export function setPlayerName(name: string) {
  try { localStorage.setItem('minefield-player-name', name.slice(0, 24) || 'Anonymous sweeper'); } catch { /* ignore */ }
}

export interface PublicScore {
  name: string;
  mode: Mode;
  difficulty: Difficulty;
  seconds: number;
  date: string;
}

let postError = '';
export function lastPublicPostError(): string { return postError; }
export function latestPublicSubmission(mode: Mode): PublicScore | null {
  try { return JSON.parse(localStorage.getItem('minefield-public-last-v1') || '{}')[mode] ?? null; } catch { return null; }
}
function rememberSubmission(score: PublicScore) {
  try {
    const scores = JSON.parse(localStorage.getItem('minefield-public-last-v1') || '{}');
    scores[score.mode] = score;
    localStorage.setItem('minefield-public-last-v1', JSON.stringify(scores));
  } catch { /* posting succeeded even when storage is unavailable */ }
}
async function confirmedWithin<T>(promise: Promise<T>): Promise<T> {
  let timer: ReturnType<typeof setTimeout>;
  try {
    return await Promise.race([promise, new Promise<never>((_, reject) => {
      timer = setTimeout(() => reject(new Error('No server confirmation within 15 seconds. Check your connection and retry; the same score will not be duplicated.')), 15000);
    })]);
  } finally { clearTimeout(timer!); }
}

/** Immutable game IDs make retries safe, including a delayed/offline first write. */
export async function submitPublicScore(record: GameRecord): Promise<boolean> {
  postError = '';
  try {
    const database = firestore();
    if (!database) throw new Error('Firebase is not configured in this build. The win is still saved locally.');
    if(record.challenge)throw new Error('Optional Classic challenge runs stay in local history, not the standard leaderboard.');
    if (!record.won || !['classic', 'blitz'].includes(record.mode) || !record.id || !Number.isFinite(record.seconds)) throw new Error('Only completed Classic and Blitz wins can be submitted.');
    const score: PublicScore = {
      name: playerName().trim() || 'Anonymous sweeper', mode: record.mode,
      difficulty: record.difficulty, seconds: Math.max(1, record.seconds), date: record.date,
    };
    const ref = doc(database, 'scores', encodeURIComponent(record.id));
    const confirmExisting = async () => {
      const existing = await confirmedWithin(getDocFromServer(ref));
      if (!existing.exists()) return false;
      const stored = existing.data() as PublicScore;
      if (stored.mode !== score.mode || stored.difficulty !== score.difficulty || stored.seconds !== score.seconds || stored.date !== score.date) throw new Error('This game ID already belongs to a different score.');
      rememberSubmission(stored); return true;
    };
    if (await confirmExisting()) return true;
    try {
      await confirmedWithin(setDoc(ref, score)); // Resolves on server acknowledgement, not just a local cache write.
    } catch (error) {
      // Create-only rules reject a repeated write if the earlier attempt landed.
      if (await confirmExisting()) return true;
      throw error;
    }
    rememberSubmission(score);
    return true;
  } catch (error) {
    const detail = error instanceof Error ? error.message : String(error);
    postError = `Score not confirmed: ${detail} Your win is saved here; use Post / retry. ${/permission-denied/i.test(detail) ? 'Check the rules deployed to this Firebase project.' : ''}`;
    console.warn('Public leaderboard: score could not be confirmed.', error);
    return false;
  }
}

/**
 * Top public scores for a mode. Blitz asks for every difficulty at once, so the
 * board can show each player's board size next to their time.
 * Empty when unconfigured; server read errors propagate to the UI.
 */
export async function topPublicScores(mode: Mode, difficulty: Difficulty, count = 20, allDifficulties = false): Promise<PublicScore[]> {
  if (mode !== 'classic' && mode !== 'blitz') return [];
  const database = firestore();
  if (!database) return [];
  if (allDifficulties) {
    // Reuse the per-difficulty index already needed by Classic, then merge
    // each difficulty's top N. Their union contains the global top N.
    const groups = await Promise.all(MODE_DIFFICULTIES[mode].map(d => topPublicScores(mode, d, count, false)));
    return groups.flat().sort((a, b) => a.seconds - b.seconds || a.date.localeCompare(b.date)).slice(0, count);
  }
  try {
    const q = query(
      collection(database, 'scores'),
      where('mode', '==', mode),
      where('difficulty', '==', difficulty),
      orderBy('seconds', 'asc'),
      limit(count),
    );
    const snapshot = await getDocsFromServer(q);
    return snapshot.docs.map(d => ({ ...(d.data() as PublicScore) }));
  } catch (error) {
    console.warn('Public leaderboard: scores could not be loaded. Check Firestore rules and indexes.', error);
    throw error;
  }
}
