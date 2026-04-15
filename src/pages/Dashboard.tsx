import { useMemo } from 'react';
import { Link } from 'react-router-dom';
import { Card } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import {
  ClipboardList, Building2, AlertTriangle, CheckCircle2, XCircle, Plus,
  TrendingUp, ArrowRight,
} from 'lucide-react';
import {
  checklistsStore, companiesStore, risksStore, riskCategoriesStore,
  safetyMeasuresStore,
} from '@/lib/storage';
import { seedDefaults } from '@/lib/storage';
import { PieChart, Pie, Cell, BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer } from 'recharts';

seedDefaults();

const CHART_COLORS = [
  'hsl(150, 65%, 38%)',
  'hsl(0, 72%, 51%)',
];

const CATEGORY_COLORS: Record<string, string> = {
  chemical: 'hsl(0, 72%, 51%)',
  physical: 'hsl(150, 65%, 38%)',
  biological: 'hsl(30, 60%, 40%)',
  ergonomic: 'hsl(200, 85%, 40%)',
  accident: 'hsl(38, 92%, 50%)',
  other: 'hsl(0, 0%, 55%)',
};

export default function Dashboard() {
  const checklists = checklistsStore.getAll();
  const companies = companiesStore.getAll();
  const risks = risksStore.getAll();
  const categories = riskCategoriesStore.getAll();
  const measures = safetyMeasuresStore.getAll();

  const stats = useMemo(() => {
    let conformities = 0;
    let nonConformities = 0;
    const riskFreq: Record<string, number> = {};

    checklists.forEach(cl => {
      if (cl.selectedRisks) {
        Object.entries(cl.selectedRisks).forEach(([riskId, val]) => {
          if (val && typeof val === 'object' && val.checked) {
            riskFreq[riskId] = (riskFreq[riskId] || 0) + 1;
          }
        });
      }
      if (cl.formData?.measureStatuses) {
        Object.entries(cl.formData.measureStatuses as Record<string, number>).forEach(([, status]) => {
          if (status === 1) conformities++;
          if (status === 2) nonConformities++;
        });
      }
    });

    const catFreq = categories.map(cat => {
      const catRisks = risks.filter(r => r.categoryId === cat.id);
      const count = catRisks.reduce((sum, r) => sum + (riskFreq[r.id] || 0), 0);
      return { name: cat.name, count, type: cat.type };
    }).filter(c => c.count > 0);

    const ncList: { name: string; count: number }[] = [];
    ncList.sort((a, b) => b.count - a.count);

    return { conformities, nonConformities, catFreq, ncList: ncList.slice(0, 5) };
  }, [checklists, risks, categories, measures]);

  const pieData = [
    { name: 'Conformidades', value: stats.conformities || 0 },
    { name: 'Não Conformidades', value: stats.nonConformities || 0 },
  ].filter(d => d.value > 0);

  return (
    <div className="p-4 md:p-6 max-w-5xl mx-auto space-y-5">
      {/* Header */}
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3">
        <div>
          <h1 className="text-2xl md:text-3xl font-bold text-foreground">Dashboard</h1>
          <p className="text-sm text-muted-foreground mt-0.5">Visão geral das avaliações</p>
        </div>
        <Link to="/checklist">
          <Button className="btn-3d-accent bg-accent hover:bg-accent/90 text-white gap-2 rounded-xl px-5 h-11 text-sm font-semibold">
            <Plus className="h-4 w-4" /> Novo Checklist
          </Button>
        </Link>
      </div>

      {/* Summary cards */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
        <StatCard
          icon={ClipboardList}
          label="Checklists"
          value={checklists.length}
          gradient="from-primary/10 to-primary/5"
          iconColor="text-primary"
          link="/checklists"
        />
        <StatCard
          icon={Building2}
          label="Empresas"
          value={companies.length}
          gradient="from-accent/10 to-accent/5"
          iconColor="text-accent"
          link="/empresas"
        />
        <StatCard
          icon={AlertTriangle}
          label="Riscos"
          value={risks.length}
          gradient="from-warning/10 to-warning/5"
          iconColor="text-warning"
          link="/riscos"
        />
        <StatCard
          icon={TrendingUp}
          label="Categorias"
          value={categories.length}
          gradient="from-primary/10 to-accent/5"
          iconColor="text-primary"
        />
      </div>

      {/* Conformity indicators */}
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
        <Card className="card-interactive p-5 flex items-center gap-4 border-l-4 border-l-green-500">
          <div className="p-3 rounded-2xl bg-gradient-to-br from-green-500/20 to-green-500/5">
            <CheckCircle2 className="h-7 w-7 text-green-500" />
          </div>
          <div>
            <p className="text-3xl font-bold text-foreground">{stats.conformities}</p>
            <p className="text-sm text-muted-foreground">Conformidades</p>
          </div>
        </Card>
        <Card className="card-interactive p-5 flex items-center gap-4 border-l-4 border-l-red-500">
          <div className="p-3 rounded-2xl bg-gradient-to-br from-red-500/20 to-red-500/5">
            <XCircle className="h-7 w-7 text-red-500" />
          </div>
          <div>
            <p className="text-3xl font-bold text-foreground">{stats.nonConformities}</p>
            <p className="text-sm text-muted-foreground">Não Conformidades</p>
          </div>
        </Card>
      </div>

      {/* Charts */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <Card className="card-interactive p-5">
          <h3 className="text-sm font-semibold text-foreground mb-4">Conformidade vs Não Conformidade</h3>
          {pieData.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-10 text-center">
              <ClipboardList className="h-10 w-10 text-muted-foreground/30 mb-3" />
              <p className="text-sm text-muted-foreground">Preencha checklists para visualizar</p>
            </div>
          ) : (
            <ResponsiveContainer width="100%" height={200}>
              <PieChart>
                <Pie data={pieData} cx="50%" cy="50%" innerRadius={50} outerRadius={80} dataKey="value" label={({ name, value }) => `${name}: ${value}`}>
                  {pieData.map((_, i) => (
                    <Cell key={i} fill={CHART_COLORS[i % CHART_COLORS.length]} />
                  ))}
                </Pie>
                <Tooltip />
              </PieChart>
            </ResponsiveContainer>
          )}
        </Card>

        <Card className="card-interactive p-5">
          <h3 className="text-sm font-semibold text-foreground mb-4">Riscos por Categoria</h3>
          {stats.catFreq.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-10 text-center">
              <AlertTriangle className="h-10 w-10 text-muted-foreground/30 mb-3" />
              <p className="text-sm text-muted-foreground">Preencha checklists para visualizar</p>
            </div>
          ) : (
            <ResponsiveContainer width="100%" height={200}>
              <BarChart data={stats.catFreq}>
                <XAxis dataKey="name" tick={{ fontSize: 10 }} />
                <YAxis allowDecimals={false} tick={{ fontSize: 10 }} />
                <Tooltip />
                <Bar dataKey="count" name="Ocorrências" radius={[6, 6, 0, 0]}>
                  {stats.catFreq.map((entry, i) => (
                    <Cell key={i} fill={CATEGORY_COLORS[entry.type] || 'hsl(200, 85%, 40%)'} />
                  ))}
                </Bar>
              </BarChart>
            </ResponsiveContainer>
          )}
        </Card>
      </div>

      {/* Recent alerts */}
      {stats.ncList.length > 0 && (
        <Card className="card-interactive p-5">
          <h3 className="text-sm font-semibold text-foreground mb-3 flex items-center gap-2">
            <AlertTriangle className="h-4 w-4 text-warning" /> Não Conformidades Recorrentes
          </h3>
          <div className="space-y-2">
            {stats.ncList.map((nc, i) => (
              <div key={i} className="flex items-center justify-between py-2 border-b border-border last:border-0">
                <span className="text-sm text-foreground">{nc.name}</span>
                <span className="text-xs font-semibold text-destructive bg-destructive/10 px-2 py-0.5 rounded-full">{nc.count}x</span>
              </div>
            ))}
          </div>
        </Card>
      )}
    </div>
  );
}

function StatCard({ icon: Icon, label, value, gradient, iconColor, link }: {
  icon: React.ElementType; label: string; value: number; gradient: string; iconColor: string; link?: string;
}) {
  const content = (
    <Card className={`card-interactive p-4 bg-gradient-to-br ${gradient} relative overflow-hidden group`}>
      <div className="flex items-center gap-3">
        <div className="p-2.5 rounded-xl bg-white/60 dark:bg-white/10 shadow-sm">
          <Icon className={`h-5 w-5 ${iconColor}`} />
        </div>
        <div className="min-w-0">
          <p className="text-2xl font-bold text-foreground leading-none">{value}</p>
          <p className="text-xs text-muted-foreground mt-1">{label}</p>
        </div>
      </div>
      {link && (
        <ArrowRight className="absolute right-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground/30 group-hover:text-primary transition-colors" />
      )}
    </Card>
  );

  if (link) return <Link to={link}>{content}</Link>;
  return content;
}
