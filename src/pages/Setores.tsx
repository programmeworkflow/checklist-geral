import { CrudList } from '@/components/CrudList';
import { useStore } from '@/hooks/useStore';
import { sectorsStore, companiesStore, functionsStore } from '@/lib/storage';
import type { Sector } from '@/lib/storage';
import { MapPin } from 'lucide-react';

export default function Setores() {
  const sectors = useStore(sectorsStore);
  const companies = useStore(companiesStore);
  const functions = useStore(functionsStore);

  const companyOptions = companies.items.map(c => ({ value: c.id, label: c.name }));

  return (
    <div className="p-4 md:p-6 max-w-3xl mx-auto space-y-4">
      <h1 className="text-2xl font-bold text-foreground flex items-center gap-2">
        <MapPin className="h-6 w-6" /> Setores (GSE)
      </h1>
      <CrudList<Sector>
        title="GSE / Setores"
        items={sectors.items}
        fields={[
          { key: 'name', label: 'Nome do setor' },
          { key: 'companyId', label: 'Empresa', type: 'select', options: companyOptions },
        ]}
        onAdd={sectors.add}
        onUpdate={sectors.update}
        onDelete={(id) => {
          sectors.remove(id);
          functions.items.filter(f => f.sectorId === id).forEach(f => functions.remove(f.id));
        }}
      />
    </div>
  );
}
