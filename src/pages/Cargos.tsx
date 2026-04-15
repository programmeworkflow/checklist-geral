import { CrudList } from '@/components/CrudList';
import { useStore } from '@/hooks/useStore';
import { functionsStore, sectorsStore, companiesStore } from '@/lib/storage';
import type { JobFunction } from '@/lib/storage';
import { SpeechInput } from '@/components/SpeechInput';
import { Users } from 'lucide-react';

export default function Cargos() {
  const functions = useStore(functionsStore);
  const sectors = useStore(sectorsStore);
  const companies = useStore(companiesStore);

  const sectorOptions = sectors.items.map(s => ({
    value: s.id,
    label: `${s.name} (${companies.items.find(c => c.id === s.companyId)?.name || '?'})`,
  }));

  return (
    <div className="p-4 md:p-6 max-w-3xl mx-auto space-y-4">
      <h1 className="text-2xl font-bold text-foreground flex items-center gap-2">
        <Users className="h-6 w-6" /> Cargos
      </h1>
      <CrudList<JobFunction>
        title="Funções / Cargos"
        items={functions.items}
        fields={[
          { key: 'name', label: 'Nome da função' },
          { key: 'sectorId', label: 'Setor', type: 'select', options: sectorOptions },
        ]}
        onAdd={functions.add}
        onUpdate={functions.update}
        onDelete={functions.remove}
        renderExtra={(item) => (
          <div className="mt-2 space-y-2">
            <div>
              <p className="text-xs text-muted-foreground mb-1">📝 Descrição do cargo</p>
              <SpeechInput
                value={item.description || ''}
                onChange={(val) => { functions.update(item.id, { description: val } as any); functions.refresh(); }}
                placeholder="Descreva as atribuições do cargo..."
                multiline
                rows={3}
              />
            </div>
          </div>
        )}
      />
    </div>
  );
}
