// Local-first data store: IndexedDB (idb-keyval) é a fonte de verdade
// imediata. As operações aplicam local primeiro e enfileiram na outbox;
// o syncManager reconcilia com o Supabase quando há rede. Funciona 100%
// offline em qualquer navegador (incluindo Safari/iOS).
import { supabase } from './supabase';
import { toDb, fromDb } from './columnMap';
import {
  getCachedTable,
  setCachedTable,
  upsertCacheRow,
  patchCacheRow,
  removeCacheRow,
  enqueueOutbox,
  getOutbox,
} from './localCache';
import { triggerSync } from './syncManager';

// ============================================
// TYPES (unchanged)
// ============================================
export type DocType = 'CNPJ' | 'CPF' | 'CEI' | 'CAEPF';

export interface Company { id: string; name: string; docType?: DocType; doc?: string; cnpj?: string; logo?: string; }
export interface Sector { id: string; companyId: string; name: string; }
export interface JobFunction { id: string; sectorId: string; name: string; description?: string; audioDescription?: string; }
export interface RiskCategory { id: string; name: string; type: string; }
export interface Risk { id: string; categoryId: string; name: string; source: string; exposureType: string; recommendations: string; customFields: Record<string, string>; audioDescription?: string; }
export type SafetyMeasureCategory = 'epi' | 'geral';
export interface SafetyMeasure {
  id: string;
  riskId: string;
  name: string;
  category?: SafetyMeasureCategory;
}
export interface Professional { id: string; name: string; formation: string; registration: string; }
export interface OccupationalExam { id: string; riskId: string; name: string; esocialCode?: string; admissional: boolean; demissional: boolean; periodico: boolean; periodicidade?: 6 | 12 | 24; retornoTrabalho: boolean; mudanca: boolean; }
export interface EPI { id: string; name: string; description: string; image?: string; }
export interface Training { id: string; name: string; description: string; }
export type FieldType = 'text' | 'textarea' | 'number' | 'date' | 'dropdown' | 'checkbox' | 'radio' | 'image' | 'display_image' | 'audio' | 'signature' | 'user_select';
export interface BlockField { id: string; blockId: string; label: string; type: FieldType; required: boolean; visible: boolean; order: number; description?: string; options?: string[]; }
export interface ChecklistBlock { id: string; name: string; order: number; isSystem: boolean; visible: boolean; description?: string; }
export interface NavItem { id: string; key: string; label: string; visible: boolean; order: number; }
export interface ReportBlock { id: string; key: string; label: string; visible: boolean; order: number; }
export interface RiskMeasure { id: string; riskId: string; measureId: string; }
export interface RiskExam {
  id: string; riskId: string; examId: string;
  admissional: boolean; demissional: boolean; periodico: boolean;
  periodicidade?: 6 | 12 | 24;
  retornoTrabalho: boolean; mudanca: boolean;
}
export interface ChecklistData {
  id: string; companyId: string; sectorId: string; functionIds: string[]; createdAt: string;
  updatedAt?: string; isDraft?: boolean;
  formData: Record<string, any>;
  selectedRisks: Record<string, { checked: boolean; desc?: string; notes?: string; frequency?: string }>;
  selectedEpis: Record<string, boolean>;
  selectedTrainings: Record<string, boolean>;
}

// ============================================
// HELPERS
// ============================================
function genId() {
  return Date.now().toString(36) + Math.random().toString(36).slice(2, 8);
}

// ============================================
// GENERIC ASYNC CRUD (Supabase)
// ============================================
export interface CrudStore<T extends { id: string }> {
  getAll: () => Promise<T[]>;
  get: (id: string) => Promise<T | undefined>;
  add: (item: Omit<T, 'id'>) => Promise<T>;
  update: (id: string, data: Partial<T>) => Promise<T | undefined>;
  remove: (id: string) => Promise<void>;
  setAll: (items: T[]) => Promise<void>;
  table: string;
}

/** Aplica as ops pendentes da outbox SOBRE uma lista vinda do servidor.
 *  Crítico: evita perder mutations locais que ainda não subiram. */
async function applyPendingToList<T extends { id: string }>(
  table: string,
  serverList: T[]
): Promise<T[]> {
  const outbox = await getOutbox();
  const pendingForTable = outbox.filter(op => op.table === table);
  if (pendingForTable.length === 0) return serverList;

  const map = new Map<string, T>();
  for (const r of serverList) map.set(r.id, r);

  for (const op of pendingForTable) {
    if (op.op === 'insert') {
      // garante que o registro está presente — converte de DB shape pra frontend
      const localRow = fromDb(table, op.row) as T;
      map.set(localRow.id, { ...(map.get(localRow.id) || {} as T), ...localRow });
    } else if (op.op === 'update') {
      const partial = fromDb(table, op.partial);
      const existing = map.get(op.rowId);
      if (existing) map.set(op.rowId, { ...existing, ...partial });
      else map.set(op.rowId, { id: op.rowId, ...partial } as T);
    } else if (op.op === 'delete') {
      map.delete(op.rowId);
    }
  }
  return Array.from(map.values());
}

/** Refresh em segundo plano: busca a tabela inteira do Supabase, mescla
 *  com a outbox local (preserva mutações pendentes), atualiza cache.
 *  Tem timeout de 6s — em rede ruim, prefere usar cache do que travar a UI.
 *  Se offline ou erro, ignora silenciosamente. */
async function refreshFromServer<T extends { id: string }>(table: string): Promise<T[] | null> {
  if (typeof navigator !== 'undefined' && navigator.onLine === false) return null;
  try {
    const fetchPromise = supabase.from(table).select('*');
    const timeoutPromise = new Promise<{ data: null; error: any }>((resolve) =>
      setTimeout(() => resolve({ data: null, error: { message: 'timeout' } }), 6000)
    );
    const { data, error } = await Promise.race([fetchPromise, timeoutPromise]);
    if (error || !data) return null;
    const serverItems = data.map(row => fromDb(table, row) as T);
    // Re-aplica tudo que ainda está pendente na outbox por cima do snapshot
    const merged = await applyPendingToList(table, serverItems);
    await setCachedTable(table, merged);
    return merged;
  } catch {
    return null;
  }
}

function createCrud<T extends { id: string }>(table: string): CrudStore<T> {
  // refresh-em-segundo-plano dispara só uma vez por sessão por tabela
  // (depois fica nas mãos do syncManager.pull periódico)
  let firstFetchDone = false;

  return {
    table,

    /** Local-first read. Retorna o cache imediatamente; se for primeira
     *  leitura da sessão, dispara um pull do servidor em background pra
     *  atualizar o cache na próxima chamada. */
    getAll: async (): Promise<T[]> => {
      const cached = await getCachedTable<T>(table);

      if (!firstFetchDone) {
        firstFetchDone = true;
        const fresh = await refreshFromServer<T>(table);
        if (fresh) return fresh;
      }

      if (cached) return cached;

      // Cache vazio E primeira fetch falhou → tenta novamente uma vez
      const fresh = await refreshFromServer<T>(table);
      return fresh || [];
    },

    get: async (id: string): Promise<T | undefined> => {
      const cached = await getCachedTable<T>(table);
      const local = cached?.find(r => r.id === id);
      if (local) return local;

      // Não tinha local — tenta servidor
      if (typeof navigator !== 'undefined' && navigator.onLine === false) return undefined;
      try {
        const { data } = await supabase.from(table).select('*').eq('id', id).maybeSingle();
        if (!data) return undefined;
        const row = fromDb(table, data) as T;
        await upsertCacheRow(table, row);
        return row;
      } catch {
        return undefined;
      }
    },

    /** Aplica no cache LOCAL imediatamente, enfileira pro Supabase. */
    add: async (item: Omit<T, 'id'>): Promise<T> => {
      const id = genId();
      const row = { ...item, id } as T;
      await upsertCacheRow(table, row);
      await enqueueOutbox({ op: 'insert', table, row: toDb(table, row) });
      triggerSync();
      return row;
    },

    update: async (id: string, partial: Partial<T>): Promise<T | undefined> => {
      const updated = await patchCacheRow<T>(table, id, partial);
      const dbPartial = toDb(table, partial);
      delete dbPartial.id;
      await enqueueOutbox({ op: 'update', table, rowId: id, partial: dbPartial });
      triggerSync();
      return updated;
    },

    remove: async (id: string): Promise<void> => {
      await removeCacheRow(table, id);
      await enqueueOutbox({ op: 'delete', table, rowId: id });
      triggerSync();
    },

    setAll: async (items: T[]): Promise<void> => {
      // setAll é raramente usado; mantém comportamento de sobrescrever local + enfileirar
      const existing = (await getCachedTable<T>(table)) || [];
      // delete cada existing, insere cada novo — fica na outbox
      for (const old of existing) {
        await enqueueOutbox({ op: 'delete', table, rowId: old.id });
      }
      for (const it of items) {
        await enqueueOutbox({ op: 'insert', table, row: toDb(table, it) });
      }
      await setCachedTable(table, items);
      triggerSync();
    },
  };
}

// ============================================
// STORE INSTANCES
// ============================================
export const companiesStore = createCrud<Company>('companies');
export const sectorsStore = createCrud<Sector>('sectors');
export const functionsStore = createCrud<JobFunction>('job_functions');
export const riskCategoriesStore = createCrud<RiskCategory>('risk_categories');
export const risksStore = createCrud<Risk>('risks');
export const examsStore = createCrud<OccupationalExam>('occupational_exams');
export const safetyMeasuresStore = createCrud<SafetyMeasure>('safety_measures');
export const episStore = createCrud<EPI>('epis');
export const trainingsStore = createCrud<Training>('trainings');
export const checklistBlocksStore = createCrud<ChecklistBlock>('checklist_blocks');
export const blockFieldsStore = createCrud<BlockField>('block_fields');
export const checklistsStore = createCrud<ChecklistData>('checklists');
export const navItemsStore = createCrud<NavItem>('nav_items');
export const reportBlocksStore = createCrud<ReportBlock>('report_blocks');
export const professionalsStore = createCrud<Professional>('professionals');
export const riskMeasuresStore = createCrud<RiskMeasure>('risk_measures');
export const riskExamsStore = createCrud<RiskExam>('risk_exams');

export interface AIConfig {
  id: string;
  name?: string;
  description?: string;
  systemPrompt: string;
  model: string;
  updatedAt?: string;
}
export const aiConfigStore = createCrud<AIConfig>('ai_config');

// ============================================
// SEED DEFAULTS (async)
// ============================================
let _seeded = false;
export async function seedDefaults() {
  if (_seeded) return;
  _seeded = true;

  const cats = await riskCategoriesStore.getAll();
  if (cats.length === 0) {
    const catDefs = [
      { name: 'Químicos', type: 'chemical' },
      { name: 'Físicos', type: 'physical' },
      { name: 'Biológicos', type: 'biological' },
      { name: 'Ergonômicos', type: 'ergonomic' },
      { name: 'Acidentes', type: 'accident' },
      { name: 'Outros', type: 'other' },
    ];
    for (const c of catDefs) await riskCategoriesStore.add(c as any);
  }

  const risks = await risksStore.getAll();
  if (risks.length === 0) {
    const allCats = await riskCategoriesStore.getAll();
    const defaultRisks: Record<string, string[]> = {
      chemical: ['Aplicação de defensivos agrícolas','Contato com óleos e graxas','Exposição a poeiras incômodas','Gases / névoas / vapores químicos','Utilização de produtos de limpeza'],
      physical: ['Calor por fonte natural','Ruído contínuo e/ou intermitente','Vibração – VCI','Exposição aos raios solares'],
      biological: ['Vírus / Bactérias / Fungos','Manipulação de alimentos','Contato com material infecto-contagiante'],
      ergonomic: ['Levantamento e transporte manual de peso','Movimentos repetitivos','Postura em pé por longos períodos','Postura sentada por longos períodos','Estresse psíquico'],
      accident: ['Queda de objetos e/ou materiais','Choques elétricos','Cortes / escoriações / perfurações','Trabalho em altura','Escorregões, tropeços, quedas'],
    };
    for (const cat of allCats) {
      for (const name of (defaultRisks[cat.type] || [])) {
        await risksStore.add({ categoryId: cat.id, name, source: '', exposureType: '', recommendations: '', customFields: {} } as any);
      }
    }
  }

  const epis = await episStore.getAll();
  if (epis.length === 0) {
    for (const name of ['Botina de segurança','Capacete de segurança','Luva de vaqueta','Óculos de proteção','Protetor auricular plug','Protetor solar','Cinto de segurança','Luva nitrílica','Másc. PFF sem filtro']) {
      await episStore.add({ name, description: '' } as any);
    }
  }

  const trainings = await trainingsStore.getAll();
  if (trainings.length === 0) {
    for (const name of ['NR 01','NR 05','NR 06','NR 10','NR 12','NR 17','NR 18','NR 33','NR 35']) {
      await trainingsStore.add({ name, description: '' } as any);
    }
  }

  const blocks = await checklistBlocksStore.getAll();
  if (blocks.length === 0) {
    const names = ['Informações Gerais','Setorização / GSE','Atribuições dos Cargos','Percepções de Riscos','Aplicação dos EPIs','Treinamentos','Observações'];
    for (let i = 0; i < names.length; i++) {
      await checklistBlocksStore.add({ name: names[i], order: i, isSystem: true, visible: true } as any);
    }
  }

  const nav = await navItemsStore.getAll();
  if (nav.length === 0) {
    const defaults = [
      { key: 'dashboard', label: 'Dashboard', visible: true, order: 0 },
      { key: 'empresas', label: 'Empresas', visible: true, order: 1 },
      { key: 'checklists', label: 'Checklists', visible: true, order: 2 },
      { key: 'relatorios', label: 'Relatórios', visible: true, order: 3 },
      { key: 'riscos', label: 'Riscos', visible: true, order: 4 },
      { key: 'exames', label: 'Exames', visible: true, order: 5 },
      { key: 'medidas', label: 'Medidas de Segurança', visible: true, order: 6 },
      { key: 'profissionais', label: 'Profissionais', visible: true, order: 7 },
      { key: 'configuracoes', label: 'Configurações', visible: true, order: 8 },
    ];
    for (const item of defaults) await navItemsStore.add(item as any);
  }

  const report = await reportBlocksStore.getAll();
  if (report.length === 0) {
    const defaults = [
      { key: 'info', label: 'Informações Gerais', visible: true, order: 0 },
      { key: 'risks', label: 'Riscos Identificados', visible: true, order: 1 },
      { key: 'conformities', label: 'Conformidades', visible: true, order: 2 },
      { key: 'nonconformities', label: 'Não Conformidades', visible: true, order: 3 },
      { key: 'na', label: 'Não se Aplica', visible: true, order: 4 },
      { key: 'actionplan', label: 'Plano de Ação', visible: true, order: 5 },
      { key: 'epis', label: 'EPIs Aplicados', visible: false, order: 6 },
      { key: 'trainings', label: 'Treinamentos', visible: false, order: 7 },
      { key: 'exams', label: 'Exames por Função', visible: true, order: 8 },
      { key: 'custom', label: 'Blocos Personalizados', visible: true, order: 9 },
      { key: 'observations', label: 'Observações', visible: true, order: 10 },
    ];
    for (const item of defaults) await reportBlocksStore.add(item as any);
  }
}
