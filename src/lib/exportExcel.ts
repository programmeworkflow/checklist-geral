import * as XLSX from 'xlsx';

export interface ExcelChecklistData {
  filename: string;
  empresa: string;
  empresaDoc?: string;
  setor: string;
  funcoes: string[];
  data: string;
  tecnico?: string;
  funcionario?: string;
  observations?: string;
  risks: Array<{
    categoria: string;
    nome: string;
    fonte: string;
    exposicao: string;
    severidade?: string;
    probabilidade?: string;
  }>;
  nonConformities: Array<{ risco: string; medida: string; nota?: string }>;
  conformities: Array<{ risco: string; medida: string }>;
  actionPlan: Array<{ acao: string; tipo: 'medida' | 'custom' }>;
  epis: Array<{ nome: string; status: string }>;
  trainings: Array<{ nome: string; status: string }>;
}

const addSheet = (wb: XLSX.WorkBook, name: string, rows: any[][], cols?: XLSX.ColInfo[]) => {
  const ws = XLSX.utils.aoa_to_sheet(rows);
  if (cols) ws['!cols'] = cols;
  XLSX.utils.book_append_sheet(wb, ws, name.slice(0, 31)); // Excel max 31 chars
};

export function exportReportToExcel(data: ExcelChecklistData) {
  const wb = XLSX.utils.book_new();

  // 1 — Informações Gerais
  addSheet(wb, 'Informações Gerais', [
    ['Campo', 'Valor'],
    ['Empresa', data.empresa],
    ['Documento', data.empresaDoc || '—'],
    ['Setor / GSE', data.setor],
    ['Funções', data.funcoes.join(', ') || '—'],
    ['Funcionário', data.funcionario || '—'],
    ['Data', data.data],
    ['Técnico', data.tecnico || '—'],
    ['Observações', data.observations || '—'],
  ], [{ wch: 22 }, { wch: 60 }]);

  // 2 — Riscos
  addSheet(wb, 'Riscos', [
    ['Categoria', 'Risco', 'Fonte geradora', 'Exposição', 'Severidade', 'Probabilidade'],
    ...data.risks.map(r => [
      r.categoria, r.nome, r.fonte, r.exposicao, r.severidade || '—', r.probabilidade || '—',
    ]),
  ], [{ wch: 18 }, { wch: 40 }, { wch: 30 }, { wch: 22 }, { wch: 16 }, { wch: 16 }]);

  // 3 — Não Conformidades
  addSheet(wb, 'Não Conformidades', [
    ['Risco', 'Medida', 'Observação'],
    ...data.nonConformities.map(n => [n.risco, n.medida, n.nota || '']),
  ], [{ wch: 35 }, { wch: 40 }, { wch: 50 }]);

  // 4 — Conformidades
  addSheet(wb, 'Conformidades', [
    ['Risco', 'Medida'],
    ...data.conformities.map(c => [c.risco, c.medida]),
  ], [{ wch: 35 }, { wch: 40 }]);

  // 5 — Plano de Ação
  addSheet(wb, 'Plano de Ação', [
    ['Tipo', 'Ação'],
    ...data.actionPlan.map(a => [a.tipo === 'custom' ? 'Personalizada' : 'Medida', a.acao]),
  ], [{ wch: 16 }, { wch: 70 }]);

  // 6 — EPIs
  addSheet(wb, 'EPIs', [
    ['EPI', 'Status'],
    ...data.epis.map(e => [e.nome, e.status]),
  ], [{ wch: 40 }, { wch: 18 }]);

  // 7 — Treinamentos
  addSheet(wb, 'Treinamentos', [
    ['Treinamento', 'Status'],
    ...data.trainings.map(t => [t.nome, t.status]),
  ], [{ wch: 40 }, { wch: 18 }]);

  XLSX.writeFile(wb, `${data.filename}.xlsx`);
}
