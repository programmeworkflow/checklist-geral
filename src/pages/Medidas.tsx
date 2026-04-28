import { useState, useMemo } from 'react';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { useStore } from '@/hooks/useStore';
import { safetyMeasuresStore, riskMeasuresStore, risksStore } from '@/lib/storage';
import type { SafetyMeasure } from '@/lib/storage';
import { Shield, Copy } from 'lucide-react';
import { Badge } from '@/components/ui/badge';
import { CrudList } from '@/components/CrudList';
import { SearchInput } from '@/components/SearchInput';
import { GenericExcelImport } from '@/components/GenericExcelImport';
import { toast } from 'sonner';

export default function Medidas() {
  const qc = useQueryClient();
  const measures = useStore(safetyMeasuresStore);
  const [search, setSearch] = useState('');
  const { data: allRiskMeasures = [] } = useQuery({ queryKey: ['risk_measures'], queryFn: () => riskMeasuresStore.getAll() });
  const { data: allRisks = [] } = useQuery({ queryKey: ['risks'], queryFn: () => risksStore.getAll() });

  const filteredMeasures = useMemo(() => {
    const sorted = [...measures.items].sort((a, b) => a.name.localeCompare(b.name, 'pt-BR'));
    if (!search) return sorted;
    return sorted.filter(m => m.name.toLowerCase().includes(search.toLowerCase()));
  }, [measures.items, search]);

  // Para cada medida, lista riscos vinculados (legacy + junction)
  const measureRiskNames = useMemo(() => {
    const map = new Map<string, string[]>();
    for (const m of measures.items) {
      const ids = new Set<string>();
      if (m.riskId) ids.add(m.riskId);
      allRiskMeasures.filter(rm => rm.measureId === m.id).forEach(rm => ids.add(rm.riskId));
      const names = [...ids].map(id => allRisks.find(r => r.id === id)?.name).filter((n): n is string => !!n);
      map.set(m.id, names);
    }
    return map;
  }, [measures.items, allRiskMeasures, allRisks]);

  const handleImport = async (rows: Record<string, string>[]) => {
    let created = 0;
    let skipped = 0;
    for (const row of rows) {
      const name = row['Nome da medida']?.trim();
      if (!name) { skipped++; continue; }
      if (measures.items.some(m => m.name.toLowerCase() === name.toLowerCase())) { skipped++; continue; }
      await safetyMeasuresStore.add({ name } as any);
      created++;
    }
    measures.refresh();
    return { created, skipped };
  };

  const handleDuplicate = async (item: SafetyMeasure) => {
    await safetyMeasuresStore.add({ name: `${item.name} (cópia)` } as any);
    qc.invalidateQueries({ queryKey: ['safety_measures'] });
    toast.success('Medida duplicada');
  };

  return (
    <div className="p-4 md:p-6 max-w-3xl mx-auto space-y-4">
      <h1 className="text-2xl font-bold text-foreground flex items-center gap-2">
        <Shield className="h-6 w-6" /> Medidas de Segurança
      </h1>
      <p className="text-sm text-muted-foreground">
        Cadastre as medidas de segurança. O vínculo com riscos é gerenciado na tela de <strong>Riscos</strong>.
      </p>

      <SearchInput value={search} onChange={setSearch} placeholder="Buscar medidas..." />

      <CrudList<SafetyMeasure>
        title="Medidas"
        items={filteredMeasures}
        selectable
        fields={[
          { key: 'name', label: 'Nome da medida' },
        ]}
        onAdd={(data) => measures.add(data as any)}
        onUpdate={measures.update}
        onDelete={measures.remove}
        renderExtra={(item) => {
          const names = measureRiskNames.get(item.id) || [];
          if (names.length === 0) return null;
          return (
            <div className="mt-2 flex flex-wrap gap-1">
              {names.slice(0, 3).map((n, i) => (
                <Badge key={i} variant="outline" className="text-[10px]">{n}</Badge>
              ))}
              {names.length > 3 && (
                <Badge variant="outline" className="text-[10px]">+{names.length - 3}</Badge>
              )}
            </div>
          );
        }}
        extraActions={(item) => (
          <button
            className="h-8 w-8 flex items-center justify-center rounded-lg text-muted-foreground hover:text-foreground hover:bg-muted transition-colors"
            onClick={(e) => { e.stopPropagation(); handleDuplicate(item); }}
            title="Duplicar medida"
          >
            <Copy className="h-3.5 w-3.5" />
          </button>
        )}
      />

      <hr className="border-border" />
      <GenericExcelImport
        title="Importar Medidas via Planilha"
        columns={[
          { header: 'Nome da medida', label: 'Nome da medida', required: true },
        ]}
        onImport={handleImport}
      />
    </div>
  );
}
