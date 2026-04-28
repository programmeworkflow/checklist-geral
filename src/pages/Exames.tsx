import { useState, useMemo } from 'react';
import { useStore } from '@/hooks/useStore';
import { examsStore } from '@/lib/storage';
import type { OccupationalExam } from '@/lib/storage';
import { Stethoscope } from 'lucide-react';
import { CrudList } from '@/components/CrudList';
import { SearchInput } from '@/components/SearchInput';
import { GenericExcelImport } from '@/components/GenericExcelImport';

export default function Exames() {
  const exams = useStore(examsStore);
  const [search, setSearch] = useState('');

  const filteredExams = useMemo(() => {
    const sorted = [...exams.items].sort((a, b) => a.name.localeCompare(b.name, 'pt-BR'));
    if (!search) return sorted;
    const q = search.toLowerCase();
    return sorted.filter(e => e.name.toLowerCase().includes(q) || ((e as any).esocialCode || '').toLowerCase().includes(q));
  }, [exams.items, search]);

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

  return (
    <div className="p-4 md:p-6 max-w-3xl mx-auto space-y-4">
      <h1 className="text-2xl font-bold text-foreground flex items-center gap-2">
        <Stethoscope className="h-6 w-6" /> Exames
      </h1>
      <p className="text-sm text-muted-foreground">
        Cadastre os exames ocupacionais. O vínculo com cada risco (e os tipos: admissional, demissional, periódico etc.) é configurado na tela de <strong>Riscos</strong>.
      </p>

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
