import { useState, useMemo } from 'react';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import {
  examsStore, safetyMeasuresStore, riskExamsStore, riskMeasuresStore,
} from '@/lib/storage';
import type { OccupationalExam, SafetyMeasure, RiskExam } from '@/lib/storage';
import { Stethoscope, Shield, Plus, X, Check, ChevronDown } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Checkbox } from '@/components/ui/checkbox';
import { Card } from '@/components/ui/card';
import { toast } from 'sonner';

interface Props {
  riskId: string;
}

const PERIODICITIES = [6, 12, 24] as const;

export function RiskAssociations({ riskId }: Props) {
  const qc = useQueryClient();
  const [tab, setTab] = useState<'exames' | 'medidas'>('exames');
  const [picking, setPicking] = useState(false);

  const { data: allExams = [] } = useQuery({ queryKey: ['exams'], queryFn: () => examsStore.getAll() });
  const { data: allMeasures = [] } = useQuery({ queryKey: ['safety_measures'], queryFn: () => safetyMeasuresStore.getAll() });
  const { data: allRiskExams = [] } = useQuery({ queryKey: ['risk_exams'], queryFn: () => riskExamsStore.getAll() });
  const { data: allRiskMeasures = [] } = useQuery({ queryKey: ['risk_measures'], queryFn: () => riskMeasuresStore.getAll() });

  const myExams = useMemo(() => allRiskExams.filter(re => re.riskId === riskId), [allRiskExams, riskId]);
  const myMeasures = useMemo(() => allRiskMeasures.filter(rm => rm.riskId === riskId), [allRiskMeasures, riskId]);

  const associatedExamIds = new Set(myExams.map(re => re.examId));
  const associatedMeasureIds = new Set(myMeasures.map(rm => rm.measureId));
  const unassociatedExams = allExams.filter(e => !associatedExamIds.has(e.id))
    .sort((a, b) => a.name.localeCompare(b.name, 'pt-BR'));
  const unassociatedMeasures = allMeasures.filter(m => !associatedMeasureIds.has(m.id))
    .sort((a, b) => a.name.localeCompare(b.name, 'pt-BR'));

  const linkExam = async (examId: string) => {
    await riskExamsStore.add({
      riskId, examId,
      admissional: false, demissional: false, periodico: false,
      retornoTrabalho: false, mudanca: false,
    } as any);
    qc.invalidateQueries({ queryKey: ['risk_exams'] });
    toast.success('Exame vinculado');
  };

  const unlinkExam = async (id: string) => {
    if (!confirm('Remover este exame do risco?')) return;
    await riskExamsStore.remove(id);
    qc.invalidateQueries({ queryKey: ['risk_exams'] });
  };

  const updateExamFlag = async (re: RiskExam, patch: Partial<RiskExam>) => {
    await riskExamsStore.update(re.id, patch as any);
    qc.invalidateQueries({ queryKey: ['risk_exams'] });
  };

  const linkMeasure = async (measureId: string) => {
    await riskMeasuresStore.add({ riskId, measureId } as any);
    qc.invalidateQueries({ queryKey: ['risk_measures'] });
    toast.success('Medida vinculada');
  };

  const unlinkMeasure = async (id: string) => {
    if (!confirm('Remover esta medida do risco?')) return;
    await riskMeasuresStore.remove(id);
    qc.invalidateQueries({ queryKey: ['risk_measures'] });
  };

  const TYPES = [
    { key: 'admissional' as const, label: 'Admiss.' },
    { key: 'demissional' as const, label: 'Demiss.' },
    { key: 'periodico' as const, label: 'Period.' },
    { key: 'retornoTrabalho' as const, label: 'Retorno' },
    { key: 'mudanca' as const, label: 'Mudança' },
  ];

  return (
    <div className="space-y-3 mt-3 pt-3 border-t border-border">
      <div className="flex gap-1">
        <button
          onClick={() => setTab('exames')}
          className={`flex-1 text-xs font-medium py-2 px-3 rounded-md transition-all ${tab === 'exames' ? 'bg-primary/10 text-primary border border-primary/30' : 'text-muted-foreground hover:bg-muted'}`}
        >
          <Stethoscope className="h-3.5 w-3.5 inline mr-1" /> Exames ({myExams.length})
        </button>
        <button
          onClick={() => setTab('medidas')}
          className={`flex-1 text-xs font-medium py-2 px-3 rounded-md transition-all ${tab === 'medidas' ? 'bg-primary/10 text-primary border border-primary/30' : 'text-muted-foreground hover:bg-muted'}`}
        >
          <Shield className="h-3.5 w-3.5 inline mr-1" /> Medidas ({myMeasures.length})
        </button>
      </div>

      {tab === 'exames' && (
        <div className="space-y-2">
          {myExams.length === 0 && (
            <p className="text-xs text-muted-foreground italic py-1">Nenhum exame vinculado.</p>
          )}
          {myExams.map(re => {
            const exam = allExams.find(e => e.id === re.examId);
            if (!exam) return null;
            return (
              <Card key={re.id} className="p-2.5 bg-muted/30">
                <div className="flex items-start justify-between gap-2 mb-2">
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-medium text-foreground truncate">{exam.name}</p>
                    {(exam as any).esocialCode && (
                      <p className="text-[10px] text-muted-foreground">eSocial: {(exam as any).esocialCode}</p>
                    )}
                  </div>
                  <button onClick={() => unlinkExam(re.id)} className="text-muted-foreground hover:text-destructive">
                    <X className="h-3.5 w-3.5" />
                  </button>
                </div>
                <div className="flex flex-wrap gap-2 text-xs">
                  {TYPES.map(t => (
                    <label key={t.key} className="inline-flex items-center gap-1 cursor-pointer">
                      <Checkbox
                        checked={re[t.key] || false}
                        onCheckedChange={(v) => updateExamFlag(re, { [t.key]: !!v } as any)}
                        className="h-3.5 w-3.5"
                      />
                      <span className="text-foreground">{t.label}</span>
                    </label>
                  ))}
                </div>
                {re.periodico && (
                  <div className="mt-2 flex items-center gap-2 text-xs">
                    <span className="text-muted-foreground">Periodicidade:</span>
                    {PERIODICITIES.map(p => (
                      <label key={p} className="inline-flex items-center gap-1 cursor-pointer">
                        <input
                          type="radio"
                          name={`per_${re.id}`}
                          checked={re.periodicidade === p}
                          onChange={() => updateExamFlag(re, { periodicidade: p } as any)}
                          className="accent-primary"
                        />
                        {p}m
                      </label>
                    ))}
                  </div>
                )}
              </Card>
            );
          })}

          {!picking ? (
            <Button size="sm" variant="outline" onClick={() => setPicking(true)} className="w-full gap-1.5 h-8 text-xs" disabled={unassociatedExams.length === 0}>
              <Plus className="h-3.5 w-3.5" /> {unassociatedExams.length === 0 ? 'Todos exames já vinculados' : 'Vincular exame'}
            </Button>
          ) : (
            <Card className="p-2 max-h-48 overflow-y-auto space-y-1 border-primary/30">
              <div className="flex items-center justify-between px-1">
                <p className="text-xs font-semibold text-foreground">Selecione um exame:</p>
                <button onClick={() => setPicking(false)} className="text-muted-foreground hover:text-foreground">
                  <X className="h-3.5 w-3.5" />
                </button>
              </div>
              {unassociatedExams.map(e => (
                <button
                  key={e.id}
                  onClick={() => { linkExam(e.id); setPicking(false); }}
                  className="w-full text-left text-xs px-2 py-1.5 rounded hover:bg-primary/10 transition-colors"
                >
                  {e.name}
                </button>
              ))}
            </Card>
          )}
        </div>
      )}

      {tab === 'medidas' && (
        <div className="space-y-2">
          {myMeasures.length === 0 && (
            <p className="text-xs text-muted-foreground italic py-1">Nenhuma medida vinculada.</p>
          )}
          {myMeasures.map(rm => {
            const m = allMeasures.find(x => x.id === rm.measureId);
            if (!m) return null;
            return (
              <div key={rm.id} className="flex items-center justify-between gap-2 px-3 py-2 bg-muted/30 rounded-md">
                <span className="text-sm text-foreground truncate">{m.name}</span>
                <button onClick={() => unlinkMeasure(rm.id)} className="text-muted-foreground hover:text-destructive shrink-0">
                  <X className="h-3.5 w-3.5" />
                </button>
              </div>
            );
          })}

          {!picking ? (
            <Button size="sm" variant="outline" onClick={() => setPicking(true)} className="w-full gap-1.5 h-8 text-xs" disabled={unassociatedMeasures.length === 0}>
              <Plus className="h-3.5 w-3.5" /> {unassociatedMeasures.length === 0 ? 'Todas medidas já vinculadas' : 'Vincular medida'}
            </Button>
          ) : (
            <Card className="p-2 max-h-48 overflow-y-auto space-y-1 border-primary/30">
              <div className="flex items-center justify-between px-1">
                <p className="text-xs font-semibold text-foreground">Selecione uma medida:</p>
                <button onClick={() => setPicking(false)} className="text-muted-foreground hover:text-foreground">
                  <X className="h-3.5 w-3.5" />
                </button>
              </div>
              {unassociatedMeasures.map(m => (
                <button
                  key={m.id}
                  onClick={() => { linkMeasure(m.id); setPicking(false); }}
                  className="w-full text-left text-xs px-2 py-1.5 rounded hover:bg-primary/10 transition-colors"
                >
                  {m.name}
                </button>
              ))}
            </Card>
          )}
        </div>
      )}
    </div>
  );
}
