import { useState } from 'react';
import { CrudList } from '@/components/CrudList';
import { useStore } from '@/hooks/useStore';
import {
  riskCategoriesStore, risksStore,
} from '@/lib/storage';
import type { Risk, RiskCategory } from '@/lib/storage';
import { RiskBadge } from '@/lib/riskColors';
import { AlertTriangle } from 'lucide-react';
import { SearchInput } from '@/components/SearchInput';
import { GenericExcelImport } from '@/components/GenericExcelImport';
import { RiskAssociations } from '@/components/RiskAssociations';
import { sortByNameOutrosLast } from '@/lib/sortRisks';

export default function Riscos() {
  const riskCategories = useStore(riskCategoriesStore);
  const risks = useStore(risksStore);
  const [search, setSearch] = useState('');

  // Categorias A-Z, mas "other" (Outros) sempre no fim
  const sortedCategories = [...riskCategories.items].sort((a, b) => {
    if (a.type === 'other' && b.type !== 'other') return 1;
    if (b.type === 'other' && a.type !== 'other') return -1;
    return a.name.localeCompare(b.name, 'pt-BR');
  });

  const categoryOptions = sortedCategories.map(c => ({ value: c.id, label: c.name }));

  const filteredRisks = risks.items.filter(r => {
    if (!search) return true;
    const q = search.toLowerCase();
    const cat = riskCategories.items.find(c => c.id === r.categoryId);
    return r.name.toLowerCase().includes(q) || (cat?.name || '').toLowerCase().includes(q);
  });

  // Riscos: ordenar por categoria (A-Z, Outros no fim) e dentro da categoria A-Z
  // com riscos "Outros..." sempre no fim (sortByNameOutrosLast)
  const sortedRisks = [...filteredRisks].sort((a, b) => {
    const catA = riskCategories.items.find(c => c.id === a.categoryId);
    const catB = riskCategories.items.find(c => c.id === b.categoryId);
    if (catA?.type === 'other' && catB?.type !== 'other') return 1;
    if (catB?.type === 'other' && catA?.type !== 'other') return -1;
    const catCmp = (catA?.name || '').localeCompare(catB?.name || '', 'pt-BR');
    if (catCmp !== 0) return catCmp;
    return sortByNameOutrosLast(a, b);
  });

  const handleRiskImport = async (rows: Record<string, string>[]) => {
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
      await risksStore.add({ name: riskName, categoryId: cat.id, source: '', exposureType: '', customFields: {} } as any);
      created++;
    }
    risks.refresh();
    return { created, skipped };
  };

  return (
    <div className="p-4 md:p-8 max-w-3xl mx-auto space-y-6">
      <div className="pb-3 border-b border-border/60">
        <p className="eyebrow mb-1 inline-flex items-center gap-1.5"><AlertTriangle className="h-3 w-3" /> Cadastros</p>
        <h1 className="heading-display text-3xl md:text-4xl text-foreground">Riscos</h1>
      </div>

      <SearchInput value={search} onChange={setSearch} placeholder="Buscar riscos..." />

      <CrudList<RiskCategory>
        title="Categorias de Risco"
        items={sortedCategories}
        fields={[
          { key: 'name', label: 'Nome da categoria', hidden: true },
          { key: 'type', label: 'Tipo', type: 'select', options: [
            { value: 'chemical', label: 'Químico' },
            { value: 'physical', label: 'Físico' },
            { value: 'biological', label: 'Biológico' },
            { value: 'ergonomic', label: 'Ergonômico' },
            { value: 'accident', label: 'Acidente' },
            { value: 'other', label: 'Outros' },
          ], hidden: true },
        ]}
        onAdd={riskCategories.add}
        onUpdate={riskCategories.update}
        onDelete={(id) => { riskCategories.remove(id); risks.items.filter(r => r.categoryId === id).forEach(r => risks.remove(r.id)); }}
        renderName={(item) => <RiskBadge type={item.type} label={item.name} />}
      />
      <hr className="border-border" />
      <CrudList<Risk>
        title="Riscos"
        items={sortedRisks}
        selectable
        fields={[
          { key: 'name', label: 'Nome do risco', placeholder: 'Ex: Acesso a espaços confinados' },
          {
            key: 'esoName',
            label: 'Nome no ESO',
            nested: 'customFields',
            placeholder: 'Como esse risco aparece no ESO (opcional)',
            helpText: 'Se preenchido, este é o nome que sai no PDF e na planilha.',
          },
          { key: 'categoryId', label: 'Categoria', type: 'select', options: categoryOptions, hidden: true },
        ]}
        onAdd={(data) => {
          const { name, categoryId, customFields = {}, ...rest } = data;
          risks.add({
            name,
            categoryId,
            customFields: { ...customFields },
            source: '',
            exposureType: '',
            ...rest,
          });
        }}
        onUpdate={(id, data) => {
          const existing = risks.items.find(r => r.id === id);
          const merged = data.customFields
            ? { ...data, customFields: { ...(existing?.customFields || {}), ...data.customFields } }
            : data;
          risks.update(id, merged);
        }}
        onDelete={(id) => {
          // M-N tables têm ON DELETE CASCADE, basta remover o risco
          risks.remove(id);
        }}
        renderExtra={(item) => {
          const cat = riskCategories.items.find(c => c.id === item.categoryId);
          const esoName = (item.customFields as any)?.esoName;
          return (
            <div className="mt-1">
              <div className="flex items-center gap-2 flex-wrap">
                {cat && <RiskBadge type={cat.type} label={cat.name} />}
                {esoName && (
                  <span className="inline-flex items-center gap-1 text-[10px] font-bold uppercase tracking-wider px-2 py-0.5 rounded-md bg-blue-100 text-blue-700 border border-blue-200">
                    ESO: {esoName}
                  </span>
                )}
              </div>
              <RiskAssociations riskId={item.id} />
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
