import React from 'react';
import { Badge } from '@/components/ui/badge';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Plus, Trash2 } from 'lucide-react';
import { SEVERITY_OPTIONS, PROBABILITY_OPTIONS } from './RiskMatrixHelp';
import { getRiskColor } from '@/lib/riskColors';
import { useQuery } from '@tanstack/react-query';
import { reportBlocksStore, professionalsStore } from '@/lib/storage';
import { useAuth } from '@/hooks/useAuth';
import logoColorida from '@/assets/logo-colorida.png';
import type { Risk, RiskCategory, SafetyMeasure, OccupationalExam, JobFunction, EPI, Training, ChecklistBlock, BlockField } from '@/lib/storage';

type MeasureStatus = 0 | 1 | 2 | 3;

interface ReportProps {
  companyName: string;
  companyLogo?: string;
  sectorName: string;
  selectedFns: JobFunction[];
  formData: Record<string, string>;
  observations: string;
  selectedRiskIds: string[];
  risks: Risk[];
  riskCategories: RiskCategory[];
  riskSources: Record<string, string>;
  riskExposures: Record<string, string>;
  riskExposureOther: Record<string, string>;
  riskSeverity: Record<string, string>;
  riskProbability: Record<string, string>;
  allMeasures: SafetyMeasure[];
  measureStatuses: Record<string, MeasureStatus>;
  measureNotes: Record<string, string>;
  allExams: OccupationalExam[];
  /** Junction tables — opcionais p/ retro-compat. Se ausentes, usa filter por riskId direto. */
  getMeasuresForRisk?: (riskId: string) => SafetyMeasure[];
  getExamsForRisk?: (riskId: string) => OccupationalExam[];
  selectedEpiIds: string[];
  epiStatuses?: Record<string, MeasureStatus>;
  allEpis: EPI[];
  selectedTrainingIds: string[];
  trainingStatuses?: Record<string, MeasureStatus>;
  allTrainings: Training[];
  blocks: ChecklistBlock[];
  allBlockFields: BlockField[];
  customActions: string[];
  onAddCustomAction: () => void;
  onUpdateCustomAction: (index: number, value: string) => void;
  onRemoveCustomAction: (index: number) => void;
  employeePhoto?: string;
}

// Style constants — fontes compactas para PDF (mais conteúdo por página)
const S = {
  page: 'bg-white text-gray-900',
  sectionTitle: 'text-[11px] font-bold text-gray-900 mb-1.5 pb-1 border-b-2 flex items-center gap-1.5',
  label: 'text-[8px] font-semibold text-gray-500 uppercase tracking-wider',
  value: 'text-[9px] text-gray-900',
  card: 'border border-gray-200 rounded-md p-2.5 bg-white',
  headerBar: 'bg-gradient-to-r from-[#0C97C4] to-[#1B9B4E]',
};

export function ChecklistReport(props: ReportProps) {
  const {
    companyName, companyLogo, sectorName, selectedFns, formData, observations,
    selectedRiskIds, risks, riskCategories, riskSources, riskExposures, riskExposureOther,
    riskSeverity, riskProbability,
    allMeasures, measureStatuses, measureNotes,
    allExams,
    getMeasuresForRisk: gM, getExamsForRisk: gE,
    selectedEpiIds, allEpis, selectedTrainingIds, allTrainings,
    blocks, allBlockFields,
    customActions, onAddCustomAction, onUpdateCustomAction, onRemoveCustomAction,
  } = props;
  const { epiStatuses = {}, trainingStatuses = {}, employeePhoto } = props;

  // Helpers com fallback ao filter direto (retrocompat)
  const measuresOf = (riskId: string) => gM ? gM(riskId) : allMeasures.filter(m => m.riskId === riskId);
  const examsOf = (riskId: string) => gE ? gE(riskId) : allExams.filter(e => e.riskId === riskId);

  const conformities: { risk: Risk; measure: SafetyMeasure }[] = [];
  const nonConformities: { risk: Risk; measure: SafetyMeasure; note: string }[] = [];
  const notApplicable: { risk: Risk; measure: SafetyMeasure }[] = [];

  selectedRiskIds.forEach(riskId => {
    const risk = risks.find(r => r.id === riskId);
    if (!risk) return;
    measuresOf(riskId).forEach(m => {
      const status = measureStatuses[m.id] || 0;
      if (status === 1) conformities.push({ risk, measure: m });
      if (status === 2) nonConformities.push({ risk, measure: m, note: measureNotes[m.id] || '' });
      if (status === 3) notApplicable.push({ risk, measure: m });
    });
  });

  // Consolida exames por nome:
  //  - OR-merge dos tipos (admiss/dem/peri/ret/mud)
  //  - MIN da periodicidade quando periódico (intervalo mais conservador)
  const mergeExam = (a: OccupationalExam, b: OccupationalExam): OccupationalExam => {
    const periodico = a.periodico || b.periodico;
    let periodicidade: 6 | 12 | 24 | undefined;
    if (periodico) {
      const aP = a.periodico ? a.periodicidade : undefined;
      const bP = b.periodico ? b.periodicidade : undefined;
      if (aP && bP) periodicidade = (Math.min(aP, bP) as 6 | 12 | 24);
      else periodicidade = aP || bP;
    }
    return {
      ...a,
      admissional: a.admissional || b.admissional,
      demissional: a.demissional || b.demissional,
      periodico,
      periodicidade,
      retornoTrabalho: a.retornoTrabalho || b.retornoTrabalho,
      mudanca: a.mudanca || b.mudanca,
    };
  };

  const examsByFunction = selectedFns.map(fn => {
    const examMap = new Map<string, OccupationalExam>();
    examMap.set('Clínico', { id: '__clinico__', riskId: '', name: 'Clínico', esocialCode: '0295', admissional: true, demissional: true, periodico: true, periodicidade: 12, retornoTrabalho: true, mudanca: true });
    selectedRiskIds.forEach(riskId => {
      examsOf(riskId).forEach(exam => {
        const existing = examMap.get(exam.name);
        examMap.set(exam.name, existing ? mergeExam(existing, exam) : { ...exam });
      });
    });
    return { fn, exams: Array.from(examMap.values()) };
  });

  const getSev = (v: string) => SEVERITY_OPTIONS.find(o => o.value === v)?.label || '—';
  const getProb = (v: string) => PROBABILITY_OPTIONS.find(o => o.value === v)?.label || '—';

  const { data: professionals = [] } = useQuery({ queryKey: ['professionals'], queryFn: () => professionalsStore.getAll(), staleTime: 30_000 });
  const { data: rBlocksRaw = [] } = useQuery({ queryKey: ['reportBlocks'], queryFn: () => reportBlocksStore.getAll(), staleTime: 30_000 });
  const rBlocks = [...rBlocksRaw].sort((a, b) => a.order - b.order);

  // =============================================
  // HEADER - Professional with MedWork logo
  // =============================================
  const renderHeader = () => (
    <div data-pdf-section="header" className="overflow-hidden rounded-lg border border-gray-200">
      {/* Top gradient bar */}
      <div className={`${S.headerBar} px-4 py-3 flex items-center gap-3`}>
        <img src={logoColorida} alt="MedWork" className="h-9 bg-white rounded-md p-1" />
        <div className="text-white">
          <h1 className="text-[14px] font-bold leading-tight">Entrevista de Percepção de Riscos Ocupacionais</h1>
          <p className="text-[10px] opacity-90 mt-0.5">NR-01 · Item 1.5.3.3 · Percepção de Riscos</p>
        </div>
      </div>
      {/* Company info bar */}
      <div className="px-4 py-2 bg-gray-50 flex items-center justify-between gap-3 border-t border-gray-200">
        <div className="flex items-center gap-2.5">
          {companyLogo && <img src={companyLogo} alt="" className="h-8 w-8 object-contain rounded border border-gray-200 bg-white p-0.5" />}
          <div>
            <p className="text-[11px] font-bold text-gray-900">{companyName}</p>
            <p className="text-[9px] text-gray-500">{sectorName} · {selectedFns.map(f => f.name).join(', ')}</p>
          </div>
        </div>
        <p className="text-[9px] text-gray-400">{new Date().toLocaleDateString('pt-BR')}</p>
      </div>
    </div>
  );

  // =============================================
  // INFORMAÇÕES GERAIS
  // =============================================
  const renderInfo = () => (
    <div data-pdf-section="info" className={S.card}>
      <h3 className={S.sectionTitle}>
        <span className="inline-flex items-center justify-center h-5 w-5 rounded bg-[#0C97C4]/10 text-[#0C97C4] text-[10px] font-bold">1</span>
        Informações Gerais
      </h3>
      <div className="flex gap-4">
        <div className="flex-1">
          <table className="w-full text-left">
            <tbody>
              {[
                ['Empresa', companyName],
                ['Setor', sectorName],
                ['Função(ões)', selectedFns.map(f => f.name).join(', ')],
                ...(formData.funcionario ? [['Funcionário(s)', formData.funcionario]] : []),
              ].map(([label, value], i) => (
                <tr key={i} className="border-b border-gray-100 last:border-0">
                  <td className="py-1 pr-3 text-[8px] font-semibold text-gray-500 uppercase tracking-wider w-1/3">{label}</td>
                  <td className="py-1 text-[10px] text-gray-900">{value}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
        {employeePhoto && <img src={employeePhoto} alt="" className="h-20 w-20 object-cover rounded-md border border-gray-200 shrink-0" />}
      </div>
      {formData.atribuicoes && (
        <div className="mt-3 pt-3 border-t border-gray-100">
          <p className={S.label}>Atribuições do cargo</p>
          <p className="text-[10px] text-gray-700 mt-1 whitespace-pre-wrap leading-relaxed">{formData.atribuicoes}</p>
        </div>
      )}
    </div>
  );

  // =============================================
  // RISCOS IDENTIFICADOS
  // =============================================
  const renderRisks = () => (
    <div data-pdf-section="risks" className={S.card}>
      <h3 className={S.sectionTitle}>
        <span className="inline-flex items-center justify-center h-5 w-5 rounded bg-amber-100 text-amber-700 text-[10px] font-bold">2</span>
        Riscos Identificados
      </h3>
      {selectedRiskIds.length === 0 ? (
        <p className="text-[10px] text-gray-400 italic">Nenhum risco selecionado.</p>
      ) : (
        <div className="space-y-3">
          {selectedRiskIds.map(rId => {
            const risk = risks.find(r => r.id === rId);
            if (!risk) return null;
            const cat = riskCategories.find(c => c.id === risk.categoryId);
            const colors = cat ? getRiskColor(cat.type) : null;
            return (
              <div key={rId} className="border border-gray-200 rounded-lg overflow-hidden">
                <div className={`px-4 py-2 ${colors ? `${colors.bg} ${colors.text}` : 'bg-gray-100 text-gray-700'}`}>
                  <span className="font-bold text-[10px]">{risk.name}</span>
                  {cat && <span className="ml-2 text-[9px] opacity-70">({cat.name})</span>}
                </div>
                <div className="px-4 py-2.5 space-y-1 text-[9px] bg-white">
                  <div><span className="text-gray-400">Fonte geradora:</span> <span className="text-gray-700 font-medium">{riskSources[rId] || '—'}</span></div>
                  <div><span className="text-gray-400">Exposição:</span> <span className="text-gray-700 font-medium">{riskExposures[rId] === 'Outra' ? riskExposureOther[rId] || '—' : riskExposures[rId] || '—'}</span></div>
                  <div className="flex gap-6">
                    <div><span className="text-gray-400">Severidade:</span> <span className="text-gray-700 font-medium">{getSev(riskSeverity[rId] || '0')}</span></div>
                    <div><span className="text-gray-400">Probabilidade:</span> <span className="text-gray-700 font-medium">{getProb(riskProbability[rId] || '0')}</span></div>
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );

  // =============================================
  // CONFORMIDADES
  // =============================================
  const renderConformities = () => (
    <div data-pdf-section="conformities" className={S.card}>
      <h3 className={S.sectionTitle}>
        <span className="inline-flex items-center justify-center h-5 w-5 rounded bg-green-100 text-green-700 text-[10px] font-bold">3</span>
        Conformidades
      </h3>
      {conformities.length === 0 ? (
        <p className="text-[10px] text-gray-400 italic">Nenhuma medida marcada como existente.</p>
      ) : (
        <div className="space-y-1.5">
          {conformities.map(({ risk, measure }) => (
            <div key={measure.id} className="flex items-center gap-2 py-1.5 px-3 rounded-md bg-green-50 border border-green-200">
              <span className="text-[9px] font-bold text-green-700 bg-green-100 px-1.5 py-0.5 rounded">EXISTENTE</span>
              <span className="text-[10px] text-gray-800 font-medium">{measure.name}</span>
              <span className="text-[9px] text-gray-400">({risk.name})</span>
            </div>
          ))}
        </div>
      )}
    </div>
  );

  // =============================================
  // NÃO CONFORMIDADES + PLANO DE AÇÃO
  // =============================================
  const renderNonConformities = () => (
    <div data-pdf-section="nonconformities" className={S.card}>
      <h3 className={S.sectionTitle}>
        <span className="inline-flex items-center justify-center h-5 w-5 rounded bg-red-100 text-red-700 text-[10px] font-bold">4</span>
        Não Conformidades (Sugestão de Plano de Ação)
      </h3>
      {nonConformities.length === 0 && customActions.length === 0 ? (
        <p className="text-[10px] text-gray-400 italic">Nenhuma medida marcada como não existente.</p>
      ) : (
        <div className="space-y-2">
          {nonConformities.map(({ risk, measure, note }) => (
            <div key={measure.id} className="rounded-lg border border-red-200 overflow-hidden">
              <div className="px-3 py-2 bg-red-50 flex items-center gap-2 flex-wrap">
                <span className="text-[9px] font-bold text-red-700 bg-red-100 px-1.5 py-0.5 rounded">NÃO EXISTENTE</span>
                <span className="text-[10px] text-gray-800 font-medium">{measure.name}</span>
                <span className="text-[9px] text-gray-400">({risk.name})</span>
              </div>
              {note && <p className="px-2.5 py-1 text-[9px] text-gray-600 bg-white border-t border-red-100">Obs: {note}</p>}
              <div className="px-2.5 py-1 bg-amber-50 border-t border-amber-200 text-[9px] text-amber-800 font-medium">
                Sugestão: Implementar {measure.name}
              </div>
            </div>
          ))}
          {customActions.map((action, i) => (
            <div key={`custom-${i}`} className="flex items-center gap-2">
              <Input placeholder="Medida adicional..." value={action} onChange={e => onUpdateCustomAction(i, e.target.value)} className="text-sm" />
              <Button type="button" variant="ghost" size="icon" className="h-8 w-8 shrink-0" onClick={() => onRemoveCustomAction(i)}>
                <Trash2 className="h-3.5 w-3.5 text-destructive" />
              </Button>
            </div>
          ))}
        </div>
      )}
    </div>
  );

  // =============================================
  // NÃO SE APLICA
  // =============================================
  const renderNA = () => notApplicable.length > 0 ? (
    <div data-pdf-section="na" className={S.card}>
      <h3 className={S.sectionTitle}>
        <span className="inline-flex items-center justify-center h-5 w-5 rounded bg-amber-100 text-amber-700 text-[10px] font-bold">—</span>
        Não se Aplica
      </h3>
      <div className="space-y-1">
        {notApplicable.map(({ risk, measure }) => (
          <div key={measure.id} className="flex items-center gap-2 py-1.5 px-3 rounded-md bg-amber-50 border border-amber-200">
            <span className="text-[9px] font-bold text-amber-700 bg-amber-100 px-1.5 py-0.5 rounded">N/A</span>
            <span className="text-[10px] text-gray-800">{measure.name}</span>
            <span className="text-[9px] text-gray-400">({risk.name})</span>
          </div>
        ))}
      </div>
    </div>
  ) : null;

  // =============================================
  // EPIs
  // =============================================
  const renderEpis = () => {
    const items = allEpis.filter(e => (epiStatuses[e.id] || 0) > 0);
    return (
      <div data-pdf-section="epis" className={S.card}>
        <h3 className={S.sectionTitle}>
          <span className="inline-flex items-center justify-center h-5 w-5 rounded bg-[#0C97C4]/10 text-[#0C97C4] text-[10px] font-bold">5</span>
          EPIs
        </h3>
        {items.length === 0 ? <p className="text-[10px] text-gray-400 italic">Nenhum EPI avaliado.</p> : (
          <div className="flex flex-wrap gap-2">
            {items.map(epi => {
              const st = epiStatuses[epi.id] || 0;
              const cls = st === 1 ? 'bg-green-50 border-green-200' : st === 2 ? 'bg-red-50 border-red-200' : 'bg-amber-50 border-amber-200';
              const label = st === 1 ? 'POSSUI' : st === 2 ? 'NÃO POSSUI' : 'N/A';
              return (
                <div key={epi.id} className={`flex items-center gap-2 px-2.5 py-1.5 rounded-lg border ${cls}`}>
                  {epi.image && <img src={epi.image} alt="" className="h-7 w-7 object-contain rounded" />}
                  <span className="text-[9px] font-medium text-gray-800">{epi.name}</span>
                  <span className="text-[8px] font-bold text-gray-500">{label}</span>
                </div>
              );
            })}
          </div>
        )}
      </div>
    );
  };

  // =============================================
  // TREINAMENTOS
  // =============================================
  const renderTrainings = () => {
    const items = allTrainings.filter(t => (trainingStatuses[t.id] || 0) > 0);
    return (
      <div data-pdf-section="trainings" className={S.card}>
        <h3 className={S.sectionTitle}>
          <span className="inline-flex items-center justify-center h-5 w-5 rounded bg-[#1B9B4E]/10 text-[#1B9B4E] text-[10px] font-bold">6</span>
          Treinamentos
        </h3>
        {items.length === 0 ? <p className="text-[10px] text-gray-400 italic">Nenhum treinamento avaliado.</p> : (
          <div className="flex flex-wrap gap-2">
            {items.map(t => {
              const st = trainingStatuses[t.id] || 0;
              const cls = st === 1 ? 'bg-green-50 border-green-200' : st === 2 ? 'bg-red-50 border-red-200' : 'bg-amber-50 border-amber-200';
              const label = st === 1 ? 'POSSUI' : st === 2 ? 'NÃO POSSUI' : 'N/A';
              return (
                <div key={t.id} className={`px-2.5 py-1.5 rounded-lg border ${cls}`}>
                  <span className="text-[9px] font-medium text-gray-800">{t.name}</span>
                  <span className="text-[8px] font-bold text-gray-500 ml-1.5">{label}</span>
                </div>
              );
            })}
          </div>
        )}
      </div>
    );
  };

  // =============================================
  // EXAMES POR FUNÇÃO
  // =============================================
  const renderExams = () => (
    <div data-pdf-section="exams" className={S.card}>
      <h3 className={S.sectionTitle}>
        <span className="inline-flex items-center justify-center h-5 w-5 rounded bg-purple-100 text-purple-700 text-[10px] font-bold">7</span>
        Exames por Função
      </h3>
      {examsByFunction.every(e => e.exams.length === 0) ? (
        <p className="text-[10px] text-gray-400 italic">Nenhum exame vinculado.</p>
      ) : (
        <div className="space-y-4">
          {examsByFunction.map(({ fn, exams }) => (
            <div key={fn.id}>
              <p className="text-[10px] font-bold text-gray-800 mb-1.5">{fn.name}</p>
              <div className="overflow-x-auto">
                <Table className="text-[9px]">
                  <TableHeader>
                    <TableRow className="bg-gray-50">
                      <TableHead className="text-[9px] px-2 py-1 font-bold">Exame</TableHead>
                      <TableHead className="text-[9px] px-1 py-1 text-center font-bold">Adm.</TableHead>
                      <TableHead className="text-[9px] px-1 py-1 text-center font-bold">Dem.</TableHead>
                      <TableHead className="text-[9px] px-1 py-1 text-center font-bold">Mud.</TableHead>
                      <TableHead className="text-[9px] px-1 py-1 text-center font-bold">Ret.</TableHead>
                      <TableHead className="text-[9px] px-1 py-1 text-center font-bold">Periódico</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {exams.map(ex => (
                      <TableRow key={ex.id}>
                        <TableCell className="px-2 py-1">
                          <span className="font-medium">{ex.name}</span>
                          <span className="text-[8px] text-gray-400 ml-1">eSocial: {ex.esocialCode || '—'}</span>
                        </TableCell>
                        <TableCell className="text-center px-1 py-1">{ex.admissional ? '✓' : '—'}</TableCell>
                        <TableCell className="text-center px-1 py-1">{ex.demissional ? '✓' : '—'}</TableCell>
                        <TableCell className="text-center px-1 py-1">{ex.mudanca ? '✓' : '—'}</TableCell>
                        <TableCell className="text-center px-1 py-1">{ex.retornoTrabalho ? '✓' : '—'}</TableCell>
                        <TableCell className="text-center px-1 py-1">{ex.periodico ? `${ex.periodicidade || 12} meses` : '—'}</TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );

  // =============================================
  // BLOCOS PERSONALIZADOS
  // =============================================
  const renderCustom = () => {
    const customBlocks = blocks.filter(b => {
      const n = b.name.toLowerCase();
      return !n.includes('risco') && !n.includes('epi') && !n.includes('treinamento') &&
        !n.includes('informações gerais') && !n.includes('informacoes gerais') &&
        !n.includes('setorização') && !n.includes('gse') &&
        !n.includes('atribuiç') && !n.includes('atribuic') &&
        !n.includes('observaç') && !n.includes('observac');
    });
    const rendered = customBlocks.map(block => {
      const fields = allBlockFields.filter(f => f.blockId === block.id && f.visible !== false).sort((a, b) => a.order - b.order);
      const hasData = fields.some(f => formData[`custom_${block.id}_${f.id}`]?.trim());
      if (!hasData) return null;
      return (
        <div key={block.id} data-pdf-section={`custom-${block.id}`} className={S.card}>
          <h3 className={S.sectionTitle}>{block.name}</h3>
          <div className="space-y-1.5 text-[10px]">
            {fields.map(field => {
              const val = formData[`custom_${block.id}_${field.id}`];
              if (!val?.trim()) return null;
              return (
                <div key={field.id}>
                  <span className="text-gray-400">{field.label}:</span>{' '}
                  <span className="text-gray-800 font-medium">{field.type === 'checkbox' ? val.replace(/\|\|\|/g, ', ') : val}</span>
                </div>
              );
            })}
          </div>
        </div>
      );
    }).filter(Boolean);
    return rendered.length > 0 ? <React.Fragment key="custom">{rendered}</React.Fragment> : null;
  };

  // =============================================
  // OBSERVAÇÕES
  // =============================================
  const renderObservations = () => observations?.trim() ? (
    <div data-pdf-section="observations" className={S.card}>
      <h3 className={S.sectionTitle}>
        <span className="inline-flex items-center justify-center h-5 w-5 rounded bg-gray-100 text-gray-600 text-[10px] font-bold">*</span>
        Observações
      </h3>
      <p className="text-[10px] text-gray-700 whitespace-pre-wrap leading-relaxed">{observations}</p>
    </div>
  ) : null;

  // =============================================
  // PROFISSIONAL RESPONSÁVEL + ASSINATURA DO ENTREVISTADO
  // =============================================
  const { user: authUser } = useAuth();
  const tecnicoId = (formData as any).tecnicoId || authUser?.id || '';
  const responsavel = professionals.find(p => p.id === tecnicoId) || authUser;
  const signatureEntrevistado = (formData as any).signatureEntrevistado || '';

  const renderProfessional = () => {
    if (!responsavel && !signatureEntrevistado) return null;
    return (
      <div data-pdf-section="professional" className={S.card}>
        <h3 className={S.sectionTitle}>Validação</h3>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
          {responsavel && (
            <div className="border border-gray-200 rounded-md p-2.5">
              <p className="text-[8px] font-semibold text-gray-400 uppercase tracking-wider mb-1">Profissional Responsável</p>
              <p className="text-[9px] font-bold text-gray-900 leading-tight">{responsavel.name}</p>
              {responsavel.formation && <p className="text-[8px] text-gray-500 mt-0.5">{responsavel.formation}</p>}
              {responsavel.registration && <p className="text-[8px] text-gray-500">Reg.: {responsavel.registration}</p>}
            </div>
          )}
          {signatureEntrevistado && (
            <div className="border border-gray-200 rounded-md p-2.5">
              <p className="text-[8px] font-semibold text-gray-400 uppercase tracking-wider mb-1">Assinatura do Entrevistado</p>
              <img
                src={signatureEntrevistado}
                alt="Assinatura"
                className="w-full max-h-24 object-contain bg-white"
              />
            </div>
          )}
        </div>
      </div>
    );
  };

  // =============================================
  // FOOTER
  // =============================================
  const renderFooter = () => (
    <div data-pdf-section="footer" className="rounded-lg border border-gray-200 overflow-hidden">
      <div className={`${S.headerBar} px-4 py-2 flex items-center gap-3`}>
        <img src={logoColorida} alt="MedWork" className="h-7 bg-white rounded p-0.5" />
        <span className="text-white text-[9px] font-semibold">MedWork · VISTEC</span>
      </div>
      <div className="px-4 py-2.5 bg-gray-50">
        <p className="text-[9px] text-gray-500 italic leading-relaxed">
          A presente entrevista foi realizada em atendimento ao item 1.5.3.3 da NR-01, que dispõe sobre a adoção de mecanismos para consultar os trabalhadores quanto à percepção de riscos ocupacionais.
        </p>
      </div>
    </div>
  );

  // =============================================
  // RENDER
  // =============================================
  const blockMap: Record<string, () => React.ReactNode> = {
    info: renderInfo,
    risks: renderRisks,
    conformities: renderConformities,
    nonconformities: renderNonConformities,
    na: renderNA,
    epis: renderEpis,
    trainings: renderTrainings,
    exams: renderExams,
    custom: renderCustom,
    observations: renderObservations,
  };

  return (
    <div className={`${S.page} space-y-4`}>
      {renderHeader()}
      {rBlocks.length > 0
        ? rBlocks.filter(b => b.visible && b.key !== 'actionplan').map(b => {
            const renderer = blockMap[b.key];
            return renderer ? <React.Fragment key={b.key}>{renderer()}</React.Fragment> : null;
          })
        : Object.entries(blockMap).map(([k, fn]) => <React.Fragment key={k}>{fn()}</React.Fragment>)
      }
      {!rBlocks.some(b => b.key === 'observations' && b.visible) && renderObservations()}
      {renderProfessional()}
      {renderFooter()}
    </div>
  );
}
