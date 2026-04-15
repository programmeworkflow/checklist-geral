import { useMemo } from 'react';
import { Link } from 'react-router-dom';
import { Card } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import {
  ClipboardList, Building2, AlertTriangle, CheckCircle2, XCircle, Plus,
} from 'lucide-react';
import {
  checklistsStore, companiesStore, risksStore, riskCategoriesStore,
  safetyMeasuresStore,
} from '@/lib/storage';
import { seedDefaults } from '@/lib/storage';
import { PieChart, Pie, Cell, BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer } from 'recharts';

seedDefaults();

const CHART_COLORS = [
  'hsl(145, 60%, 42%)', // success
  'hsl(0, 72%, 51%)',   // destructive
];

const CATEGORY_COLORS: Record<string, string> = {
  chemical: 'hsl(0, 72%, 51%)',
  physical: 'hsl(145, 60%, 42%)',
  biological: 'hsl(30, 60%, 40%)',
  ergonomic: 'hsl(210, 80%, 45%)',
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
    const ncFreq: Record<string, number> = {};

    checklists.forEach(cl => {
      // Count selected risks
      if (cl.selectedRisks) {
        Object.entries(cl.selectedRisks).forEach(([riskId, val]) => {
          if (val && typeof val === 'object' && val.checked) {
            riskFreq[riskId] = (riskFreq[riskId] || 0) + 1;
          }
        });
      }

      // Count measure statuses from formData
      if (cl.formData?.measureStatuses) {
        Object.entries(cl.formData.measureStatuses as Record<string, number>).forEach(([, status]) => {
          if (status === 1) conformities++;
          if (status === 2) {
            nonConformities++;
          }
        });
      }
    });

    // Risk frequency by category
    const catFreq = categories.map(cat => {
      const catRisks = risks.filter(r => r.categoryId === cat.id);
      const count = catRisks.reduce((sum, r) => sum + (riskFreq[r.id] || 0), 0);
      return { name: cat.name, count, type: cat.type };
    }).filter(c => c.count > 0);

    // Top non-conformity measures
    const ncList: { name: string; count: number }[] = [];
    Object.entries(ncFreq).forEach(([mId, count]) => {
      const m = measures.find(x => x.id === mId);
      if (m) ncList.push({ name: m.name, count });
    });
    ncList.sort((a, b) => b.count - a.count);

    return { conformities, nonConformities, catFreq, ncList: ncList.slice(0, 5) };
  }, [checklists, risks, categories, measures]);

  const pieData = [
    { name: 'Conformidades', value: stats.conformities || 0 },
    { name: 'Não Conformidades', value: stats.nonConformities || 0 },
  ].filter(d => d.value > 0);

  return (
    <div className="p-4 md:p-6 max-w-5xl mx-auto space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold text-foreground">Dashboard</h1>
        <Link to="/checklist">
          <Button size="sm" className="bg-green-600 hover:bg-green-700 text-white animate-pulse gap-1">
            <Plus className="h-4 w-4" /> Novo Checklist
          </Button>
        </Link>
      </div>

      {/* Summary cards */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
        <SummaryCard icon={ClipboardList} label="Checklists" value={checklists.length} color="text-primary" />
        <SummaryCard icon={Building2} label="Empresas" value={companies.length} color="text-primary" />
        <SummaryCard icon={AlertTriangle} label="Riscos" value={risks.length} color="text-warning" />
        <SummaryCard icon={CheckCircle2} label="Conformidades" value={stats.conformities} color="text-success" />
      </div>

      {/* Conformity indicators */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
        <Card className="p-4 flex items-center gap-4">
          <div className="p-3 rounded-full bg-success/10">
            <CheckCircle2 className="h-6 w-6 text-success" />
          </div>
          <div>
            <p className="text-2xl font-bold text-foreground">{stats.conformities}</p>
            <p className="text-sm text-muted-foreground">Conformidades</p>
          </div>
        </Card>
        <Card className="p-4 flex items-center gap-4">
          <div className="p-3 rounded-full bg-destructive/10">
            <XCircle className="h-6 w-6 text-destructive" />
          </div>
          <div>
            <p className="text-2xl font-bold text-foreground">{stats.nonConformities}</p>
            <p className="text-sm text-muted-foreground">Não Conformidades</p>
          </div>
        </Card>
      </div>

      {/* Charts */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {/* Pie */}
        <Card className="p-4">
          <h3 className="text-sm font-semibold text-foreground mb-3">Conformidade vs Não Conformidade</h3>
          {pieData.length === 0 ? (
            <p className="text-sm text-muted-foreground text-center py-8">Sem dados ainda. Preencha checklists para visualizar.</p>
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

        {/* Bar */}
        <Card className="p-4">
          <h3 className="text-sm font-semibold text-foreground mb-3">Riscos Mais Frequentes por Categoria</h3>
          {stats.catFreq.length === 0 ? (
            <p className="text-sm text-muted-foreground text-center py-8">Sem dados ainda. Preencha checklists para visualizar.</p>
          ) : (
            <ResponsiveContainer width="100%" height={200}>
              <BarChart data={stats.catFreq}>
                <XAxis dataKey="name" tick={{ fontSize: 11 }} />
                <YAxis allowDecimals={false} tick={{ fontSize: 11 }} />
                <Tooltip />
                <Bar dataKey="count" name="Ocorrências" radius={[4, 4, 0, 0]}>
                  {stats.catFreq.map((entry, i) => (
                    <Cell key={i} fill={CATEGORY_COLORS[entry.type] || 'hsl(210, 80%, 45%)'} />
                  ))}
                </Bar>
              </BarChart>
            </ResponsiveContainer>
          )}
        </Card>
      </div>

      {/* Recent alerts */}
      {stats.ncList.length > 0 && (
        <Card className="p-4">
          <h3 className="text-sm font-semibold text-foreground mb-3 flex items-center gap-2">
            <AlertTriangle className="h-4 w-4 text-warning" /> Não Conformidades Mais Recorrentes
          </h3>
          <div className="space-y-2">
            {stats.ncList.map((nc, i) => (
              <div key={i} className="flex items-center justify-between py-1.5 border-b border-border last:border-0">
                <span className="text-sm text-foreground">{nc.name}</span>
                <span className="text-xs font-medium text-destructive">{nc.count}x</span>
              </div>
            ))}
          </div>
        </Card>
      )}
    </div>
  );
}

function SummaryCard({ icon: Icon, label, value, color }: {
  icon: React.ElementType; label: string; value: number; color: string;
}) {
  return (
    <Card className="p-4">
      <div className="flex items-center gap-3">
        <Icon className={`h-5 w-5 ${color}`} />
        <div>
          <p className="text-xl font-bold text-foreground">{value}</p>
          <p className="text-xs text-muted-foreground">{label}</p>
        </div>
      </div>
    </Card>
  );
}
