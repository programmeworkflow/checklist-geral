import { useState } from 'react';
import { CrudList } from '@/components/CrudList';
import { useStore } from '@/hooks/useStore';
import {
  riskCategoriesStore, risksStore, examsStore, safetyMeasuresStore,
} from '@/lib/storage';
import type { Risk, RiskCategory } from '@/lib/storage';
import { RiskBadge } from '@/lib/riskColors';
import { Badge } from '@/components/ui/badge';
import { Stethoscope, Shield, AlertTriangle } from 'lucide-react';
import { SearchInput } from '@/components/SearchInput';
import { GenericExcelImport } from '@/components/GenericExcelImport';

export default function Riscos() {
  const riskCategories = useStore(riskCategoriesStore);
  const risks = useStore(risksStore);
  const exams = useStore(examsStore);
  const safetyMeasures = useStore(safetyMeasuresStore);
  const [search, setSearch] = useState('');

  const categoryOptions = riskCategories.items.map(c => ({ value: c.id, label: c.name }));

  const makeReorder = <T extends { id: string }>(store: { setAll: (items: T[]) => void }, refresh: () => void) => {
    return (reordered: T[]) => { store.setAll(reordered); refresh(); };
  };

  const filteredRisks = risks.items.filter(r => {
    if (!search) return true;
    const q = search.toLowerCase();
    const cat = riskCategories.items.find(c => c.id === r.categoryId);
    return r.name.toLowerCase().includes(q) || (cat?.name || '').toLowerCase().includes(q);
  });

  const handleRiskImport = (rows: Record<string, string>[]) => {
    let created = 0;
    let skipped = 0;
    for (const row of rows) {
      const catName = row['Categoria do risco'];
      const riskName = row['Nome do risco'];
      // Find category by name (case-insensitive)
      const cat = riskCategories.items.find(c => c.name.toLowerCase() === catName.toLowerCase());
      if (!cat) { skipped++; continue; }
      // Check duplicate
      const exists = risks.items.some(r => r.categoryId === cat.id && r.name.toLowerCase() === riskName.toLowerCase());
      if (exists) { skipped++; continue; }
      risksStore.add({ name: riskName, categoryId: cat.id, source: '', exposureType: '', customFields: {} } as any);
      created++;
    }
    risks.refresh();
    return { created, skipped };
  };

  return (
    <div className="p-4 md:p-6 max-w-3xl mx-auto space-y-6">
      <h1 className="text-2xl font-bold text-foreground flex items-center gap-2">
        <AlertTriangle className="h-6 w-6" /> Riscos
      </h1>

      <SearchInput value={search} onChange={setSearch} placeholder="Buscar riscos..." />

      <CrudList<RiskCategory>
        title="Categorias de Risco"
        items={riskCategories.items}
        fields={[
          { key: 'name', label: 'Nome da categoria', hidden: true },
          { key: 'type', label: 'Tipo', type: 'select', options: [
            { value: 'chemical', label: 'Químico' },
            { value: 'physical', label: 'Físico' },
            { value: 'biological', label: 'Biológico' },
            { value: 'ergonomic', label: 'Ergonômico' },
            { value: 'accident', label: 'Acidente' },
          ], hidden: true },
        ]}
        onAdd={riskCategories.add}
        onUpdate={riskCategories.update}
        onDelete={(id) => { riskCategories.remove(id); risks.items.filter(r => r.categoryId === id).forEach(r => risks.remove(r.id)); }}
        onReorder={makeReorder(riskCategoriesStore, riskCategories.refresh)}
        renderName={(item) => <RiskBadge type={item.type} label={item.name} />}
      />
      <hr className="border-border" />
      <CrudList<Risk>
        title="Riscos"
        items={filteredRisks}
        fields={[
          { key: 'name', label: 'Nome do risco' },
          { key: 'categoryId', label: 'Categoria', type: 'select', options: categoryOptions, hidden: true },
        ]}
        onAdd={(data) => {
          risks.add({ ...data, customFields: {}, source: '', exposureType: '' });
        }}
        onUpdate={risks.update}
        onDelete={(id) => {
          risks.remove(id);
          exams.items.filter(e => e.riskId === id).forEach(e => exams.remove(e.id));
          safetyMeasures.items.filter(m => m.riskId === id).forEach(m => safetyMeasures.remove(m.id));
        }}
        onReorder={makeReorder(risksStore, risks.refresh)}
        renderExtra={(item) => {
          const cat = riskCategories.items.find(c => c.id === item.categoryId);
          const riskExams = exams.items.filter(e => e.riskId === item.id);
          const riskMeasures = safetyMeasures.items.filter(m => m.riskId === item.id);
          return (
            <div className="mt-1 space-y-1">
              {cat && <RiskBadge type={cat.type} label={cat.name} />}
              {riskExams.length > 0 && (
                <div className="flex flex-wrap gap-1 mt-1">
                  <Stethoscope className="h-3.5 w-3.5 text-muted-foreground" />
                  {riskExams.map(ex => <Badge key={ex.id} variant="outline" className="text-xs">{ex.name}</Badge>)}
                </div>
              )}
              {riskMeasures.length > 0 && (
                <div className="flex flex-wrap gap-1 mt-1">
                  <Shield className="h-3.5 w-3.5 text-muted-foreground" />
                  {riskMeasures.map(m => <Badge key={m.id} variant="outline" className="text-xs">{m.name}</Badge>)}
                </div>
              )}
            </div>
          );
        }}
      />

      <hr className="border-border" />
      <GenericExcelImport
        title="Importar Riscos via Planilha"
        columns={[
          { header: 'Categoria do risco', label: 'Categoria do risco', required: true },
          { header: 'Nome do risco', label: 'Nome do risco', required: true },
        ]}
        onImport={handleRiskImport}
      />
    </div>
  );
}
