import { CrudList } from '@/components/CrudList';
import { useStore } from '@/hooks/useStore';
import { trainingsStore } from '@/lib/storage';
import { GraduationCap } from 'lucide-react';

export default function Treinamentos() {
  const trainings = useStore(trainingsStore);

  return (
    <div className="p-4 md:p-6 max-w-3xl mx-auto space-y-4">
      <h1 className="text-2xl font-bold text-foreground flex items-center gap-2">
        <GraduationCap className="h-6 w-6" /> Treinamentos
      </h1>
      <CrudList
        title="Treinamentos"
        items={trainings.items}
        selectable
        fields={[{ key: 'name', label: 'Nome do treinamento' }, { key: 'description', label: 'Descrição' }]}
        onAdd={trainings.add}
        onUpdate={trainings.update}
        onDelete={trainings.remove}
      />
    </div>
  );
}
