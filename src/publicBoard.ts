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
 * Until configured (or while offline), the leaderboard silently falls back to
 * local-only scores, so the game always works.
 */
import { initializeApp, getApps, type FirebaseApp } from 'firebase/app';
import { getFirestore, collection, addDoc, query, where, orderBy, limit, getDocs, type Firestore } from 'firebase/firestore';
import type { Difficulty, GameRecord, Mode } from './game';

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

/** Push a finished game to the public board. Never throws. */
export async function submitPublicScore(record: GameRecord): Promise<boolean> {
  const database = firestore();
  if (!database || !record.won) return false;
  try {
    await addDoc(collection(database, 'scores'), {
      name: playerName(),
      mode: record.mode,
      difficulty: record.difficulty,
      seconds: record.seconds,
      date: record.date,
    });
    return true;
  } catch {
    return false;
  }
}

/** Top public scores for a mode/difficulty. Empty array when unconfigured/offline. */
export async function topPublicScores(mode: Mode, difficulty: Difficulty, count = 20): Promise<PublicScore[]> {
  const database = firestore();
  if (!database) return [];
  try {
    const q = query(
      collection(database, 'scores'),
      where('mode', '==', mode),
      where('difficulty', '==', difficulty),
      orderBy('seconds', 'asc'),
      limit(count),
    );
    const snapshot = await getDocs(q);
    return snapshot.docs.map(d => d.data() as PublicScore);
  } catch {
    return [];
  }
}
