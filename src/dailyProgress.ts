import type { GameRecord } from './game';
const KEY = 'minefield-daily-wins-v1';
const valid = (s: unknown): s is string => typeof s === 'string' && /^\d{4}-\d{2}-\d{2}$/.test(s) && !Number.isNaN(Date.parse(s));
export function mergeDailyWins(days: string[], records: GameRecord[]): string[] {
  return [...new Set([...days.filter(valid), ...records.filter(r => r.mode === 'daily' && r.won).map(r => r.dailyDay ?? r.date.slice(0, 10)).filter(valid)])].sort();
}
export function readDailyWins(records: GameRecord[] = []): string[] {
  try { const data: unknown = JSON.parse(localStorage.getItem(KEY) || '[]'); return mergeDailyWins(Array.isArray(data) ? data : [], records); } catch { return mergeDailyWins([], records); }
}
export function saveDailyWins(days: string[]) { try { localStorage.setItem(KEY, JSON.stringify(days)); } catch { /* No persistent storage available. */ } }
export function streakFor(days: string[], today: string): number {
  const set = new Set(days);
  const cursor = new Date(`${today}T12:00:00Z`);
  if (!set.has(today)) cursor.setUTCDate(cursor.getUTCDate() - 1);
  let n = 0;
  while (set.has(cursor.toISOString().slice(0, 10))) { n++; cursor.setUTCDate(cursor.getUTCDate() - 1); }
  return n;
}
