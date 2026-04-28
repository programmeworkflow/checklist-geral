import { useMemo } from 'react';
import { Link } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';
import { Card } from '@/components/ui/card';
import {
  ClipboardList, Building2, AlertTriangle, CheckCircle2, XCircle, Plus,
  TrendingUp, ArrowUpRight, Shield, BarChart3, Stethoscope, Users,
} from 'lucide-react';
import {
  checklistsStore, companiesStore, risksStore, riskCategoriesStore,
  safetyMeasuresStore, examsStore, professionalsStore,
} from '@/lib/storage';
import { PieChart, Pie, Cell, BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer } from 'recharts';

const PIE_COLORS = ['hsl(148, 70%, 36%)', 'hsl(0, 72%, 51%)'];
const CATEGORY_COLORS: Record<string, string> = {
  chemical: '#DC2626', physical: '#0C97C4', biological: '#92400E',
  ergonomic: '#1A6FB5', accident: '#D97706', other: '#6B7280',
};

export default function Dashboard() {
  const { data: checklists = [] } = useQuery({ queryKey: ['checklists'], queryFn: () => checklistsStore.getAll() });
  const { data: companies = [] } = useQuery({ queryKey: ['companies'], queryFn: () => companiesStore.getAll() });
  const { data: risks = [] } = useQuery({ queryKey: ['risks'], queryFn: () => risksStore.getAll() });
  const { data: categories = [] } = useQuery({ queryKey: ['riskCategories'], queryFn: () => riskCategoriesStore.getAll() });
  const { data: measures = [] } = useQuery({ queryKey: ['safetyMeasures'], queryFn: () => safetyMeasuresStore.getAll() });
  const { data: exams = [] } = useQuery({ queryKey: ['exams'], queryFn: () => examsStore.getAll() });
  const { data: professionals = [] } = useQuery({ queryKey: ['professionals'], queryFn: () => professionalsStore.getAll() });

  const stats = useMemo(() => {
    let conformities = 0, nonConformities = 0;
    const riskFreq: Record<string, number> = {};
    checklists.forEach(cl => {
      if (cl.selectedRisks) Object.entries(cl.selectedRisks).forEach(([riskId, val]) => {
        if (val && typeof val === 'object' && val.checked) riskFreq[riskId] = (riskFreq[riskId] || 0) + 1;
      });
      if (cl.formData?.measureStatuses) Object.values(cl.formData.measureStatuses as Record<string, number>).forEach(s => {
        if (s === 1) conformities++; if (s === 2) nonConformities++;
      });
    });
    const catFreq = categories.map(cat => {
      const count = risks.filter(r => r.categoryId === cat.id).reduce((s, r) => s + (riskFreq[r.id] || 0), 0);
      return { name: cat.name, count, type: cat.type };
    }).filter(c => c.count > 0);

    // Checklists por técnico (top 5)
    const tecnicoCount: Record<string, number> = {};
    checklists.forEach(cl => {
      const tid = (cl.formData as any)?.tecnicoId || (cl.formData as any)?.tecnico;
      if (tid) tecnicoCount[tid] = (tecnicoCount[tid] || 0) + 1;
    });
    const tecnicoRanking = Object.entries(tecnicoCount)
      .map(([id, count]) => {
        const prof = professionals.find(p => p.id === id);
        return { id, name: prof?.name || id, count };
      })
      .sort((a, b) => b.count - a.count)
      .slice(0, 5);

    return { conformities, nonConformities, catFreq, tecnicoRanking };
  }, [checklists, risks, categories, measures, professionals]);

  const pieData = [
    { name: 'Conformidades', value: stats.conformities || 0 },
    { name: 'Não Conformidades', value: stats.nonConformities || 0 },
  ].filter(d => d.value > 0);

  const total = stats.conformities + stats.nonConformities;
  const conformRate = total > 0 ? Math.round((stats.conformities / total) * 100) : 0;

  return (
    <div className="p-4 md:p-8 max-w-6xl mx-auto space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl md:text-3xl font-extrabold text-foreground tracking-tight">Dashboard</h1>
          <p className="text-sm text-muted-foreground mt-1">Visao geral das avaliacoes de riscos</p>
        </div>
        <Link to="/checklist">
          <button className="btn-3d-accent inline-flex items-center gap-2 bg-accent hover:bg-accent/90 text-white rounded-xl px-5 h-11 text-sm font-semibold">
            <Plus className="h-4 w-4" /> Novo Checklist
          </button>
        </Link>
      </div>

      {/* KPI Cards */}
      <div className="grid grid-cols-2 lg:grid-cols-5 gap-3 md:gap-4">
        <KpiCard
          icon={ClipboardList}
          label="Checklists"
          value={checklists.length}
          color="from-[#0C97C4]/15 to-[#0C97C4]/5"
          iconBg="bg-[#0C97C4]/15"
          iconColor="text-[#0C97C4]"
          link="/checklists"
        />
        <KpiCard
          icon={Building2}
          label="Empresas"
          value={companies.length}
          color="from-[#1B9B4E]/15 to-[#1B9B4E]/5"
          iconBg="bg-[#1B9B4E]/15"
          iconColor="text-[#1B9B4E]"
          link="/empresas"
        />
        <KpiCard
          icon={AlertTriangle}
          label="Riscos"
          value={risks.length}
          color="from-[#D97706]/15 to-[#D97706]/5"
          iconBg="bg-[#D97706]/15"
          iconColor="text-[#D97706]"
          link="/riscos"
        />
        <KpiCard
          icon={Stethoscope}
          label="Exames"
          value={exams.length}
          color="from-[#7C3AED]/15 to-[#7C3AED]/5"
          iconBg="bg-[#7C3AED]/15"
          iconColor="text-[#7C3AED]"
          link="/exames"
        />
        <KpiCard
          icon={Shield}
          label="Conformidade"
          value={conformRate}
          suffix="%"
          color="from-[#1A6FB5]/15 to-[#1A6FB5]/5"
          iconBg="bg-[#1A6FB5]/15"
          iconColor="text-[#1A6FB5]"
        />
      </div>

      {/* Conformity Status */}
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 md:gap-4">
        <Card className="card-interactive p-5 border-l-[3px] border-l-[#1B9B4E]">
          <div className="flex items-center gap-4">
            <div className="h-12 w-12 rounded-2xl bg-gradient-to-br from-[#1B9B4E]/20 to-[#1B9B4E]/5 flex items-center justify-center">
              <CheckCircle2 className="h-6 w-6 text-[#1B9B4E]" />
            </div>
            <div>
              <p className="stat-value text-foreground">{stats.conformities}</p>
              <p className="text-xs text-muted-foreground mt-0.5 font-medium">Conformidades</p>
            </div>
          </div>
        </Card>
        <Card className="card-interactive p-5 border-l-[3px] border-l-destructive">
          <div className="flex items-center gap-4">
            <div className="h-12 w-12 rounded-2xl bg-gradient-to-br from-destructive/20 to-destructive/5 flex items-center justify-center">
              <XCircle className="h-6 w-6 text-destructive" />
            </div>
            <div>
              <p className="stat-value text-foreground">{stats.nonConformities}</p>
              <p className="text-xs text-muted-foreground mt-0.5 font-medium">Nao Conformidades</p>
            </div>
          </div>
        </Card>
      </div>

      {/* Charts */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <Card className="card-interactive p-5 md:p-6">
          <div className="flex items-center gap-2 mb-5">
            <div className="h-8 w-8 rounded-lg bg-primary/10 flex items-center justify-center">
              <TrendingUp className="h-4 w-4 text-primary" />
            </div>
            <h3 className="text-sm font-semibold text-foreground">Conformidade</h3>
          </div>
          {pieData.length === 0 ? <EmptyChart /> : (
            <ResponsiveContainer width="100%" height={210}>
              <PieChart>
                <Pie data={pieData} cx="50%" cy="50%" innerRadius={55} outerRadius={85} dataKey="value" strokeWidth={2} stroke="hsl(var(--card))">
                  {pieData.map((_, i) => <Cell key={i} fill={PIE_COLORS[i]} />)}
                </Pie>
                <Tooltip contentStyle={{ borderRadius: 10, border: '1px solid hsl(var(--border))', fontSize: 13 }} />
              </PieChart>
            </ResponsiveContainer>
          )}
        </Card>

        <Card className="card-interactive p-5 md:p-6">
          <div className="flex items-center gap-2 mb-5">
            <div className="h-8 w-8 rounded-lg bg-accent/10 flex items-center justify-center">
              <BarChart3 className="h-4 w-4 text-accent" />
            </div>
            <h3 className="text-sm font-semibold text-foreground">Riscos por Categoria</h3>
          </div>
          {stats.catFreq.length === 0 ? <EmptyChart /> : (
            <ResponsiveContainer width="100%" height={210}>
              <BarChart data={stats.catFreq} barCategoryGap="20%">
                <XAxis dataKey="name" tick={{ fontSize: 10, fill: 'hsl(var(--muted-foreground))' }} axisLine={false} tickLine={false} />
                <YAxis allowDecimals={false} tick={{ fontSize: 10, fill: 'hsl(var(--muted-foreground))' }} axisLine={false} tickLine={false} />
                <Tooltip contentStyle={{ borderRadius: 10, border: '1px solid hsl(var(--border))', fontSize: 13 }} />
                <Bar dataKey="count" name="Ocorrencias" radius={[8, 8, 0, 0]}>
                  {stats.catFreq.map((e, i) => <Cell key={i} fill={CATEGORY_COLORS[e.type] || '#0C97C4'} />)}
                </Bar>
              </BarChart>
            </ResponsiveContainer>
          )}
        </Card>
      </div>

      {/* Checklists por Técnico */}
      <Card className="card-interactive p-5 md:p-6">
        <div className="flex items-center gap-2 mb-5">
          <div className="h-8 w-8 rounded-lg bg-primary/10 flex items-center justify-center">
            <Users className="h-4 w-4 text-primary" />
          </div>
          <h3 className="text-sm font-semibold text-foreground">Checklists por Técnico</h3>
        </div>
        {stats.tecnicoRanking.length === 0 ? (
          <div className="py-8 text-center text-sm text-muted-foreground">
            Nenhum checklist com técnico vinculado ainda.
          </div>
        ) : (
          <div className="space-y-2">
            {stats.tecnicoRanking.map((t, i) => {
              const max = stats.tecnicoRanking[0].count;
              const pct = (t.count / max) * 100;
              return (
                <div key={t.id} className="flex items-center gap-3">
                  <div className="text-xs font-bold text-muted-foreground w-6">{i + 1}º</div>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center justify-between mb-1">
                      <span className="text-sm font-medium text-foreground truncate">{t.name}</span>
                      <span className="text-xs font-semibold text-primary shrink-0 ml-2">{t.count}</span>
                    </div>
                    <div className="h-2 bg-muted rounded-full overflow-hidden">
                      <div className="h-full bg-gradient-to-r from-primary to-primary/70 rounded-full" style={{ width: `${pct}%` }} />
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </Card>
    </div>
  );
}

function EmptyChart() {
  return (
    <div className="flex flex-col items-center justify-center py-12 text-center">
      <div className="h-14 w-14 rounded-2xl bg-muted flex items-center justify-center mb-3">
        <ClipboardList className="h-6 w-6 text-muted-foreground/40" />
      </div>
      <p className="text-sm text-muted-foreground">Preencha checklists para visualizar</p>
    </div>
  );
}

function KpiCard({ icon: Icon, label, value, suffix, color, iconBg, iconColor, link }: {
  icon: React.ElementType; label: string; value: number; suffix?: string;
  color: string; iconBg: string; iconColor: string; link?: string;
}) {
  const content = (
    <Card className={`card-interactive relative overflow-hidden p-4 md:p-5 bg-gradient-to-br ${color} group`}>
      <div className="flex items-start justify-between">
        <div className={`h-10 w-10 rounded-xl ${iconBg} flex items-center justify-center`}>
          <Icon className={`h-5 w-5 ${iconColor}`} />
        </div>
        {link && <ArrowUpRight className="h-4 w-4 text-muted-foreground/30 group-hover:text-primary transition-colors" />}
      </div>
      <div className="mt-3">
        <p className="stat-value text-foreground">{value}{suffix}</p>
        <p className="text-xs text-muted-foreground mt-1 font-medium">{label}</p>
      </div>
    </Card>
  );
  return link ? <Link to={link}>{content}</Link> : content;
}
