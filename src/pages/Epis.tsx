import { useState, useRef } from 'react';
import { useStore } from '@/hooks/useStore';
import { episStore } from '@/lib/storage';
import { safeUploadFile } from '@/lib/uploadFile';
import { HardHat, Plus, Pencil, Trash2, Check, X, ImagePlus } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Card } from '@/components/ui/card';
import { toast } from 'sonner';

export default function Epis() {
  const epis = useStore(episStore);
  const [adding, setAdding] = useState(false);
  const [editing, setEditing] = useState<string | null>(null);
  const [form, setForm] = useState({ name: '', description: '', image: '' });
  const fileRef = useRef<HTMLInputElement>(null);

  const handleImage = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    e.target.value = '';
    const url = await safeUploadFile(file, 'epi-images');
    setForm(prev => ({ ...prev, image: url }));
  };

  const startAdd = () => { setForm({ name: '', description: '', image: '' }); setAdding(true); setEditing(null); };
  const startEdit = (item: any) => { setForm({ name: item.name, description: item.description || '', image: item.image || '' }); setEditing(item.id); setAdding(false); };
  const cancel = () => { setForm({ name: '', description: '', image: '' }); setAdding(false); setEditing(null); };

  const save = () => {
    if (!form.name.trim()) { toast.error('Nome é obrigatório'); return; }
    if (adding) {
      epis.add(form);
      toast.success('EPI adicionado');
    } else if (editing) {
      epis.update(editing, form);
      toast.success('EPI atualizado');
    }
    cancel();
  };

  return (
    <div className="p-4 md:p-6 max-w-3xl mx-auto space-y-4">
      <h1 className="text-2xl font-bold text-foreground flex items-center gap-2">
        <HardHat className="h-6 w-6" /> EPIs
      </h1>

      <input ref={fileRef} type="file" accept="image/*" className="hidden" onChange={handleImage} />

      <div className="space-y-2">
        {epis.items.map(item => (
          <Card key={item.id} className="p-3">
            {editing === item.id ? (
              <div className="space-y-2">
                <Input value={form.name} onChange={e => setForm({ ...form, name: e.target.value })} placeholder="Nome do EPI" />
                <Input value={form.description} onChange={e => setForm({ ...form, description: e.target.value })} placeholder="Descrição" />
                <div className="flex items-center gap-2">
                  <Button variant="outline" size="sm" onClick={() => fileRef.current?.click()}>
                    <ImagePlus className="h-4 w-4 mr-1" /> {form.image ? 'Trocar imagem' : 'Adicionar imagem'}
                  </Button>
                  {form.image && (
                    <>
                      <img src={form.image} alt="Preview" className="h-10 w-10 object-cover rounded border border-border" />
                      <Button variant="ghost" size="sm" onClick={() => setForm({ ...form, image: '' })}><X className="h-4 w-4" /></Button>
                    </>
                  )}
                </div>
                <div className="flex gap-2">
                  <Button size="sm" onClick={save}><Check className="h-4 w-4 mr-1" /> Salvar</Button>
                  <Button variant="ghost" size="sm" onClick={cancel}><X className="h-4 w-4" /></Button>
                </div>
              </div>
            ) : (
              <div className="flex items-center gap-3">
                {item.image && <img src={item.image} alt={item.name} className="h-12 w-12 object-cover rounded border border-border" />}
                <div className="flex-1">
                  <p className="font-medium text-foreground">{item.name}</p>
                  {item.description && <p className="text-sm text-muted-foreground">{item.description}</p>}
                </div>
                <div className="flex gap-1">
                  <Button variant="ghost" size="icon" onClick={() => startEdit(item)}><Pencil className="h-4 w-4" /></Button>
                  <Button variant="ghost" size="icon" onClick={() => epis.remove(item.id)}><Trash2 className="h-4 w-4" /></Button>
                </div>
              </div>
            )}
          </Card>
        ))}
      </div>

      {adding ? (
        <Card className="p-3 space-y-2">
          <Input value={form.name} onChange={e => setForm({ ...form, name: e.target.value })} placeholder="Nome do EPI" />
          <Input value={form.description} onChange={e => setForm({ ...form, description: e.target.value })} placeholder="Descrição" />
          <div className="flex items-center gap-2">
            <Button variant="outline" size="sm" onClick={() => fileRef.current?.click()}>
              <ImagePlus className="h-4 w-4 mr-1" /> Adicionar imagem
            </Button>
            {form.image && (
              <>
                <img src={form.image} alt="Preview" className="h-10 w-10 object-cover rounded border border-border" />
                <Button variant="ghost" size="sm" onClick={() => setForm({ ...form, image: '' })}><X className="h-4 w-4" /></Button>
              </>
            )}
          </div>
          <div className="flex gap-2">
            <Button size="sm" onClick={save}><Check className="h-4 w-4 mr-1" /> Adicionar</Button>
            <Button variant="ghost" size="sm" onClick={cancel}><X className="h-4 w-4" /></Button>
          </div>
        </Card>
      ) : (
        <Button onClick={startAdd}><Plus className="h-4 w-4 mr-1" /> Adicionar EPI</Button>
      )}
    </div>
  );
}
