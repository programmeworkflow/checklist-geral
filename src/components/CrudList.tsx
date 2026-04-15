import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Card } from '@/components/ui/card';
import { Pencil, Trash2, Plus, Check, X, ChevronUp, ChevronDown } from 'lucide-react';

interface Field {
  key: string;
  label: string;
  type?: 'text' | 'textarea' | 'select';
  options?: { value: string; label: string }[];
  hidden?: boolean; // hide from card display (still editable in form)
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

  const resetForm = () => {
    setForm({});
    setAdding(false);
    setEditing(null);
  };

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
    if (editing) {
      onUpdate(editing, form);
    } else {
      onAdd(form);
    }
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
    <Card className="p-4 space-y-4 border-primary/30">
      {fields.map(f => (
        <div key={f.key}>
          <label className="text-sm font-medium text-muted-foreground block mb-1.5">{f.label}</label>
          {f.type === 'select' ? (
            <select
              className="w-full rounded-md border border-input bg-background px-3 py-3 text-sm min-h-[44px]"
              value={form[f.key] || ''}
              onChange={e => setForm({ ...form, [f.key]: e.target.value })}
            >
              <option value="">-- Selecione --</option>
              {f.options?.map(o => (
                <option key={o.value} value={o.value}>{o.label}</option>
              ))}
            </select>
          ) : f.type === 'textarea' ? (
            <Textarea
              className="w-full min-h-[80px]"
              value={form[f.key] || ''}
              onChange={e => setForm({ ...form, [f.key]: e.target.value })}
              placeholder={f.label}
              rows={3}
            />
          ) : (
            <Input
              className="w-full min-h-[44px]"
              value={form[f.key] || ''}
              onChange={e => setForm({ ...form, [f.key]: e.target.value })}
              placeholder={f.label}
            />
          )}
        </div>
      ))}
      <div className="flex flex-col sm:flex-row gap-3 pt-2">
        <Button onClick={save} className="w-full sm:w-auto min-h-[44px]">
          <Check className="h-4 w-4 mr-1" /> Salvar
        </Button>
        <Button variant="outline" onClick={resetForm} className="w-full sm:w-auto min-h-[44px]">
          <X className="h-4 w-4 mr-1" /> Cancelar
        </Button>
      </div>
    </Card>
  );

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <h3 className="text-lg font-semibold text-foreground">{title}</h3>
        <Button size="default" onClick={startAdd} variant="default" className="min-h-[44px] px-4">
          <Plus className="h-4 w-4 mr-1" /> Novo
        </Button>
      </div>

      {/* Show add form at top only when adding */}
      {adding && renderForm()}

      <div className="space-y-3">
        {items.length === 0 && (
          <p className="text-sm text-muted-foreground py-6 text-center">Nenhum item cadastrado.</p>
        )}
        {items.map((item, index) => {
          // If editing this item, show form inline
          if (editing === item.id) {
            return <div key={item.id}>{renderForm()}</div>;
          }

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
            <Card key={item.id} className="p-4">
              <div className="flex items-center justify-between gap-2">
                <div className="flex-1 min-w-0">
                  {renderName ? renderName(item) : (
                    <p className="font-medium text-foreground truncate">{displayFields[0]?.value}</p>
                  )}
                  {(renderName ? displayFields : displayFields.slice(1)).map(df => (
                    df.value ? (
                      <p key={df.key} className="text-sm text-muted-foreground truncate">{df.value}</p>
                    ) : null
                  ))}
                  {renderExtra?.(item)}
                </div>
                <div className="flex items-center gap-1 shrink-0">
                  {onReorder && (
                    <>
                      <Button
                        size="icon"
                        variant="ghost"
                        className="h-9 w-9"
                        disabled={index === 0}
                        onClick={() => moveItem(index, -1)}
                      >
                        <ChevronUp className="h-4 w-4" />
                      </Button>
                      <Button
                        size="icon"
                        variant="ghost"
                        className="h-9 w-9"
                        disabled={index === items.length - 1}
                        onClick={() => moveItem(index, 1)}
                      >
                        <ChevronDown className="h-4 w-4" />
                      </Button>
                    </>
                  )}
                  <Button size="icon" variant="ghost" className="h-9 w-9" onClick={() => startEdit(item)}>
                    <Pencil className="h-4 w-4" />
                  </Button>
                  <Button size="icon" variant="ghost" className="h-9 w-9" onClick={() => onDelete(item.id)}>
                    <Trash2 className="h-4 w-4 text-destructive" />
                  </Button>
                </div>
              </div>
            </Card>
          );
        })}
      </div>
    </div>
  );
}
