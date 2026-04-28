import { useMemo } from 'react';
import { CrudList } from '@/components/CrudList';
import { useStore } from '@/hooks/useStore';
import { functionsStore, sectorsStore, companiesStore } from '@/lib/storage';
import type { JobFunction } from '@/lib/storage';
import { Users } from 'lucide-react';

export default function Cargos() {
  const functions = useStore(functionsStore);
  const sectors = useStore(sectorsStore);
  const companies = useStore(companiesStore);

  const sectorById = useMemo(() => {
    const m = new Map<string, { name: string; companyName: string }>();
    sectors.items.forEach(s => {
      const co = companies.items.find(c => c.id === s.companyId);
      m.set(s.id, { name: s.name, companyName: co?.name || '?' });
    });
    return m;
  }, [sectors.items, companies.items]);

  const sectorOptions = useMemo(() => sectors.items
    .map(s => {
      const co = companies.items.find(c => c.id === s.companyId);
      return { value: s.id, label: `${s.name} (${co?.name || '?'})` };
    })
    .sort((a, b) => a.label.localeCompare(b.label, 'pt-BR'))
  , [sectors.items, companies.items]);

  // Lista plana ordenada por NOME DO SETOR (A-Z) e dentro do setor pelo nome do cargo
  const sortedFunctions = useMemo(() => [...functions.items].sort((a, b) => {
    const sa = sectorById.get(a.sectorId)?.name || '';
    const sb = sectorById.get(b.sectorId)?.name || '';
    const cmp = sa.localeCompare(sb, 'pt-BR');
    if (cmp !== 0) return cmp;
    return a.name.localeCompare(b.name, 'pt-BR');
  }), [functions.items, sectorById]);

  return (
    <div className="p-4 md:p-8 max-w-3xl mx-auto space-y-6">
      <div className="pb-3 border-b border-border/60">
        <p className="eyebrow mb-1 inline-flex items-center gap-1.5"><Users className="h-3 w-3" /> Cadastros</p>
        <h1 className="heading-display text-3xl md:text-4xl text-foreground">Cargos</h1>
      </div>
      <CrudList<JobFunction>
        title="Cargos"
        items={sortedFunctions}
        selectable
        fields={[
          { key: 'name', label: 'Nome do cargo', hidden: true },
          { key: 'sectorId', label: 'Setor', type: 'select', options: sectorOptions, hidden: true },
        ]}
        onAdd={functions.add}
        onUpdate={functions.update}
        onDelete={functions.remove}
        renderName={(item) => {
          const s = sectorById.get(item.sectorId);
          return (
            <p className="font-semibold text-foreground">
              {item.name}
              {s && <span className="text-muted-foreground font-normal"> ({s.name})</span>}
            </p>
          );
        }}
      />
    </div>
  );
}
