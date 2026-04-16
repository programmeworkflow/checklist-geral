import { useState, useEffect, useCallback, useRef } from 'react';
import { useStore } from '@/hooks/useStore';
import { checklistBlocksStore, blockFieldsStore, navItemsStore, reportBlocksStore, ChecklistBlock, NavItem, BlockField, ReportBlock } from '@/lib/storage';
import { Settings as SettingsIcon, Pencil, Check, X, Plus, Trash2, ChevronDown, ChevronUp, Save } from 'lucide-react';
import { Switch } from '@/components/ui/switch';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { BlockFieldBuilder } from '@/components/BlockFieldBuilder';

import { toast } from 'sonner';

// Deep clone helper
const clone = <T,>(v: T): T => JSON.parse(JSON.stringify(v));

const Settings = () => {
  const blocks = useStore(checklistBlocksStore);
  const fields = useStore(blockFieldsStore);
  const nav = useStore(navItemsStore);
  const reportBlocks = useStore(reportBlocksStore);

  // Draft state (editable copies)
  const [draftNav, setDraftNav] = useState<NavItem[]>(() => clone(nav.items));
  const [draftBlocks, setDraftBlocks] = useState<ChecklistBlock[]>(() => clone(blocks.items));
  const [draftFields, setDraftFields] = useState<BlockField[]>(() => clone(fields.items));
  const [draftReportBlocks, setDraftReportBlocks] = useState<ReportBlock[]>(() => clone(reportBlocks.items));

  const [editingId, setEditingId] = useState<string | null>(null);
  const [editLabel, setEditLabel] = useState('');
  const [expandedBlockId, setExpandedBlockId] = useState<string | null>(null);
  const [newBlockName, setNewBlockName] = useState('');

  // Track dirty state
  const isDirty = useCallback(() => {
    return JSON.stringify(draftNav) !== JSON.stringify(nav.items) ||
           JSON.stringify(draftBlocks) !== JSON.stringify(blocks.items) ||
           JSON.stringify(draftFields) !== JSON.stringify(fields.items) ||
           JSON.stringify(draftReportBlocks) !== JSON.stringify(reportBlocks.items);
  }, [draftNav, draftBlocks, draftFields, draftReportBlocks, nav.items, blocks.items, fields.items, reportBlocks.items]);

  const [dirty, setDirty] = useState(false);
  useEffect(() => {
    setDirty(isDirty());
  }, [isDirty]);

  // Sync from store if external changes (unlikely but safe)
  const initializedRef = useRef(false);
  useEffect(() => {
    if (!initializedRef.current) {
      initializedRef.current = true;
      return;
    }
    if (!dirty) {
      setDraftNav(clone(nav.items));
      setDraftBlocks(clone(blocks.items));
      setDraftFields(clone(fields.items));
      setDraftReportBlocks(clone(reportBlocks.items));
    }
  }, [nav.items, blocks.items, fields.items, reportBlocks.items]);

  const sortedNav = [...draftNav].sort((a, b) => a.order - b.order);
  const sortedBlocks = [...draftBlocks].sort((a, b) => a.order - b.order);
  const sortedReportBlocks = [...draftReportBlocks].sort((a, b) => a.order - b.order);

  // Nav helpers (operate on draft)
  const toggleVisibility = (id: string, current: boolean) => {
    setDraftNav(prev => prev.map(i => i.id === id ? { ...i, visible: !current } : i));
  };

  const deleteNavItem = (id: string) => {
    setDraftNav(prev => prev.filter(i => i.id !== id));
  };

  const startEdit = (id: string, label: string) => {
    setEditingId(id);
    setEditLabel(label);
  };

  const saveEdit = (id: string) => {
    if (editLabel.trim()) {
      setDraftNav(prev => prev.map(i => i.id === id ? { ...i, label: editLabel.trim() } : i));
    }
    setEditingId(null);
  };

  const moveItem = (index: number, direction: -1 | 1) => {
    const newIndex = index + direction;
    if (newIndex < 0 || newIndex >= sortedNav.length) return;
    const currentItem = sortedNav[index];
    const swapItem = sortedNav[newIndex];
    setDraftNav(prev => prev.map(i => {
      if (i.id === currentItem.id) return { ...i, order: swapItem.order };
      if (i.id === swapItem.id) return { ...i, order: currentItem.order };
      return i;
    }));
  };

  // Block helpers (operate on draft)
  const moveBlock = (index: number, direction: -1 | 1) => {
    const newIndex = index + direction;
    if (newIndex < 0 || newIndex >= sortedBlocks.length) return;
    const curr = sortedBlocks[index];
    const swap = sortedBlocks[newIndex];
    setDraftBlocks(prev => prev.map(b => {
      if (b.id === curr.id) return { ...b, order: swap.order };
      if (b.id === swap.id) return { ...b, order: curr.order };
      return b;
    }));
  };

  const addBlock = () => {
    if (!newBlockName.trim()) return;
    const newBlock: ChecklistBlock = {
      id: Date.now().toString(36) + Math.random().toString(36).slice(2, 8),
      name: newBlockName.trim(),
      order: sortedBlocks.length,
      isSystem: false,
      visible: true,
    };
    setDraftBlocks(prev => [...prev, newBlock]);
    setNewBlockName('');
  };

  const deleteBlock = (block: ChecklistBlock) => {
    setDraftFields(prev => prev.filter(f => f.blockId !== block.id));
    setDraftBlocks(prev => prev.filter(b => b.id !== block.id));
  };

  // Field helpers (operate on draft)
  const addField = (field: Omit<BlockField, 'id'>) => {
    const newField: BlockField = {
      ...field,
      id: Date.now().toString(36) + Math.random().toString(36).slice(2, 8),
    } as BlockField;
    setDraftFields(prev => [...prev, newField]);
  };

  const updateField = (id: string, data: Partial<BlockField>) => {
    setDraftFields(prev => prev.map(f => f.id === id ? { ...f, ...data } : f));
  };

  const removeField = (id: string) => {
    setDraftFields(prev => prev.filter(f => f.id !== id));
  };

  // SAVE: persist all drafts to stores
  const handleSave = async () => {
    await navItemsStore.setAll(draftNav);
    await checklistBlocksStore.setAll(draftBlocks);
    await blockFieldsStore.setAll(draftFields);
    await reportBlocksStore.setAll(draftReportBlocks);
    nav.refresh();
    blocks.refresh();
    fields.refresh();
    reportBlocks.refresh();
    toast.success('Configurações salvas com sucesso!');
  };

  const moveReportBlock = (index: number, dir: -1 | 1) => {
    const target = index + dir;
    if (target < 0 || target >= sortedReportBlocks.length) return;
    const a = sortedReportBlocks[index];
    const b = sortedReportBlocks[target];
    setDraftReportBlocks(prev => prev.map(rb => {
      if (rb.id === a.id) return { ...rb, order: b.order };
      if (rb.id === b.id) return { ...rb, order: a.order };
      return rb;
    }));
  };

  const [editingReportId, setEditingReportId] = useState<string | null>(null);
  const [editReportLabel, setEditReportLabel] = useState('');

  const deleteReportBlock = (id: string) => {
    setDraftReportBlocks(prev => prev.filter(r => r.id !== id));
  };

  return (
    <div className="p-4 md:p-6 max-w-3xl mx-auto space-y-6 pb-24">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold text-foreground flex items-center gap-2">
          <SettingsIcon className="h-6 w-6" /> Configurações
        </h1>
      </div>

      {/* Sidebar Nav */}
      <Card>
        <CardHeader>
          <CardTitle className="text-lg">Menu Lateral</CardTitle>
        </CardHeader>
        <CardContent className="space-y-1">
          {sortedNav.map((item, index) => (
            <div
              key={item.id}
              className="flex items-center gap-3 py-2 px-3 rounded-md hover:bg-muted/50 transition-colors"
            >
              <div className="flex flex-col gap-0.5">
                <button onClick={() => moveItem(index, -1)} disabled={index === 0}
                  className="text-muted-foreground hover:text-foreground disabled:opacity-30 text-xs leading-none">▲</button>
                <button onClick={() => moveItem(index, 1)} disabled={index === sortedNav.length - 1}
                  className="text-muted-foreground hover:text-foreground disabled:opacity-30 text-xs leading-none">▼</button>
              </div>
              <Switch
                checked={item.visible}
                onCheckedChange={() => toggleVisibility(item.id, item.visible)}
                className="shrink-0"
              />
              {editingId === item.id ? (
                <div className="flex items-center gap-1 flex-1">
                  <Input value={editLabel} onChange={e => setEditLabel(e.target.value)}
                    className="h-8 text-sm" autoFocus
                    onKeyDown={e => { if (e.key === 'Enter') saveEdit(item.id); if (e.key === 'Escape') setEditingId(null); }}
                  />
                  <Button size="icon" variant="ghost" className="h-8 w-8" onClick={() => saveEdit(item.id)}>
                    <Check className="h-4 w-4 text-primary" />
                  </Button>
                  <Button size="icon" variant="ghost" className="h-8 w-8" onClick={() => setEditingId(null)}>
                    <X className="h-4 w-4 text-destructive" />
                  </Button>
                </div>
              ) : (
                <div className="flex items-center gap-2 flex-1 min-w-0">
                  <span className={`text-sm truncate ${!item.visible ? 'text-muted-foreground line-through' : 'text-foreground'}`}>
                    {item.label}
                  </span>
                  <Button size="icon" variant="ghost" className="h-7 w-7 shrink-0" onClick={() => startEdit(item.id, item.label)}>
                    <Pencil className="h-3.5 w-3.5 text-muted-foreground" />
                  </Button>
                  <Button size="icon" variant="ghost" className="h-7 w-7 shrink-0 text-destructive" onClick={() => deleteNavItem(item.id)}>
                    <Trash2 className="h-3.5 w-3.5" />
                  </Button>
                </div>
              )}
            </div>
          ))}
        </CardContent>
      </Card>

      {/* Checklist Blocks */}
      <Card>
        <CardHeader>
          <CardTitle className="text-lg">Blocos do Checklist</CardTitle>
          <p className="text-sm text-muted-foreground">
            Configure blocos fixos (ativar/desativar) e crie blocos personalizados com campos dinâmicos.
          </p>
        </CardHeader>
        <CardContent className="space-y-2">
          {sortedBlocks.map((block, index) => {
            const isExpanded = expandedBlockId === block.id;
            const blockFields = draftFields.filter(f => f.blockId === block.id);
            return (
              <Card key={block.id} className={`border ${isExpanded ? 'border-primary/30' : ''}`}>
                <div className="flex items-center gap-2 p-3">
                  <div className="flex flex-col gap-0.5">
                    <button onClick={() => moveBlock(index, -1)} disabled={index === 0}
                      className="text-muted-foreground hover:text-foreground disabled:opacity-30 text-xs">▲</button>
                    <button onClick={() => moveBlock(index, 1)} disabled={index === sortedBlocks.length - 1}
                      className="text-muted-foreground hover:text-foreground disabled:opacity-30 text-xs">▼</button>
                  </div>
                  <Switch
                    checked={block.visible !== false}
                    onCheckedChange={v => setDraftBlocks(prev => prev.map(b => b.id === block.id ? { ...b, visible: v } : b))}
                    className="shrink-0"
                  />
                  <div className="flex-1 min-w-0">
                    <span className={`text-sm font-medium ${block.visible === false ? 'text-muted-foreground line-through' : 'text-foreground'}`}>
                      {block.name}
                    </span>
                    {!block.isSystem && blockFields.length > 0 && (
                      <span className="text-xs text-muted-foreground ml-2">{blockFields.length} campo(s)</span>
                    )}
                  </div>
                  <Button variant="ghost" size="icon" className="h-7 w-7"
                    onClick={() => setExpandedBlockId(isExpanded ? null : block.id)}>
                    {isExpanded ? <ChevronUp className="h-4 w-4" /> : <ChevronDown className="h-4 w-4" />}
                  </Button>
                  <Button variant="ghost" size="icon" className="h-7 w-7 text-destructive"
                    onClick={() => deleteBlock(block)}>
                    <Trash2 className="h-4 w-4" />
                  </Button>
                </div>
                {isExpanded && (
                  <div className="px-3 pb-3 border-t border-border pt-3">
                    <div className="mb-3">
                      <label className="text-xs font-medium text-muted-foreground">Nome do bloco</label>
                      <Input
                        value={block.name}
                        onChange={e => setDraftBlocks(prev => prev.map(b => b.id === block.id ? { ...b, name: e.target.value } : b))}
                        className="mt-1 h-8 text-sm"
                      />
                    </div>
                    <div className="mb-3">
                      <label className="text-xs font-medium text-muted-foreground">Descrição</label>
                      <Input
                        value={block.description || ''}
                        onChange={e => setDraftBlocks(prev => prev.map(b => b.id === block.id ? { ...b, description: e.target.value } : b))}
                        placeholder="Instrução ou descrição do bloco..."
                        className="mt-1 h-8 text-sm"
                      />
                    </div>
                    <label className="text-xs font-medium text-muted-foreground mb-2 block">Campos</label>
                    <BlockFieldBuilder
                      fields={draftFields}
                      blockId={block.id}
                      onAdd={(f) => addField(f as any)}
                      onUpdate={(id, data) => updateField(id, data)}
                      onRemove={(id) => removeField(id)}
                    />
                  </div>
                )}
              </Card>
            );
          })}

          {/* Add new block */}
          <div className="flex gap-2 pt-2">
            <Input
              value={newBlockName}
              onChange={e => setNewBlockName(e.target.value)}
              placeholder="Nome do novo bloco..."
              className="h-9 text-sm"
              onKeyDown={e => { if (e.key === 'Enter') addBlock(); }}
            />
            <Button onClick={addBlock} disabled={!newBlockName.trim()} size="sm" className="shrink-0">
              <Plus className="h-4 w-4 mr-1" /> Criar bloco
            </Button>
          </div>
        </CardContent>
      </Card>

      {/* Report Blocks */}
      <Card>
        <CardHeader>
          <CardTitle className="text-lg">Blocos do Relatório</CardTitle>
        </CardHeader>
        <CardContent className="space-y-1">
          {sortedReportBlocks.map((rb, index) => (
            <div key={rb.id} className="flex items-center gap-2 py-2 border-b border-border last:border-0">
              <div className="flex flex-col gap-0.5">
                <button type="button" onClick={() => moveReportBlock(index, -1)} disabled={index === 0}
                  className="text-muted-foreground hover:text-foreground disabled:opacity-30 p-0.5">
                  <ChevronUp className="h-3.5 w-3.5" />
                </button>
                <button type="button" onClick={() => moveReportBlock(index, 1)} disabled={index === sortedReportBlocks.length - 1}
                  className="text-muted-foreground hover:text-foreground disabled:opacity-30 p-0.5">
                  <ChevronDown className="h-3.5 w-3.5" />
                </button>
              </div>
              {editingReportId === rb.id ? (
                <div className="flex items-center gap-1 flex-1">
                  <Input value={editReportLabel} onChange={e => setEditReportLabel(e.target.value)}
                    className="h-8 text-sm" autoFocus
                    onKeyDown={e => {
                      if (e.key === 'Enter' && editReportLabel.trim()) {
                        setDraftReportBlocks(prev => prev.map(r => r.id === rb.id ? { ...r, label: editReportLabel.trim() } : r));
                        setEditingReportId(null);
                      }
                      if (e.key === 'Escape') setEditingReportId(null);
                    }}
                  />
                  <Button size="icon" variant="ghost" className="h-8 w-8" onClick={() => {
                    if (editReportLabel.trim()) {
                      setDraftReportBlocks(prev => prev.map(r => r.id === rb.id ? { ...r, label: editReportLabel.trim() } : r));
                    }
                    setEditingReportId(null);
                  }}>
                    <Check className="h-4 w-4 text-primary" />
                  </Button>
                  <Button size="icon" variant="ghost" className="h-8 w-8" onClick={() => setEditingReportId(null)}>
                    <X className="h-4 w-4 text-destructive" />
                  </Button>
                </div>
              ) : (
                <div className="flex items-center gap-2 flex-1 min-w-0">
                  <span className={`text-sm font-medium truncate ${!rb.visible ? 'text-muted-foreground line-through' : 'text-foreground'}`}>
                    {rb.label}
                  </span>
                  <Button size="icon" variant="ghost" className="h-7 w-7 shrink-0" onClick={() => { setEditingReportId(rb.id); setEditReportLabel(rb.label); }}>
                    <Pencil className="h-3.5 w-3.5 text-muted-foreground" />
                  </Button>
                  <Button size="icon" variant="ghost" className="h-7 w-7 shrink-0 text-destructive" onClick={() => deleteReportBlock(rb.id)}>
                    <Trash2 className="h-3.5 w-3.5" />
                  </Button>
                </div>
              )}
              <Switch
                checked={rb.visible}
                onCheckedChange={(checked) => {
                  setDraftReportBlocks(prev => prev.map(r => r.id === rb.id ? { ...r, visible: checked } : r));
                }}
              />
            </div>
          ))}
        </CardContent>
      </Card>
      {/* Floating Save Button */}
      {dirty && (
        <div className="fixed bottom-6 right-6 z-50 animate-in fade-in slide-in-from-bottom-4">
          <Button onClick={handleSave} size="lg" className="shadow-lg gap-2">
            <Save className="h-5 w-5" />
            Salvar Configurações
          </Button>
        </div>
      )}
    </div>
  );
};

export default Settings;
