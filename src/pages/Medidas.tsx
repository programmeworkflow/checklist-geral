import { useState, useMemo } from 'react';
import { useStore } from '@/hooks/useStore';
import { safetyMeasuresStore } from '@/lib/storage';
import type { SafetyMeasure } from '@/lib/storage';
import { Shield } from 'lucide-react';
import { CrudList } from '@/components/CrudList';
import { SearchInput } from '@/components/SearchInput';
import { GenericExcelImport } from '@/components/GenericExcelImport';

export default function Medidas() {
  const measures = useStore(safetyMeasuresStore);
  const [search, setSearch] = useState('');

  const filteredMeasures = useMemo(() => {
    const sorted = [...measures.items].sort((a, b) => a.name.localeCompare(b.name, 'pt-BR'));
    if (!search) return sorted;
    return sorted.filter(m => m.name.toLowerCase().includes(search.toLowerCase()));
  }, [measures.items, search]);

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
