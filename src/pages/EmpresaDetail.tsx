import { useParams, useNavigate } from 'react-router-dom';
import { useState, useMemo } from 'react';
import { useStore } from '@/hooks/useStore';
import { companiesStore, sectorsStore, functionsStore, checklistsStore, safetyMeasuresStore } from '@/lib/storage';
import { Card } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Progress } from '@/components/ui/progress';
import { ExcelImport } from '@/components/ExcelImport';
import {
  ArrowLeft, Plus, Pencil, Trash2, MapPin, ClipboardCheck,
  CheckCircle2, Clock, ChevronDown, ChevronRight, XCircle, AlertTriangle,
} from 'lucide-react';
import { toast } from 'sonner';
import { cn } from '@/lib/utils';

export default function EmpresaDetail() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const companies = useStore(companiesStore);
  const sectors = useStore(sectorsStore);
  const functions = useStore(functionsStore);

  const company = companies.items.find(c => c.id === id);
  const companySectors = sectors.items.filter(s => s.companyId === id);
  const companyFunctions = companySectors.flatMap(s =>
    functions.items.filter(f => f.sectorId === s.id)
  );
  const checklists = checklistsStore.getAll();
  const allMeasures = safetyMeasuresStore.getAll();

  const completedFunctionIds = new Set(
    checklists.filter(cl => cl.companyId === id).flatMap(cl => cl.functionIds || [])
  );
  const totalFunctions = companyFunctions.length;
  const completedCount = companyFunctions.filter(f => completedFunctionIds.has(f.id)).length;
  const pendingCount = totalFunctions - completedCount;
  const progressPercent = totalFunctions > 0 ? Math.round((completedCount / totalFunctions) * 100) : 0;

  // Dashboard: conformities/non-conformities
  const { conformities, nonConformities } = useMemo(() => {
    let conf = 0, nonConf = 0;
    checklists.filter(cl => cl.companyId === id).forEach(cl => {
      const statuses = (cl as any).measureStatuses || cl.formData?.measureStatuses || {};
      Object.values(statuses).forEach((status: any) => {
        if (status === 1) conf++;
        if (status === 2) nonConf++;
      });
    });
    return { conformities: conf, nonConformities: nonConf };
  }, [checklists, id]);

  // UI state
  const [showImport, setShowImport] = useState(false);
  const [expandedSector, setExpandedSector] = useState<string | null>(companySectors[0]?.id || null);
  const [addingSector, setAddingSector] = useState(false);
  const [newSectorName, setNewSectorName] = useState('');
  const [editingSector, setEditingSector] = useState<string | null>(null);
  const [editSectorName, setEditSectorName] = useState('');
  const [addingFunctionFor, setAddingFunctionFor] = useState<string | null>(null);
  const [newFunctionName, setNewFunctionName] = useState('');
  const [editingFunction, setEditingFunction] = useState<string | null>(null);
  const [editFunctionName, setEditFunctionName] = useState('');

  if (!company) {
    return (
      <div className="p-6 text-center">
        <p className="text-muted-foreground">Empresa não encontrada.</p>
        <Button variant="outline" className="mt-4" onClick={() => navigate('/empresas')}>
          <ArrowLeft className="h-4 w-4 mr-1" /> Voltar
        </Button>
      </div>
    );
  }

  const handleAddSector = () => {
    if (!newSectorName.trim()) return;
    sectors.add({ companyId: id!, name: newSectorName.trim() } as any);
    setNewSectorName('');
    setAddingSector(false);
    toast.success('Setor adicionado');
  };

  const handleUpdateSector = (sectorId: string) => {
    if (!editSectorName.trim()) return;
    sectors.update(sectorId, { name: editSectorName.trim() });
    setEditingSector(null);
    toast.success('Setor atualizado');
  };

  const handleDeleteSector = (sectorId: string) => {
    functions.items.filter(f => f.sectorId === sectorId).forEach(f => functions.remove(f.id));
    sectors.remove(sectorId);
    toast.success('Setor removido');
  };

  const handleAddFunction = (sectorId: string) => {
    if (!newFunctionName.trim()) return;
    functions.add({ sectorId, name: newFunctionName.trim() } as any);
    setNewFunctionName('');
    setAddingFunctionFor(null);
    toast.success('Cargo adicionado');
  };

  const handleUpdateFunction = (funcId: string) => {
    if (!editFunctionName.trim()) return;
    functions.update(funcId, { name: editFunctionName.trim() });
    setEditingFunction(null);
    toast.success('Cargo atualizado');
  };

  const handleDeleteFunction = (funcId: string) => {
    functions.remove(funcId);
    toast.success('Cargo removido');
  };

  return (
    <div className="p-4 md:p-6 max-w-4xl mx-auto space-y-6">
      {/* Header */}
      <div className="flex items-center gap-3">
        <Button variant="ghost" size="icon" onClick={() => navigate('/empresas')}>
          <ArrowLeft className="h-5 w-5" />
        </Button>
        <div className="flex-1 flex items-center gap-3">
          {(company as any).logo && (
            <img src={(company as any).logo} alt="Logo" className="h-12 w-12 object-contain rounded border border-border bg-white p-0.5 shrink-0" />
          )}
          <div>
            <h1 className="text-xl font-bold text-foreground">{company.name}</h1>
            {((company as any).doc || (company as any).cnpj) && (
              <p className="text-xs text-muted-foreground mt-0.5">{(company as any).docType || 'CNPJ'}: {(company as any).doc || (company as any).cnpj}</p>
            )}
            <p className="text-sm text-muted-foreground">Gestão de setores, cargos e visitas</p>
          </div>
        </div>
      </div>

      {/* Dashboard indicators */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
        <Card className="p-3 flex items-center gap-3">
          <Clock className="h-5 w-5 text-amber-500 shrink-0" />
          <div>
            <p className="text-lg font-bold text-foreground">{pendingCount}</p>
            <p className="text-xs text-muted-foreground">Pendentes</p>
          </div>
        </Card>
        <Card className="p-3 flex items-center gap-3">
          <CheckCircle2 className="h-5 w-5 text-green-600 shrink-0" />
          <div>
            <p className="text-lg font-bold text-foreground">{completedCount}</p>
            <p className="text-xs text-muted-foreground">Concluídos</p>
          </div>
        </Card>
        <Card className="p-3 flex items-center gap-3">
          <CheckCircle2 className="h-5 w-5 text-green-600 shrink-0" />
          <div>
            <p className="text-lg font-bold text-foreground">{conformities}</p>
            <p className="text-xs text-muted-foreground">Conformidades</p>
          </div>
        </Card>
        <Card className="p-3 flex items-center gap-3">
          <XCircle className="h-5 w-5 text-red-600 shrink-0" />
          <div>
            <p className="text-lg font-bold text-foreground">{nonConformities}</p>
            <p className="text-xs text-muted-foreground">Não Conform.</p>
          </div>
        </Card>
      </div>

      {/* Progress Card */}
      {totalFunctions > 0 && (
        <Card className="p-4">
          <div className="flex items-center justify-between mb-2">
            <span className="text-sm font-medium text-foreground flex items-center gap-2">
              <ClipboardCheck className="h-4 w-4" /> Progresso da Visita
            </span>
            <span className="text-sm font-semibold text-primary">{progressPercent}%</span>
          </div>
          <Progress value={progressPercent} className="h-2" />
          <p className="text-xs text-muted-foreground mt-1">
            {completedCount} de {totalFunctions} cargos entrevistados
          </p>
        </Card>
      )}

      {/* Actions */}
      <div className="flex flex-wrap gap-2">
        <Button size="sm" onClick={() => setAddingSector(true)} disabled={addingSector}>
          <Plus className="h-4 w-4 mr-1" /> Novo Setor
        </Button>
        <Button size="sm" variant="outline" onClick={() => setShowImport(!showImport)}>
          📥 Importar Setores/Cargos
        </Button>
      </div>

      {showImport && (
        <ExcelImport
          companyId={id!}
          companyName={company.name}
          onComplete={() => { sectors.refresh(); functions.refresh(); setShowImport(false); }}
        />
      )}

      {/* Add Sector Form */}
      {addingSector && (
        <Card className="p-3">
          <div className="flex gap-2">
            <Input
              value={newSectorName}
              onChange={e => setNewSectorName(e.target.value)}
              placeholder="Nome do setor"
              onKeyDown={e => e.key === 'Enter' && handleAddSector()}
              autoFocus
            />
            <Button size="sm" onClick={handleAddSector}>Salvar</Button>
            <Button size="sm" variant="ghost" onClick={() => { setAddingSector(false); setNewSectorName(''); }}>
              Cancelar
            </Button>
          </div>
        </Card>
      )}

      {/* Sectors & Functions */}
      {companySectors.length === 0 ? (
        <Card className="p-8 text-center">
          <MapPin className="h-8 w-8 mx-auto text-muted-foreground mb-2" />
          <p className="text-sm text-muted-foreground">Nenhum setor cadastrado.</p>
          <p className="text-xs text-muted-foreground mt-1">Adicione setores e cargos para iniciar as visitas.</p>
        </Card>
      ) : (
        <div className="space-y-2">
          {companySectors.map(sector => {
            const sectorFunctions = functions.items.filter(f => f.sectorId === sector.id);
            const isExpanded = expandedSector === sector.id;

            return (
              <Card key={sector.id} className="overflow-hidden">
                {/* Sector Header */}
                <button
                  type="button"
                  className="w-full flex items-center gap-3 p-3 bg-muted/70 hover:bg-muted transition-colors text-left"
                  onClick={() => setExpandedSector(isExpanded ? null : sector.id)}
                >
                  {isExpanded ? <ChevronDown className="h-4 w-4 text-muted-foreground" /> : <ChevronRight className="h-4 w-4 text-muted-foreground" />}
                  <MapPin className="h-4 w-4 text-primary" />
                  {editingSector === sector.id ? (
                    <div className="flex gap-2 flex-1" onClick={e => e.stopPropagation()}>
                      <Input
                        value={editSectorName}
                        onChange={e => setEditSectorName(e.target.value)}
                        onKeyDown={e => e.key === 'Enter' && handleUpdateSector(sector.id)}
                        autoFocus
                        className="h-8 text-sm"
                      />
                      <Button size="sm" variant="ghost" onClick={() => handleUpdateSector(sector.id)}>OK</Button>
                      <Button size="sm" variant="ghost" onClick={() => setEditingSector(null)}>✕</Button>
                    </div>
                  ) : (
                    <>
                      <span className="flex-1 font-semibold text-sm text-foreground">{sector.name}</span>
                      <span className="text-xs text-muted-foreground mr-2">{sectorFunctions.length} cargo(s)</span>
                      <div className="flex gap-1" onClick={e => e.stopPropagation()}>
                        <button
                          type="button"
                          className="p-1 rounded hover:bg-primary/10 text-muted-foreground hover:text-primary"
                          onClick={() => { setEditingSector(sector.id); setEditSectorName(sector.name); }}
                        >
                          <Pencil className="h-3.5 w-3.5" />
                        </button>
                        <button
                          type="button"
                          className="p-1 rounded hover:bg-destructive/10 text-muted-foreground hover:text-destructive"
                          onClick={() => handleDeleteSector(sector.id)}
                        >
                          <Trash2 className="h-3.5 w-3.5" />
                        </button>
                      </div>
                    </>
                  )}
                </button>

                {/* Functions List */}
                {isExpanded && (
                  <div className="border-t border-border px-3 pb-3 pt-2 space-y-1.5">
                    {sectorFunctions.map(func => {
                      const isCompleted = completedFunctionIds.has(func.id);
                      const funcChecklist = checklists.find(cl => cl.companyId === id && (cl.functionIds || []).includes(func.id));
                      
                      const handleFunctionClick = () => {
                        if (editingFunction === func.id) return;
                        if (isCompleted && funcChecklist) {
                          navigate(`/checklist/${funcChecklist.id}`);
                        } else {
                          if (window.confirm(`Deseja iniciar checklist para "${func.name}"?`)) {
                            navigate(`/checklist?empresa=${id}&setor=${sector.id}&funcao=${func.id}`);
                          }
                        }
                      };

                      return (
                        <div
                          key={func.id}
                          className={cn(
                            'flex items-center gap-2 p-2 rounded-md text-sm cursor-pointer hover:opacity-80 transition-opacity',
                            isCompleted ? 'bg-green-500/20 border border-green-500/40' : 'bg-muted/30'
                          )}
                          onClick={handleFunctionClick}
                        >
                          {isCompleted ? (
                            <CheckCircle2 className="h-4 w-4 text-green-600 shrink-0" />
                          ) : (
                            <Clock className="h-4 w-4 text-muted-foreground shrink-0" />
                          )}
                          {editingFunction === func.id ? (
                            <div className="flex gap-2 flex-1" onClick={e => e.stopPropagation()}>
                              <Input
                                value={editFunctionName}
                                onChange={e => setEditFunctionName(e.target.value)}
                                onKeyDown={e => e.key === 'Enter' && handleUpdateFunction(func.id)}
                                autoFocus
                                className="h-7 text-sm"
                              />
                              <Button size="sm" variant="ghost" className="h-7" onClick={() => handleUpdateFunction(func.id)}>OK</Button>
                              <Button size="sm" variant="ghost" className="h-7" onClick={() => setEditingFunction(null)}>✕</Button>
                            </div>
                          ) : (
                            <>
                              <span className={cn('flex-1', isCompleted ? 'text-green-800 dark:text-green-300 font-medium' : 'text-foreground')}>{func.name}</span>
                              <span className={cn(
                                'text-xs px-2 py-0.5 rounded-full',
                                isCompleted ? 'bg-green-500/20 text-green-700' : 'bg-muted text-muted-foreground'
                              )}>
                                {isCompleted ? 'Entrevistado' : 'Pendente'}
                              </span>
                              <div className="flex gap-1" onClick={e => e.stopPropagation()}>
                                <button
                                  type="button"
                                  className="p-1 rounded hover:bg-primary/10 text-muted-foreground hover:text-primary"
                                  onClick={() => { setEditingFunction(func.id); setEditFunctionName(func.name); }}
                                >
                                  <Pencil className="h-3.5 w-3.5" />
                                </button>
                                <button
                                  type="button"
                                  className="p-1 rounded hover:bg-destructive/10 text-muted-foreground hover:text-destructive"
                                  onClick={() => handleDeleteFunction(func.id)}
                                >
                                  <Trash2 className="h-3.5 w-3.5" />
                                </button>
                              </div>
                            </>
                          )}
                        </div>
                      );
                    })}

                    {/* Add Function */}
                    {addingFunctionFor === sector.id ? (
                      <div className="flex gap-2 pt-1">
                        <Input
                          value={newFunctionName}
                          onChange={e => setNewFunctionName(e.target.value)}
                          placeholder="Nome do cargo"
                          onKeyDown={e => e.key === 'Enter' && handleAddFunction(sector.id)}
                          autoFocus
                          className="h-8 text-sm"
                        />
                        <Button size="sm" className="h-8" onClick={() => handleAddFunction(sector.id)}>Salvar</Button>
                        <Button size="sm" variant="ghost" className="h-8" onClick={() => { setAddingFunctionFor(null); setNewFunctionName(''); }}>
                          Cancelar
                        </Button>
                      </div>
                    ) : (
                      <button
                        type="button"
                        className="flex items-center gap-1 text-xs text-primary hover:text-primary/80 pt-1"
                        onClick={() => setAddingFunctionFor(sector.id)}
                      >
                        <Plus className="h-3.5 w-3.5" /> Adicionar cargo
                      </button>
                    )}
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
