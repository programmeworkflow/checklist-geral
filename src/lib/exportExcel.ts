import * as XLSX from 'xlsx';

/**
 * Exportação Excel no modelo "VISTEC" — 2 abas:
 *  - "Riscos":  1 linha por (Cargo × Risco) com EPIs e Medidas
 *               separadas em "existentes" (status=1) e "a implementar" (status=2)
 *  - "Exames":  1 linha por (Cargo × Exame único) com flags consolidados
 *               (OR-merge dos tipos / MIN da periodicidade)
 */

export interface ExcelExamRow {
  examName: string;
  admissional: boolean;
  demissional: boolean;
  mudanca: boolean;
  retornoTrabalho: boolean;
  periodico: boolean;
  periodicidade?: 6 | 12 | 24;
}

export interface ExcelRiskRow {
  riscoNome: string;
  fonteGeradora: string;
  tipoExposicao: string;
  probabilidade: string;
  severidade: string;
  episExistentes: string[];
  episAImplementar: string[];
  medidasExistentes: string[];
  medidasAImplementar: string[];
}

export interface ExcelCargoBlock {
  cargoNome: string;
  descricaoAtividades: string;
  riscos: ExcelRiskRow[];
  exames: ExcelExamRow[]; // já consolidado: 1 entrada por nome único
}

export interface ExcelChecklistDataV2 {
  filename: string;
  empresa: string;
  cnpj: string;
  setor: string;
  cargos: ExcelCargoBlock[];
}

const addSheet = (wb: XLSX.WorkBook, name: string, rows: any[][], cols?: XLSX.ColInfo[]) => {
  const ws = XLSX.utils.aoa_to_sheet(rows);
  if (cols) ws['!cols'] = cols;
  XLSX.utils.book_append_sheet(wb, ws, name.slice(0, 31));
};

const periodicidadeLabel = (p?: 6 | 12 | 24): string => {
  if (!p) return '';
  return `${p} meses`;
};

const yn = (v: boolean) => (v ? 'Sim' : 'Não');

export function exportReportToExcel(data: ExcelChecklistDataV2) {
  const wb = XLSX.utils.book_new();

  // ===========================================================
  // Sheet "Riscos" — 1 linha por (Cargo × Risco)
  // 14 colunas: A-N
  // ===========================================================
  const riscosHeader = [
    'Empresa', 'CNPJ', 'Setor', 'Cargo', 'Descrição das atividades',
    'Riscos', 'Fontes geradoras', 'Tipo de exposição',
    'Probabilidade', 'Severidade',
    'EPIs existentes', 'EPIs a serem implementados',
    'Medidas existentes', 'Medidas a serem implementadas',
  ];
  const riscosRows: any[][] = [riscosHeader];
  for (const cargo of data.cargos) {
    if (cargo.riscos.length === 0) {
      // cargo sem riscos selecionados — 1 linha só com identificação
      riscosRows.push([
        data.empresa, data.cnpj, data.setor, cargo.cargoNome,
        cargo.descricaoAtividades,
        '', '', '', '', '', '', '', '', '',
      ]);
      continue;
    }
    for (const r of cargo.riscos) {
      riscosRows.push([
        data.empresa, data.cnpj, data.setor, cargo.cargoNome,
        cargo.descricaoAtividades,
        r.riscoNome, r.fonteGeradora, r.tipoExposicao,
        r.probabilidade, r.severidade,
        r.episExistentes.join('; '),
        r.episAImplementar.join('; '),
        r.medidasExistentes.join('; '),
        r.medidasAImplementar.join('; '),
      ]);
    }
  }
  addSheet(wb, 'Riscos', riscosRows, [
    { wch: 24 }, // Empresa
    { wch: 22 }, // CNPJ
    { wch: 22 }, // Setor
    { wch: 28 }, // Cargo
    { wch: 50 }, // Descrição
    { wch: 35 }, // Riscos
    { wch: 35 }, // Fontes
    { wch: 18 }, // Exposição
    { wch: 22 }, // Probabilidade
    { wch: 18 }, // Severidade
    { wch: 30 }, // EPIs existentes
    { wch: 30 }, // EPIs a implementar
    { wch: 30 }, // Medidas existentes
    { wch: 30 }, // Medidas a implementar
  ]);

  // ===========================================================
  // Sheet "Exames" — 1 linha por (Cargo × Exame único)
  // ===========================================================
  const examesHeader = [
    'Empresa', 'CNPJ', 'Setor', 'Cargo', 'Exame',
    'Admissional', 'Demissional', 'Mudança', 'Retorno', 'Periódico', 'Periodicamente',
  ];
  const examesRows: any[][] = [examesHeader];
  for (const cargo of data.cargos) {
    for (const e of cargo.exames) {
      examesRows.push([
        data.empresa, data.cnpj, data.setor, cargo.cargoNome,
        e.examName,
        yn(e.admissional),
        yn(e.demissional),
        yn(e.mudanca),
        yn(e.retornoTrabalho),
        yn(e.periodico),
        periodicidadeLabel(e.periodicidade),
      ]);
    }
  }
  addSheet(wb, 'Exames', examesRows, [
    { wch: 24 }, // Empresa
    { wch: 22 }, // CNPJ
    { wch: 22 }, // Setor
    { wch: 28 }, // Cargo
    { wch: 30 }, // Exame
    { wch: 12 }, // Admissional
    { wch: 12 }, // Demissional
    { wch: 12 }, // Mudança
    { wch: 12 }, // Retorno
    { wch: 12 }, // Periódico
    { wch: 16 }, // Periodicamente
  ]);

  XLSX.writeFile(wb, `${data.filename}.xlsx`);
}
