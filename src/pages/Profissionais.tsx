import { useState } from 'react';
import { CrudList } from '@/components/CrudList';
import { useStore } from '@/hooks/useStore';
import { professionalsStore } from '@/lib/storage';
import type { Professional } from '@/lib/storage';
import { UserCheck } from 'lucide-react';
import { SearchInput } from '@/components/SearchInput';

export default function Profissionais() {
  const professionals = useStore(professionalsStore);
  const [search, setSearch] = useState('');

  const filtered = professionals.items.filter(p => {
    if (!search) return true;
    const q = search.toLowerCase();
    return p.name.toLowerCase().includes(q) || p.formation.toLowerCase().includes(q) || p.registration.toLowerCase().includes(q);
  });

  return (
    <div className="p-4 md:p-6 max-w-3xl mx-auto space-y-4">
      <h1 className="text-2xl font-bold text-foreground flex items-center gap-2">
        <UserCheck className="h-6 w-6" /> Profissionais
      </h1>

      <SearchInput value={search} onChange={setSearch} placeholder="Buscar profissionais..." />

      <CrudList<Professional>
        title="Profissionais"
        items={filtered}
        selectable
        fields={[
          { key: 'name', label: 'Nome' },
          { key: 'formation', label: 'Formação' },
          { key: 'registration', label: 'Registro profissional' },
        ]}
        onAdd={professionals.add}
        onUpdate={professionals.update}
        onDelete={professionals.remove}
        renderExtra={(item) => (
          <div className="mt-0.5 space-y-0.5">
            {item.formation && <p className="text-xs text-muted-foreground">Formação: {item.formation}</p>}
            {item.registration && <p className="text-xs text-muted-foreground">Registro: {item.registration}</p>}
          </div>
        )}
      />
    </div>
  );
}
