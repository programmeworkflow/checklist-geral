import { Link, useNavigate } from 'react-router-dom';
import { Card } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Plus, Copy, ClipboardList, Trash2, FileText, Pencil, Building2 } from 'lucide-react';
import { checklistsStore, companiesStore, sectorsStore, functionsStore } from '@/lib/storage';
import { toast } from 'sonner';
import { useState, useMemo } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { SearchInput } from '@/components/SearchInput';

export default function ChecklistList() {
  const navigate = useNavigate();
  const [, setRefresh] = useState(0);
  const [search, setSearch] = useState('');
  const checklists = checklistsStore.getAll();
  const companies = companiesStore.getAll();
  const sectors = sectorsStore.getAll();
  const fns = functionsStore.getAll();

  // Duplicate dialog state
  const [duplicateId, setDuplicateId] = useState<string | null>(null);
  const [dupCompanyId, setDupCompanyId] = useState('');

  const handleDelete = (id: string) => {
    if (!window.confirm('Excluir este checklist?')) return;
    checklistsStore.remove(id);
    setRefresh(n => n + 1);
    toast.success('Checklist excluído.');
  };

  const handleDuplicate = () => {
    if (!duplicateId) return;
    const source = checklistsStore.get(duplicateId);
    if (!source) return;
    // Navigate to duplicate with target company
    const targetCompany = dupCompanyId || source.companyId;
    navigate(`/checklist/${duplicateId}?duplicate=true&empresa=${targetCompany}`);
    setDuplicateId(null);
  };

  // Group by company with search filter
  const grouped = useMemo(() => {
    const q = search.toLowerCase();
    const filtered = checklists.filter(cl => {
      if (!q) return true;
      const company = companies.find(c => c.id === cl.companyId);
      const sector = sectors.find(s => s.id === cl.sectorId);
      const fnNames = cl.functionIds?.map(fid => fns.find(f => f.id === fid)?.name || '').join(' ') || '';
      return (company?.name || '').toLowerCase().includes(q) ||
        (sector?.name || '').toLowerCase().includes(q) ||
        fnNames.toLowerCase().includes(q);
    });
    const map = new Map<string, typeof checklists>();
    filtered.slice().reverse().forEach(cl => {
      const key = cl.companyId;
      if (!map.has(key)) map.set(key, []);
      map.get(key)!.push(cl);
    });
    return Array.from(map.entries()).map(([companyId, items]) => ({
      company: companies.find(c => c.id === companyId),
      companyId,
      items,
    }));
  }, [checklists, companies, search, sectors, fns]);

  return (
    <div className="p-4 md:p-6 max-w-3xl mx-auto space-y-4">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold text-foreground flex items-center gap-2">
          <ClipboardList className="h-6 w-6" /> Checklists
        </h1>
        <Link to="/checklist">
          <Button size="sm"><Plus className="h-4 w-4 mr-1" /> Novo</Button>
        </Link>
      </div>

      {checklists.length > 0 && (
        <SearchInput value={search} onChange={setSearch} placeholder="Buscar por empresa, setor ou função..." />
      )}

      {checklists.length === 0 ? (
        <Card className="p-8 text-center">
          <p className="text-sm text-muted-foreground">Nenhum checklist criado ainda.</p>
          <Link to="/checklist">
            <Button className="mt-4"><Plus className="h-4 w-4 mr-1" /> Criar Primeiro Checklist</Button>
          </Link>
        </Card>
      ) : (
        <div className="space-y-5">
          {grouped.map(({ company, companyId, items }) => (
            <div key={companyId}>
              <h2 className="text-sm font-semibold text-muted-foreground flex items-center gap-1.5 mb-2">
                <Building2 className="h-4 w-4" /> {company?.name || 'Empresa removida'}
              </h2>
              <div className="space-y-2">
                {items.map(cl => {
                  const sector = sectors.find(s => s.id === cl.sectorId);
                  return (
                    <Card
                      key={cl.id}
                      className="p-3 flex items-center justify-between cursor-pointer hover:bg-muted/50 transition-colors"
                      onClick={() => navigate(`/checklist/${cl.id}`)}
                    >
                      <div className="flex items-center gap-2">
                        <FileText className="h-4 w-4 text-muted-foreground shrink-0" />
                        <div>
                          <p className="font-medium text-foreground text-sm">{sector?.name || 'Setor removido'}</p>
                          <p className="text-xs text-muted-foreground">
                            {new Date(cl.createdAt).toLocaleDateString('pt-BR')}
                            {cl.functionIds?.length > 0 && ` · ${cl.functionIds.length} função(ões)`}
                          </p>
                        </div>
                      </div>
                      <div className="flex items-center gap-1" onClick={e => e.stopPropagation()}>
                        <button
                          type="button"
                          className="p-2 rounded-md text-muted-foreground hover:text-primary hover:bg-primary/10 transition-colors"
                          title="Editar checklist"
                          onClick={() => navigate(`/checklist/${cl.id}?duplicate=true`)}
                        >
                          <Pencil className="h-4 w-4" />
                        </button>
                        <button
                          type="button"
                          className="p-2 rounded-md text-muted-foreground hover:text-primary hover:bg-primary/10 transition-colors"
                          title="Duplicar checklist"
                          onClick={() => { setDuplicateId(cl.id); setDupCompanyId(''); }}
                        >
                          <Copy className="h-4 w-4" />
                        </button>
                        <button
                          type="button"
                          className="p-2 rounded-md text-muted-foreground hover:text-destructive hover:bg-destructive/10 transition-colors"
                          title="Excluir checklist"
                          onClick={() => handleDelete(cl.id)}
                        >
                          <Trash2 className="h-4 w-4" />
                        </button>
                      </div>
                    </Card>
                  );
                })}
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Duplicate dialog - choose company */}
      <Dialog open={!!duplicateId} onOpenChange={open => { if (!open) setDuplicateId(null); }}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Duplicar Checklist</DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            <div>
              <label className="text-sm font-medium text-muted-foreground">Empresa de destino</label>
              <select
                className="w-full mt-1 rounded-md border border-input bg-background px-3 py-2 text-sm"
                value={dupCompanyId}
                onChange={e => setDupCompanyId(e.target.value)}
              >
                <option value="">Mesma empresa</option>
                {companies.map(c => <option key={c.id} value={c.id}>{c.name}</option>)}
              </select>
            </div>
            <div className="flex gap-2 justify-end">
              <Button variant="outline" onClick={() => setDuplicateId(null)}>Cancelar</Button>
              <Button onClick={handleDuplicate}>Duplicar</Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}
