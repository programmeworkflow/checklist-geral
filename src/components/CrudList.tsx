import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Card } from '@/components/ui/card';
import { Checkbox } from '@/components/ui/checkbox';
import { Pencil, Trash2, Plus, Check, X, ChevronUp, ChevronDown, Inbox, CheckSquare, Square } from 'lucide-react';

interface Field {
  key: string;
  label: string;
  type?: 'text' | 'textarea' | 'select';
  options?: { value: string; label: string }[];
  hidden?: boolean;
  /** Se setado, lê/escreve o valor em obj[nested][key] em vez de obj[key] */
  nested?: string;
  placeholder?: string;
  helpText?: string;
}

interface CrudListProps<T extends { id: string }> {
  title: string;
  items: T[];
  fields: Field[];
  onAdd: (item: any) => void;
  onUpdate: (id: string, data: any) => void;
  onDelete: (id: string) => void;
  onReorder?: (reorderedItems: T[]) => void;
  renderExtra?: (item: T) => React.ReactNode;
  renderName?: (item: T) => React.ReactNode;
  /** Botões extras (ex: duplicar) renderizados antes de editar/excluir */
  extraActions?: (item: T) => React.ReactNode;
  /** Habilita seleção múltipla com botão de exclusão em massa */
  selectable?: boolean;
}

export function CrudList<T extends { id: string }>({
  title, items, fields, onAdd, onUpdate, onDelete, onReorder, renderExtra, renderName,
  extraActions, selectable = false,
}: CrudListProps<T>) {
  const [adding, setAdding] = useState(false);
  const [editing, setEditing] = useState<string | null>(null);
  const [form, setForm] = useState<Record<string, string>>({});
  const [selected, setSelected] = useState<Set<string>>(new Set());

  const resetForm = () => { setForm({}); setAdding(false); setEditing(null); };

  const startAdd = () => {
    setForm(Object.fromEntries(fields.map(f => [f.key, ''])));
    setAdding(true);
    setEditing(null);
  };

  const readField = (item: T, f: Field): string => {
    const raw = f.nested
      ? (item as any)[f.nested]?.[f.key]
      : (item as any)[f.key];
    return raw == null ? '' : String(raw);
  };

  const buildPayload = (): any => {
    const payload: any = {};
    for (const f of fields) {
      const v = form[f.key] ?? '';
      if (f.nested) {
        if (!payload[f.nested]) payload[f.nested] = {};
        payload[f.nested][f.key] = v;
      } else {
        payload[f.key] = v;
      }
    }
    return payload;
  };

  const startEdit = (item: T) => {
    setForm(Object.fromEntries(fields.map(f => [f.key, readField(item, f)])));
    setEditing(item.id);
    setAdding(false);
  };

  const save = () => {
    const payload = buildPayload();
    if (editing) onUpdate(editing, payload);
    else onAdd(payload);
    resetForm();
  };

  const moveItem = (index: number, direction: -1 | 1) => {
    if (!onReorder) return;
    const newIndex = index + direction;
    if (newIndex < 0 || newIndex >= items.length) return;
    const reordered = [...items];
    [reordered[index], reordered[newIndex]] = [reordered[newIndex], reordered[index]];
    onReorder(reordered);
  };

  const toggleSelect = (id: string) => {
    setSelected(prev => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id); else next.add(id);
      return next;
    });
  };

  const toggleSelectAll = () => {
    if (selected.size === items.length) setSelected(new Set());
    else setSelected(new Set(items.map(i => i.id)));
  };

  const handleBulkDelete = () => {
    if (selected.size === 0) return;
    if (!confirm(`Excluir ${selected.size} ${selected.size === 1 ? 'item' : 'itens'}?`)) return;
    selected.forEach(id => onDelete(id));
    setSelected(new Set());
  };

  const visibleFields = fields.filter(f => !f.hidden);

  const renderForm = (compact = false) => (
    <Card className={compact
      ? "p-3 space-y-2 border-primary/30 bg-primary/[0.02]"
      : "p-5 space-y-4 border-primary/20 bg-gradient-to-br from-primary/[0.03] to-transparent shadow-sm"}>
      {fields.map((f, idx) => (
        <div key={f.key}>
          {!compact && <label className="text-xs font-semibold text-muted-foreground uppercase tracking-wider block mb-1.5">{f.label}</label>}
          {f.type === 'select' ? (
            <select
              className="w-full rounded-lg border border-input bg-background px-3 py-2.5 text-sm min-h-[40px] focus:ring-2 focus:ring-primary/20 focus:border-primary transition-all"
              value={form[f.key] || ''}
              onChange={e => setForm({ ...form, [f.key]: e.target.value })}
            >
              <option value="">{compact ? f.label : '-- Selecione --'}</option>
              {f.options?.map(o => <option key={o.value} value={o.value}>{o.label}</option>)}
            </select>
          ) : f.type === 'textarea' ? (
            <Textarea
              className="w-full min-h-[60px] rounded-lg"
              value={form[f.key] || ''}
              onChange={e => setForm({ ...form, [f.key]: e.target.value })}
              placeholder={f.placeholder || f.label}
              rows={2}
              autoFocus={!compact && idx === 0}
            />
          ) : (
            <Input
              className="w-full min-h-[40px] rounded-lg"
              value={form[f.key] || ''}
              onChange={e => setForm({ ...form, [f.key]: e.target.value })}
              onKeyDown={e => {
                if (e.key === 'Enter') save();
                if (e.key === 'Escape') resetForm();
              }}
              placeholder={f.placeholder || f.label}
              autoFocus={!compact && idx === 0}
            />
          )}
          {f.helpText && (
            <p className="text-[11px] text-muted-foreground mt-1.5 leading-relaxed">{f.helpText}</p>
          )}
        </div>
      ))}
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
    <div className="space-y-4">
      <div className="flex items-center justify-between flex-wrap gap-2">
        <div className="flex items-center gap-3">
          <h3 className="text-lg font-bold text-foreground">{title}</h3>
          {selectable && items.length > 0 && (
            <button
              onClick={toggleSelectAll}
              className="text-xs text-muted-foreground hover:text-foreground inline-flex items-center gap-1.5"
              title={selected.size === items.length ? 'Desmarcar todos' : 'Selecionar todos'}
            >
              {selected.size === items.length ? <CheckSquare className="h-4 w-4" /> : <Square className="h-4 w-4" />}
              {selected.size > 0 ? `${selected.size} de ${items.length}` : `${items.length} ${items.length === 1 ? 'item' : 'itens'}`}
            </button>
          )}
        </div>
        <div className="flex items-center gap-2">
          {selectable && selected.size > 0 && (
            <button
              onClick={handleBulkDelete}
              className="inline-flex items-center gap-1.5 bg-destructive text-destructive-foreground px-3 h-10 rounded-xl text-sm font-semibold hover:bg-destructive/90 transition-colors"
            >
              <Trash2 className="h-4 w-4" /> Excluir {selected.size}
            </button>
          )}
          <button
            onClick={startAdd}
            className="btn-3d inline-flex items-center gap-1.5 bg-primary text-white px-4 h-10 rounded-xl text-sm font-semibold hover:bg-primary/90 transition-colors"
          >
            <Plus className="h-4 w-4" /> Novo
          </button>
        </div>
      </div>

      {adding && renderForm()}

      <div className="space-y-2">
        {items.length === 0 && (
          <div className="flex flex-col items-center justify-center py-12 text-center">
            <div className="h-14 w-14 rounded-2xl bg-muted flex items-center justify-center mb-3">
              <Inbox className="h-6 w-6 text-muted-foreground/40" />
            </div>
            <p className="text-sm text-muted-foreground">Nenhum item cadastrado.</p>
          </div>
        )}
        {items.map((item, index) => {
          if (editing === item.id) return <div key={item.id}>{renderForm(true)}</div>;

          const displayFields = visibleFields.map(f => {
            const raw = readField(item, f);
            if (!raw) return { key: f.key, label: f.label, value: '' };
            if (f.type === 'select' && f.options) {
              const opt = f.options.find(o => o.value === raw);
              return { key: f.key, label: f.label, value: opt?.label || '' };
            }
            return { key: f.key, label: f.label, value: raw };
          });

          const isSelected = selected.has(item.id);

          return (
            <Card key={item.id} className={`card-interactive p-4 group ${isSelected ? 'ring-2 ring-primary/40 bg-primary/[0.03]' : ''}`}>
              <div className="flex items-center justify-between gap-3">
                {selectable && (
                  <Checkbox
                    checked={isSelected}
                    onCheckedChange={() => toggleSelect(item.id)}
                    className="shrink-0"
                  />
                )}
                <div className="flex-1 min-w-0">
                  {renderName ? renderName(item) : (
                    <p className="font-semibold text-foreground truncate">{displayFields[0]?.value}</p>
                  )}
                  {(renderName ? displayFields : displayFields.slice(1)).map(df => (
                    df.value ? (
                      <p key={df.key} className="text-sm text-muted-foreground truncate mt-0.5">{df.value}</p>
                    ) : null
                  ))}
                  {renderExtra?.(item)}
                </div>
                <div className="flex items-center gap-0.5 shrink-0 opacity-60 group-hover:opacity-100 transition-opacity">
                  {onReorder && (
                    <>
                      <button
                        className="h-8 w-8 flex items-center justify-center rounded-lg text-muted-foreground hover:text-foreground hover:bg-muted transition-colors disabled:opacity-30"
                        disabled={index === 0}
                        onClick={() => moveItem(index, -1)}
                      >
                        <ChevronUp className="h-4 w-4" />
                      </button>
                      <button
                        className="h-8 w-8 flex items-center justify-center rounded-lg text-muted-foreground hover:text-foreground hover:bg-muted transition-colors disabled:opacity-30"
                        disabled={index === items.length - 1}
                        onClick={() => moveItem(index, 1)}
                      >
                        <ChevronDown className="h-4 w-4" />
                      </button>
                    </>
                  )}
                  {extraActions?.(item)}
                  <button
                    className="h-8 w-8 flex items-center justify-center rounded-lg text-muted-foreground hover:text-primary hover:bg-primary/10 transition-colors"
                    onClick={() => startEdit(item)}
                  >
                    <Pencil className="h-3.5 w-3.5" />
                  </button>
                  <button
                    className="h-8 w-8 flex items-center justify-center rounded-lg text-muted-foreground hover:text-destructive hover:bg-destructive/10 transition-colors"
                    onClick={() => { if (confirm('Excluir este item?')) onDelete(item.id); }}
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
