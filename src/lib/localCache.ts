/**
 * localCache.ts — persistência offline-first em IndexedDB.
 *
 * Duas estruturas:
 *  1. Cache por tabela: `cache:${table}` → array de items (frontend shape).
 *     Espelho local de tudo que já foi lido do Supabase. Lido instantâneo.
 *
 *  2. Outbox FIFO: `outbox` → array de operações pendentes.
 *     Cada operação é { id, op, table, ... } e é processada em ordem
 *     pelo syncManager assim que houver internet.
 *
 * Por que idb-keyval e não Dexie? Não precisamos de indexes/queries
 * complexas — só `getAll` por tabela e a outbox. Idb-keyval é 1KB,
 * sem migrations, sem schema. Funciona em qualquer browser (Safari ok).
 */
import { get, set, createStore } from 'idb-keyval';

const STORE = createStore('vistec-local-v1', 'kv');

// ============================================
// CACHE POR TABELA
// ============================================

export async function getCachedTable<T>(table: string): Promise<T[] | undefined> {
  return get<T[]>(`cache:${table}`, STORE);
}

export async function setCachedTable<T>(table: string, items: T[]): Promise<void> {
  await set(`cache:${table}`, items, STORE);
}

/** Aplica patch numa única linha do cache. Cria se não existe. */
export async function upsertCacheRow<T extends { id: string }>(table: string, row: T): Promise<void> {
  const existing = (await getCachedTable<T>(table)) || [];
  const idx = existing.findIndex(r => r.id === row.id);
  if (idx >= 0) existing[idx] = row;
  else existing.push(row);
  await setCachedTable(table, existing);
}

export async function patchCacheRow<T extends { id: string }>(
  table: string,
  id: string,
  partial: Partial<T>
): Promise<T | undefined> {
  const existing = (await getCachedTable<T>(table)) || [];
  const idx = existing.findIndex(r => r.id === id);
  if (idx < 0) return undefined;
  existing[idx] = { ...existing[idx], ...partial };
  await setCachedTable(table, existing);
  return existing[idx];
}

export async function removeCacheRow<T extends { id: string }>(table: string, id: string): Promise<void> {
  const existing = (await getCachedTable<T>(table)) || [];
  const next = existing.filter(r => r.id !== id);
  await setCachedTable(table, next);
}

// ============================================
// OUTBOX
// ============================================

export type OutboxOp =
  | { id: string; ts: number; op: 'insert'; table: string; row: any }
  | { id: string; ts: number; op: 'update'; table: string; rowId: string; partial: any }
  | { id: string; ts: number; op: 'delete'; table: string; rowId: string };

export async function getOutbox(): Promise<OutboxOp[]> {
  return (await get<OutboxOp[]>('outbox', STORE)) || [];
}

export async function setOutbox(ops: OutboxOp[]): Promise<void> {
  await set('outbox', ops, STORE);
}

let outboxLock: Promise<void> = Promise.resolve();

/** Adiciona operação à outbox de forma serializada (evita race entre add() concorrentes). */
export async function enqueueOutbox(op: Omit<OutboxOp, 'id' | 'ts'>): Promise<void> {
  const next = outboxLock.then(async () => {
    const list = await getOutbox();
    list.push({
      ...(op as any),
      id: `${Date.now()}_${Math.random().toString(36).slice(2, 8)}`,
      ts: Date.now(),
    });
    await setOutbox(list);
  });
  outboxLock = next.catch(() => {});
  await next;
}

export async function popOutboxFront(opId: string): Promise<void> {
  const next = outboxLock.then(async () => {
    const list = await getOutbox();
    await setOutbox(list.filter(o => o.id !== opId));
  });
  outboxLock = next.catch(() => {});
  await next;
}

export async function getOutboxCount(): Promise<number> {
  return (await getOutbox()).length;
}
