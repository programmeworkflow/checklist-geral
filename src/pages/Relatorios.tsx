import { useState, useMemo } from 'react';
import { Card } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import {
  checklistsStore, companiesStore, sectorsStore, functionsStore,
  safetyMeasuresStore, professionalsStore,
} from '@/lib/storage';
import { FileText, Building2, MapPin, Users, UserCheck, ChevronDown } from 'lucide-react';

type FilterType = 'empresa' | 'setor' | 'funcao' | 'tecnico';

export default function Relatorios() {
  const [filterType, setFilterType] = useState<FilterType>('empresa');
  const [selectedId, setSelectedId] = useState('');

  const checklists = checklistsStore.getAll();
  const companies = companiesStore.getAll();
  const sectors = sectorsStore.getAll();
  const functions = functionsStore.getAll();
  const professionals = professionalsStore.getAll();
  const allMeasures = safetyMeasuresStore.getAll();

  const filterOptions = useMemo(() => {
    switch (filterType) {
      case 'empresa': return companies.map(c => ({ id: c.id, name: c.name }));
      case 'setor': return sectors.map(s => {
        const comp = companies.find(c => c.id === s.companyId);
        return { id: s.id, name: `${s.name}${comp ? ` (${comp.name})` : ''}` };
      });
      case 'funcao': return functions.map(f => ({ id: f.id, name: f.name }));
      case 'tecnico': return professionals.map(p => ({ id: p.id, name: p.name }));
      default: return [];
    }
  }, [filterType, companies, sectors, functions, professionals]);

  const filteredChecklists = useMemo(() => {
    if (!selectedId) return [];
    switch (filterType) {
      case 'empresa': return checklists.filter(cl => cl.companyId === selectedId);
      case 'setor': return checklists.filter(cl => cl.sectorId === selectedId);
      case 'funcao': return checklists.filter(cl => cl.functionIds?.includes(selectedId));
      case 'tecnico': return checklists.filter(cl => cl.formData?.tecnicoId === selectedId);
      default: return [];
    }
  }, [filterType, selectedId, checklists]);

  const stats = useMemo(() => {
    let conf = 0, nonConf = 0;
    filteredChecklists.forEach(cl => {
      const statuses = (cl as any).measureStatuses || cl.formData?.measureStatuses || {};
      Object.values(statuses).forEach((s: any) => {
        if (s === 1) conf++;
        if (s === 2) nonConf++;
      });
    });
    return { total: filteredChecklists.length, conf, nonConf };
  }, [filteredChecklists]);

  const filters: { key: FilterType; label: string; icon: React.ElementType }[] = [
    { key: 'empresa', label: 'Por Empresa', icon: Building2 },
    { key: 'setor', label: 'Por Setor', icon: MapPin },
    { key: 'funcao', label: 'Por Função', icon: Users },
    { key: 'tecnico', label: 'Por Técnico', icon: UserCheck },
  ];

  return (
    <div className="p-4 md:p-6 max-w-4xl mx-auto space-y-6">
      <h1 className="text-2xl font-bold text-foreground flex items-center gap-2">
        <FileText className="h-6 w-6" /> Relatórios
      </h1>

      {/* Filter type selection */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-2">
        {filters.map(f => (
          <button
            key={f.key}
            type="button"
            onClick={() => { setFilterType(f.key); setSelectedId(''); }}
            className={`flex items-center gap-2 px-4 py-3 rounded-lg border-2 transition-all text-sm font-medium ${
              filterType === f.key
                ? 'bg-primary/10 border-primary text-primary'
                : 'bg-background border-input hover:border-muted-foreground/30 text-foreground'
            }`}
          >
            <f.icon className="h-4 w-4" />
            {f.label}
          </button>
        ))}
      </div>

      {/* Filter value selection */}
      <div>
        <select
          className="w-full rounded-md border border-input bg-background px-3 py-2 text-sm"
          value={selectedId}
          onChange={e => setSelectedId(e.target.value)}
        >
          <option value="">-- Selecione --</option>
          {filterOptions.map(o => (
            <option key={o.id} value={o.id}>{o.name}</option>
          ))}
        </select>
      </div>

      {/* Results */}
      {selectedId && (
        <>
          <div className="grid grid-cols-3 gap-3">
            <Card className="p-3 text-center">
              <p className="text-2xl font-bold text-foreground">{stats.total}</p>
              <p className="text-xs text-muted-foreground">Checklists</p>
            </Card>
            <Card className="p-3 text-center">
              <p className="text-2xl font-bold text-green-600">{stats.conf}</p>
              <p className="text-xs text-muted-foreground">Conformidades</p>
            </Card>
            <Card className="p-3 text-center">
              <p className="text-2xl font-bold text-red-600">{stats.nonConf}</p>
              <p className="text-xs text-muted-foreground">Não Conform.</p>
            </Card>
          </div>

          {filteredChecklists.length === 0 ? (
            <Card className="p-8 text-center">
              <p className="text-sm text-muted-foreground">Nenhum checklist encontrado para este filtro.</p>
            </Card>
          ) : (
            <div className="space-y-2">
              {filteredChecklists.map(cl => {
                const comp = companies.find(c => c.id === cl.companyId);
                const sec = sectors.find(s => s.id === cl.sectorId);
                const funcs = functions.filter(f => cl.functionIds?.includes(f.id));
                return (
                  <Card key={cl.id} className="p-3 cursor-pointer hover:bg-muted/50 transition-colors"
                    onClick={() => window.location.href = `/checklist/${cl.id}`}>
                    <div className="flex items-center justify-between">
                      <div>
                        <p className="text-sm font-medium text-foreground">{comp?.name || 'Empresa removida'}</p>
                        <p className="text-xs text-muted-foreground">
                          {sec?.name || 'Setor removido'} · {funcs.map(f => f.name).join(', ') || '—'}
                        </p>
                        <p className="text-xs text-muted-foreground">
                          {new Date(cl.createdAt).toLocaleDateString('pt-BR')}
                        </p>
                      </div>
                      <FileText className="h-4 w-4 text-muted-foreground" />
                    </div>
                  </Card>
                );
              })}
            </div>
          )}
        </>
      )}
    </div>
  );
}
