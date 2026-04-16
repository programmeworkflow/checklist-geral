import { Link, useNavigate } from 'react-router-dom';
import { Card } from '@/components/ui/card';
import { Settings, ClipboardList, Plus, ArrowRight, Building2, Calendar } from 'lucide-react';
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
        <div className="flex flex-col items-center mb-8 pt-8">
          <div className="rounded-3xl bg-gradient-to-br from-primary/10 to-accent/10 p-5 mb-4">
            <img src={logoColorida} alt="MedWork" className="h-20" />
          </div>
          <h1 className="text-2xl font-extrabold text-foreground tracking-tight">
            VIS<span className="text-gradient">TEC</span>
          </h1>
          <p className="text-sm text-muted-foreground mt-1 text-center max-w-xs">
            Entrevista de Percepcao de Riscos Ocupacionais - NR 01
          </p>
        </div>

        {/* Action cards */}
        <div className="grid grid-cols-2 gap-3 mb-8">
          <Link to="/checklist">
            <Card className="card-interactive h-24 flex flex-col items-center justify-center gap-2 bg-gradient-to-br from-accent/10 to-accent/5 border-accent/20 group">
              <div className="h-10 w-10 rounded-xl bg-accent/15 flex items-center justify-center group-hover:scale-110 transition-transform">
                <Plus className="h-5 w-5 text-accent" />
              </div>
              <span className="text-xs font-semibold text-foreground">Novo Checklist</span>
            </Card>
          </Link>
          <Link to="/configuracoes">
            <Card className="card-interactive h-24 flex flex-col items-center justify-center gap-2 bg-gradient-to-br from-primary/10 to-primary/5 border-primary/20 group">
              <div className="h-10 w-10 rounded-xl bg-primary/15 flex items-center justify-center group-hover:scale-110 transition-transform">
                <Settings className="h-5 w-5 text-primary" />
              </div>
              <span className="text-xs font-semibold text-foreground">Configuracoes</span>
            </Card>
          </Link>
        </div>

        {/* Recent checklists */}
        <div>
          <div className="flex items-center justify-between mb-3">
            <h2 className="text-base font-bold text-foreground flex items-center gap-2">
              <ClipboardList className="h-4 w-4 text-primary" /> Recentes
            </h2>
            {checklists.length > 0 && (
              <Link to="/checklists" className="text-xs text-primary font-medium flex items-center gap-1 hover:underline">
                Ver todos <ArrowRight className="h-3 w-3" />
              </Link>
            )}
          </div>

          {checklists.length === 0 ? (
            <Card className="p-8 text-center border-dashed">
              <div className="h-12 w-12 rounded-2xl bg-muted flex items-center justify-center mx-auto mb-3">
                <ClipboardList className="h-5 w-5 text-muted-foreground/40" />
              </div>
              <p className="text-sm font-medium text-muted-foreground">Nenhum checklist criado</p>
              <p className="text-xs text-muted-foreground/70 mt-1">Configure empresas e setores primeiro</p>
            </Card>
          ) : (
            <div className="space-y-2">
              {checklists.slice().reverse().slice(0, 8).map(cl => {
                const company = companies.find(c => c.id === cl.companyId);
                const sector = sectors.find(s => s.id === cl.sectorId);
                return (
                  <Card
                    key={cl.id}
                    className="card-interactive p-3.5 flex items-center justify-between gap-3 cursor-pointer"
                    onClick={() => navigate(`/checklist/${cl.id}`)}
                  >
                    <div className="flex items-center gap-3 min-w-0">
                      <div className="h-9 w-9 rounded-xl bg-primary/10 flex items-center justify-center shrink-0">
                        <Building2 className="h-4 w-4 text-primary" />
                      </div>
                      <div className="min-w-0">
                        <p className="font-semibold text-foreground text-sm truncate">{company?.name || 'Empresa removida'}</p>
                        <p className="text-xs text-muted-foreground truncate flex items-center gap-1">
                          {sector?.name || 'Setor'}
                          <span className="text-muted-foreground/40">·</span>
                          <Calendar className="h-3 w-3 inline" />
                          {new Date(cl.createdAt).toLocaleDateString('pt-BR')}
                        </p>
                      </div>
                    </div>
                    <ArrowRight className="h-4 w-4 text-muted-foreground/30 shrink-0" />
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
