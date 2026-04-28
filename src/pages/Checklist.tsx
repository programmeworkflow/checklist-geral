import { useState, useMemo, useRef, useEffect } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { Checkbox } from '@/components/ui/checkbox';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import {
  companiesStore, sectorsStore, functionsStore,
  riskCategoriesStore, risksStore, episStore, trainingsStore,
  checklistBlocksStore, checklistsStore, examsStore, safetyMeasuresStore,
  blockFieldsStore, professionalsStore, riskExamsStore, riskMeasuresStore,
  FieldType,
} from '@/lib/storage';
import { ArrowLeft, ArrowRight, Save, Camera, ImagePlus, Paperclip, X, Stethoscope, Shield, FileBarChart, ChevronRight, Trash2, Share2, Plus } from 'lucide-react';
import { SpeechInput } from '@/components/SpeechInput';
import { Badge } from '@/components/ui/badge';
import { toast } from 'sonner';
import { getRiskColor } from '@/lib/riskColors';
import { SeverityHelp, ProbabilityHelp, SEVERITY_OPTIONS, PROBABILITY_OPTIONS } from '@/components/RiskMatrixHelp';
import { ChecklistReport } from '@/components/ChecklistReport';
import { exportReportToPdf } from '@/lib/exportPdf';
import { exportReportToExcel } from '@/lib/exportExcel';
import { safeUploadFile, uploadBase64 } from '@/lib/uploadFile';
import { FileSpreadsheet, FileDown } from 'lucide-react';
import { SignaturePad } from '@/components/SignaturePad';

type Step = 'select' | 'fill';
type MeasureStatus = 0 | 1 | 2 | 3;

const Checklist = () => {
  const navigate = useNavigate();
  const { id: duplicateId } = useParams<{ id: string }>();
  const [step, setStep] = useState<Step>('select');

  const [companyId, setCompanyId] = useState('');
  const [sectorId, setSectorId] = useState('');
  const [selectedFunctionIds, setSelectedFunctionIds] = useState<string[]>([]);

  const [formData, setFormData] = useState<Record<string, string>>({});
  const [selectedRisks, setSelectedRisks] = useState<Record<string, boolean>>({});
  const [riskExposures, setRiskExposures] = useState<Record<string, string>>({});
  const [riskExposureOther, setRiskExposureOther] = useState<Record<string, string>>({});
  const [epiStatuses, setEpiStatuses] = useState<Record<string, MeasureStatus>>({});
  const [trainingStatuses, setTrainingStatuses] = useState<Record<string, MeasureStatus>>({});
  const [employeePhotos, setEmployeePhotos] = useState<string[]>([]);
  const employeePhotoRef = useRef<HTMLInputElement>(null);
  const employeeGalleryRef = useRef<HTMLInputElement>(null);
  const [observations, setObservations] = useState('');

  const [measureStatuses, setMeasureStatuses] = useState<Record<string, MeasureStatus>>({});
  const [measureNotes, setMeasureNotes] = useState<Record<string, string>>({});
  const [activeRiskId, setActiveRiskId] = useState<string | null>(null);
  const [openCategoryId, setOpenCategoryId] = useState<string | null>(null);

  // Risk matrix
  const [riskSeverity, setRiskSeverity] = useState<Record<string, string>>({});
  const [riskProbability, setRiskProbability] = useState<Record<string, string>>({});

  // Per-checklist fonte geradora (editable, initialized from risk config)
  const [riskSources, setRiskSources] = useState<Record<string, string>>({});

  // Action plan custom measures
  const [customActions, setCustomActions] = useState<string[]>([]);

  // Show report section
  const [showReport, setShowReport] = useState(false);
  const [exporting, setExporting] = useState(false);
  const reportRef = useRef<HTMLDivElement>(null);

  // Autosave (rascunho)
  const [draftId, setDraftId] = useState<string | null>(null);
  const [autoSaving, setAutoSaving] = useState(false);
  const [lastSavedAt, setLastSavedAt] = useState<Date | null>(null);

  // Load existing checklist data (view or duplicate)
  const isDuplicate = window.location.search.includes('duplicate=true');
  useEffect(() => {
    if (!duplicateId) return;
    (async () => {
    const source = await checklistsStore.get(duplicateId);
    if (!source) return;

    // If duplicating to a different company, use URL param
    const urlParams = new URLSearchParams(window.location.search);
    const targetEmpresa = urlParams.get('empresa');
    setCompanyId(targetEmpresa || source.companyId);
    setSectorId(targetEmpresa ? '' : source.sectorId);
    setSelectedFunctionIds(source.functionIds || []);
    const fd: any = source.formData || {};
    setFormData(fd);
    setObservations(fd.observations || '');
    // Prefer formData.* (new schema), fall back to top-level (legacy)
    const pick = (k: string) => fd[k] ?? (source as any)[k];
    // Load EPI/Training statuses (backward compat: old boolean → status 1)
    const epiSt: Record<string, MeasureStatus> = {};
    const epiStatusesSrc = pick('epiStatuses');
    if (epiStatusesSrc) {
      Object.entries(epiStatusesSrc).forEach(([k, v]) => { epiSt[k] = v as MeasureStatus; });
    } else if (source.selectedEpis) {
      Object.entries(source.selectedEpis).forEach(([k, v]) => { if (v) epiSt[k] = 1; });
    }
    setEpiStatuses(epiSt);
    const trSt: Record<string, MeasureStatus> = {};
    const trainingStatusesSrc = pick('trainingStatuses');
    if (trainingStatusesSrc) {
      Object.entries(trainingStatusesSrc).forEach(([k, v]) => { trSt[k] = v as MeasureStatus; });
    } else if (source.selectedTrainings) {
      Object.entries(source.selectedTrainings).forEach(([k, v]) => { if (v) trSt[k] = 1; });
    }
    setTrainingStatuses(trSt);
    setEmployeePhotos(pick('employeePhotos') || (pick('employeePhoto') ? [pick('employeePhoto')] : []));

    const riskChecks: Record<string, boolean> = {};
    const riskExp: Record<string, string> = {};
    const riskExpOther: Record<string, string> = {};
    Object.entries(source.selectedRisks || {}).forEach(([riskId, data]) => {
      if (data.checked) {
        riskChecks[riskId] = true;
        riskExp[riskId] = (data as any).exposure || '';
        riskExpOther[riskId] = (data as any).exposureOther || '';
      }
    });
    setSelectedRisks(riskChecks);
    setRiskExposures(riskExp);
    setRiskExposureOther(riskExpOther);

    const mStatuses: Record<string, MeasureStatus> = {};
    const mNotes: Record<string, string> = {};
    Object.entries(pick('measureStatuses') || {}).forEach(([k, v]) => { mStatuses[k] = v as MeasureStatus; });
    Object.entries(pick('measureNotes') || {}).forEach(([k, v]) => { mNotes[k] = v as string; });
    setMeasureStatuses(mStatuses);
    setMeasureNotes(mNotes);

    const sev: Record<string, string> = {};
    const prob: Record<string, string> = {};
    Object.entries(pick('riskSeverity') || {}).forEach(([k, v]) => { sev[k] = v as string; });
    Object.entries(pick('riskProbability') || {}).forEach(([k, v]) => { prob[k] = v as string; });
    setRiskSeverity(sev);
    setRiskProbability(prob);

    setCustomActions(pick('customActions') || []);
    setRiskSources(pick('riskSources') || {});

    setStep('fill');
    // If viewing (not duplicating), show report directly
    if (!isDuplicate) {
      setShowReport(true);
    }
    })();
  }, [duplicateId]);

  // Handle URL params from empresa → checklist flow
  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    const empresa = params.get('empresa');
    const setor = params.get('setor');
    const funcao = params.get('funcao');
    if (empresa && setor) {
      setCompanyId(empresa);
      setSectorId(setor);
      if (funcao) {
        setSelectedFunctionIds([funcao]);
      }
      setStep('fill');
    }
  }, []);

  // Attachments
  const [attachments, setAttachments] = useState<Record<string, string[]>>({});
  const [showAttachMenu, setShowAttachMenu] = useState<string | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const cameraInputRef = useRef<HTMLInputElement>(null);
  const activeAttachKey = useRef<string>('');

  const addAttachment = (key: string, dataUrl: string) => {
    setAttachments(prev => ({ ...prev, [key]: [...(prev[key] || []), dataUrl] }));
  };
  const removeAttachment = (key: string, index: number) => {
    setAttachments(prev => ({ ...prev, [key]: (prev[key] || []).filter((_, i) => i !== index) }));
  };
  const handleFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files;
    if (!files) return;
    const key = activeAttachKey.current;
    const list = Array.from(files);
    e.target.value = '';
    setShowAttachMenu(null);
    for (const file of list) {
      const url = await safeUploadFile(file, 'checklist-files');
      addAttachment(key, url);
    }
  };
  const openCamera = (key: string) => { activeAttachKey.current = key; cameraInputRef.current?.click(); setShowAttachMenu(null); };
  const openGallery = (key: string) => { activeAttachKey.current = key; fileInputRef.current?.click(); setShowAttachMenu(null); };

  const qc = useQueryClient();
  const { data: companies = [] } = useQuery({ queryKey: ['companies'], queryFn: () => companiesStore.getAll() });
  const { data: allSectors = [] } = useQuery({ queryKey: ['sectors'], queryFn: () => sectorsStore.getAll() });
  const { data: allFunctions = [] } = useQuery({ queryKey: ['functions'], queryFn: () => functionsStore.getAll() });
  const { data: riskCategories = [] } = useQuery({ queryKey: ['risk_categories'], queryFn: () => riskCategoriesStore.getAll() });
  const { data: risks = [] } = useQuery({ queryKey: ['risks'], queryFn: () => risksStore.getAll() });
  const { data: epis = [] } = useQuery({ queryKey: ['epis'], queryFn: () => episStore.getAll() });
  const { data: trainings = [] } = useQuery({ queryKey: ['trainings'], queryFn: () => trainingsStore.getAll() });
  const { data: allExams = [] } = useQuery({ queryKey: ['exams'], queryFn: () => examsStore.getAll() });
  const { data: allMeasures = [] } = useQuery({ queryKey: ['safety_measures'], queryFn: () => safetyMeasuresStore.getAll() });
  const { data: allRiskExams = [] } = useQuery({ queryKey: ['risk_exams'], queryFn: () => riskExamsStore.getAll() });
  const { data: allRiskMeasures = [] } = useQuery({ queryKey: ['risk_measures'], queryFn: () => riskMeasuresStore.getAll() });
  const { data: allBlockFields = [] } = useQuery({ queryKey: ['block_fields'], queryFn: () => blockFieldsStore.getAll() });
  const { data: allBlocks = [] } = useQuery({ queryKey: ['checklist_blocks'], queryFn: () => checklistBlocksStore.getAll() });
  const { data: professionals = [] } = useQuery({ queryKey: ['professionals'], queryFn: () => professionalsStore.getAll() });
  const blocks = useMemo(() => allBlocks.filter(b => b.visible !== false).sort((a, b) => a.order - b.order), [allBlocks]);

  // Categorias ordenadas A-Z, "other" sempre por último
  const sortedRiskCategories = useMemo(() => [...riskCategories].sort((a, b) => {
    if (a.type === 'other' && b.type !== 'other') return 1;
    if (b.type === 'other' && a.type !== 'other') return -1;
    return a.name.localeCompare(b.name, 'pt-BR');
  }), [riskCategories]);

  // Helpers: medidas e exames associados a um risco — combina junction novo (risk_measures/risk_exams)
  // com o vínculo legado direto (m.riskId/e.riskId) pra não perder dados antigos.
  const getMeasuresForRisk = (riskId: string) => {
    const direct = allMeasures.filter(m => m.riskId === riskId);
    const viaJunction = allRiskMeasures
      .filter(rm => rm.riskId === riskId)
      .map(rm => allMeasures.find(m => m.id === rm.measureId))
      .filter((m): m is typeof allMeasures[0] => !!m);
    const map = new Map<string, typeof allMeasures[0]>();
    [...direct, ...viaJunction].forEach(m => map.set(m.id, m));
    return Array.from(map.values());
  };
  const getExamsForRisk = (riskId: string) => {
    const direct = allExams.filter(e => e.riskId === riskId);
    const viaJunction = allRiskExams
      .filter(re => re.riskId === riskId)
      .map(re => {
        const exam = allExams.find(e => e.id === re.examId);
        if (!exam) return null;
        // mescla flags da associação por cima do exame
        return {
          ...exam,
          admissional: re.admissional,
          demissional: re.demissional,
          periodico: re.periodico,
          periodicidade: re.periodicidade,
          retornoTrabalho: re.retornoTrabalho,
          mudanca: re.mudanca,
        } as typeof exam;
      })
      .filter((e): e is NonNullable<typeof e> => !!e);
    const map = new Map<string, typeof allExams[0]>();
    [...direct, ...viaJunction].forEach(e => map.set(e.id, e));
    return Array.from(map.values());
  };

  // Initialize openCategoryId once riskCategories load
  useEffect(() => {
    if (sortedRiskCategories.length > 0 && openCategoryId === null) {
      setOpenCategoryId(sortedRiskCategories[0]?.id || null);
    }
  }, [sortedRiskCategories]);

  const companySectors = useMemo(() => allSectors.filter(s => s.companyId === companyId), [companyId, allSectors]);
  const sectorFunctions = useMemo(() => allFunctions.filter(f => f.sectorId === sectorId), [sectorId, allFunctions]);

  const tecnicoId = formData.tecnicoId || '';
  const canProceed = companyId && sectorId && selectedFunctionIds.length > 0 && tecnicoId;
  const handleProceed = () => { if (canProceed) setStep('fill'); };
  const toggleFunction = (id: string) => {
    setSelectedFunctionIds(prev => prev.includes(id) ? prev.filter(x => x !== id) : [...prev, id]);
  };

  const EXPOSURE_OPTIONS = ['Contínua/Permanente', 'Intermitente', 'Eventual/Ocasional', 'Habitual', 'Outra'];

  const toggleRisk = (riskId: string) => {
    const wasSelected = !!selectedRisks[riskId];
    setSelectedRisks(prev => ({ ...prev, [riskId]: !wasSelected }));
    if (!wasSelected) {
      setActiveRiskId(riskId);
      // Initialize fonte geradora from risk config if not set
      if (!riskSources[riskId]) {
        const risk = risks.find(r => r.id === riskId);
        if (risk?.source) {
          setRiskSources(prev => ({ ...prev, [riskId]: risk.source }));
        }
      }
    } else {
      if (activeRiskId === riskId) setActiveRiskId(null);
    }
  };

  // Quick measure creation state
  const [newMeasureName, setNewMeasureName] = useState<Record<string, string>>({});
  const [showNewMeasure, setShowNewMeasure] = useState<string | null>(null);

  const cycleMeasureStatus = (measureId: string) => {
    setMeasureStatuses(prev => {
      const current = prev[measureId] || 0;
      const next = ((current + 1) % 4) as MeasureStatus; // 0→1(verde)→2(vermelho)→3(amarelo)→0(reset)
      return { ...prev, [measureId]: next };
    });
  };

  const handleQuickAddMeasure = async (riskId: string) => {
    const name = newMeasureName[riskId]?.trim();
    if (!name) return;
    // Cria a medida pura + associa ao risco via risk_measures
    const created = await safetyMeasuresStore.add({ name } as any);
    await riskMeasuresStore.add({ riskId, measureId: created.id } as any);
    qc.invalidateQueries({ queryKey: ['safety_measures'] });
    qc.invalidateQueries({ queryKey: ['risk_measures'] });
    setNewMeasureName(prev => ({ ...prev, [riskId]: '' }));
    setShowNewMeasure(null);
    toast.success('Medida adicionada');
  };

  const selectedRiskIds = useMemo(
    () => Object.entries(selectedRisks).filter(([, v]) => v).map(([k]) => k),
    [selectedRisks]
  );

  // Helper que monta o payload completo (rascunho ou final)
  const buildPayload = (isDraft: boolean) => ({
    companyId,
    sectorId,
    functionIds: selectedFunctionIds,
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
    isDraft,
    formData: {
      ...formData,
      observations,
      epiStatuses,
      trainingStatuses,
      employeePhoto: employeePhotos[0] || '',
      employeePhotos,
      measureStatuses,
      measureNotes,
      riskSeverity,
      riskProbability,
      riskSources,
      customActions: customActions.filter(a => a.trim()),
    },
    selectedRisks: Object.fromEntries(
      selectedRiskIds.map(k => [k, {
        checked: true,
        exposure: riskExposures[k] || '',
        exposureOther: riskExposureOther[k] || '',
      }])
    ),
    selectedEpis: Object.fromEntries(Object.entries(epiStatuses).filter(([, v]) => v === 1).map(([k]) => [k, true])),
    selectedTrainings: Object.fromEntries(Object.entries(trainingStatuses).filter(([, v]) => v === 1).map(([k]) => [k, true])),
  });

  // Autosave debounced (3s sem mudança → grava como is_draft=true)
  useEffect(() => {
    if (step !== 'fill' || !companyId || !sectorId || isDuplicate) return;
    if (showReport) return; // não salva durante exibição do relatório
    const hasContent = selectedRiskIds.length > 0 || Object.keys(formData).length > 1;
    if (!hasContent && !draftId) return;

    const timer = setTimeout(async () => {
      setAutoSaving(true);
      try {
        const payload = buildPayload(true);
        if (draftId) {
          await checklistsStore.update(draftId, payload as any);
        } else {
          const created = await checklistsStore.add(payload as any);
          setDraftId(created.id);
        }
        setLastSavedAt(new Date());
      } catch (err) {
        console.error('autosave fail:', err);
      } finally {
        setAutoSaving(false);
      }
    }, 3000);

    return () => clearTimeout(timer);
  }, [
    step, companyId, sectorId, selectedFunctionIds, formData, observations,
    epiStatuses, trainingStatuses, employeePhotos, measureStatuses, measureNotes,
    riskSeverity, riskProbability, riskSources, customActions,
    selectedRisks, riskExposures, riskExposureOther, showReport,
  ]);

  const handleSave = async () => {
    // Validate fonte geradora (required)
    const missingSource = selectedRiskIds.find(id => !riskSources[id]?.trim());
    if (missingSource) {
      const risk = risks.find(r => r.id === missingSource);
      toast.error(`Preencha a "Fonte geradora" para: ${risk?.name || 'risco selecionado'}`);
      setActiveRiskId(missingSource);
      setShowReport(false);
      return;
    }

    const missingExposure = selectedRiskIds.find(id => !riskExposures[id]?.trim());
    if (missingExposure) {
      const risk = risks.find(r => r.id === missingExposure);
      toast.error(`Selecione a "Exposição ao risco" para: ${risk?.name || 'risco selecionado'}`);
      setActiveRiskId(missingExposure);
      setShowReport(false);
      return;
    }

    const missingOther = selectedRiskIds.find(id => riskExposures[id] === 'Outra' && !riskExposureOther[id]?.trim());
    if (missingOther) {
      const risk = risks.find(r => r.id === missingOther);
      toast.error(`Descreva a exposição "Outra" para: ${risk?.name || 'risco selecionado'}`);
      setActiveRiskId(missingOther);
      setShowReport(false);
      return;
    }

    // Non-conformity note is optional - no validation needed

    // Employee photo required
    if (employeePhotos.length === 0) {
      toast.error('Tire a foto do funcionário antes de salvar.');
      return;
    }

    try {
      const payload = buildPayload(false);
      if (draftId) {
        // Promove o rascunho a checklist final
        await checklistsStore.update(draftId, payload as any);
      } else {
        const created = await checklistsStore.add(payload as any);
        setDraftId(created.id);
      }
      qc.invalidateQueries({ queryKey: ['checklists'] });
      toast.success('Checklist salvo com sucesso!');
      setShowReport(true);
    } catch (err: any) {
      console.error('Save checklist failed:', err);
      toast.error(`Falha ao salvar: ${err?.message || 'erro desconhecido'}`);
    }
  };

  if (step === 'select') {
    return (
      <div className="p-4 max-w-lg mx-auto pb-24">
        <h1 className="text-2xl font-bold text-foreground mb-6">Novo Checklist</h1>
        <div className="space-y-4">
          <div>
            <label className="text-sm font-medium text-muted-foreground">Profissional Responsável <span className="text-destructive">*</span></label>
            <select
              className="w-full mt-1 rounded-md border border-input bg-background px-3 py-2 text-sm"
              value={tecnicoId}
              onChange={e => setFormData({ ...formData, tecnicoId: e.target.value })}
            >
              <option value="">-- Selecione --</option>
              {professionals.map(p => (
                <option key={p.id} value={p.id}>{p.name}{p.formation ? ` — ${p.formation}` : ''}</option>
              ))}
            </select>
            {professionals.length === 0 && (
              <p className="text-xs text-muted-foreground mt-1">
                Nenhum profissional cadastrado. Cadastre em <a href="/profissionais" className="text-primary underline">Profissionais</a>.
              </p>
            )}
          </div>
          <div>
            <label className="text-sm font-medium text-muted-foreground">Empresa</label>
            <select className="w-full mt-1 rounded-md border border-input bg-background px-3 py-2 text-sm" value={companyId}
              onChange={e => { setCompanyId(e.target.value); setSectorId(''); setSelectedFunctionIds([]); }}>
              <option value="">-- Selecione --</option>
              {companies.map(c => <option key={c.id} value={c.id}>{c.name}</option>)}
            </select>
          </div>
          {companyId && (
            <div>
              <label className="text-sm font-medium text-muted-foreground mb-2 block">GSE / Setor</label>
              <div className="grid grid-cols-1 gap-2">
                {companySectors.map(s => (
                  <button
                    key={s.id}
                    type="button"
                    onClick={() => {
                      setSectorId(s.id);
                      // Auto-select all functions of this sector
                      const funcs = allFunctions.filter(f => f.sectorId === s.id);
                      setSelectedFunctionIds(funcs.map(f => f.id));
                    }}
                    className={`w-full text-left px-4 py-3 rounded-lg border-2 transition-all text-base font-medium ${
                      sectorId === s.id
                        ? 'bg-primary/10 border-primary text-primary'
                        : 'bg-background border-input hover:border-muted-foreground/30 text-foreground'
                    }`}
                  >
                    {s.name}
                  </button>
                ))}
              </div>
            </div>
          )}
          {sectorId && (
            <div>
              <label className="text-sm font-medium text-muted-foreground mb-2 block">Funções</label>
              {sectorFunctions.length === 0 ? (
                <p className="text-sm text-muted-foreground">Nenhuma função cadastrada neste setor.</p>
              ) : (
                <div className="space-y-2">
                  {sectorFunctions.map(fn => (
                    <label key={fn.id} className="flex items-center gap-2 p-2 rounded-md border border-input cursor-pointer hover:bg-muted/50">
                      <Checkbox checked={selectedFunctionIds.includes(fn.id)} onCheckedChange={() => toggleFunction(fn.id)} />
                      <span className="text-sm text-foreground">{fn.name}</span>
                    </label>
                  ))}
                </div>
              )}
            </div>
          )}
          <Button onClick={handleProceed} disabled={!canProceed} className="w-full mt-4">
            Iniciar Checklist <ArrowRight className="ml-2 h-4 w-4" />
          </Button>
        </div>
      </div>
    );
  }

  const company = companies.find(c => c.id === companyId);
  const sector = allSectors.find(s => s.id === sectorId);
  const selectedFns = allFunctions.filter(f => selectedFunctionIds.includes(f.id));
  const activeRisk = activeRiskId ? risks.find(r => r.id === activeRiskId) : null;
  const activeRiskCategory = activeRisk ? riskCategories.find(c => c.id === activeRisk.categoryId) : null;
  const activeRiskMeasures = activeRiskId ? getMeasuresForRisk(activeRiskId) : [];
  const activeRiskExams = activeRiskId ? getExamsForRisk(activeRiskId) : [];

  const handleExportPdf = async (mode: 'download' | 'share' = 'download') => {
    if (!reportRef.current) return;
    setExporting(true);
    try {
      const filename = `relatorio_${company?.name?.replace(/\s+/g, '_') || 'checklist'}`;
      await exportReportToPdf(reportRef.current, filename, mode);
    } catch (err) {
      console.error(err);
      toast.error('Erro ao gerar PDF.');
    } finally {
      setExporting(false);
    }
  };

  const handleExportExcel = () => {
    try {
      const filename = `relatorio_${company?.name?.replace(/\s+/g, '_') || 'checklist'}`;
      const statusText = (st: number | undefined) =>
        st === 1 ? 'Conforme' : st === 2 ? 'Não conforme' : st === 3 ? 'N/A' : 'Não avaliado';
      const sevLabel = (v?: string) => {
        const opt = SEVERITY_OPTIONS.find(o => String(o.value) === String(v));
        return opt ? opt.label : '—';
      };
      const probLabel = (v?: string) => {
        const opt = PROBABILITY_OPTIONS.find(o => String(o.value) === String(v));
        return opt ? opt.label : '—';
      };

      const risksData = selectedRiskIds.map(id => {
        const r = risks.find(x => x.id === id);
        const cat = riskCategories.find(c => c.id === r?.categoryId);
        return {
          categoria: cat?.name || '—',
          nome: r?.name || '—',
          fonte: riskSources[id] || '—',
          exposicao: riskExposures[id] === 'Outra'
            ? (riskExposureOther[id] || 'Outra')
            : (riskExposures[id] || '—'),
          severidade: sevLabel(riskSeverity[id]),
          probabilidade: probLabel(riskProbability[id]),
        };
      });

      const nonConformities: { risco: string; medida: string; nota?: string }[] = [];
      const conformities: { risco: string; medida: string }[] = [];
      selectedRiskIds.forEach(rId => {
        const r = risks.find(x => x.id === rId);
        getMeasuresForRisk(rId).forEach(m => {
          const st = measureStatuses[m.id] || 0;
          if (st === 1) conformities.push({ risco: r?.name || '—', medida: m.name });
          if (st === 2) nonConformities.push({ risco: r?.name || '—', medida: m.name, nota: measureNotes[m.id] });
        });
      });

      const actionPlan = [
        ...nonConformities.map(n => ({ acao: `${n.medida}${n.nota ? ' — ' + n.nota : ''} (${n.risco})`, tipo: 'medida' as const })),
        ...customActions.filter(a => a.trim()).map(a => ({ acao: a, tipo: 'custom' as const })),
      ];

      const epiList = Object.entries(epiStatuses)
        .filter(([, v]) => v > 0)
        .map(([id, st]) => {
          const e = epis.find(x => x.id === id);
          return { nome: e?.name || '—', status: statusText(st as number) };
        });

      const trainingList = Object.entries(trainingStatuses)
        .filter(([, v]) => v > 0)
        .map(([id, st]) => {
          const t = trainings.find(x => x.id === id);
          return { nome: t?.name || '—', status: statusText(st as number) };
        });

      exportReportToExcel({
        filename,
        empresa: company?.name || '—',
        empresaDoc: company?.doc,
        setor: sector?.name || '—',
        funcoes: selectedFns.map(f => f.name),
        data: new Date().toLocaleDateString('pt-BR'),
        tecnico: formData.tecnico,
        funcionario: formData.funcionario,
        observations,
        risks: risksData,
        nonConformities,
        conformities,
        actionPlan,
        epis: epiList,
        trainings: trainingList,
      });
    } catch (err) {
      console.error(err);
      toast.error('Erro ao gerar Excel.');
    }
  };

  const AttachmentAction = ({ attachKey }: { attachKey: string }) => {
    const photos = attachments[attachKey] || [];
    return (
      <div className="mt-1">
        <div className="flex items-center gap-1">
          <button type="button" className="inline-flex items-center gap-1 text-xs text-primary hover:text-primary/80 transition-colors px-2 py-1 rounded-md hover:bg-primary/10"
            onClick={() => setShowAttachMenu(showAttachMenu === attachKey ? null : attachKey)}>
            <Paperclip className="h-3.5 w-3.5" /> Anexar foto
          </button>
        </div>
        {showAttachMenu === attachKey && (
          <div className="flex gap-2 mt-1 animate-in fade-in slide-in-from-top-1 duration-150">
            <button type="button" className="flex items-center gap-1 text-xs bg-primary/10 text-primary px-3 py-1.5 rounded-md hover:bg-primary/20 transition-colors"
              onClick={() => openCamera(attachKey)}>
              <Camera className="h-3.5 w-3.5" /> Tirar foto
            </button>
            <button type="button" className="flex items-center gap-1 text-xs bg-primary/10 text-primary px-3 py-1.5 rounded-md hover:bg-primary/20 transition-colors"
              onClick={() => openGallery(attachKey)}>
              <ImagePlus className="h-3.5 w-3.5" /> Galeria
            </button>
          </div>
        )}
        {photos.length > 0 && (
          <div className="flex gap-2 mt-2 flex-wrap">
            {photos.map((src, i) => (
              <div key={i} className="relative group">
                <img src={src} alt="Anexo" className="h-16 w-16 object-cover rounded-md border border-border" />
                <button type="button" className="absolute -top-1 -right-1 bg-destructive text-destructive-foreground rounded-full p-0.5 opacity-0 group-hover:opacity-100 transition-opacity"
                  onClick={() => removeAttachment(attachKey, i)}>
                  <X className="h-3 w-3" />
                </button>
              </div>
            ))}
          </div>
        )}
      </div>
    );
  };

  const RiskDetailPanel = () => {
    if (selectedRiskIds.length === 0) {
      return (
        <div className="flex items-center justify-center h-full text-muted-foreground text-base p-8 text-center">
          Selecione um risco à esquerda para ver os detalhes
        </div>
      );
    }

    return (
      <div className="space-y-3 p-3 md:p-4 overflow-y-auto md:max-h-[600px]">
        {selectedRiskIds.map(riskId => {
          const risk = risks.find(r => r.id === riskId);
          if (!risk) return null;
          const riskCat = riskCategories.find(c => c.id === risk.categoryId);
          const colors = riskCat ? getRiskColor(riskCat.type) : null;
          const riskKey = `risk_${riskId}`;
          const riskMeasures = getMeasuresForRisk(riskId);
          const riskExamsForRisk = getExamsForRisk(riskId);
          const isExpanded = activeRiskId === riskId;

          return (
            <div key={riskId} className="border border-border rounded-lg overflow-hidden">
              <button
                type="button"
                onClick={() => setActiveRiskId(isExpanded ? null : riskId)}
                className={`w-full text-left px-4 py-3 flex items-center justify-between transition-colors ${colors ? `${colors.bg} ${colors.text}` : 'bg-muted text-foreground'}`}
              >
                <span className="font-semibold text-base">{risk.name}</span>
                <ChevronRight className={`h-4 w-4 text-gray-700 transition-transform duration-200 ${isExpanded ? 'rotate-90' : ''}`} />
              </button>

              <div className={`overflow-hidden transition-all duration-200 ${isExpanded ? 'max-h-[2000px] opacity-100' : 'max-h-0 opacity-0'}`}>
                <div className="space-y-4 p-4">
                  {risk.recommendations?.trim() && (
                    <p className="text-sm text-muted-foreground italic bg-muted/50 px-3 py-2 rounded-md">
                      💡 {risk.recommendations}
                    </p>
                  )}

                  <div>
                    <label className="text-base font-medium text-muted-foreground">
                      Fonte geradora do risco <span className="text-destructive">*</span>
                    </label>
                    <SpeechInput
                      value={riskSources[riskId] || ''}
                      onChange={val => setRiskSources(prev => ({ ...prev, [riskId]: val }))}
                      placeholder="Descreva a fonte geradora..."
                      required
                      className={`mt-1 ${!riskSources[riskId]?.trim() ? 'border-destructive' : ''}`}
                    />
                  </div>

                  <div>
                    <label className="text-base font-medium text-muted-foreground">
                      Exposição ao risco <span className="text-destructive">*</span>
                    </label>
                    <select
                      className={`w-full mt-1 rounded-md border bg-background px-3 py-3 text-base ${!riskExposures[riskId] ? 'border-destructive' : 'border-input'}`}
                      value={riskExposures[riskId] || ''}
                      onChange={e => setRiskExposures({ ...riskExposures, [riskId]: e.target.value })}
                    >
                      <option value="">-- Selecione --</option>
                      {EXPOSURE_OPTIONS.map(opt => <option key={opt} value={opt}>{opt}</option>)}
                    </select>
                  </div>

                  {riskExposures[riskId] === 'Outra' && (
                    <div>
                      <label className="text-base font-medium text-muted-foreground">
                        Descreva a exposição <span className="text-destructive">*</span>
                      </label>
                      <Input
                        placeholder="Descreva a exposição..."
                        value={riskExposureOther[riskId] || ''}
                        onChange={e => setRiskExposureOther({ ...riskExposureOther, [riskId]: e.target.value })}
                        className={`mt-1 text-base ${!riskExposureOther[riskId]?.trim() ? 'border-destructive' : ''}`}
                      />
                    </div>
                  )}

                  <div className="grid grid-cols-2 gap-3">
                    <div>
                      <label className="text-base font-medium text-muted-foreground flex items-center gap-1.5">
                        Severidade <SeverityHelp />
                      </label>
                      <select
                        className="w-full mt-1 rounded-md border border-input bg-background px-3 py-3 text-base"
                        value={riskSeverity[riskId] || '0'}
                        onChange={e => setRiskSeverity({ ...riskSeverity, [riskId]: e.target.value })}
                      >
                        {SEVERITY_OPTIONS.map(opt => <option key={opt.value} value={opt.value}>{opt.label}</option>)}
                      </select>
                    </div>
                    <div>
                      <label className="text-base font-medium text-muted-foreground flex items-center gap-1.5">
                        Probabilidade <ProbabilityHelp riskCategoryType={riskCat?.type} />
                      </label>
                      <select
                        className="w-full mt-1 rounded-md border border-input bg-background px-3 py-3 text-base"
                        value={riskProbability[riskId] || '0'}
                        onChange={e => setRiskProbability({ ...riskProbability, [riskId]: e.target.value })}
                      >
                        {PROBABILITY_OPTIONS.map(opt => <option key={opt.value} value={opt.value}>{opt.label}</option>)}
                      </select>
                    </div>
                  </div>

                  {riskMeasures.length > 0 && (
                    <div>
                      <p className="text-base font-medium text-muted-foreground flex items-center gap-1.5 mb-2">
                        <Shield className="h-4 w-4" /> Medidas de segurança
                      </p>
                      <p className="text-xs text-muted-foreground mb-3">
                        Clique para alternar: <span className="text-green-600 font-medium">verde = existente</span> · <span className="text-red-600 font-medium">vermelho = não existente</span> · neutro = não avaliado
                      </p>
                      <div className="space-y-2">
                        {riskMeasures.map(measure => {
                          const status = measureStatuses[measure.id] || 0;
                          const bgClass = status === 1
                            ? 'bg-green-100 border-green-400 dark:bg-green-900/30 dark:border-green-700'
                            : status === 2
                            ? 'bg-red-100 border-red-400 dark:bg-red-900/30 dark:border-red-700'
                            : 'bg-background border-input';
                          const textClass = status === 1
                            ? 'text-green-800 dark:text-green-300'
                            : status === 2
                            ? 'text-red-800 dark:text-red-300'
                            : 'text-foreground';
                          const label = status === 1 ? 'EXISTENTE' : status === 2 ? 'NÃO EXISTENTE' : '';

                          return (
                            <div key={measure.id}>
                              <button
                                type="button"
                                onClick={() => cycleMeasureStatus(measure.id)}
                                className={`w-full text-left px-4 py-3 rounded-lg border-2 transition-all ${bgClass} ${textClass}`}
                              >
                                <div className="flex items-center justify-between">
                                  <span className="text-base font-medium">{measure.name}</span>
                                  {label && <Badge variant="outline" className={`text-[10px] ${textClass} border-current`}>{label}</Badge>}
                                </div>
                              </button>
                              {status === 2 && (
                                <div className="mt-2 ml-2">
                                  <label className="text-xs font-medium text-destructive">
                                    Descrever não conformidade <span className="text-destructive">*</span>
                                  </label>
                                  <Textarea
                                    placeholder="Descreva a não conformidade..."
                                    value={measureNotes[measure.id] || ''}
                                    onChange={e => setMeasureNotes({ ...measureNotes, [measure.id]: e.target.value })}
                                    className={`mt-1 text-base ${!measureNotes[measure.id]?.trim() ? 'border-destructive' : ''}`}
                                    rows={2}
                                  />
                                </div>
                              )}
                            </div>
                          );
                        })}
                      </div>
                    </div>
                  )}

                  {riskExamsForRisk.length > 0 && (
                    <div className="bg-muted/30 px-3 py-2 rounded-md">
                      <p className="text-xs font-medium text-muted-foreground flex items-center gap-1 mb-1">
                        <Stethoscope className="h-3 w-3" /> Exames ocupacionais
                      </p>
                      <div className="flex flex-wrap gap-1">
                        {riskExamsForRisk.map(ex => (
                          <Badge key={ex.id} variant="outline" className="text-[10px]">
                            {ex.name}
                            {[ex.admissional && 'Adm', ex.periodico && 'Per', ex.demissional && 'Dem', ex.retornoTrabalho && 'Ret', ex.mudanca && 'Mud'].filter(Boolean).length > 0 && (
                              <span className="ml-1 text-muted-foreground">
                                ({[ex.admissional && 'Adm', ex.periodico && 'Per', ex.demissional && 'Dem', ex.retornoTrabalho && 'Ret', ex.mudanca && 'Mud'].filter(Boolean).join(', ')})
                              </span>
                            )}
                          </Badge>
                        ))}
                      </div>
                    </div>
                  )}

                  <AttachmentAction attachKey={riskKey} />
                </div>
              </div>
            </div>
          );
        })}
      </div>
    );
  };

  return (
    <div className="p-4 max-w-6xl mx-auto pb-24">
      <input ref={fileInputRef} type="file" accept="image/*" className="hidden" onChange={handleFileChange} multiple />
      <input ref={cameraInputRef} type="file" accept="image/*" capture="environment" className="hidden" onChange={handleFileChange} />

      {/* ## 7 - Hide navigation buttons in print */}
      <div className="flex items-center justify-between mb-4 print:hidden">
        <Button variant="ghost" size="sm" onClick={() => setStep('select')}>
          <ArrowLeft className="h-4 w-4 mr-1" /> Voltar
        </Button>
        <div className="flex items-center gap-3">
          {autoSaving && (
            <span className="text-xs text-muted-foreground inline-flex items-center gap-1">
              <span className="h-1.5 w-1.5 rounded-full bg-primary animate-pulse" /> Salvando…
            </span>
          )}
          {!autoSaving && lastSavedAt && draftId && (
            <span className="text-xs text-muted-foreground inline-flex items-center gap-1">
              <span className="h-1.5 w-1.5 rounded-full bg-green-500" /> Rascunho salvo
            </span>
          )}
          <Button
            variant={showReport ? 'default' : 'outline'}
            size="sm"
            onClick={() => setShowReport(!showReport)}
          >
            <FileBarChart className="h-4 w-4 mr-1" /> {showReport ? 'Editar' : 'Relatório'}
          </Button>
        </div>
      </div>

      <div className="mb-4 p-3 rounded-lg bg-primary/10 border border-primary/20 print:hidden">
        <p className="text-sm font-medium text-foreground">{company?.name}</p>
        <p className="text-xs text-muted-foreground">{sector?.name} · {selectedFns.map(f => f.name).join(', ')}</p>
      </div>

      {showReport ? (
        <div className="space-y-6">
          <div ref={reportRef}>
            <ChecklistReport
              companyName={company?.name || ''}
              companyLogo={(company as any)?.logo}
              sectorName={sector?.name || ''}
              selectedFns={selectedFns}
              formData={formData}
              observations={observations}
              selectedRiskIds={selectedRiskIds}
              risks={risks}
              riskCategories={riskCategories}
              riskSources={riskSources}
              riskExposures={riskExposures}
              riskExposureOther={riskExposureOther}
              riskSeverity={riskSeverity}
              riskProbability={riskProbability}
              allMeasures={allMeasures}
              measureStatuses={measureStatuses}
              measureNotes={measureNotes}
              allExams={allExams}
              getMeasuresForRisk={getMeasuresForRisk}
              getExamsForRisk={getExamsForRisk}
              selectedEpiIds={Object.entries(epiStatuses).filter(([, v]) => v === 1).map(([k]) => k)}
              epiStatuses={epiStatuses}
              allEpis={epis}
              selectedTrainingIds={Object.entries(trainingStatuses).filter(([, v]) => v === 1).map(([k]) => k)}
              trainingStatuses={trainingStatuses}
              employeePhoto={employeePhotos[0] || ''}
              allTrainings={trainings}
              blocks={blocks}
              allBlockFields={allBlockFields}
              customActions={customActions}
              onAddCustomAction={() => setCustomActions([...customActions, ''])}
              onUpdateCustomAction={(i, v) => { const a = [...customActions]; a[i] = v; setCustomActions(a); }}
              onRemoveCustomAction={(i) => setCustomActions(customActions.filter((_, idx) => idx !== i))}
            />
          </div>
          <div className="flex flex-wrap gap-2 print:hidden">
            <Button onClick={handleSave} className="flex-1 min-w-[160px] bg-green-600 hover:bg-green-700 text-white" size="lg">
              <Save className="h-4 w-4 mr-2" /> Salvar Checklist
            </Button>
            <Button variant="outline" size="lg" onClick={() => handleExportPdf('download')} disabled={exporting}>
              <FileDown className="h-4 w-4 mr-2" /> {exporting ? 'Gerando...' : 'Baixar PDF'}
            </Button>
            <Button variant="outline" size="lg" onClick={() => handleExportPdf('share')} disabled={exporting}>
              <Share2 className="h-4 w-4 mr-2" /> Compartilhar
            </Button>
            <Button variant="outline" size="lg" onClick={handleExportExcel}>
              <FileSpreadsheet className="h-4 w-4 mr-2" /> Baixar Excel
            </Button>
          </div>
        </div>
      ) : (
        <div className="space-y-6">
          {blocks.map(block => {
            const blockLower = block.name.toLowerCase();

            if (blockLower.includes('informações gerais') || blockLower.includes('informacoes gerais')) {
              return (
                <Card key={block.id} className="p-4">
                  <h2 className="bg-muted text-foreground px-3 py-2 rounded-md mb-3 font-semibold text-base">{block.name}</h2>
                  <div className="space-y-3">
                    <div>
                      <label className="text-base text-muted-foreground">Funcionário entrevistado</label>
                      <Input value={formData.funcionario || ''} onChange={e => setFormData({ ...formData, funcionario: e.target.value })} className="text-base" />
                    </div>
                  </div>
                </Card>
              );
            }

            if (blockLower.includes('setorização') || blockLower.includes('gse')) {
              return (
                <Card key={block.id} className="p-4">
                  <h2 className="bg-muted text-foreground px-3 py-2 rounded-md mb-3 font-semibold text-base">{block.name}</h2>
                  <div>
                    <label className="text-base text-muted-foreground">Local</label>
                    <Input value={formData.local || ''} onChange={e => setFormData({ ...formData, local: e.target.value })} className="text-base" />
                  </div>
                </Card>
              );
            }

            if (blockLower.includes('atribuições') || blockLower.includes('atribuicoes')) {
              return (
                <Card key={block.id} className="p-4">
                  <h2 className="bg-muted text-foreground px-3 py-2 rounded-md mb-3 font-semibold text-base">{block.name}</h2>
                  <SpeechInput placeholder="Descreva as atribuições..." value={formData.atribuicoes || ''}
                    onChange={val => setFormData({ ...formData, atribuicoes: val })} multiline rows={3} />
                </Card>
              );
            }

            if (blockLower.includes('risco')) {
              return (
                <Card key={block.id} className="p-0 overflow-hidden">
                  <h2 className="bg-muted text-foreground px-4 py-3 font-semibold text-base">{block.name}</h2>
                  <div className="p-3 md:p-4 space-y-2">
                    {sortedRiskCategories.map(cat => {
                      const catRisks = [...risks.filter(r => r.categoryId === cat.id)].sort((a, b) => a.name.localeCompare(b.name, 'pt-BR'));
                      if (catRisks.length === 0) return null;
                      const colors = getRiskColor(cat.type);
                      const isOpen = openCategoryId === cat.id;
                      return (
                        <div key={cat.id} className="mb-2">
                          <button
                            type="button"
                            onClick={() => setOpenCategoryId(isOpen ? null : cat.id)}
                            className={`${colors.bg} ${colors.text} px-3 py-2.5 rounded-md font-semibold text-base w-full text-left flex items-center justify-between transition-all`}
                          >
                            <span>{cat.name}</span>
                            <ChevronRight className={`h-4 w-4 text-gray-700 transition-transform duration-200 ${isOpen ? 'rotate-90' : ''}`} />
                          </button>
                          <div className={`overflow-hidden transition-all duration-200 ${isOpen ? 'max-h-[20000px] opacity-100 mt-2' : 'max-h-0 opacity-0'}`}>
                            <div className="grid grid-cols-1 gap-1.5">
                              {catRisks.map(risk => {
                                const isSelected = !!selectedRisks[risk.id];
                                const isActive = activeRiskId === risk.id;
                                const riskCat = riskCategories.find(c => c.id === risk.categoryId);
                                const riskMeasures = getMeasuresForRisk(risk.id);
                                const riskExamsForRisk = getExamsForRisk(risk.id);
                                const riskKey = `risk_${risk.id}`;
                                return (
                                  <div key={risk.id}>
                                    <button
                                      type="button"
                                      onClick={() => {
                                        if (isSelected && isActive) {
                                          setActiveRiskId(null);
                                        } else if (isSelected && !isActive) {
                                          setActiveRiskId(risk.id);
                                        } else {
                                          toggleRisk(risk.id);
                                          setActiveRiskId(risk.id);
                                        }
                                      }}
                                      className={`w-full text-left px-3 py-2.5 rounded-lg border-2 transition-all text-base
                                        ${isSelected
                                          ? 'bg-green-100 border-green-500 dark:bg-green-900/30 dark:border-green-600'
                                          : 'bg-background border-input hover:border-muted-foreground/30'}
                                        ${isActive ? 'ring-2 ring-primary ring-offset-1' : ''}
                                      `}
                                    >
                                      <div className="flex items-center justify-between">
                                        <span className={`font-medium ${isSelected ? 'text-green-800 dark:text-green-300' : 'text-foreground'}`}>
                                          {risk.name}
                                        </span>
                                        {isSelected && (
                                          <ChevronRight className={`h-4 w-4 text-muted-foreground transition-transform duration-200 ${isActive ? 'rotate-90' : ''}`} />
                                        )}
                                      </div>
                                    </button>
                                    {/* Inline risk details */}
                                    {isSelected && isActive && (
                                      <div className="mt-1 mb-2 border border-border rounded-lg p-4 bg-muted/10 space-y-4 animate-in fade-in slide-in-from-top-2 duration-200">
                                        {risk.recommendations?.trim() && (
                                          <p className="text-sm text-muted-foreground italic bg-muted/50 px-3 py-2 rounded-md">
                                            💡 {risk.recommendations}
                                          </p>
                                        )}
                                        <div>
                                          <label className="text-base font-medium text-muted-foreground">
                                            Fonte geradora do risco <span className="text-destructive">*</span>
                                          </label>
                                          <SpeechInput
                                            value={riskSources[risk.id] || ''}
                                            onChange={val => setRiskSources(prev => ({ ...prev, [risk.id]: val }))}
                                            placeholder="Descreva a fonte geradora..."
                                            required
                                            className={`mt-1 ${!riskSources[risk.id]?.trim() ? 'border-destructive' : ''}`}
                                          />
                                        </div>
                                        <div>
                                          <label className="text-base font-medium text-muted-foreground">
                                            Exposição ao risco <span className="text-destructive">*</span>
                                          </label>
                                          <select
                                            className={`w-full mt-1 rounded-md border bg-background px-3 py-3 text-base ${!riskExposures[risk.id] ? 'border-destructive' : 'border-input'}`}
                                            value={riskExposures[risk.id] || ''}
                                            onChange={e => setRiskExposures({ ...riskExposures, [risk.id]: e.target.value })}
                                          >
                                            <option value="">-- Selecione --</option>
                                            {EXPOSURE_OPTIONS.map(opt => <option key={opt} value={opt}>{opt}</option>)}
                                          </select>
                                        </div>
                                        {riskExposures[risk.id] === 'Outra' && (
                                          <div>
                                            <label className="text-base font-medium text-muted-foreground">
                                              Descreva a exposição <span className="text-destructive">*</span>
                                            </label>
                                            <Input
                                              placeholder="Descreva a exposição..."
                                              value={riskExposureOther[risk.id] || ''}
                                              onChange={e => setRiskExposureOther({ ...riskExposureOther, [risk.id]: e.target.value })}
                                              className={`mt-1 text-base ${!riskExposureOther[risk.id]?.trim() ? 'border-destructive' : ''}`}
                                            />
                                          </div>
                                        )}
                                        <div className="grid grid-cols-2 gap-3">
                                          <div>
                                            <label className="text-base font-medium text-muted-foreground flex items-center gap-1.5">
                                              Severidade <SeverityHelp />
                                            </label>
                                            <select
                                              className="w-full mt-1 rounded-md border border-input bg-background px-3 py-3 text-base"
                                              value={riskSeverity[risk.id] || '0'}
                                              onChange={e => setRiskSeverity({ ...riskSeverity, [risk.id]: e.target.value })}
                                            >
                                              {SEVERITY_OPTIONS.map(opt => <option key={opt.value} value={opt.value}>{opt.label}</option>)}
                                            </select>
                                          </div>
                                          <div>
                                            <label className="text-base font-medium text-muted-foreground flex items-center gap-1.5">
                                              Probabilidade <ProbabilityHelp riskCategoryType={riskCat?.type} />
                                            </label>
                                            <select
                                              className="w-full mt-1 rounded-md border border-input bg-background px-3 py-3 text-base"
                                              value={riskProbability[risk.id] || '0'}
                                              onChange={e => setRiskProbability({ ...riskProbability, [risk.id]: e.target.value })}
                                            >
                                              {PROBABILITY_OPTIONS.map(opt => <option key={opt.value} value={opt.value}>{opt.label}</option>)}
                                            </select>
                                          </div>
                                        </div>
                                        {riskMeasures.length > 0 && (
                                          <div>
                                            <p className="text-base font-medium text-muted-foreground flex items-center gap-1.5 mb-2">
                                              <Shield className="h-4 w-4" /> Medidas de segurança
                                            </p>
                                            <p className="text-xs text-muted-foreground mb-3">
                                              Clique para alternar: <span className="text-green-600 font-medium">verde = existente</span> · <span className="text-red-600 font-medium">vermelho = não existente</span> · <span className="text-amber-600 font-medium">amarelo = não se aplica</span>
                                            </p>
                                            <div className="space-y-2">
                                              {riskMeasures.map(measure => {
                                                const status = measureStatuses[measure.id] || 0;
                                                const bgClass = status === 1
                                                  ? 'bg-green-100 border-green-400 dark:bg-green-900/30 dark:border-green-700'
                                                  : status === 2
                                                  ? 'bg-red-100 border-red-400 dark:bg-red-900/30 dark:border-red-700'
                                                  : status === 3
                                                  ? 'bg-amber-100 border-amber-400 dark:bg-amber-900/30 dark:border-amber-700'
                                                  : 'bg-background border-input';
                                                const textClass = status === 1
                                                  ? 'text-green-800 dark:text-green-300'
                                                  : status === 2
                                                  ? 'text-red-800 dark:text-red-300'
                                                  : status === 3
                                                  ? 'text-amber-800 dark:text-amber-300'
                                                  : 'text-foreground';
                                                const label = status === 1 ? 'EXISTENTE' : status === 2 ? 'NÃO EXISTENTE' : status === 3 ? 'NÃO SE APLICA' : '';
                                                return (
                                                  <div key={measure.id}>
                                                    <button
                                                      type="button"
                                                      onClick={() => cycleMeasureStatus(measure.id)}
                                                      className={`w-full text-left px-4 py-3 rounded-lg border-2 transition-all ${bgClass} ${textClass}`}
                                                    >
                                                      <div className="flex items-center justify-between">
                                                        <span className="text-base font-medium">{measure.name}</span>
                                                        {label && <Badge variant="outline" className={`text-[10px] ${textClass} border-current`}>{label}</Badge>}
                                                      </div>
                                                    </button>
                                                    {status === 2 && (
                                                      <div className="mt-2 ml-2">
                                                        <label className="text-xs font-medium text-muted-foreground">
                                                          Descrever não conformidade (opcional)
                                                        </label>
                                                        <Textarea
                                                          placeholder="Descreva a não conformidade..."
                                                          value={measureNotes[measure.id] || ''}
                                                          onChange={e => setMeasureNotes({ ...measureNotes, [measure.id]: e.target.value })}
                                                          className="mt-1 text-base"
                                                          rows={2}
                                                        />
                                                      </div>
                                                    )}
                                                  </div>
                                                );
                                              })}
                                            </div>
                                          </div>
                                        )}
                                        {/* Quick add measure */}
                                        <div className="mt-2">
                                          {showNewMeasure === risk.id ? (
                                            <div className="flex gap-2">
                                              <Input
                                                placeholder="Nome da medida..."
                                                value={newMeasureName[risk.id] || ''}
                                                onChange={e => setNewMeasureName(prev => ({ ...prev, [risk.id]: e.target.value }))}
                                                className="text-sm"
                                                onKeyDown={e => { if (e.key === 'Enter') handleQuickAddMeasure(risk.id); }}
                                              />
                                              <Button size="sm" onClick={() => handleQuickAddMeasure(risk.id)} disabled={!newMeasureName[risk.id]?.trim()}>
                                                <Plus className="h-3.5 w-3.5" />
                                              </Button>
                                              <Button size="sm" variant="ghost" onClick={() => setShowNewMeasure(null)}>
                                                <X className="h-3.5 w-3.5" />
                                              </Button>
                                            </div>
                                          ) : (
                                            <button
                                              type="button"
                                              className="text-xs text-primary hover:text-primary/80 inline-flex items-center gap-1"
                                              onClick={() => setShowNewMeasure(risk.id)}
                                            >
                                              <Plus className="h-3 w-3" /> Adicionar nova medida
                                            </button>
                                          )}
                                        </div>
                                        {riskExamsForRisk.length > 0 && (
                                          <div className="bg-muted/30 px-3 py-2 rounded-md">
                                            <p className="text-xs font-medium text-muted-foreground flex items-center gap-1 mb-1">
                                              <Stethoscope className="h-3 w-3" /> Exames ocupacionais
                                            </p>
                                            <div className="flex flex-wrap gap-1">
                                              {riskExamsForRisk.map(ex => (
                                                <Badge key={ex.id} variant="outline" className="text-[10px]">
                                                  {ex.name}
                                                  {[ex.admissional && 'Adm', ex.periodico && 'Per', ex.demissional && 'Dem', ex.retornoTrabalho && 'Ret', ex.mudanca && 'Mud'].filter(Boolean).length > 0 && (
                                                    <span className="ml-1 text-muted-foreground">
                                                      ({[ex.admissional && 'Adm', ex.periodico && 'Per', ex.demissional && 'Dem', ex.retornoTrabalho && 'Ret', ex.mudanca && 'Mud'].filter(Boolean).join(', ')})
                                                    </span>
                                                  )}
                                                </Badge>
                                              ))}
                                            </div>
                                          </div>
                                        )}
                                        <AttachmentAction attachKey={riskKey} />
                                        <div className="flex justify-end">
                                          <Button
                                            type="button"
                                            variant="ghost"
                                            size="sm"
                                            className="text-destructive hover:text-destructive"
                                            onClick={() => {
                                              setSelectedRisks(prev => ({ ...prev, [risk.id]: false }));
                                              setActiveRiskId(null);
                                            }}
                                          >
                                            <Trash2 className="h-3.5 w-3.5 mr-1" /> Remover risco
                                          </Button>
                                        </div>
                                      </div>
                                    )}
                                  </div>
                                );
                              })}
                            </div>
                          </div>
                        </div>
                      );
                    })}
                  </div>
                </Card>
              );
            }

            if (blockLower.includes('epi')) {
              const cycleEpi = (id: string) => {
                setEpiStatuses(prev => {
                  const current = prev[id] || 0;
                  const next = ((current + 1) % 4) as MeasureStatus;
                  return { ...prev, [id]: next };
                });
              };
              return (
                <Card key={block.id} className="p-4">
                  <h2 className="bg-muted text-foreground px-3 py-2 rounded-md mb-3 font-semibold text-base">Aplicação de EPIs</h2>
                  <p className="text-xs text-muted-foreground mb-3">
                    Clique para alternar: <span className="text-green-600 font-medium">verde = possui</span> · <span className="text-red-600 font-medium">vermelho = não possui</span> · <span className="text-amber-600 font-medium">amarelo = não se aplica</span>
                  </p>
                  <div className="grid grid-cols-3 sm:grid-cols-4 md:grid-cols-5 gap-3">
                    {epis.map(epi => {
                      const status = epiStatuses[epi.id] || 0;
                      const bgClass = status === 1 ? 'bg-green-100 border-green-500 dark:bg-green-900/30 dark:border-green-600'
                        : status === 2 ? 'bg-red-100 border-red-500 dark:bg-red-900/30 dark:border-red-600'
                        : status === 3 ? 'bg-amber-100 border-amber-500 dark:bg-amber-900/30 dark:border-amber-600'
                        : 'bg-white border-input hover:border-muted-foreground/30 dark:bg-white/90';
                      const textClass = status === 1 ? 'text-green-800 dark:text-green-300'
                        : status === 2 ? 'text-red-800 dark:text-red-300'
                        : status === 3 ? 'text-amber-800 dark:text-amber-300'
                        : 'text-foreground';
                      return (
                        <button key={epi.id} type="button" onClick={() => cycleEpi(epi.id)}
                          className={`flex flex-col items-center justify-center p-2 rounded-xl border-2 transition-all min-h-[90px] ${bgClass}`}>
                          {epi.image ? (
                            <img src={epi.image} alt={epi.name} className="h-12 w-12 object-contain mb-1 rounded" />
                          ) : (
                            <div className="h-12 w-12 bg-muted rounded flex items-center justify-center mb-1">
                              <span className="text-lg">🦺</span>
                            </div>
                          )}
                          <span className={`text-xs text-center font-medium leading-tight ${textClass}`}>{epi.name}</span>
                        </button>
                      );
                    })}
                  </div>
                </Card>
              );
            }

            if (blockLower.includes('treinamento')) {
              const cycleTraining = (id: string) => {
                setTrainingStatuses(prev => {
                  const current = prev[id] || 0;
                  const next = ((current + 1) % 4) as MeasureStatus;
                  return { ...prev, [id]: next };
                });
              };
              return (
                <Card key={block.id} className="p-4">
                  <h2 className="bg-muted text-foreground px-3 py-2 rounded-md mb-3 font-semibold text-base">Treinamentos</h2>
                  <p className="text-xs text-muted-foreground mb-3">
                    Clique para alternar: <span className="text-green-600 font-medium">verde = possui</span> · <span className="text-red-600 font-medium">vermelho = não possui</span> · <span className="text-amber-600 font-medium">amarelo = não se aplica</span>
                  </p>
                  <div className="grid grid-cols-3 sm:grid-cols-4 md:grid-cols-5 gap-3">
                    {trainings.map(t => {
                      const status = trainingStatuses[t.id] || 0;
                      const bgClass = status === 1 ? 'bg-green-100 border-green-500 dark:bg-green-900/30 dark:border-green-600'
                        : status === 2 ? 'bg-red-100 border-red-500 dark:bg-red-900/30 dark:border-red-600'
                        : status === 3 ? 'bg-amber-100 border-amber-500 dark:bg-amber-900/30 dark:border-amber-600'
                        : 'bg-background border-input hover:border-muted-foreground/30';
                      const textClass = status === 1 ? 'text-green-800 dark:text-green-300'
                        : status === 2 ? 'text-red-800 dark:text-red-300'
                        : status === 3 ? 'text-amber-800 dark:text-amber-300'
                        : 'text-foreground';
                      return (
                        <button key={t.id} type="button" onClick={() => cycleTraining(t.id)}
                          className={`flex items-center justify-center p-3 rounded-xl border-2 transition-all min-h-[80px] ${bgClass}`}>
                          <span className={`text-sm text-center font-semibold leading-tight ${textClass}`}>{t.name}</span>
                        </button>
                      );
                    })}
                  </div>
                </Card>
              );
            }

            if (blockLower.includes('observaç') || blockLower.includes('observac')) {
              return (
                <Card key={block.id} className="p-4">
                  <h2 className="bg-muted text-foreground px-3 py-2 rounded-md mb-3 font-semibold text-base">{block.name}</h2>
                  <Textarea placeholder="Observações gerais..." value={observations} onChange={e => setObservations(e.target.value)} rows={3} />
                </Card>
              );
            }

            {/* Custom dynamic block */}
            const blockFields = allBlockFields.filter(f => f.blockId === block.id && f.visible !== false).sort((a, b) => a.order - b.order);
            return (
              <Card key={block.id} className="p-4">
                <h2 className="bg-muted text-foreground px-3 py-2 rounded-md mb-3 font-semibold text-base">{block.name}</h2>
                {block.description && <p className="text-xs text-muted-foreground mb-3">{block.description}</p>}
                {blockFields.length === 0 ? (
                  <p className="text-sm text-muted-foreground">Bloco sem campos configurados.</p>
                ) : (
                  <div className="space-y-3">
                    {blockFields.map(field => {
                      const fieldKey = `custom_${block.id}_${field.id}`;
                      const value = formData[fieldKey] || '';
                      const onChange = (val: string) => setFormData(prev => ({ ...prev, [fieldKey]: val }));

                      return (
                        <div key={field.id}>
                          <label className="text-base font-medium text-muted-foreground">
                            {field.label} {field.required && <span className="text-destructive">*</span>}
                          </label>
                          {field.description && <p className="text-xs text-muted-foreground">{field.description}</p>}

                          {field.type === 'text' && (
                            <Input value={value} onChange={e => onChange(e.target.value)} className="mt-1" placeholder={field.label} />
                          )}
                          {field.type === 'textarea' && (
                            <Textarea value={value} onChange={e => onChange(e.target.value)} className="mt-1" rows={3} placeholder={field.label} />
                          )}
                          {field.type === 'number' && (
                            <Input type="number" value={value} onChange={e => onChange(e.target.value)} className="mt-1" />
                          )}
                          {field.type === 'date' && (
                            <Input type="date" value={value} onChange={e => onChange(e.target.value)} className="mt-1" />
                          )}
                          {field.type === 'dropdown' && (
                            <select className="w-full mt-1 rounded-md border border-input bg-background px-3 py-2 text-sm" value={value} onChange={e => onChange(e.target.value)}>
                              <option value="">-- Selecione --</option>
                              {(field.options || []).map(opt => <option key={opt} value={opt}>{opt}</option>)}
                            </select>
                          )}
                          {field.type === 'radio' && (
                            <div className="mt-1 space-y-1">
                              {(field.options || []).map(opt => (
                                <label key={opt} className="flex items-center gap-2 cursor-pointer">
                                  <input type="radio" name={fieldKey} value={opt} checked={value === opt} onChange={() => onChange(opt)} className="accent-primary" />
                                  <span className="text-sm">{opt}</span>
                                </label>
                              ))}
                            </div>
                          )}
                          {field.type === 'checkbox' && (
                            <div className="mt-1 space-y-1">
                              {(field.options || []).map(opt => {
                                const selected = value ? value.split('|||') : [];
                                const isChecked = selected.includes(opt);
                                return (
                                  <label key={opt} className="flex items-center gap-2 cursor-pointer">
                                    <Checkbox
                                      checked={isChecked}
                                      onCheckedChange={() => {
                                        const newVal = isChecked ? selected.filter(s => s !== opt) : [...selected, opt];
                                        onChange(newVal.join('|||'));
                                      }}
                                    />
                                    <span className="text-sm">{opt}</span>
                                  </label>
                                );
                              })}
                            </div>
                          )}
                          {(field.type === 'image' || field.type === 'display_image') && (
                            <AttachmentAction attachKey={fieldKey} />
                          )}
                          {field.type === 'audio' && (
                            <SpeechInput value={value} onChange={onChange} placeholder={field.label} className="mt-1" />
                          )}
                          {field.type === 'signature' && (
                            <SignaturePad
                              value={value || ''}
                              onChange={(dataUrl) => onChange(dataUrl || '')}
                            />
                          )}
                          {field.type === 'user_select' && (
                            <Input value={value} onChange={e => onChange(e.target.value)} className="mt-1" placeholder="Nome do técnico..." />
                          )}
                        </div>
                      );
                    })}
                  </div>
                )}
              </Card>
            );
          })}

          {/* Employee photo capture - multiple photos */}
          <Card className="p-4">
            <h2 className="bg-muted text-foreground px-3 py-2 rounded-md mb-3 font-semibold text-base">
              Foto do Funcionário <span className="text-destructive">*</span>
            </h2>
            <input ref={employeePhotoRef} type="file" accept="image/*" capture="environment" className="hidden"
              onChange={async e => {
                const files = e.target.files;
                if (!files) return;
                const list = Array.from(files);
                e.target.value = '';
                for (const file of list) {
                  const dataUrl = await new Promise<string>((resolve, reject) => {
                    const r = new FileReader();
                    r.onload = () => resolve(r.result as string);
                    r.onerror = () => reject(r.error);
                    r.readAsDataURL(file);
                  });
                  const stampedDataUrl = await new Promise<string>((resolve) => {
                    const img = new Image();
                    img.onload = () => {
                      const canvas = document.createElement('canvas');
                      canvas.width = img.width;
                      canvas.height = img.height;
                      const ctx = canvas.getContext('2d')!;
                      ctx.drawImage(img, 0, 0);
                      const now = new Date();
                      const timestamp = now.toLocaleDateString('pt-BR') + ' ' + now.toLocaleTimeString('pt-BR');
                      const fontSize = Math.max(20, img.width * 0.04);
                      ctx.font = `bold ${fontSize}px sans-serif`;
                      ctx.fillStyle = 'rgba(0,0,0,0.6)';
                      const textWidth = ctx.measureText(timestamp).width;
                      ctx.fillRect(10, img.height - fontSize - 20, textWidth + 20, fontSize + 10);
                      ctx.fillStyle = '#FFFFFF';
                      ctx.fillText(timestamp, 20, img.height - 18);
                      resolve(canvas.toDataURL('image/jpeg', 0.85));
                    };
                    img.src = dataUrl;
                  });
                  const url = await uploadBase64(stampedDataUrl, 'employee-photos');
                  setEmployeePhotos(prev => [...prev, url]);
                }
              }}
            />
            <input ref={employeeGalleryRef} type="file" accept="image/*" multiple className="hidden"
              onChange={async e => {
                const files = e.target.files;
                if (!files) return;
                const list = Array.from(files);
                e.target.value = '';
                for (const file of list) {
                  const url = await safeUploadFile(file, 'employee-photos');
                  setEmployeePhotos(prev => [...prev, url]);
                }
              }}
            />
            {employeePhotos.length > 0 && (
              <div className="flex gap-2 flex-wrap mb-3">
                {employeePhotos.map((photo, i) => (
                  <div key={i} className="relative group">
                    <img src={photo} alt={`Foto ${i + 1}`} className="h-32 w-32 object-cover rounded-lg border border-border" />
                    <button type="button" className="absolute top-1 right-1 bg-destructive text-destructive-foreground rounded-full p-1 opacity-0 group-hover:opacity-100 transition-opacity"
                      onClick={() => setEmployeePhotos(prev => prev.filter((_, idx) => idx !== i))}>
                      <X className="h-3 w-3" />
                    </button>
                  </div>
                ))}
              </div>
            )}
            <div className="flex gap-2">
              <Button type="button" variant="outline" onClick={() => employeePhotoRef.current?.click()}>
                <Camera className="h-4 w-4 mr-2" /> Tirar Foto
              </Button>
              <Button type="button" variant="outline" onClick={() => employeeGalleryRef.current?.click()}>
                <ImagePlus className="h-4 w-4 mr-2" /> Galeria
              </Button>
            </div>
          </Card>

          <Button onClick={handleSave} className="w-full bg-green-600 hover:bg-green-700 text-white" size="lg">
            <Save className="h-4 w-4 mr-2" /> Salvar Checklist
          </Button>
        </div>
      )}
    </div>
  );
};

export default Checklist;
