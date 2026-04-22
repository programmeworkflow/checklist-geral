import { useStore } from '@/hooks/useStore';
import { companiesStore, sectorsStore, functionsStore, checklistsStore, type DocType } from '@/lib/storage';
import { safeUploadFile } from '@/lib/uploadFile';
import { useNavigate } from 'react-router-dom';
import { useState, useMemo, useRef, useCallback } from 'react';
import { useQuery } from '@tanstack/react-query';
import { Card } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Progress } from '@/components/ui/progress';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Building2, Plus, Pencil, Trash2, ChevronRight, Search, ImagePlus, X } from 'lucide-react';
import { toast } from 'sonner';

const DOC_TYPES: { value: DocType; label: string; digits: number | null }[] = [
  { value: 'CNPJ', label: 'CNPJ', digits: 14 },
  { value: 'CPF', label: 'CPF', digits: 11 },
  { value: 'CEI', label: 'CEI', digits: null },
  { value: 'CAEPF', label: 'CAEPF', digits: null },
];

function formatDoc(value: string, type: DocType): string {
  const nums = value.replace(/\D/g, '');
  if (type === 'CNPJ' && nums.length <= 14) {
    return nums.replace(/^(\d{2})(\d{3})(\d{3})(\d{4})(\d{0,2}).*/, (_, a, b, c, d, e) =>
      e ? `${a}.${b}.${c}/${d}-${e}` : nums.length > 12 ? `${a}.${b}.${c}/${d}` : nums
    );
  }
  if (type === 'CPF' && nums.length <= 11) {
    return nums.replace(/^(\d{3})(\d{3})(\d{3})(\d{0,2}).*/, (_, a, b, c, d) =>
      d ? `${a}.${b}.${c}-${d}` : nums.length > 9 ? `${a}.${b}.${c}` : nums
    );
  }
  return nums;
}

function validateDoc(value: string, type: DocType): string | null {
  const nums = value.replace(/\D/g, '');
  if (!nums) return null;
  const info = DOC_TYPES.find(d => d.value === type);
  if (info?.digits && nums.length !== info.digits) {
    return `${type} deve ter ${info.digits} dígitos (atual: ${nums.length})`;
  }
  return null;
}

function DocField({ docType, setDocType, doc, setDoc }: {
  docType: DocType; setDocType: (v: DocType) => void;
  doc: string; setDoc: (v: string) => void;
}) {
  const error = validateDoc(doc, docType);
  return (
    <div className="space-y-1.5">
      <div className="flex gap-2">
        <Select value={docType} onValueChange={v => { setDocType(v as DocType); setDoc(''); }}>
          <SelectTrigger className="w-[110px] shrink-0">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            {DOC_TYPES.map(d => (
              <SelectItem key={d.value} value={d.value}>{d.label}</SelectItem>
            ))}
          </SelectContent>
        </Select>
        <Input
          value={formatDoc(doc, docType)}
          onChange={e => {
            const nums = e.target.value.replace(/\D/g, '');
            const info = DOC_TYPES.find(d => d.value === docType);
            const max = info?.digits || 20;
            setDoc(nums.slice(0, max));
          }}
          placeholder={`Nº do ${docType} (opcional)`}
          inputMode="numeric"
        />
      </div>
      {error && <p className="text-xs text-destructive">{error}</p>}
    </div>
  );
}

export default function Empresas() {
  const navigate = useNavigate();
  const companies = useStore(companiesStore);
  const sectors = useStore(sectorsStore);
  const functions = useStore(functionsStore);

  const [adding, setAdding] = useState(false);
  const [newName, setNewName] = useState('');
  const [newDocType, setNewDocType] = useState<DocType>('CNPJ');
  const [newDoc, setNewDoc] = useState('');
  const [newLogo, setNewLogo] = useState('');
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editName, setEditName] = useState('');
  const [editDocType, setEditDocType] = useState<DocType>('CNPJ');
  const [editDoc, setEditDoc] = useState('');
  const [editLogo, setEditLogo] = useState('');
  const [search, setSearch] = useState('');
  const logoInputRef = useRef<HTMLInputElement>(null);
  const editLogoInputRef = useRef<HTMLInputElement>(null);

  const { data: checklists = [] } = useQuery({ queryKey: ['checklists'], queryFn: () => checklistsStore.getAll() });

  const filteredCompanies = useMemo(() => {
    if (!search.trim()) return companies.items;
    const q = search.toLowerCase();
    return companies.items.filter(c =>
      c.name.toLowerCase().includes(q) || (c.doc || c.cnpj || '').includes(q)
    );
  }, [companies.items, search]);

  const handleLogoUpload = async (e: React.ChangeEvent<HTMLInputElement>, setter: (val: string) => void) => {
    const file = e.target.files?.[0];
    if (!file) return;
    e.target.value = '';
    const url = await safeUploadFile(file, 'logos');
    setter(url);
  };

  const handleAdd = useCallback(() => {
    if (!newName.trim()) return;
    companies.add({
      name: newName.trim(),
      docType: newDocType,
      doc: newDoc || undefined,
      logo: newLogo || undefined,
    } as any);
    setNewName(''); setNewDoc(''); setNewLogo(''); setNewDocType('CNPJ');
    setAdding(false);
    toast.success('Empresa adicionada');
  }, [newName, newDocType, newDoc, newLogo, companies]);

  const handleUpdate = useCallback((id: string) => {
    if (!editName.trim()) return;
    companies.update(id, {
      name: editName.trim(),
      docType: editDocType,
      doc: editDoc || undefined,
      logo: editLogo || undefined,
    });
    setEditingId(null);
    toast.success('Empresa atualizada');
  }, [editName, editDocType, editDoc, editLogo, companies]);

  const handleDelete = (id: string) => {
    sectors.items.filter(s => s.companyId === id).forEach(s => {
      functions.items.filter(f => f.sectorId === s.id).forEach(f => functions.remove(f.id));
      sectors.remove(s.id);
    });
    companies.remove(id);
    toast.success('Empresa removida');
  };

  const startEdit = (company: any) => {
    setEditingId(company.id);
    setEditName(company.name);
    setEditDocType(company.docType || 'CNPJ');
    setEditDoc(company.doc || company.cnpj || '');
    setEditLogo(company.logo || '');
  };

  const LogoUploader = ({ logo, onUpload, onRemove, inputRef }: {
    logo: string; onUpload: (e: React.ChangeEvent<HTMLInputElement>) => void;
    onRemove: () => void; inputRef: React.RefObject<HTMLInputElement>;
  }) => (
    <div className="flex items-center gap-3">
      <input ref={inputRef} type="file" accept="image/*" className="hidden" onChange={onUpload} />
      {logo ? (
        <div className="relative group">
          <img src={logo} alt="Logo" className="h-14 w-14 object-contain rounded border border-border bg-white p-1" />
          <button type="button" className="absolute -top-1 -right-1 bg-destructive text-destructive-foreground rounded-full p-0.5 opacity-0 group-hover:opacity-100 transition-opacity"
            onClick={onRemove}><X className="h-3 w-3" /></button>
        </div>
      ) : (
        <Button type="button" variant="outline" size="sm" onClick={() => inputRef.current?.click()}>
          <ImagePlus className="h-4 w-4 mr-1" /> Logo
        </Button>
      )}
    </div>
  );

  const displayDoc = (company: any) => {
    const doc = company.doc || company.cnpj;
    if (!doc) return null;
    const type = company.docType || 'CNPJ';
    return `${type}: ${formatDoc(doc, type)}`;
  };

  return (
    <div className="p-4 md:p-6 max-w-3xl mx-auto space-y-4">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold text-foreground flex items-center gap-2">
          <Building2 className="h-6 w-6" /> Empresas
        </h1>
        <Button size="sm" onClick={() => setAdding(true)} disabled={adding}>
          <Plus className="h-4 w-4 mr-1" /> Nova Empresa
        </Button>
      </div>

      <div className="relative">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
        <Input placeholder="Pesquisar empresa..." value={search} onChange={e => setSearch(e.target.value)} className="pl-9" />
      </div>

      {adding && (
        <Card className="p-4 space-y-3 border-primary/30">
          <Input value={newName} onChange={e => setNewName(e.target.value)} placeholder="Nome da empresa" onKeyDown={e => e.key === 'Enter' && handleAdd()} autoFocus />
          <DocField docType={newDocType} setDocType={setNewDocType} doc={newDoc} setDoc={setNewDoc} />
          <LogoUploader logo={newLogo} onUpload={e => handleLogoUpload(e, setNewLogo)} onRemove={() => setNewLogo('')} inputRef={logoInputRef as any} />
          <div className="flex gap-2">
            <Button size="sm" onClick={handleAdd}>Salvar</Button>
            <Button size="sm" variant="ghost" onClick={() => { setAdding(false); setNewName(''); setNewDoc(''); setNewLogo(''); setNewDocType('CNPJ'); }}>Cancelar</Button>
          </div>
        </Card>
      )}

      {filteredCompanies.length === 0 && !adding ? (
        <Card className="p-8 text-center">
          <Building2 className="h-8 w-8 mx-auto text-muted-foreground mb-2" />
          <p className="text-sm text-muted-foreground">{search ? 'Nenhuma empresa encontrada.' : 'Nenhuma empresa cadastrada.'}</p>
          {!search && (
            <Button className="mt-4" onClick={() => setAdding(true)}>
              <Plus className="h-4 w-4 mr-1" /> Cadastrar Empresa
            </Button>
          )}
        </Card>
      ) : (
        <div className="space-y-2">
          {filteredCompanies.map(company => {
            const companySectors = sectors.items.filter(s => s.companyId === company.id);
            const companyFunctions = companySectors.flatMap(s => functions.items.filter(f => f.sectorId === s.id));
            const completedIds = new Set(checklists.filter(cl => cl.companyId === company.id).flatMap(cl => cl.functionIds || []));
            const total = companyFunctions.length;
            const done = companyFunctions.filter(f => completedIds.has(f.id)).length;
            const pct = total > 0 ? Math.round((done / total) * 100) : 0;

            return (
              <Card key={company.id} className="p-4 cursor-pointer hover:bg-muted/30 transition-colors"
                onClick={() => editingId !== company.id && navigate(`/empresas/${company.id}`)}>
                {editingId === company.id ? (
                  <div className="space-y-3" onClick={e => e.stopPropagation()}>
                    <Input value={editName} onChange={e => setEditName(e.target.value)} onKeyDown={e => e.key === 'Enter' && handleUpdate(company.id)} autoFocus />
                    <DocField docType={editDocType} setDocType={setEditDocType} doc={editDoc} setDoc={setEditDoc} />
                    <LogoUploader logo={editLogo} onUpload={e => handleLogoUpload(e, setEditLogo)} onRemove={() => setEditLogo('')} inputRef={editLogoInputRef as any} />
                    <div className="flex gap-2">
                      <Button size="sm" onClick={() => handleUpdate(company.id)}>OK</Button>
                      <Button size="sm" variant="ghost" onClick={() => setEditingId(null)}>✕</Button>
                    </div>
                  </div>
                ) : (
                  <div className="flex items-center gap-3">
                    {company.logo ? (
                      <img src={company.logo} alt="Logo" className="h-10 w-10 object-contain rounded border border-border bg-white p-0.5 shrink-0" />
                    ) : (
                      <Building2 className="h-5 w-5 text-primary shrink-0" />
                    )}
                    <div className="flex-1 min-w-0">
                      <p className="font-medium text-foreground">{company.name}</p>
                      {displayDoc(company) && <p className="text-xs text-muted-foreground">{displayDoc(company)}</p>}
                      <p className="text-xs text-muted-foreground">{companySectors.length} setor(es) · {total} cargo(s)</p>
                      {total > 0 && (
                        <div className="mt-1.5">
                          <Progress value={pct} className="h-1.5" />
                          <p className="text-xs text-muted-foreground mt-0.5">{pct}% entrevistado</p>
                        </div>
                      )}
                    </div>
                    <div className="flex gap-1 shrink-0" onClick={e => e.stopPropagation()}>
                      <button type="button" className="p-1.5 rounded hover:bg-primary/10 text-muted-foreground hover:text-primary"
                        onClick={() => startEdit(company)}><Pencil className="h-4 w-4" /></button>
                      <button type="button" className="p-1.5 rounded hover:bg-destructive/10 text-muted-foreground hover:text-destructive"
                        onClick={() => handleDelete(company.id)}><Trash2 className="h-4 w-4" /></button>
                    </div>
                    <ChevronRight className="h-5 w-5 text-muted-foreground shrink-0" />
                  </div>
                )}
              </Card>
            );
          })}
        </div>
      )}
    </div>
  );
}
