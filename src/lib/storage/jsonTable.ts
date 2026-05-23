/**
 * Generic localStorage-backed collection used by every repository.
 *
 * Each "table" is a JSON array stored under a single key. We use a simple
 * in-memory cache so repeated reads in the same tick don't re-parse JSON.
 *
 * On any mutation we also broadcast on a `BroadcastChannel` so other tabs of
 * the same app can react in real-time. See `realtime/channel.ts`.
 */

import { realtimeBus } from '@/lib/realtime/channel';

const NAMESPACE = 'bb:db:';

export class JSONTable<T extends { id: string }> {
  private cache: T[] | null = null;

  constructor(public readonly name: string) {}

  private get key(): string {
    return NAMESPACE + this.name;
  }

  private load(): T[] {
    if (this.cache) return this.cache;
    try {
      const raw = localStorage.getItem(this.key);
      this.cache = raw ? (JSON.parse(raw) as T[]) : [];
    } catch {
      this.cache = [];
    }
    return this.cache;
  }

  private save(rows: T[]): void {
    this.cache = rows;
    localStorage.setItem(this.key, JSON.stringify(rows));
  }

  invalidate(): void {
    this.cache = null;
  }

  all(): T[] {
    return [...this.load()];
  }

  find(predicate: (r: T) => boolean): T | undefined {
    return this.load().find(predicate);
  }

  filter(predicate: (r: T) => boolean): T[] {
    return this.load().filter(predicate);
  }

  getById(id: string): T | undefined {
    return this.find((r) => r.id === id);
  }

  insert(row: T): T {
    const rows = [...this.load(), row];
    this.save(rows);
    realtimeBus.emit({ table: this.name, op: 'insert', id: row.id });
    return row;
  }

  insertMany(rows: T[]): T[] {
    const next = [...this.load(), ...rows];
    this.save(next);
    realtimeBus.emit({ table: this.name, op: 'insert', id: null });
    return rows;
  }

  update(id: string, patch: Partial<T>): T | undefined {
    const rows = this.load();
    const idx = rows.findIndex((r) => r.id === id);
    if (idx === -1) return undefined;
    const updated = { ...rows[idx], ...patch } as T;
    const next = [...rows];
    next[idx] = updated;
    this.save(next);
    realtimeBus.emit({ table: this.name, op: 'update', id });
    return updated;
  }

  upsert(row: T): T {
    const rows = this.load();
    const idx = rows.findIndex((r) => r.id === row.id);
    if (idx === -1) {
      this.save([...rows, row]);
      realtimeBus.emit({ table: this.name, op: 'insert', id: row.id });
    } else {
      const next = [...rows];
      next[idx] = row;
      this.save(next);
      realtimeBus.emit({ table: this.name, op: 'update', id: row.id });
    }
    return row;
  }

  remove(id: string): boolean {
    const rows = this.load();
    const next = rows.filter((r) => r.id !== id);
    if (next.length === rows.length) return false;
    this.save(next);
    realtimeBus.emit({ table: this.name, op: 'delete', id });
    return true;
  }

  removeWhere(predicate: (r: T) => boolean): number {
    const rows = this.load();
    const next = rows.filter((r) => !predicate(r));
    const removed = rows.length - next.length;
    if (removed > 0) {
      this.save(next);
      realtimeBus.emit({ table: this.name, op: 'delete', id: null });
    }
    return removed;
  }

  clear(): void {
    this.save([]);
    realtimeBus.emit({ table: this.name, op: 'delete', id: null });
  }
}
