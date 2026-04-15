// localStorage-based data store for settings

export type DocType = 'CNPJ' | 'CPF' | 'CEI' | 'CAEPF';

export interface Company {
  id: string;
  name: string;
  docType?: DocType;
  doc?: string;
  cnpj?: string; // legacy
  logo?: string;
}

export interface Sector {
  id: string;
  companyId: string;
  name: string;
}

export interface JobFunction {
  id: string;
  sectorId: string;
  name: string;
  description?: string;
  audioDescription?: string;
}

export interface RiskCategory {
  id: string;
  name: string;
  type: string;
}

export interface Risk {
  id: string;
  categoryId: string;
  name: string;
  source: string;
  exposureType: string;
  recommendations: string;
  customFields: Record<string, string>;
  audioDescription?: string;
}

export interface SafetyMeasure {
  id: string;
  riskId: string;
  name: string;
}

export interface Professional {
  id: string;
  name: string;
  formation: string;
  registration: string;
}

export interface OccupationalExam {
  id: string;
  riskId: string;
  name: string;
  esocialCode?: string;
  admissional: boolean;
  demissional: boolean;
  periodico: boolean;
  periodicidade?: 6 | 12 | 24;
  retornoTrabalho: boolean;
  mudanca: boolean;
}

export interface EPI {
  id: string;
  name: string;
  description: string;
  image?: string;
}

export interface Training {
  id: string;
  name: string;
  description: string;
}

export type FieldType = 'text' | 'textarea' | 'number' | 'date' | 'dropdown' | 'checkbox' | 'radio' | 'image' | 'display_image' | 'audio' | 'signature' | 'user_select';

export interface BlockField {
  id: string;
  blockId: string;
  label: string;
  type: FieldType;
  required: boolean;
  visible: boolean;
  order: number;
  description?: string;
  options?: string[]; // for dropdown, radio, checkbox
}

export interface ChecklistBlock {
  id: string;
  name: string;
  order: number;
  isSystem: boolean;
  visible: boolean;
  description?: string;
}

export interface NavItem {
  id: string;
  key: string;
  label: string;
  visible: boolean;
  order: number;
}

export interface ReportBlock {
  id: string;
  key: string;       // e.g. 'info', 'risks', 'conformities', 'nonconformities', 'na', 'actionplan', 'epis', 'trainings', 'exams', 'observations'
  label: string;
  visible: boolean;
  order: number;
}

export interface ChecklistData {
  id: string;
  companyId: string;
  sectorId: string;
  functionIds: string[];
  createdAt: string;
  formData: Record<string, any>;
  selectedRisks: Record<string, { checked: boolean; desc?: string; notes?: string; frequency?: string }>;
  selectedEpis: Record<string, boolean>;
  selectedTrainings: Record<string, boolean>;
}

const PREFIX = 'checklist_v2_';

function getItem<T>(key: string, fallback: T): T {
  try {
    const raw = localStorage.getItem(PREFIX + key);
    return raw ? JSON.parse(raw) : fallback;
  } catch { return fallback; }
}

function setItem(key: string, value: any) {
  localStorage.setItem(PREFIX + key, JSON.stringify(value));
}

function genId() {
  return Date.now().toString(36) + Math.random().toString(36).slice(2, 8);
}

// Generic CRUD
function createCrud<T extends { id: string }>(key: string) {
  return {
    getAll: (): T[] => getItem<T[]>(key, []),
    get: (id: string): T | undefined => getItem<T[]>(key, []).find(i => i.id === id),
    add: (item: Omit<T, 'id'>): T => {
      const items = getItem<T[]>(key, []);
      const newItem = { ...item, id: genId() } as T;
      items.push(newItem);
      setItem(key, items);
      return newItem;
    },
    update: (id: string, data: Partial<T>) => {
      const items = getItem<T[]>(key, []);
      const idx = items.findIndex(i => i.id === id);
      if (idx >= 0) {
        items[idx] = { ...items[idx], ...data };
        setItem(key, items);
      }
      return items[idx];
    },
    remove: (id: string) => {
      const items = getItem<T[]>(key, []).filter(i => i.id !== id);
      setItem(key, items);
    },
    setAll: (items: T[]) => setItem(key, items),
  };
}

export const companiesStore = createCrud<Company>('companies');
export const sectorsStore = createCrud<Sector>('sectors');
export const functionsStore = createCrud<JobFunction>('functions');
export const riskCategoriesStore = createCrud<RiskCategory>('riskCategories');
export const risksStore = createCrud<Risk>('risks');
export const examsStore = createCrud<OccupationalExam>('exams');
export const safetyMeasuresStore = createCrud<SafetyMeasure>('safetyMeasures');
export const episStore = createCrud<EPI>('epis');
export const trainingsStore = createCrud<Training>('trainings');
export const checklistBlocksStore = createCrud<ChecklistBlock>('checklistBlocks');
export const blockFieldsStore = createCrud<BlockField>('blockFields');
export const checklistsStore = createCrud<ChecklistData>('checklists');
export const navItemsStore = createCrud<NavItem>('navItems');
export const reportBlocksStore = createCrud<ReportBlock>('reportBlocks');
export const professionalsStore = createCrud<Professional>('professionals');

// Seed defaults if empty
export function seedDefaults() {
  if (riskCategoriesStore.getAll().length === 0) {
    const cats = [
      { name: 'Químicos', type: 'chemical' },
      { name: 'Físicos', type: 'physical' },
      { name: 'Biológicos', type: 'biological' },
      { name: 'Ergonômicos', type: 'ergonomic' },
      { name: 'Acidentes', type: 'accident' },
      { name: 'Outros', type: 'other' },
    ];
    cats.forEach(c => riskCategoriesStore.add(c as any));
  }

  if (risksStore.getAll().length === 0) {
    const cats = riskCategoriesStore.getAll();
    const defaultRisks: Record<string, string[]> = {
      chemical: [
        'Aplicação de defensivos agrícolas','Contato com óleos e graxas',
        'Exposição a poeiras incômodas','Gases / névoas / vapores químicos',
        'Utilização de produtos de limpeza',
      ],
      physical: [
        'Calor por fonte natural','Ruído contínuo e/ou intermitente',
        'Vibração – VCI','Exposição aos raios solares',
      ],
      biological: [
        'Vírus / Bactérias / Fungos','Manipulação de alimentos',
        'Contato com material infecto-contagiante',
      ],
      ergonomic: [
        'Levantamento e transporte manual de peso','Movimentos repetitivos',
        'Postura em pé por longos períodos','Postura sentada por longos períodos',
        'Estresse psíquico',
      ],
      accident: [
        'Queda de objetos e/ou materiais','Choques elétricos',
        'Cortes / escoriações / perfurações','Trabalho em altura',
        'Escorregões, tropeços, quedas',
      ],
    };
    cats.forEach(cat => {
      (defaultRisks[cat.type] || []).forEach(name => {
        risksStore.add({ categoryId: cat.id, name, source: '', exposureType: '', customFields: {} } as any);
      });
    });
  }

  if (episStore.getAll().length === 0) {
    const defaultEpis = [
      'Botina de segurança','Capacete de segurança','Luva de vaqueta',
      'Óculos de proteção','Protetor auricular plug','Protetor solar',
      'Cinto de segurança','Luva nitrílica','Másc. PFF sem filtro',
    ];
    defaultEpis.forEach(name => episStore.add({ name, description: '' } as any));
  }

  if (trainingsStore.getAll().length === 0) {
    const defaultTrainings = ['NR 01','NR 05','NR 06','NR 10','NR 12','NR 17','NR 18','NR 33','NR 35'];
    defaultTrainings.forEach(name => trainingsStore.add({ name, description: '' } as any));
  }

  if (checklistBlocksStore.getAll().length === 0) {
    const blocks = [
      'Informações Gerais','Setorização / GSE','Atribuições dos Cargos',
      'Percepções de Riscos','Aplicação dos EPIs','Treinamentos','Observações',
    ];
    blocks.forEach((name, i) => checklistBlocksStore.add({ name, order: i, isSystem: true, visible: true } as any));
  }

  if (navItemsStore.getAll().length === 0) {
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
    defaults.forEach(item => navItemsStore.add(item as any));
  }

  if (reportBlocksStore.getAll().length === 0) {
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
    defaults.forEach(item => reportBlocksStore.add(item as any));
  }
}
