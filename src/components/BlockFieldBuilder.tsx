import { useState } from 'react';
import { BlockField, FieldType } from '@/lib/storage';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Switch } from '@/components/ui/switch';
import { Card } from '@/components/ui/card';
import { Plus, Trash2, GripVertical, ChevronDown, ChevronUp } from 'lucide-react';

const FIELD_TYPE_LABELS: Record<FieldType, string> = {
  text: 'Texto curto',
  textarea: 'Texto longo',
  number: 'Número',
  date: 'Data',
  dropdown: 'Lista suspensa',
  checkbox: 'Marcação (checkbox)',
  radio: 'Opção única (radio)',
  image: 'Upload de imagem',
  display_image: 'Exibição de imagem',
  audio: 'Áudio',
  signature: 'Assinatura',
  user_select: 'Seleção de técnico',
};

const FIELD_TYPES = Object.keys(FIELD_TYPE_LABELS) as FieldType[];

interface Props {
  fields: BlockField[];
  blockId: string;
  onAdd: (field: Omit<BlockField, 'id'>) => void;
  onUpdate: (id: string, data: Partial<BlockField>) => void;
  onRemove: (id: string) => void;
}

export const BlockFieldBuilder = ({ fields, blockId, onAdd, onUpdate, onRemove }: Props) => {
  const [expandedId, setExpandedId] = useState<string | null>(null);
  const sorted = [...fields].filter(f => f.blockId === blockId).sort((a, b) => a.order - b.order);

  const handleAdd = () => {
    onAdd({
      blockId,
      label: 'Novo campo',
      type: 'text',
      required: false,
      visible: true,
      order: sorted.length,
      description: '',
      options: [],
    });
  };

  const needsOptions = (type: FieldType) => ['dropdown', 'radio', 'checkbox'].includes(type);

  return (
    <div className="space-y-2">
      {sorted.map((field, index) => {
        const isExpanded = expandedId === field.id;
        return (
          <Card key={field.id} className="p-3">
            <div className="flex items-center gap-2">
              <GripVertical className="h-4 w-4 text-muted-foreground shrink-0" />
              <div className="flex items-center gap-1 shrink-0">
                <button
                  onClick={() => {
                    if (index > 0) {
                      const prev = sorted[index - 1];
                      onUpdate(field.id, { order: prev.order });
                      onUpdate(prev.id, { order: field.order });
                    }
                  }}
                  disabled={index === 0}
                  className="text-muted-foreground hover:text-foreground disabled:opacity-30 text-xs"
                >▲</button>
                <button
                  onClick={() => {
                    if (index < sorted.length - 1) {
                      const next = sorted[index + 1];
                      onUpdate(field.id, { order: next.order });
                      onUpdate(next.id, { order: field.order });
                    }
                  }}
                  disabled={index === sorted.length - 1}
                  className="text-muted-foreground hover:text-foreground disabled:opacity-30 text-xs"
                >▼</button>
              </div>
              <span className="text-sm font-medium text-foreground flex-1 truncate">{field.label}</span>
              <span className="text-xs text-muted-foreground shrink-0">{FIELD_TYPE_LABELS[field.type]}</span>
              <Switch
                checked={field.visible}
                onCheckedChange={v => onUpdate(field.id, { visible: v })}
                className="shrink-0"
              />
              <button onClick={() => setExpandedId(isExpanded ? null : field.id)} className="text-muted-foreground hover:text-foreground">
                {isExpanded ? <ChevronUp className="h-4 w-4" /> : <ChevronDown className="h-4 w-4" />}
              </button>
              <button onClick={() => onRemove(field.id)} className="text-destructive hover:text-destructive/80">
                <Trash2 className="h-4 w-4" />
              </button>
            </div>

            {isExpanded && (
              <div className="mt-3 space-y-3 pl-6 border-l-2 border-muted ml-2">
                <div>
                  <label className="text-xs font-medium text-muted-foreground">Nome do campo</label>
                  <Input
                    value={field.label}
                    onChange={e => onUpdate(field.id, { label: e.target.value })}
                    className="mt-1 h-8 text-sm"
                  />
                </div>
                <div>
                  <label className="text-xs font-medium text-muted-foreground">Tipo</label>
                  <Select value={field.type} onValueChange={(v: FieldType) => onUpdate(field.id, { type: v })}>
                    <SelectTrigger className="mt-1 h-8 text-sm">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      {FIELD_TYPES.map(t => (
                        <SelectItem key={t} value={t}>{FIELD_TYPE_LABELS[t]}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
                <div className="flex items-center gap-4">
                  <label className="flex items-center gap-2 text-xs">
                    <Switch checked={field.required} onCheckedChange={v => onUpdate(field.id, { required: v })} />
                    Obrigatório
                  </label>
                  <label className="flex items-center gap-2 text-xs">
                    <Switch checked={field.visible} onCheckedChange={v => onUpdate(field.id, { visible: v })} />
                    Visível
                  </label>
                </div>
                <div>
                  <label className="text-xs font-medium text-muted-foreground">Texto de apoio</label>
                  <Input
                    value={field.description || ''}
                    onChange={e => onUpdate(field.id, { description: e.target.value })}
                    placeholder="Instrução para o campo..."
                    className="mt-1 h-8 text-sm"
                  />
                </div>
                {needsOptions(field.type) && (
                  <OptionsEditor
                    options={field.options || []}
                    onChange={opts => onUpdate(field.id, { options: opts })}
                  />
                )}
              </div>
            )}
          </Card>
        );
      })}
      <Button variant="outline" size="sm" onClick={handleAdd} className="w-full">
        <Plus className="h-4 w-4 mr-1" /> Adicionar campo
      </Button>
    </div>
  );
};

const OptionsEditor = ({ options, onChange }: { options: string[]; onChange: (o: string[]) => void }) => {
  return (
    <div>
      <label className="text-xs font-medium text-muted-foreground">Opções</label>
      <div className="space-y-1 mt-1">
        {options.map((opt, i) => (
          <div key={i} className="flex gap-1">
            <Input
              value={opt}
              onChange={e => {
                const newOpts = [...options];
                newOpts[i] = e.target.value;
                onChange(newOpts);
              }}
              className="h-7 text-xs"
            />
            <Button variant="ghost" size="icon" className="h-7 w-7 shrink-0" onClick={() => onChange(options.filter((_, j) => j !== i))}>
              <Trash2 className="h-3 w-3" />
            </Button>
          </div>
        ))}
        <Button variant="ghost" size="sm" onClick={() => onChange([...options, ''])} className="text-xs h-7">
          <Plus className="h-3 w-3 mr-1" /> Opção
        </Button>
      </div>
    </div>
  );
};
