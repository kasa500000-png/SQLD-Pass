import * as SQLite from 'expo-sqlite';
import * as Crypto from 'expo-crypto';
import {Linking, Share} from 'react-native';
import type {AppState, Repository, Services} from '../core/types';
import support from '../../config/public-support.json';

export class NativeRepository implements Repository {
  private db?: Promise<SQLite.SQLiteDatabase>;
  private readonly knownSnapshots = new Set<string>();
  constructor(private readonly name = 'sqld_pass.sqlite') {}
  private connection(): Promise<SQLite.SQLiteDatabase> {
    if (!this.db) {
      const opening = this.open(this.name).catch(error => {
        if (this.db === opening) this.db = undefined;
        throw error;
      });
      this.db = opening;
    }
    return this.db;
  }
  private async open(name: string): Promise<SQLite.SQLiteDatabase> {
    // Own the connection so a failed initialization cannot reuse a stale native handle.
    // The same database file, schema, previous slot and snapshots remain in place.
    const db = await SQLite.openDatabaseAsync(name, {useNewConnection: true});
    try {
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
    } catch (error) {
      try { await db.closeAsync(); } catch { /* Preserve the original failure. */ }
      throw error;
    }
  }
  async load(): Promise<unknown | null> {
    const connection = this.connection();
    const db = await connection;
    try {
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
    } catch (error) {
      // Loading happens before the controller accepts writes. A user retry gets a
      // fresh handle; no automatic replay of writes or removal of learner records.
      if (this.db === connection) {
        try { await db.closeAsync(); } catch { /* Preserve the read failure. */ }
        this.db = undefined;
        this.knownSnapshots.clear();
      }
      throw error;
    }
  }
  async save(state: AppState): Promise<void> {
    const db = await this.connection();
    const payload = JSON.stringify({...state, exams: state.exams.map(e => { const {snapshots: _snapshots, ...rest} = e; return rest; })});
    const pending = state.exams.filter(e => !this.knownSnapshots.has(e.id));
    await db.withExclusiveTransactionAsync(async tx => {
      const old = await tx.getFirstAsync<{revision: number; payload: string; saved_at: number}>('SELECT revision, payload, saved_at FROM learner_state WHERE slot = ?', 'current');
      if ((old?.revision ?? 0) !== state.revision - 1) throw new Error('저장 기록의 버전이 다릅니다. 앱을 다시 열어 주세요.');
      const migrating=state.textbookMigration?.version===1&&!!old&&JSON.parse(old.payload).contentVersion==='phase1.20260908.1'&&state.contentVersion!==JSON.parse(old.payload).contentVersion;
      if(migrating){await tx.runAsync('DELETE FROM learner_state WHERE slot = ?', 'previous');await tx.runAsync('DELETE FROM exam_snapshot');}
      for (const exam of pending) await tx.runAsync('INSERT OR IGNORE INTO exam_snapshot(attempt_id, payload) VALUES (?, ?)', exam.id, JSON.stringify(exam.snapshots));
      if (old && !migrating) await tx.runAsync('INSERT OR REPLACE INTO learner_state(slot, revision, payload, saved_at) VALUES (?, ?, ?, ?)', 'previous', old.revision, old.payload, old.saved_at);
      await tx.runAsync('INSERT OR REPLACE INTO learner_state(slot, revision, payload, saved_at) VALUES (?, ?, ?, ?)', 'current', state.revision, payload, Date.now());
    });
    if(state.textbookMigration&&state.exams.length===0)this.knownSnapshots.clear();
    for (const exam of pending) this.knownSnapshots.add(exam.id);
  }
  async clear(): Promise<void> {
    const db = await this.connection();
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
    supportEmail:support.supportEmail,privacyUrl:support.privacyUrl,supportUrl:support.supportUrl,
    clock: () => ({wall: Date.now(), mono: performance.now(), runtimeId}), uuid: () => Crypto.randomUUID(),
    async openURL(url) { await Linking.openURL(url); },
    async share(message) { const result = await Share.share({message, title: 'SQLD Pass 오류 제보'}); return result.action === Share.dismissedAction ? 'cancelled' : 'shared'; }
  };
}
