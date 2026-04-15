import { Link, useNavigate } from 'react-router-dom';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { Settings, ClipboardList, Plus, Copy } from 'lucide-react';
import { checklistsStore, companiesStore, sectorsStore } from '@/lib/storage';
import { seedDefaults } from '@/lib/storage';
import logoColorida from '@/assets/logo-colorida.png';

seedDefaults();

const Index = () => {
  const navigate = useNavigate();
  const checklists = checklistsStore.getAll();
  const companies = companiesStore.getAll();
  const sectors = sectorsStore.getAll();

  return (
    <div className="min-h-screen bg-background">
      <div className="p-4 max-w-lg mx-auto pb-24">
        {/* Header */}
        <div className="flex flex-col items-center mb-8 pt-6">
          <img src={logoColorida} alt="MedWork" className="h-16 mb-3" />
          <h1 className="text-xl font-bold text-foreground">Visita Técnica</h1>
          <p className="text-sm text-muted-foreground">Entrevista de Percepção de Riscos Ocupacionais - NR 01</p>
        </div>

        {/* Actions */}
        <div className="grid grid-cols-2 gap-3 mb-8">
          <Link to="/checklist">
            <Button className="w-full h-20 flex-col gap-1" size="lg">
              <Plus className="h-6 w-6" />
              <span className="text-xs">Novo Checklist</span>
            </Button>
          </Link>
          <Link to="/settings">
            <Button variant="secondary" className="w-full h-20 flex-col gap-1" size="lg">
              <Settings className="h-6 w-6" />
              <span className="text-xs">Configurações e cadastros</span>
            </Button>
          </Link>
        </div>

        {/* Recent checklists */}
        <div>
          <h2 className="text-lg font-semibold text-foreground mb-3 flex items-center gap-2">
            <ClipboardList className="h-5 w-5" /> Checklists Recentes
          </h2>
          {checklists.length === 0 ? (
            <Card className="p-6 text-center">
              <p className="text-sm text-muted-foreground">Nenhum checklist criado ainda.</p>
              <p className="text-xs text-muted-foreground mt-1">Configure empresas, setores e funções em Configurações.</p>
            </Card>
          ) : (
            <div className="space-y-2">
              {checklists.slice().reverse().slice(0, 10).map(cl => {
                const company = companies.find(c => c.id === cl.companyId);
                const sector = sectors.find(s => s.id === cl.sectorId);
                return (
                  <Card key={cl.id} className="p-3 flex items-center justify-between">
                    <div>
                      <p className="font-medium text-foreground text-sm">{company?.name || 'Empresa removida'}</p>
                      <p className="text-xs text-muted-foreground">{sector?.name || 'Setor removido'} · {new Date(cl.createdAt).toLocaleDateString('pt-BR')}</p>
                    </div>
                    <button
                      type="button"
                      className="p-2 rounded-md text-muted-foreground hover:text-primary hover:bg-primary/10 transition-colors"
                      title="Duplicar checklist"
                      onClick={() => navigate(`/checklist/${cl.id}`)}
                    >
                      <Copy className="h-4 w-4" />
                    </button>
                  </Card>
                );
              })}
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default Index;
