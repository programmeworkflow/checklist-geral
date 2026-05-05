/**
 * syncManager.ts — processa a outbox local contra o Supabase.
 *
 * Disparos:
 *  - `triggerSync()` chamado após cada mutação local (no storage.ts)
 *  - Evento `online` da janela
 *  - Polling a cada 30s
 *  - Boot do app (start())
 *
 * Garantias:
 *  - FIFO: operações são processadas estritamente na ordem de inserção.
 *  - Idempotência: se uma op falhar, fica na outbox e tenta de novo.
 *  - Single-flight: nunca há dois processOutbox concorrentes.
 *
 * Conflito: política simples de "last write wins". Se o servidor já tem
 * um registro mais novo, o update local sobrescreve — assume-se que o
 * usuário que fez a mudança offline tem a intenção mais recente.
 */
import { supabase } from './supabase';
import {
  getOutbox,
  popOutboxFront,
  type OutboxOp,
} from './localCache';

let running = false;
let pollerStarted = false;
const listeners = new Set<(pending: number) => void>();
const errorListeners = new Set<(err: { table: string; op: string; message: string }) => void>();
let lastSuccessAt: number | null = null;
const successListeners = new Set<(ts: number) => void>();

async function notifyListeners() {
  if (listeners.size === 0) return;
  const pending = (await getOutbox()).length;
  for (const cb of listeners) {
    try { cb(pending); } catch {}
  }
}

/** Subscribe to pending count changes. Returns unsubscribe. */
export function onPendingChange(cb: (pending: number) => void): () => void {
  listeners.add(cb);
  // Dispatch initial count
  getOutbox().then(list => { try { cb(list.length); } catch {} });
  return () => { listeners.delete(cb); };
}

/** Subscribe to permanent sync errors (schema-level rejections). */
export function onSyncError(cb: (err: { table: string; op: string; message: string }) => void): () => void {
  errorListeners.add(cb);
  return () => { errorListeners.delete(cb); };
}

/** Subscribe to successful syncs (each op that flushed). */
export function onSyncSuccess(cb: (ts: number) => void): () => void {
  successListeners.add(cb);
  if (lastSuccessAt) { try { cb(lastSuccessAt); } catch {} }
  return () => { successListeners.delete(cb); };
}

function fireError(err: { table: string; op: string; message: string }) {
  for (const cb of errorListeners) {
    try { cb(err); } catch {}
  }
}

function isTransientError(error: any): boolean {
  // Sem mensagem → provavelmente erro de rede capturado pelo wrapper Supabase
  if (!error) return false;
  // FetchError / NetworkError / TypeError do fetch nativo
  const msg = String(error.message || '').toLowerCase();
  if (msg.includes('failed to fetch') || msg.includes('networkerror') || msg.includes('load failed')) return true;
  // 408 / 5xx
  const status = (error as any).status;
  if (status === 408 || status === 429 || (status >= 500 && status < 600)) return true;
  return false;
}

async function applyOp(op: OutboxOp): Promise<{ ok: boolean; transient: boolean; error?: any }> {
  try {
    if (op.op === 'insert') {
      const { error } = await supabase.from(op.table).insert(op.row);
      if (!error) return { ok: true, transient: false };
      // 23505 = unique_violation: provável retry após sucesso. Trata como ok.
      if ((error as any).code === '23505' || (error as any).status === 409) {
        return { ok: true, transient: false };
      }
      if (isTransientError(error)) return { ok: false, transient: true, error };
      // Erro permanente: dispara notificação visível e descarta
      fireError({
        table: op.table,
        op: 'insert',
        message: (error as any).message || (error as any).details || 'erro desconhecido',
      });
      console.error('[sync] insert FALHOU permanentemente:', op, error);
      return { ok: true, transient: false, error };
    }

    if (op.op === 'update') {
      const { error } = await supabase.from(op.table).update(op.partial).eq('id', op.rowId);
      if (!error) return { ok: true, transient: false };
      if (isTransientError(error)) return { ok: false, transient: true, error };
      fireError({
        table: op.table,
        op: 'update',
        message: (error as any).message || (error as any).details || 'erro desconhecido',
      });
      console.error('[sync] update FALHOU permanentemente:', op, error);
      return { ok: true, transient: false, error };
    }

    if (op.op === 'delete') {
      const { error } = await supabase.from(op.table).delete().eq('id', op.rowId);
      if (!error) return { ok: true, transient: false };
      if ((error as any).status === 404) return { ok: true, transient: false };
      if (isTransientError(error)) return { ok: false, transient: true, error };
      fireError({
        table: op.table,
        op: 'delete',
        message: (error as any).message || (error as any).details || 'erro desconhecido',
      });
      console.error('[sync] delete FALHOU permanentemente:', op, error);
      return { ok: true, transient: false, error };
    }

    return { ok: true, transient: false };
  } catch (err) {
    // Catch-all: se qualquer exceção rolou, considera transient pra reintentar
    return { ok: false, transient: true, error: err };
  }
}

async function processOutbox() {
  if (running) return;
  if (typeof navigator !== 'undefined' && navigator.onLine === false) return;
  running = true;
  try {
    while (true) {
      const queue = await getOutbox();
      if (queue.length === 0) break;
      const head = queue[0];
      const result = await applyOp(head);
      if (result.ok) {
        await popOutboxFront(head.id);
        lastSuccessAt = Date.now();
        for (const cb of successListeners) {
          try { cb(lastSuccessAt); } catch {}
        }
        await notifyListeners();
      } else {
        // Tudo que não é "ok" é tratado como transient — para o loop, tenta de novo no próximo trigger
        break;
      }
    }
  } finally {
    running = false;
  }
}

/** Force a sync attempt (used by manual button). Resolves when a pass finishes. */
export async function forceSync(): Promise<void> {
  await processOutbox();
}

/** Disparado por código que acabou de fazer uma mutação local. */
export function triggerSync(): void {
  // não bloqueia o caller; processOutbox cuida do single-flight
  void processOutbox();
}

/** Inicializa listeners. Chamar uma vez no boot do app (main.tsx). */
export function startSync(): void {
  if (typeof window === 'undefined') return;

  if (!pollerStarted) {
    pollerStarted = true;
    window.addEventListener('online', () => {
      void processOutbox();
    });
    // Polling de fallback: garante que mesmo sem evento "online" (alguns
    // browsers em background) a fila eventualmente sai.
    setInterval(() => { void processOutbox(); }, 30_000);
  }

  // Tenta sincronizar agora
  void processOutbox();
}
