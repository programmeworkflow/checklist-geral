import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Card } from '@/components/ui/card';
import { Pencil, Trash2, Plus, Check, X, ChevronUp, ChevronDown, Inbox } from 'lucide-react';

interface Field {
  key: string;
  label: string;
  type?: 'text' | 'textarea' | 'select';
  options?: { value: string; label: string }[];
  hidden?: boolean;
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
}

export function CrudList<T extends { id: string }>({
  title, items, fields, onAdd, onUpdate, onDelete, onReorder, renderExtra, renderName
}: CrudListProps<T>) {
  const [adding, setAdding] = useState(false);
  const [editing, setEditing] = useState<string | null>(null);
  const [form, setForm] = useState<Record<string, string>>({});

  const resetForm = () => { setForm({}); setAdding(false); setEditing(null); };

  const startAdd = () => {
    setForm(Object.fromEntries(fields.map(f => [f.key, ''])));
    setAdding(true);
    setEditing(null);
  };

  const startEdit = (item: T) => {
    setForm(Object.fromEntries(fields.map(f => [f.key, (item as any)[f.key] || ''])));
    setEditing(item.id);
    setAdding(false);
  };

  const save = () => {
    if (editing) onUpdate(editing, form);
    else onAdd(form);
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

  const visibleFields = fields.filter(f => !f.hidden);

  const renderForm = () => (
    <Card className="p-5 space-y-4 border-primary/20 bg-gradient-to-br from-primary/[0.03] to-transparent shadow-sm">
      {fields.map(f => (
        <div key={f.key}>
          <label className="text-xs font-semibold text-muted-foreground uppercase tracking-wider block mb-1.5">{f.label}</label>
          {f.type === 'select' ? (
            <select
              className="w-full rounded-lg border border-input bg-background px-3 py-3 text-sm min-h-[44px] focus:ring-2 focus:ring-primary/20 focus:border-primary transition-all"
              value={form[f.key] || ''}
              onChange={e => setForm({ ...form, [f.key]: e.target.value })}
            >
              <option value="">-- Selecione --</option>
              {f.options?.map(o => <option key={o.value} value={o.value}>{o.label}</option>)}
            </select>
          ) : f.type === 'textarea' ? (
            <Textarea
              className="w-full min-h-[80px] rounded-lg"
              value={form[f.key] || ''}
              onChange={e => setForm({ ...form, [f.key]: e.target.value })}
              placeholder={f.label}
              rows={3}
            />
          ) : (
            <Input
              className="w-full min-h-[44px] rounded-lg"
              value={form[f.key] || ''}
              onChange={e => setForm({ ...form, [f.key]: e.target.value })}
              placeholder={f.label}
            />
          )}
        </div>
      ))}
      <div className="flex flex-col sm:flex-row gap-2 pt-1">
        <Button onClick={save} className="btn-3d w-full sm:w-auto min-h-[44px] rounded-xl gap-1.5">
          <Check className="h-4 w-4" /> Salvar
        </Button>
        <Button variant="outline" onClick={resetForm} className="w-full sm:w-auto min-h-[44px] rounded-xl gap-1.5">
          <X className="h-4 w-4" /> Cancelar
        </Button>
      </div>
    </Card>
  );

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <h3 className="text-lg font-bold text-foreground">{title}</h3>
        <button
          onClick={startAdd}
          className="btn-3d inline-flex items-center gap-1.5 bg-primary text-white px-4 h-10 rounded-xl text-sm font-semibold hover:bg-primary/90 transition-colors"
        >
          <Plus className="h-4 w-4" /> Novo
        </button>
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
          if (editing === item.id) return <div key={item.id}>{renderForm()}</div>;

          const displayFields = visibleFields.map(f => {
            const raw = (item as any)[f.key];
            if (!raw) return { key: f.key, label: f.label, value: '' };
            if (f.type === 'select' && f.options) {
              const opt = f.options.find(o => o.value === raw);
              return { key: f.key, label: f.label, value: opt?.label || '' };
            }
            return { key: f.key, label: f.label, value: String(raw) };
          });

          return (
            <Card key={item.id} className="card-interactive p-4 group">
              <div className="flex items-center justify-between gap-3">
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
                  <button
                    className="h-8 w-8 flex items-center justify-center rounded-lg text-muted-foreground hover:text-primary hover:bg-primary/10 transition-colors"
                    onClick={() => startEdit(item)}
                  >
                    <Pencil className="h-3.5 w-3.5" />
                  </button>
                  <button
                    className="h-8 w-8 flex items-center justify-center rounded-lg text-muted-foreground hover:text-destructive hover:bg-destructive/10 transition-colors"
                    onClick={() => onDelete(item.id)}
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
