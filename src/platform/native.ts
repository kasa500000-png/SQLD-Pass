import * as SQLite from 'expo-sqlite';
import * as Crypto from 'expo-crypto';
import {Linking, Share} from 'react-native';
import type {AppState, Repository, Services} from '../core/types';

export class NativeRepository implements Repository {
  private readonly db: Promise<SQLite.SQLiteDatabase>;
  private readonly knownSnapshots = new Set<string>();
  constructor(name = 'sqld_pass.sqlite') { this.db = this.open(name); }
  private async open(name: string): Promise<SQLite.SQLiteDatabase> {
    const db = await SQLite.openDatabaseAsync(name);
    await db.execAsync('PRAGMA journal_mode = WAL; PRAGMA busy_timeout = 5000;');
    const row = await db.getFirstAsync<{user_version: number}>('PRAGMA user_version');
    const version = row?.user_version ?? 0;
    if (version > 1) throw new Error('더 최신 앱에서 만든 기록입니다. 앱 업데이트가 필요합니다.');
    if (version === 0) {
      await db.withExclusiveTransactionAsync(async tx => {
        await tx.execAsync(`CREATE TABLE IF NOT EXISTS learner_state (
          slot TEXT PRIMARY KEY NOT NULL,
          revision INTEGER NOT NULL,
          payload TEXT NOT NULL,
          saved_at INTEGER NOT NULL
        ); PRAGMA user_version = 1;`);
      });
    }
    await db.execAsync(`CREATE TABLE IF NOT EXISTS exam_snapshot (
      attempt_id TEXT PRIMARY KEY NOT NULL,
      payload TEXT NOT NULL
    );`);
    return db;
  }
  async load(): Promise<unknown | null> {
    const db = await this.db;
    const row = await db.getFirstAsync<{payload: string}>('SELECT payload FROM learner_state WHERE slot = ?', 'current');
    if (!row) return null;
    const decoded = JSON.parse(row.payload) as AppState;
    if (decoded && Array.isArray(decoded.exams)) {
      for (const exam of decoded.exams) {
        if (!Array.isArray(exam.snapshots)) {
          const snap = await db.getFirstAsync<{payload: string}>('SELECT payload FROM exam_snapshot WHERE attempt_id = ?', exam.id);
          if (!snap) throw new Error('응시 당시 문항을 복구할 수 없습니다. 원본 기록을 보존했습니다.');
          exam.snapshots = JSON.parse(snap.payload);
          this.knownSnapshots.add(exam.id);
        }
      }
    }
    return decoded;
  }
  async save(state: AppState): Promise<void> {
    const db = await this.db;
    const payload = JSON.stringify({...state, exams: state.exams.map(e => { const {snapshots: _snapshots, ...rest} = e; return rest; })});
    const pending = state.exams.filter(e => !this.knownSnapshots.has(e.id));
    await db.withExclusiveTransactionAsync(async tx => {
      const old = await tx.getFirstAsync<{revision: number; payload: string; saved_at: number}>('SELECT revision, payload, saved_at FROM learner_state WHERE slot = ?', 'current');
      if ((old?.revision ?? 0) !== state.revision - 1) throw new Error('저장 기록의 버전이 다릅니다. 앱을 다시 열어 주세요.');
      for (const exam of pending) await tx.runAsync('INSERT OR IGNORE INTO exam_snapshot(attempt_id, payload) VALUES (?, ?)', exam.id, JSON.stringify(exam.snapshots));
      if (old) await tx.runAsync('INSERT OR REPLACE INTO learner_state(slot, revision, payload, saved_at) VALUES (?, ?, ?, ?)', 'previous', old.revision, old.payload, old.saved_at);
      await tx.runAsync('INSERT OR REPLACE INTO learner_state(slot, revision, payload, saved_at) VALUES (?, ?, ?, ?)', 'current', state.revision, payload, Date.now());
    });
    for (const exam of pending) this.knownSnapshots.add(exam.id);
  }
  async clear(): Promise<void> {
    const db = await this.db;
    await db.withExclusiveTransactionAsync(async tx => {
      await tx.runAsync('DELETE FROM learner_state WHERE slot IN (?, ?)', 'current', 'previous');
      await tx.runAsync('DELETE FROM exam_snapshot');
    });
    this.knownSnapshots.clear();
  }
}
export function createNativeServices(): Services {
  const runtimeId = Crypto.randomUUID();
  return {
    repository: new NativeRepository(), platform: 'native',
    clock: () => ({wall: Date.now(), mono: performance.now(), runtimeId}), uuid: () => Crypto.randomUUID(),
    async openURL(url) { await Linking.openURL(url); },
    async share(message) { const result = await Share.share({message, title: 'SQLD Pass 오류 제보'}); return result.action === Share.dismissedAction ? 'cancelled' : 'shared'; }
  };
}
