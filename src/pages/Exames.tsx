import { useState } from 'react';
import { useQueryClient } from '@tanstack/react-query';
import { useStore } from '@/hooks/useStore';
import { examsStore, risksStore, riskCategoriesStore } from '@/lib/storage';
import type { OccupationalExam } from '@/lib/storage';
import { Stethoscope, Plus, Pencil, Trash2, Check, X, Copy } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Card } from '@/components/ui/card';
import { Checkbox } from '@/components/ui/checkbox';
import { Badge } from '@/components/ui/badge';
import { getRiskColor } from '@/lib/riskColors';
import { toast } from 'sonner';
import { SearchInput } from '@/components/SearchInput';
import { GenericExcelImport } from '@/components/GenericExcelImport';

const EXAM_TYPES = [
  { key: 'admissional' as const, label: 'Admissional' },
  { key: 'demissional' as const, label: 'Demissional' },
  { key: 'periodico' as const, label: 'Periódico' },
  { key: 'retornoTrabalho' as const, label: 'Retorno' },
  { key: 'mudanca' as const, label: 'Mudança' },
];

export default function Exames() {
  const qc = useQueryClient();
  const exams = useStore(examsStore);
  const risks = useStore(risksStore);
  const categories = useStore(riskCategoriesStore);
  const [adding, setAdding] = useState(false);
  const [editing, setEditing] = useState<string | null>(null);
  const [name, setName] = useState('');
  const [esocialCode, setEsocialCode] = useState('');
  const [selectedRiskIds, setSelectedRiskIds] = useState<string[]>([]);
  const [search, setSearch] = useState('');
  const [types, setTypes] = useState({ admissional: false, demissional: false, periodico: false, retornoTrabalho: false, mudanca: false });
  const [periodicidade, setPeriodicidade] = useState<6 | 12 | 24>(12);

  const resetForm = () => {
    setAdding(false); setEditing(null); setName(''); setEsocialCode('');
    setSelectedRiskIds([]);
    setTypes({ admissional: false, demissional: false, periodico: false, retornoTrabalho: false, mudanca: false });
    setPeriodicidade(12);
  };

  const startAdd = () => { resetForm(); setAdding(true); };

  const startEdit = (item: OccupationalExam) => {
    const allWithName = exams.items.filter(e => e.name === item.name);
    setName(item.name);
    setEsocialCode((item as any).esocialCode || '');
    setSelectedRiskIds(allWithName.map(e => e.riskId));
    setTypes({
      admissional: item.admissional,
      demissional: item.demissional,
      periodico: item.periodico,
      retornoTrabalho: item.retornoTrabalho,
      mudanca: item.mudanca,
    });
    setPeriodicidade(item.periodicidade || 12);
    setEditing(item.id);
    setAdding(false);
  };

  const handleDuplicate = async (item: OccupationalExam) => {
    await examsStore.add({ name: item.name + ' (cópia)', riskId: item.riskId, admissional: item.admissional, demissional: item.demissional, periodico: item.periodico, retornoTrabalho: item.retornoTrabalho, mudanca: item.mudanca } as any);
    qc.invalidateQueries({ queryKey: ['occupational_exams'] });
    toast.success('Exame duplicado');
  };

  const toggleRisk = (riskId: string) => {
    setSelectedRiskIds(prev =>
      prev.includes(riskId) ? prev.filter(id => id !== riskId) : [...prev, riskId]
    );
  };

  const save = async () => {
    if (!name.trim()) return;
    if (selectedRiskIds.length === 0) {
      toast.error('Selecione ao menos um risco');
      return;
    }

    if (editing) {
      const editItem = exams.items.find(e => e.id === editing);
      if (editItem) {
        const oldEntries = exams.items.filter(e => e.name === editItem.name);
        for (const e of oldEntries) {
          await examsStore.remove(e.id);
        }
      }
    }

    for (const riskId of selectedRiskIds) {
      await examsStore.add({ name: name.trim(), riskId, esocialCode: esocialCode.trim(), ...types, periodicidade: types.periodico ? periodicidade : undefined } as any);
    }

    qc.invalidateQueries({ queryKey: ['occupational_exams'] });
    resetForm();
    toast.success('Exame salvo');
  };

  const risksByCategory = categories.items.map(cat => ({
    cat,
    risks: risks.items.filter(r => r.categoryId === cat.id),
  })).filter(g => g.risks.length > 0);

  // Deduplicate exams by name
  const uniqueExams = Array.from(
    exams.items.reduce((map, e) => {
      if (!map.has(e.name)) map.set(e.name, { ...e, riskIds: [e.riskId] });
      else map.get(e.name)!.riskIds.push(e.riskId);
      return map;
    }, new Map<string, OccupationalExam & { riskIds: string[] }>()).values()
  );

  const filteredExams = uniqueExams.filter(e => {
    if (!search) return true;
    const q = search.toLowerCase();
    return e.name.toLowerCase().includes(q) || ((e as any).esocialCode || '').toLowerCase().includes(q);
  });

  const handleExamImport = async (rows: Record<string, string>[]) => {
    let created = 0;
    let skipped = 0;
    // Get all risk IDs to link exams to (link to first risk by default)
    const allRisks = risks.items;
    for (const row of rows) {
      const examName = row['Nome do exame'];
      const code = row['Código do eSocial'] || '';
      const exists = exams.items.some(e => e.name.toLowerCase() === examName.toLowerCase());
      if (exists) { skipped++; continue; }
      // Add exam linked to first available risk (user can edit later)
      if (allRisks.length > 0) {
        await examsStore.add({ name: examName, esocialCode: code, riskId: allRisks[0].id, admissional: false, demissional: false, periodico: true, retornoTrabalho: false, mudanca: false } as any);
        created++;
      }
    }
    qc.invalidateQueries({ queryKey: ['occupational_exams'] });
    return { created, skipped };
  };

  return (
    <div className="p-4 md:p-6 max-w-3xl mx-auto space-y-4">
      <h1 className="text-2xl font-bold text-foreground flex items-center gap-2">
        <Stethoscope className="h-6 w-6" /> Exames
      </h1>

      <SearchInput value={search} onChange={setSearch} placeholder="Buscar exames..." />

      <div className="flex justify-end">
        <Button onClick={startAdd} className="min-h-[44px] px-4">
          <Plus className="h-4 w-4 mr-1" /> Novo Exame
        </Button>
      </div>

      {(adding || editing) && (
        <Card className="p-4 space-y-4 border-primary/30">
          <div>
            <label className="text-sm font-medium text-muted-foreground block mb-1.5">Nome do exame</label>
            <Input value={name} onChange={e => setName(e.target.value)} placeholder="Nome do exame" className="min-h-[44px]" />
          </div>
          <div>
            <label className="text-sm font-medium text-muted-foreground block mb-1.5">Código eSocial</label>
            <Input value={esocialCode} onChange={e => setEsocialCode(e.target.value.replace(/\D/g, ''))} placeholder="Código eSocial (somente números)" inputMode="numeric" className="min-h-[44px]" />
          </div>
          <div>
            <label className="text-sm font-medium text-muted-foreground block mb-2">Tipos de exame:</label>
            <div className="flex flex-wrap gap-3">
              {EXAM_TYPES.map(t => (
                <label key={t.key} className="flex items-center gap-1.5 cursor-pointer">
                  <Checkbox checked={types[t.key]} onCheckedChange={(v) => setTypes({ ...types, [t.key]: !!v })} />
                  <span className="text-sm text-foreground">{t.label}</span>
                </label>
              ))}
            </div>
            {types.periodico && (
              <div className="mt-3">
                <label className="text-sm font-medium text-muted-foreground block mb-1.5">Periodicidade:</label>
                <div className="flex gap-3">
                  {([6, 12, 24] as const).map(m => (
                    <label key={m} className="flex items-center gap-1.5 cursor-pointer">
                      <input type="radio" name="periodicidade" checked={periodicidade === m} onChange={() => setPeriodicidade(m)} className="accent-primary" />
                      <span className="text-sm text-foreground">{m} meses</span>
                    </label>
                  ))}
                </div>
              </div>
            )}
          </div>
          <div>
            <label className="text-sm font-medium text-muted-foreground block mb-2">Vincular aos riscos:</label>
            <div className="space-y-3 max-h-64 overflow-y-auto">
              {risksByCategory.map(({ cat, risks: catRisks }) => {
                const colors = getRiskColor(cat.type);
                return (
                  <div key={cat.id}>
                    <p className="text-xs font-semibold mb-1">
                      <span className={`inline-block w-3 h-3 rounded-full ${colors.bg} mr-1.5 align-middle`} />
                      {cat.name}
                    </p>
                    <div className="space-y-1 ml-4">
                      {catRisks.map(risk => (
                        <label key={risk.id} className="flex items-center gap-2 cursor-pointer py-0.5">
                          <Checkbox
                            checked={selectedRiskIds.includes(risk.id)}
                            onCheckedChange={() => toggleRisk(risk.id)}
                          />
                          <span className="text-sm text-foreground">{risk.name}</span>
                        </label>
                      ))}
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
          <div className="flex flex-col sm:flex-row gap-3 pt-2">
            <Button onClick={save} className="w-full sm:w-auto min-h-[44px]">
              <Check className="h-4 w-4 mr-1" /> Salvar
            </Button>
            <Button variant="outline" onClick={resetForm} className="w-full sm:w-auto min-h-[44px]">
              <X className="h-4 w-4 mr-1" /> Cancelar
            </Button>
          </div>
        </Card>
      )}

      <div className="space-y-3">
        {filteredExams.length === 0 && (
          <p className="text-sm text-muted-foreground py-6 text-center">{search ? 'Nenhum exame encontrado.' : 'Nenhum exame cadastrado.'}</p>
        )}
        {filteredExams.map(item => (
          <Card key={item.id} className="p-4">
            <div className="flex items-center justify-between gap-2">
              <div className="flex-1 min-w-0">
                <p className="font-medium text-foreground">{item.name}</p>
                {(item as any).esocialCode && (
                  <p className="text-xs text-muted-foreground">eSocial: {(item as any).esocialCode}</p>
                )}
                <div className="flex flex-wrap gap-1 mt-1">
                  {EXAM_TYPES.filter(t => item[t.key]).map(t => (
                    <Badge key={t.key} variant="secondary" className="text-[10px]">{t.label}</Badge>
                  ))}
                </div>
                <div className="flex flex-wrap gap-1 mt-1">
                  {item.riskIds.map(rId => {
                    const risk = risks.items.find(r => r.id === rId);
                    const cat = risk ? categories.items.find(c => c.id === risk.categoryId) : null;
                    const colors = cat ? getRiskColor(cat.type) : null;
                    return risk ? (
                      <Badge key={rId} variant="outline" className="text-xs flex items-center gap-1">
                        {colors && <span className={`inline-block w-2 h-2 rounded-full ${colors.bg}`} />}
                        {risk.name}
                      </Badge>
                    ) : null;
                  })}
                </div>
              </div>
              <div className="flex items-center gap-1 shrink-0">
                <Button size="icon" variant="ghost" className="h-9 w-9" onClick={() => handleDuplicate(item)}>
                  <Copy className="h-4 w-4" />
                </Button>
                <Button size="icon" variant="ghost" className="h-9 w-9" onClick={() => startEdit(item)}>
                  <Pencil className="h-4 w-4" />
                </Button>
                <Button size="icon" variant="ghost" className="h-9 w-9" onClick={async () => {
                  for (const e of exams.items.filter(e => e.name === item.name)) {
                    await examsStore.remove(e.id);
                  }
                  qc.invalidateQueries({ queryKey: ['occupational_exams'] });
                  toast.success('Exame excluído');
                }}>
                  <Trash2 className="h-4 w-4 text-destructive" />
                </Button>
              </div>
            </div>
          </Card>
        ))}
      </div>

      <hr className="border-border" />
      <GenericExcelImport
        title="Importar Exames via Planilha"
        columns={[
          { header: 'Nome do exame', label: 'Nome do exame', required: true },
          { header: 'Código do eSocial', label: 'Código do eSocial' },
        ]}
        onImport={handleExamImport}
      />
    </div>
  );
}
