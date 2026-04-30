import { useMemo, useState } from 'react';
import { useStore } from '@/hooks/useStore';
import { functionsStore, sectorsStore, companiesStore } from '@/lib/storage';
import type { JobFunction } from '@/lib/storage';
import { Users, Plus, Pencil, Trash2, Check, X, Sparkles } from 'lucide-react';
import { Card } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Checkbox } from '@/components/ui/checkbox';
import { SearchInput } from '@/components/SearchInput';
import { generateCargoDescription } from '@/lib/aiRiskAnalyzer';
import { toast } from 'sonner';

export default function Cargos() {
  const functions = useStore(functionsStore);
  const sectors = useStore(sectorsStore);
  const companies = useStore(companiesStore);

  const [search, setSearch] = useState('');
  const [adding, setAdding] = useState(false);
  const [editing, setEditing] = useState<string | null>(null);
  const [form, setForm] = useState<{ name: string; sectorId: string; description: string }>({
    name: '', sectorId: '', description: '',
  });
  const [aiLoading, setAiLoading] = useState(false);
  const [selected, setSelected] = useState<Set<string>>(new Set());

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

  const filtered = useMemo(() => {
    let list = [...functions.items];
    if (search) {
      const q = search.toLowerCase();
      list = list.filter(f =>
        f.name.toLowerCase().includes(q) ||
        (sectorById.get(f.sectorId)?.name || '').toLowerCase().includes(q)
      );
    }
    return list.sort((a, b) => {
      const sa = sectorById.get(a.sectorId)?.name || '';
      const sb = sectorById.get(b.sectorId)?.name || '';
      const cmp = sa.localeCompare(sb, 'pt-BR');
      if (cmp !== 0) return cmp;
      return a.name.localeCompare(b.name, 'pt-BR');
    });
  }, [functions.items, search, sectorById]);

  const resetForm = () => {
    setForm({ name: '', sectorId: '', description: '' });
    setAdding(false);
    setEditing(null);
  };

  const startAdd = () => {
    setForm({ name: '', sectorId: sectorOptions[0]?.value || '', description: '' });
    setAdding(true);
    setEditing(null);
  };

  const startEdit = (item: JobFunction) => {
    setForm({
      name: item.name,
      sectorId: item.sectorId,
      description: item.description || '',
    });
    setEditing(item.id);
    setAdding(false);
  };

  const save = async () => {
    if (!form.name.trim()) { toast.error('Nome obrigatório'); return; }
    if (!form.sectorId) { toast.error('Selecione o setor'); return; }
    try {
      if (editing) await functions.update(editing, form);
      else await functions.add(form);
      resetForm();
      toast.success(editing ? 'Cargo atualizado' : 'Cargo criado');
    } catch (err: any) {
      toast.error(`Erro: ${err?.message || 'desconhecido'}`);
    }
  };

  const handleAIDescription = async () => {
    if (!form.name.trim()) {
      toast.error('Preencha o nome do cargo antes de gerar com IA');
      return;
    }
    setAiLoading(true);
    try {
      const sectorInfo = sectorById.get(form.sectorId);
      const text = await generateCargoDescription({
        cargoNome: form.name.trim(),
        setor: sectorInfo?.name,
        empresa: sectorInfo?.companyName,
      });
      setForm(f => ({ ...f, description: text }));
      toast.success('Descritivo gerado pela IA');
    } catch (err: any) {
      toast.error(`IA: ${err?.message || 'falha'}`);
    } finally {
      setAiLoading(false);
    }
  };

  const toggleSelect = (id: string) => {
    setSelected(prev => {
      const next = new Set(prev);
      next.has(id) ? next.delete(id) : next.add(id);
      return next;
    });
  };

  const handleBulkDelete = () => {
    if (selected.size === 0) return;
    if (!confirm(`Excluir ${selected.size} cargo(s)?`)) return;
    selected.forEach(id => functions.remove(id));
    setSelected(new Set());
  };

  const renderForm = () => (
    <Card className="p-5 border-primary/30 space-y-4 bg-primary/[0.02]">
      <div>
        <label className="text-xs font-semibold text-muted-foreground uppercase tracking-wider block mb-1.5">Nome do cargo</label>
        <Input
          value={form.name}
          onChange={e => setForm({ ...form, name: e.target.value })}
          placeholder="Ex: Operador de Empilhadeira"
          className="min-h-[40px]"
          autoFocus
        />
      </div>
      <div>
        <label className="text-xs font-semibold text-muted-foreground uppercase tracking-wider block mb-1.5">Setor</label>
        <select
          className="w-full rounded-lg border border-input bg-background px-3 py-2 text-sm min-h-[40px]"
          value={form.sectorId}
          onChange={e => setForm({ ...form, sectorId: e.target.value })}
        >
          <option value="">-- Selecione --</option>
          {sectorOptions.map(o => <option key={o.value} value={o.value}>{o.label}</option>)}
        </select>
      </div>
      <div>
        <div className="flex items-center justify-between gap-2 mb-1.5">
          <label className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">
            Atribuições / Descritivo de função
          </label>
          <button
            type="button"
            onClick={handleAIDescription}
            disabled={aiLoading || !form.name.trim()}
            className="inline-flex items-center gap-1 text-[11px] font-bold uppercase tracking-wider px-2.5 py-1 rounded-md border-2 border-primary text-primary hover:bg-primary hover:text-primary-foreground transition-colors disabled:opacity-50"
          >
            {aiLoading ? (
              <span className="inline-flex items-center gap-1.5">
                <span className="h-1.5 w-1.5 rounded-full bg-current animate-pulse" /> Gerando…
              </span>
            ) : (
              <><Sparkles className="h-3 w-3" /> Gerar com IA</>
            )}
          </button>
        </div>
        <Textarea
          value={form.description}
          onChange={e => setForm({ ...form, description: e.target.value })}
          placeholder="Descreva o que esse cargo faz ou clique em 'Gerar com IA'..."
          rows={5}
          className="leading-relaxed"
        />
      </div>
      <div className="flex flex-row gap-2 pt-1">
        <Button onClick={save} size="sm" className="btn-3d gap-1.5">
          <Check className="h-3.5 w-3.5" /> Salvar
        </Button>
        <Button variant="outline" onClick={resetForm} size="sm" className="gap-1.5">
          <X className="h-3.5 w-3.5" /> Cancelar
        </Button>
      </div>
    </Card>
  );

  return (
    <div className="p-4 md:p-8 max-w-3xl mx-auto space-y-6">
      <div className="pb-3 border-b border-border/60">
        <p className="eyebrow mb-1 inline-flex items-center gap-1.5"><Users className="h-3 w-3" /> Cadastros</p>
        <h1 className="heading-display text-3xl md:text-4xl text-foreground">Cargos</h1>
      </div>

      <SearchInput value={search} onChange={setSearch} placeholder="Buscar por cargo ou setor..." />

      <div className="flex items-center justify-between gap-2 flex-wrap">
        <div className="flex items-center gap-3">
          <h3 className="text-lg font-bold text-foreground">Cargos</h3>
          <span className="text-xs text-muted-foreground">
            {selected.size > 0 ? `${selected.size} de ${filtered.length}` : `${filtered.length} ${filtered.length === 1 ? 'item' : 'itens'}`}
          </span>
        </div>
        <div className="flex items-center gap-2">
          {selected.size > 0 && (
            <button
              onClick={handleBulkDelete}
              className="inline-flex items-center gap-1.5 bg-destructive text-destructive-foreground px-3 h-10 rounded-xl text-sm font-semibold hover:bg-destructive/90"
            >
              <Trash2 className="h-4 w-4" /> Excluir {selected.size}
            </button>
          )}
          <button
            onClick={startAdd}
            className="btn-3d inline-flex items-center gap-1.5 bg-primary text-white px-4 h-10 rounded-xl text-sm font-semibold hover:bg-primary/90"
          >
            <Plus className="h-4 w-4" /> Novo
          </button>
        </div>
      </div>

      {adding && renderForm()}

      <div className="space-y-2">
        {filtered.length === 0 && (
          <Card className="p-8 text-center text-sm text-muted-foreground">
            {search ? 'Nenhum cargo encontrado.' : 'Nenhum cargo cadastrado. Clique em "Novo" pra começar.'}
          </Card>
        )}
        {filtered.map(item => {
          if (editing === item.id) return <div key={item.id}>{renderForm()}</div>;
          const sec = sectorById.get(item.sectorId);
          const isSel = selected.has(item.id);
          return (
            <Card key={item.id} className={`card-interactive p-4 group ${isSel ? 'ring-2 ring-primary/40 bg-primary/[0.03]' : ''}`}>
              <div className="flex items-start justify-between gap-3">
                <div className="flex items-start gap-3 flex-1 min-w-0">
                  <Checkbox
                    checked={isSel}
                    onCheckedChange={() => toggleSelect(item.id)}
                    className="mt-1 shrink-0"
                  />
                  <div className="flex-1 min-w-0">
                    <p className="font-semibold text-foreground">
                      {item.name}
                      {sec && <span className="text-muted-foreground font-normal"> ({sec.name})</span>}
                    </p>
                    {item.description && (
                      <p className="text-xs text-muted-foreground mt-1.5 leading-relaxed line-clamp-3">
                        {item.description}
                      </p>
                    )}
                  </div>
                </div>
                <div className="flex items-center gap-0.5 shrink-0 opacity-60 group-hover:opacity-100 transition-opacity">
                  <button
                    className="h-8 w-8 flex items-center justify-center rounded-lg text-muted-foreground hover:text-primary hover:bg-primary/10"
                    onClick={() => startEdit(item)}
                  >
                    <Pencil className="h-3.5 w-3.5" />
                  </button>
                  <button
                    className="h-8 w-8 flex items-center justify-center rounded-lg text-muted-foreground hover:text-destructive hover:bg-destructive/10"
                    onClick={() => { if (confirm(`Excluir cargo "${item.name}"?`)) functions.remove(item.id); }}
                  >
                    <Trash2 className="h-3.5 w-3.5" />
                  </button>
                </div>
              </div>
            </Card>
          );
        })}
      </div>
    </div>
  );
}
