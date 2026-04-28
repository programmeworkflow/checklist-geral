import { useState, useMemo } from 'react';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { useStore } from '@/hooks/useStore';
import { examsStore, riskExamsStore, risksStore } from '@/lib/storage';
import type { OccupationalExam } from '@/lib/storage';
import { Stethoscope, Copy } from 'lucide-react';
import { Badge } from '@/components/ui/badge';
import { CrudList } from '@/components/CrudList';
import { SearchInput } from '@/components/SearchInput';
import { GenericExcelImport } from '@/components/GenericExcelImport';
import { toast } from 'sonner';

export default function Exames() {
  const qc = useQueryClient();
  const exams = useStore(examsStore);
  const [search, setSearch] = useState('');
  const { data: allRiskExams = [] } = useQuery({ queryKey: ['risk_exams'], queryFn: () => riskExamsStore.getAll() });
  const { data: allRisks = [] } = useQuery({ queryKey: ['risks'], queryFn: () => risksStore.getAll() });

  const filteredExams = useMemo(() => {
    const sorted = [...exams.items].sort((a, b) => a.name.localeCompare(b.name, 'pt-BR'));
    if (!search) return sorted;
    const q = search.toLowerCase();
    return sorted.filter(e => e.name.toLowerCase().includes(q) || ((e as any).esocialCode || '').toLowerCase().includes(q));
  }, [exams.items, search]);

  // Agregação: para cada exame, junta os flags de TODAS as risk_exams + flags antigos no próprio exame
  const examMeta = useMemo(() => {
    const map = new Map<string, {
      types: { admiss: boolean; dem: boolean; peri: boolean; ret: boolean; mud: boolean };
      riskNames: string[];
    }>();
    for (const e of exams.items) {
      const links = allRiskExams.filter(re => re.examId === e.id);
      const types = {
        admiss: e.admissional || links.some(l => l.admissional),
        dem: e.demissional || links.some(l => l.demissional),
        peri: e.periodico || links.some(l => l.periodico),
        ret: e.retornoTrabalho || links.some(l => l.retornoTrabalho),
        mud: e.mudanca || links.some(l => l.mudanca),
      };
      const riskIds = new Set<string>();
      if (e.riskId) riskIds.add(e.riskId);
      links.forEach(l => riskIds.add(l.riskId));
      const riskNames = [...riskIds].map(id => allRisks.find(r => r.id === id)?.name).filter((n): n is string => !!n);
      map.set(e.id, { types, riskNames });
    }
    return map;
  }, [exams.items, allRiskExams, allRisks]);

  const handleImport = async (rows: Record<string, string>[]) => {
    let created = 0;
    let skipped = 0;
    for (const row of rows) {
      const name = row['Nome do exame']?.trim();
      const code = row['Código do eSocial']?.trim() || '';
      if (!name) { skipped++; continue; }
      if (exams.items.some(e => e.name.toLowerCase() === name.toLowerCase())) { skipped++; continue; }
      await examsStore.add({ name, esocialCode: code, admissional: false, demissional: false, periodico: false, retornoTrabalho: false, mudanca: false } as any);
      created++;
    }
    exams.refresh();
    return { created, skipped };
  };

  const handleDuplicate = async (item: OccupationalExam) => {
    await examsStore.add({
      name: `${item.name} (cópia)`,
      esocialCode: (item as any).esocialCode || '',
      admissional: false, demissional: false, periodico: false,
      retornoTrabalho: false, mudanca: false,
    } as any);
    qc.invalidateQueries({ queryKey: ['occupational_exams'] });
    toast.success('Exame duplicado');
  };

  const TYPE_LABELS = [
    { key: 'admiss' as const, label: 'Admiss.' },
    { key: 'dem' as const, label: 'Demiss.' },
    { key: 'peri' as const, label: 'Period.' },
    { key: 'ret' as const, label: 'Retorno' },
    { key: 'mud' as const, label: 'Mudança' },
  ];

  return (
    <div className="p-4 md:p-8 max-w-3xl mx-auto space-y-6">
      <div className="pb-3 border-b border-border/60">
        <p className="eyebrow mb-1 inline-flex items-center gap-1.5"><Stethoscope className="h-3 w-3" /> Cadastros</p>
        <h1 className="heading-display text-3xl md:text-4xl text-foreground">Exames</h1>
        <p className="text-sm text-muted-foreground mt-2 max-w-md">
          Cadastre os exames ocupacionais. O vínculo com cada risco e os tipos (admissional, demissional, periódico) é configurado em <strong className="text-foreground">Riscos</strong>.
        </p>
      </div>

      <SearchInput value={search} onChange={setSearch} placeholder="Buscar exames..." />

      <CrudList<OccupationalExam>
        title="Exames"
        items={filteredExams}
        selectable
        fields={[
          { key: 'name', label: 'Nome do exame' },
          { key: 'esocialCode', label: 'Código eSocial' },
        ]}
        onAdd={(data) => exams.add({
          ...data,
          admissional: false, demissional: false, periodico: false,
          retornoTrabalho: false, mudanca: false,
        } as any)}
        onUpdate={exams.update}
        onDelete={exams.remove}
        renderExtra={(item) => {
          const meta = examMeta.get(item.id);
          if (!meta) return null;
          const activeTypes = TYPE_LABELS.filter(t => meta.types[t.key]);
          return (
            <div className="mt-2 space-y-1.5">
              {activeTypes.length > 0 && (
                <div className="flex flex-wrap gap-1">
                  {activeTypes.map(t => (
                    <Badge key={t.key} variant="secondary" className="text-[10px] px-2 py-0">{t.label}</Badge>
                  ))}
                </div>
              )}
              {meta.riskNames.length > 0 && (
                <div className="flex flex-wrap gap-1">
                  {meta.riskNames.slice(0, 3).map((n, i) => (
                    <Badge key={i} variant="outline" className="text-[10px]">{n}</Badge>
                  ))}
                  {meta.riskNames.length > 3 && (
                    <Badge variant="outline" className="text-[10px]">+{meta.riskNames.length - 3}</Badge>
                  )}
                </div>
              )}
            </div>
          );
        }}
        extraActions={(item) => (
          <button
            className="h-8 w-8 flex items-center justify-center rounded-lg text-muted-foreground hover:text-foreground hover:bg-muted transition-colors"
            onClick={(e) => { e.stopPropagation(); handleDuplicate(item); }}
            title="Duplicar exame"
          >
            <Copy className="h-3.5 w-3.5" />
          </button>
        )}
      />

      <hr className="border-border" />
      <GenericExcelImport
        title="Importar Exames via Planilha"
        columns={[
          { header: 'Nome do exame', label: 'Nome do exame', required: true },
          { header: 'Código do eSocial', label: 'Código do eSocial' },
        ]}
        onImport={handleImport}
      />
    </div>
  );
}
