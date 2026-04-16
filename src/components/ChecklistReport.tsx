import React from 'react';
import { Card } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Plus, Trash2, CheckCircle2, XCircle, FileText, Stethoscope, AlertTriangle, Shield, Building2, ClipboardList, ShieldAlert, GraduationCap, MessageSquare, User } from 'lucide-react';
import { SEVERITY_OPTIONS, PROBABILITY_OPTIONS } from './RiskMatrixHelp';
import { getRiskColor } from '@/lib/riskColors';
import { useQuery } from '@tanstack/react-query';
import { reportBlocksStore, professionalsStore } from '@/lib/storage';
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

export function ChecklistReport(props: ReportProps) {
  const {
    companyName, companyLogo, sectorName, selectedFns, formData, observations,
    selectedRiskIds, risks, riskCategories, riskSources, riskExposures, riskExposureOther,
    riskSeverity, riskProbability,
    allMeasures, measureStatuses, measureNotes,
    allExams,
    selectedEpiIds, allEpis, selectedTrainingIds, allTrainings,
    blocks, allBlockFields,
    customActions, onAddCustomAction, onUpdateCustomAction, onRemoveCustomAction,
  } = props;

  const conformities: { risk: Risk; measure: SafetyMeasure }[] = [];
  const nonConformities: { risk: Risk; measure: SafetyMeasure; note: string }[] = [];
  const notApplicable: { risk: Risk; measure: SafetyMeasure }[] = [];

  selectedRiskIds.forEach(riskId => {
    const risk = risks.find(r => r.id === riskId);
    if (!risk) return;
    allMeasures.filter(m => m.riskId === riskId).forEach(m => {
      const status = measureStatuses[m.id] || 0;
      if (status === 1) conformities.push({ risk, measure: m });
      if (status === 2) nonConformities.push({ risk, measure: m, note: measureNotes[m.id] || '' });
      if (status === 3) notApplicable.push({ risk, measure: m });
    });
  });

  const examsByFunction = selectedFns.map(fn => {
    const examMap = new Map<string, OccupationalExam>();
    // Always include "Clínico" exam
    const clinicoExam: OccupationalExam = {
      id: '__clinico__',
      riskId: '',
      name: 'Clínico',
      esocialCode: '0295',
      admissional: true,
      demissional: true,
      periodico: true,
      periodicidade: 12,
      retornoTrabalho: true,
      mudanca: true,
    };
    examMap.set('Clínico', clinicoExam);

    selectedRiskIds.forEach(riskId => {
      allExams.filter(e => e.riskId === riskId).forEach(exam => {
        const existing = examMap.get(exam.name);
        if (!existing) {
          examMap.set(exam.name, { ...exam });
        } else {
          examMap.set(exam.name, {
            ...existing,
            admissional: existing.admissional || exam.admissional,
            demissional: existing.demissional || exam.demissional,
            periodico: existing.periodico || exam.periodico,
            periodicidade: exam.periodico ? (exam as any).periodicidade || existing.periodicidade : existing.periodicidade,
            retornoTrabalho: existing.retornoTrabalho || exam.retornoTrabalho,
            mudanca: existing.mudanca || exam.mudanca,
          });
        }
      });
    });
    return { fn, exams: Array.from(examMap.values()) };
  });

  const getSevLabel = (v: string) => SEVERITY_OPTIONS.find(o => o.value === v)?.label || 'Não informado';
  const getProbLabel = (v: string) => PROBABILITY_OPTIONS.find(o => o.value === v)?.label || 'Não informado';
  const { epiStatuses = {}, trainingStatuses = {}, employeePhoto } = props;

  // Get professionals
  const { data: professionals = [] } = useQuery({
    queryKey: ['professionals'],
    queryFn: () => professionalsStore.getAll(),
    staleTime: 30_000,
  });

  // Report block ordering and visibility
  const { data: rBlocksRaw = [] } = useQuery({
    queryKey: ['reportBlocks'],
    queryFn: () => reportBlocksStore.getAll(),
    staleTime: 30_000,
  });
  const rBlocks = [...rBlocksRaw].sort((a, b) => a.order - b.order);

  // Header: clean, no black bar
  const renderHeader = () => (
    <div key="header" className="px-6 py-4 flex items-center gap-4 border-b border-border">
      {companyLogo && (
        <img src={companyLogo} alt="Logo" className="h-14 w-14 object-contain rounded border border-border p-1" />
      )}
      <div className="flex-1">
        <h1 className="text-xl font-bold text-foreground">Entrevista de Percepção de Riscos</h1>
        <h2 className="text-lg font-semibold text-foreground">{companyName}</h2>
        <p className="text-sm text-muted-foreground">{sectorName} · {selectedFns.map(f => f.name).join(', ')}</p>
      </div>
    </div>
  );

  // ## 8 - Informações Gerais - photo beside info fields, atribuições below
  const renderInfo = () => (
    <Card key="info" className="p-4">
      <h3 className="font-semibold text-foreground mb-3 flex items-center gap-2">
        <Building2 className="h-4 w-4" /> Informações Gerais
      </h3>
      <div className="flex gap-4">
        <div className="flex-1 overflow-x-auto">
          <Table>
            <TableBody>
              <TableRow>
                <TableCell className="font-medium text-muted-foreground w-1/3">Empresa</TableCell>
                <TableCell className="text-foreground">{companyName}</TableCell>
              </TableRow>
              <TableRow>
                <TableCell className="font-medium text-muted-foreground">Setor</TableCell>
                <TableCell className="text-foreground">{sectorName}</TableCell>
              </TableRow>
              <TableRow>
                <TableCell className="font-medium text-muted-foreground">Função(ões)</TableCell>
                <TableCell className="text-foreground">{selectedFns.map(f => f.name).join(', ')}</TableCell>
              </TableRow>
              {formData.funcionario && (
                <TableRow>
                  <TableCell className="font-medium text-muted-foreground">Funcionário(s) Avaliado(s)</TableCell>
                  <TableCell className="text-foreground">{formData.funcionario}</TableCell>
                </TableRow>
              )}
            </TableBody>
          </Table>
        </div>
        {employeePhoto && (
          <div className="shrink-0">
            <img src={employeePhoto} alt="Funcionário" className="h-28 w-28 object-cover rounded-lg border border-border" />
          </div>
        )}
      </div>
      {formData.atribuicoes && (
        <div className="mt-3">
          <span className="text-sm font-medium text-muted-foreground">Atribuições do cargo:</span>
          <p className="text-sm text-foreground whitespace-pre-wrap mt-1 text-justify">{formData.atribuicoes}</p>
        </div>
      )}
    </Card>
  );

  // ## 12 - Page break utility
  const PageBreak = () => <div className="hidden print:block print:break-after-page" />;

  const renderRisks = () => {
    return (
      <React.Fragment key="risks">
        <div className="print:break-before-page" />
        <Card className="p-4">
          <h3 className="font-semibold text-foreground mb-3 flex items-center gap-2">
            <AlertTriangle className="h-4 w-4" /> Riscos Identificados
          </h3>
          {selectedRiskIds.length === 0 ? (
            <p className="text-sm text-muted-foreground">Nenhum risco selecionado.</p>
          ) : (
            <div className="space-y-3">
              {selectedRiskIds.map(rId => {
                const risk = risks.find(r => r.id === rId);
                if (!risk) return null;
                const cat = riskCategories.find(c => c.id === risk.categoryId);
                const colors = cat ? getRiskColor(cat.type) : null;
                const riskConformities = conformities.filter(c => c.risk.id === rId);
                const riskNonConformities = nonConformities.filter(c => c.risk.id === rId);
                return (
                  <div key={rId} className="border border-border rounded-lg overflow-hidden">
                    <div className={`px-4 py-2 ${colors ? `${colors.bg} ${colors.text}` : 'bg-muted text-foreground'}`}>
                      <span className="font-semibold text-sm">{risk.name}</span>
                      {cat && <span className="ml-2 text-xs opacity-80">({cat.name})</span>}
                    </div>
                    <div className="p-3 space-y-1 text-sm">
                      <div><span className="text-muted-foreground">Fonte geradora:</span> <span className="text-foreground">{riskSources[rId] || '—'}</span></div>
                      <div><span className="text-muted-foreground">Exposição:</span> <span className="text-foreground">{riskExposures[rId] === 'Outra' ? riskExposureOther[rId] || '—' : riskExposures[rId] || '—'}</span></div>
                      <div className="flex gap-4">
                        <div><span className="text-muted-foreground">Severidade:</span> <span className="text-foreground">{getSevLabel(riskSeverity[rId] || '0')}</span></div>
                        <div><span className="text-muted-foreground">Probabilidade:</span> <span className="text-foreground">{getProbLabel(riskProbability[rId] || '0')}</span></div>
                      </div>
                      {riskConformities.length > 0 && (
                        <div className="mt-2 pt-2 border-t border-border/50">
                          <span className="text-[11px] font-medium text-green-700 dark:text-green-400">Conformidades:</span>
                          <ul className="mt-0.5 space-y-0.5">
                            {riskConformities.map(({ measure }) => (
                              <li key={measure.id} className="text-[11px] text-muted-foreground flex items-center gap-1">
                                <CheckCircle2 className="h-3 w-3 text-green-600 shrink-0" />
                                {measure.name}
                              </li>
                            ))}
                          </ul>
                        </div>
                      )}
                      {riskNonConformities.length > 0 && (
                        <div className={`mt-2 pt-2 ${riskConformities.length > 0 ? '' : 'border-t border-border/50'}`}>
                          <span className="text-[11px] font-medium text-red-700 dark:text-red-400">Não conformidades:</span>
                          <ul className="mt-0.5 space-y-0.5">
                            {riskNonConformities.map(({ measure }) => (
                              <li key={measure.id} className="text-[11px] text-muted-foreground flex items-center gap-1">
                                <XCircle className="h-3 w-3 text-red-600 shrink-0" />
                                {measure.name}
                              </li>
                            ))}
                          </ul>
                        </div>
                      )}
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </Card>
        <div className="print:break-after-page" />
      </React.Fragment>
    );
  };

  const renderConformities = () => (
    <Card key="conformities" className="p-4">
      <h3 className="font-semibold text-foreground mb-3 flex items-center gap-2">
        <CheckCircle2 className="h-4 w-4 text-green-600" /> Conformidades
      </h3>
      {conformities.length === 0 ? (
        <p className="text-sm text-muted-foreground">Nenhuma medida marcada como existente.</p>
      ) : (
        <div className="space-y-1">
          {conformities.map(({ risk, measure }) => (
            <div key={measure.id} className="flex items-center gap-2 py-1.5 border-b border-border last:border-0">
              <Badge variant="outline" className="text-[10px] bg-green-50 text-green-700 border-green-300 dark:bg-green-900/20 dark:text-green-400">EXISTENTE</Badge>
              <span className="text-sm text-foreground">{measure.name}</span>
              <span className="text-xs text-muted-foreground">({risk.name})</span>
            </div>
          ))}
        </div>
      )}
    </Card>
  );

  // ## 10 - Unified Non-conformities block (merged with action plan)
  const renderNonConformities = () => (
    <Card key="nonconformities" className="p-4">
      <h3 className="font-semibold text-foreground mb-3 flex items-center gap-2">
        <XCircle className="h-4 w-4 text-red-600" /> Não Conformidades (Sugestão de Plano de Ação)
      </h3>
      {nonConformities.length === 0 && customActions.length === 0 ? (
        <p className="text-sm text-muted-foreground">Nenhuma medida marcada como não existente.</p>
      ) : (
        <div className="space-y-3">
          {nonConformities.map(({ risk, measure, note }) => (
            <div key={measure.id} className="p-3 rounded-md bg-red-50 dark:bg-red-900/10 border border-red-200 dark:border-red-800">
              <div className="flex items-center gap-2">
                <Badge variant="outline" className="text-[10px] bg-red-100 text-red-700 border-red-300 dark:bg-red-900/30 dark:text-red-400">NÃO EXISTENTE</Badge>
                <span className="text-sm font-medium text-foreground">{measure.name}</span>
                <span className="text-xs text-muted-foreground">({risk.name})</span>
              </div>
              {note && <p className="text-sm text-muted-foreground mt-1 ml-1">📝 {note}</p>}
              <div className="mt-2 ml-1 p-2 bg-amber-50 dark:bg-amber-900/10 rounded border border-amber-200 dark:border-amber-800">
                <p className="text-xs font-medium text-amber-800 dark:text-amber-300">
                  ⚡ Sugestão: Implementar {measure.name}
                </p>
              </div>
            </div>
          ))}
          {customActions.map((action, i) => (
            <div key={`custom-${i}`} className="flex items-center gap-2">
              <Input placeholder="Descreva a medida adicional..." value={action} onChange={e => onUpdateCustomAction(i, e.target.value)} className="text-sm" />
              <Button type="button" variant="ghost" size="icon" className="h-8 w-8 shrink-0" onClick={() => onRemoveCustomAction(i)}>
                <Trash2 className="h-3.5 w-3.5 text-destructive" />
              </Button>
            </div>
          ))}
        </div>
      )}
    </Card>
  );

  const renderNA = () => notApplicable.length > 0 ? (
    <React.Fragment key="na">
      <Card className="p-4">
        <h3 className="font-semibold text-foreground mb-3 flex items-center gap-2">
          <Shield className="h-4 w-4 text-amber-600" /> Não se Aplica
        </h3>
        <div className="space-y-1">
          {notApplicable.map(({ risk, measure }) => (
            <div key={measure.id} className="flex items-center gap-2 py-1.5 border-b border-border last:border-0">
              <Badge variant="outline" className="text-[10px] bg-amber-50 text-amber-700 border-amber-300 dark:bg-amber-900/20 dark:text-amber-400">N/A</Badge>
              <span className="text-sm text-foreground">{measure.name}</span>
              <span className="text-xs text-muted-foreground">({risk.name})</span>
            </div>
          ))}
        </div>
      </Card>
      <div className="print:break-after-page" />
    </React.Fragment>
  ) : null;

  const renderEpis = () => {
    const allEpiItems = allEpis.filter(e => (epiStatuses[e.id] || 0) > 0);
    return (
      <Card key="epis" className="p-4">
        <h3 className="font-semibold text-foreground mb-3 flex items-center gap-2">
          <ShieldAlert className="h-4 w-4" /> EPIs
        </h3>
        {allEpiItems.length === 0 ? (
          <p className="text-sm text-muted-foreground">Nenhum EPI avaliado.</p>
        ) : (
          <div className="flex flex-wrap gap-2">
            {allEpiItems.map(epi => {
              const st = epiStatuses[epi.id] || 0;
              const colorClass = st === 1 ? 'bg-green-50 border-green-200 dark:bg-green-900/20 dark:border-green-800'
                : st === 2 ? 'bg-red-50 border-red-200 dark:bg-red-900/20 dark:border-red-800'
                : 'bg-amber-50 border-amber-200 dark:bg-amber-900/20 dark:border-amber-800';
              const label = st === 1 ? 'POSSUI' : st === 2 ? 'NÃO POSSUI' : 'N/A';
              return (
                <div key={epi.id} className={`flex items-center gap-2 px-3 py-2 rounded-lg border ${colorClass}`}>
                  {epi.image && <img src={epi.image} alt={epi.name} className="h-8 w-8 object-contain rounded" />}
                  <span className="text-sm font-medium text-foreground">{epi.name}</span>
                  <Badge variant="outline" className="text-[10px]">{label}</Badge>
                </div>
              );
            })}
          </div>
        )}
      </Card>
    );
  };

  const renderTrainings = () => {
    const allTrainingItems = allTrainings.filter(t => (trainingStatuses[t.id] || 0) > 0);
    return (
      <React.Fragment key="trainings">
        <Card className="p-4">
          <h3 className="font-semibold text-foreground mb-3 flex items-center gap-2">
            <GraduationCap className="h-4 w-4" /> Treinamentos
          </h3>
          {allTrainingItems.length === 0 ? (
            <p className="text-sm text-muted-foreground">Nenhum treinamento avaliado.</p>
          ) : (
            <div className="flex flex-wrap gap-2">
              {allTrainingItems.map(t => {
                const st = trainingStatuses[t.id] || 0;
                const colorClass = st === 1 ? 'bg-green-50 border-green-200 dark:bg-green-900/20 dark:border-green-800'
                  : st === 2 ? 'bg-red-50 border-red-200 dark:bg-red-900/20 dark:border-red-800'
                  : 'bg-amber-50 border-amber-200 dark:bg-amber-900/20 dark:border-amber-800';
                const label = st === 1 ? 'POSSUI' : st === 2 ? 'NÃO POSSUI' : 'N/A';
                return (
                  <div key={t.id} className={`px-3 py-1.5 rounded-lg border ${colorClass}`}>
                    <span className="text-sm font-medium text-foreground">{t.name}</span>
                    <Badge variant="outline" className="text-[10px] ml-2">{label}</Badge>
                  </div>
                );
              })}
            </div>
          )}
        </Card>
        {/* ## 12 - Page break between Trainings and Exams */}
        <PageBreak />
      </React.Fragment>
    );
  };

  // ## 9 - Exams with periodicity display + page break before
  const renderExams = () => (
    <React.Fragment key="exams">
      <div className="print:break-before-page" />
      <Card className="p-4">
        <h3 className="font-semibold text-foreground mb-3 flex items-center gap-2">
          <Stethoscope className="h-4 w-4" /> Exames por Função
        </h3>
        {examsByFunction.every(e => e.exams.length === 0) ? (
          <p className="text-sm text-muted-foreground">Nenhum exame vinculado.</p>
        ) : (
          <div className="space-y-4">
            {examsByFunction.map(({ fn, exams }) => (
              <div key={fn.id}>
                <p className="text-sm font-semibold text-foreground mb-1">{fn.name}</p>
                {exams.length === 0 ? (
                  <p className="text-xs text-muted-foreground ml-2">Sem exames.</p>
                ) : (
                  <div className="overflow-x-auto">
                    <Table className="text-xs">
                      <TableHeader>
                        <TableRow>
                          <TableHead className="text-[11px] px-2 py-1">Exame</TableHead>
                          <TableHead className="text-[11px] px-1 py-1 text-center">Adm.</TableHead>
                          <TableHead className="text-[11px] px-1 py-1 text-center">Dem.</TableHead>
                          <TableHead className="text-[11px] px-1 py-1 text-center">Mud.</TableHead>
                          <TableHead className="text-[11px] px-1 py-1 text-center">Ret.</TableHead>
                          <TableHead className="text-[11px] px-1 py-1 text-center">Periódico</TableHead>
                        </TableRow>
                      </TableHeader>
                      <TableBody>
                        {exams.map(ex => (
                          <TableRow key={ex.id}>
                            <TableCell className="text-[11px] px-2 py-1">
                              <div className="font-medium">{ex.name}</div>
                              <div className="text-[10px] text-muted-foreground">
                                Código eSocial: {ex.esocialCode || 'Não informado'}
                              </div>
                            </TableCell>
                            <TableCell className="text-center px-1 py-1">{ex.admissional ? '✓' : '—'}</TableCell>
                            <TableCell className="text-center px-1 py-1">{ex.demissional ? '✓' : '—'}</TableCell>
                            <TableCell className="text-center px-1 py-1">{ex.mudanca ? '✓' : '—'}</TableCell>
                            <TableCell className="text-center px-1 py-1">{ex.retornoTrabalho ? '✓' : '—'}</TableCell>
                            <TableCell className="text-center px-1 py-1 text-[10px]">
                              {ex.periodico
                                ? `${ex.periodicidade || 12} meses`
                                : 'Não obrigatório'}
                            </TableCell>
                          </TableRow>
                        ))}
                      </TableBody>
                    </Table>
                  </div>
                )}
              </div>
            ))}
          </div>
        )}
      </Card>
    </React.Fragment>
  );

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
        <Card key={block.id} className="p-4">
          <h3 className="font-semibold text-foreground mb-3 flex items-center gap-2">
            <ClipboardList className="h-4 w-4" /> {block.name}
          </h3>
          <div className="space-y-2 text-sm">
            {fields.map(field => {
              const val = formData[`custom_${block.id}_${field.id}`];
              if (!val?.trim()) return null;
              return (
                <div key={field.id}>
                  <span className="text-muted-foreground">{field.label}:</span>{' '}
                  <span className="text-foreground">{field.type === 'checkbox' ? val.replace(/\|\|\|/g, ', ') : val}</span>
                </div>
              );
            })}
          </div>
        </Card>
      );
    }).filter(Boolean);
    return rendered.length > 0 ? <React.Fragment key="custom">{rendered}</React.Fragment> : null;
  };

  const renderObservations = () => observations?.trim() ? (
    <Card key="observations" className="p-4">
      <h3 className="font-semibold text-foreground mb-3 flex items-center gap-2">
        <MessageSquare className="h-4 w-4" /> Observações
      </h3>
      <p className="text-sm text-foreground whitespace-pre-wrap">{observations}</p>
    </Card>
  ) : null;

  // ## 11 - Professional responsible
  const renderProfessional = () => {
    if (professionals.length === 0) return null;
    return (
      <Card key="professional" className="p-4">
        <h3 className="font-semibold text-foreground mb-3 flex items-center gap-2">
          <User className="h-4 w-4" /> Profissional Responsável
        </h3>
        <div className="space-y-3">
          {professionals.map(p => (
            <div key={p.id} className="border border-border rounded-lg p-3">
              <p className="text-sm font-semibold text-foreground">{p.name}</p>
              <p className="text-xs text-muted-foreground">{p.formation}</p>
              <p className="text-xs text-muted-foreground">Registro: {p.registration}</p>
            </div>
          ))}
        </div>
      </Card>
    );
  };

  // blockMap without actionplan (merged into nonconformities)
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

  const renderFooterText = () => (
    <Card key="footer-text" className="p-4">
      <p className="text-sm text-muted-foreground italic">
        A presente entrevista foi realizada em atendimento ao item 1.5.3.3 da NR-01, que dispõe sobre a adoção de mecanismos para consultar os trabalhadores quanto à percepção de riscos ocupacionais.
      </p>
    </Card>
  );

  return (
    <div className="space-y-6">
      {renderHeader()}

      {rBlocks.length > 0
        ? rBlocks.filter(b => b.visible && b.key !== 'actionplan').map(b => {
            const renderer = blockMap[b.key];
            return renderer ? renderer() : null;
          })
        : Object.values(blockMap).map(fn => fn())
      }

      {/* Always render observations and professional regardless of block config */}
      {!rBlocks.some(b => b.key === 'observations' && b.visible) && renderObservations()}
      {renderProfessional()}
      {renderFooterText()}
    </div>
  );
}
