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

async function applyOp(op: OutboxOp): Promise<{ ok: boolean; transient: boolean }> {
  try {
    if (op.op === 'insert') {
      const { error } = await supabase.from(op.table).insert(op.row);
      if (error) {
        // 23505 = unique_violation: já foi inserido (provável retry após sucesso)
        // 409 = conflict
        if ((error as any).code === '23505' || (error as any).status === 409) {
          return { ok: true, transient: false };
        }
        // Erro de schema/PostgREST: NÃO transient, descarta a op para não bloquear a fila
        if ((error as any).code?.startsWith?.('PGRST')) {
          console.warn('[sync] descartando op com erro de schema:', op, error);
          return { ok: true, transient: false };
        }
        return { ok: false, transient: true };
      }
      return { ok: true, transient: false };
    }
    if (op.op === 'update') {
      const { error } = await supabase.from(op.table).update(op.partial).eq('id', op.rowId);
      if (error) {
        if ((error as any).code?.startsWith?.('PGRST')) {
          console.warn('[sync] descartando update com erro de schema:', op, error);
          return { ok: true, transient: false };
        }
        return { ok: false, transient: true };
      }
      return { ok: true, transient: false };
    }
    if (op.op === 'delete') {
      const { error } = await supabase.from(op.table).delete().eq('id', op.rowId);
      if (error) {
        // 404 = já não existe; ok
        if ((error as any).status === 404) return { ok: true, transient: false };
        if ((error as any).code?.startsWith?.('PGRST')) {
          console.warn('[sync] descartando delete com erro de schema:', op, error);
          return { ok: true, transient: false };
        }
        return { ok: false, transient: true };
      }
      return { ok: true, transient: false };
    }
    return { ok: true, transient: false };
  } catch (err) {
    // Erro de rede: transient. Tenta de novo.
    return { ok: false, transient: true };
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
        await notifyListeners();
      } else if (result.transient) {
        // Rede caiu / servidor instável: para o loop, tenta de novo no próximo trigger
        break;
      } else {
        // Erro permanente já foi tratado em applyOp (descarta)
        await popOutboxFront(head.id);
        await notifyListeners();
      }
    }
  } finally {
    running = false;
  }
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
