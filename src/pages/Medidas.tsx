import { useState, useCallback } from 'react';
import { useStore } from '@/hooks/useStore';
import { safetyMeasuresStore, risksStore, riskCategoriesStore } from '@/lib/storage';
import type { SafetyMeasure } from '@/lib/storage';
import { Shield, Plus, Pencil, Trash2, Check, X, Copy } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Card } from '@/components/ui/card';
import { Checkbox } from '@/components/ui/checkbox';
import { Badge } from '@/components/ui/badge';
import { getRiskColor } from '@/lib/riskColors';
import { toast } from 'sonner';
import { SearchInput } from '@/components/SearchInput';
import { GenericExcelImport } from '@/components/GenericExcelImport';

export default function Medidas() {
  const measures = useStore(safetyMeasuresStore);
  const risks = useStore(risksStore);
  const categories = useStore(riskCategoriesStore);
  const [adding, setAdding] = useState(false);
  const [editing, setEditing] = useState<string | null>(null);
  const [name, setName] = useState('');
  const [selectedRiskIds, setSelectedRiskIds] = useState<string[]>([]);
  const [search, setSearch] = useState('');

  const resetForm = () => { setAdding(false); setEditing(null); setName(''); setSelectedRiskIds([]); };

  const handleMeasureImport = useCallback((rows: Record<string, string>[]) => {
    let created = 0;
    let skipped = 0;
    rows.forEach(row => {
      const measureName = row['Nome da medida']?.trim();
      const riskName = row['Risco vinculado']?.trim();
      if (!measureName || !riskName) { skipped++; return; }
      const risk = risks.items.find(r => r.name.toLowerCase() === riskName.toLowerCase());
      if (!risk) { skipped++; return; }
      const exists = measures.items.some(m => m.name.toLowerCase() === measureName.toLowerCase() && m.riskId === risk.id);
      if (exists) { skipped++; return; }
      safetyMeasuresStore.add({ name: measureName, riskId: risk.id } as any);
      created++;
    });
    if (created > 0) measures.refresh();
    return { created, skipped };
  }, [risks.items, measures]);

  const startAdd = () => { resetForm(); setAdding(true); };

  const startEdit = (item: SafetyMeasure) => {
    // Find all measures with the same name to pre-select their risks
    const allWithName = measures.items.filter(m => m.name === item.name);
    setName(item.name);
    setSelectedRiskIds(allWithName.map(m => m.riskId));
    setEditing(item.id);
    setAdding(false);
  };

  const handleDuplicate = (item: SafetyMeasure) => {
    measures.add({ name: item.name + ' (cópia)', riskId: item.riskId });
    toast.success('Medida duplicada');
  };

  const toggleRisk = (riskId: string) => {
    setSelectedRiskIds(prev =>
      prev.includes(riskId) ? prev.filter(id => id !== riskId) : [...prev, riskId]
    );
  };

  const save = () => {
    if (!name.trim()) return;
    if (selectedRiskIds.length === 0) {
      toast.error('Selecione ao menos um risco');
      return;
    }

    if (editing) {
      // Remove old entries with same name, recreate for selected risks
      const editItem = measures.items.find(m => m.id === editing);
      if (editItem) {
        const oldEntries = measures.items.filter(m => m.name === editItem.name);
        oldEntries.forEach(m => safetyMeasuresStore.remove(m.id));
      }
      selectedRiskIds.forEach(riskId => {
        safetyMeasuresStore.add({ name: name.trim(), riskId } as any);
      });
    } else {
      selectedRiskIds.forEach(riskId => {
        safetyMeasuresStore.add({ name: name.trim(), riskId } as any);
      });
    }
    measures.refresh();
    resetForm();
    toast.success('Medida salva');
  };

  // Group risks by category for display
  const risksByCategory = categories.items.map(cat => ({
    cat,
    risks: risks.items.filter(r => r.categoryId === cat.id),
  })).filter(g => g.risks.length > 0);

  // Deduplicate measures by name for display, showing all linked risks
  const uniqueMeasures = Array.from(
    measures.items.reduce((map, m) => {
      if (!map.has(m.name)) map.set(m.name, { ...m, riskIds: [m.riskId] });
      else map.get(m.name)!.riskIds.push(m.riskId);
      return map;
    }, new Map<string, SafetyMeasure & { riskIds: string[] }>()).values()
  );

  const filteredMeasures = uniqueMeasures.filter(m => {
    if (!search) return true;
    return m.name.toLowerCase().includes(search.toLowerCase());
  });

  return (
    <div className="p-4 md:p-6 max-w-3xl mx-auto space-y-4">
      <h1 className="text-2xl font-bold text-foreground flex items-center gap-2">
        <Shield className="h-6 w-6" /> Medidas de Segurança
      </h1>

      <SearchInput value={search} onChange={setSearch} placeholder="Buscar medidas..." />

      <div className="flex justify-end">
        <Button onClick={startAdd} className="min-h-[44px] px-4">
          <Plus className="h-4 w-4 mr-1" /> Nova Medida
        </Button>
      </div>

      {(adding || editing) && (
        <Card className="p-4 space-y-4 border-primary/30">
          <div>
            <label className="text-sm font-medium text-muted-foreground block mb-1.5">Nome da medida</label>
            <Input value={name} onChange={e => setName(e.target.value)} placeholder="Nome da medida" className="min-h-[44px]" />
          </div>
          <div>
            <label className="text-sm font-medium text-muted-foreground block mb-2">Vincular aos riscos:</label>
            <div className="space-y-3 max-h-64 overflow-y-auto">
              {risksByCategory.map(({ cat, risks: catRisks }) => {
                const colors = getRiskColor(cat.type);
                return (
                  <div key={cat.id}>
                    <p className="text-xs font-semibold mb-1">
                      <span className={`inline-block w-3 h-3 rounded-full ${colors.bg} mr-1.5 align-middle`} />
                      {cat.name}
                    </p>
                    <div className="space-y-1 ml-4">
                      {catRisks.map(risk => (
                        <label key={risk.id} className="flex items-center gap-2 cursor-pointer py-0.5">
                          <Checkbox
                            checked={selectedRiskIds.includes(risk.id)}
                            onCheckedChange={() => toggleRisk(risk.id)}
                          />
                          <span className="text-sm text-foreground">{risk.name}</span>
                        </label>
                      ))}
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
          <div className="flex flex-col sm:flex-row gap-3 pt-2">
            <Button onClick={save} className="w-full sm:w-auto min-h-[44px]">
              <Check className="h-4 w-4 mr-1" /> Salvar
            </Button>
            <Button variant="outline" onClick={resetForm} className="w-full sm:w-auto min-h-[44px]">
              <X className="h-4 w-4 mr-1" /> Cancelar
            </Button>
          </div>
        </Card>
      )}

      <div className="space-y-3">
        {filteredMeasures.length === 0 && (
          <p className="text-sm text-muted-foreground py-6 text-center">{search ? 'Nenhuma medida encontrada.' : 'Nenhuma medida cadastrada.'}</p>
        )}
        {filteredMeasures.map(item => (
          <Card key={item.id} className="p-4">
            <div className="flex items-center justify-between gap-2">
              <div className="flex-1 min-w-0">
                <p className="font-medium text-foreground">{item.name}</p>
                <div className="flex flex-wrap gap-1 mt-1">
                  {item.riskIds.map(rId => {
                    const risk = risks.items.find(r => r.id === rId);
                    const cat = risk ? categories.items.find(c => c.id === risk.categoryId) : null;
                    const colors = cat ? getRiskColor(cat.type) : null;
                    return risk ? (
                      <Badge key={rId} variant="outline" className="text-xs flex items-center gap-1">
                        {colors && <span className={`inline-block w-2 h-2 rounded-full ${colors.bg}`} />}
                        {risk.name}
                      </Badge>
                    ) : null;
                  })}
                </div>
              </div>
              <div className="flex items-center gap-1 shrink-0">
                <Button size="icon" variant="ghost" className="h-9 w-9" onClick={() => handleDuplicate(item)}>
                  <Copy className="h-4 w-4" />
                </Button>
                <Button size="icon" variant="ghost" className="h-9 w-9" onClick={() => startEdit(item)}>
                  <Pencil className="h-4 w-4" />
                </Button>
                <Button size="icon" variant="ghost" className="h-9 w-9" onClick={() => {
                  // Delete all entries with this name
                  measures.items.filter(m => m.name === item.name).forEach(m => safetyMeasuresStore.remove(m.id));
                  measures.refresh();
                  toast.success('Medida excluída');
                }}>
                  <Trash2 className="h-4 w-4 text-destructive" />
                </Button>
              </div>
            </div>
          </Card>
        ))}
      </div>

      <hr className="border-border" />
      <GenericExcelImport
        title="Importar Medidas via Planilha"
        columns={[
          { header: 'Nome da medida', label: 'Nome da medida', required: true },
          { header: 'Risco vinculado', label: 'Risco vinculado', required: true },
        ]}
        onImport={handleMeasureImport}
      />
    </div>
  );
}
