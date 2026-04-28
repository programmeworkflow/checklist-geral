import { useState, useEffect } from 'react';
import { Link, useLocation, useNavigate } from 'react-router-dom';
import {
  LayoutDashboard, ClipboardList, Building2, AlertTriangle,
  Shield, HardHat, GraduationCap, Settings, Menu, ChevronLeft,
  ChevronDown, FolderOpen, Stethoscope, UserCheck,
  FileText, Sun, Moon, ArrowLeft, X, PanelLeftClose, PanelLeft,
  LucideIcon,
} from 'lucide-react';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { Button } from '@/components/ui/button';
import { cn } from '@/lib/utils';
import { navItemsStore } from '@/lib/storage';
import logoColorida from '@/assets/logo-colorida.png';

const ICON_MAP: Record<string, LucideIcon> = {
  dashboard: LayoutDashboard,
  empresas: Building2,
  checklists: ClipboardList,
  relatorios: FileText,
  riscos: AlertTriangle,
  exames: Stethoscope,
  medidas: Shield,
  profissionais: UserCheck,
  cargos: UserCheck,
  setores: Building2,
  epis: HardHat,
  treinamentos: GraduationCap,
  configuracoes: Settings,
};

const ROUTE_MAP: Record<string, string> = {
  dashboard: '/',
  empresas: '/empresas',
  checklists: '/checklists',
  relatorios: '/relatorios',
  riscos: '/riscos',
  exames: '/exames',
  medidas: '/medidas',
  profissionais: '/profissionais',
  cargos: '/cargos',
  setores: '/setores',
  epis: '/epis',
  treinamentos: '/treinamentos',
  configuracoes: '/configuracoes',
};

const CADASTRO_KEYS = ['riscos', 'exames', 'medidas', 'profissionais', 'cargos', 'setores'];

export function AppLayout({ children }: { children: React.ReactNode }) {
  const location = useLocation();
  const navigate = useNavigate();
  const qc = useQueryClient();
  const [collapsed, setCollapsed] = useState(false);
  const [mobileOpen, setMobileOpen] = useState(false);

  const { data: navItems = [] } = useQuery({
    queryKey: ['nav_items'],
    queryFn: async () => {
      const items = await navItemsStore.getAll();
      // Only fix exames visibility if nav was already seeded
      if (items.length > 1) {
        const examesItem = items.find(i => i.key === 'exames');
        if (examesItem && !examesItem.visible) {
          await navItemsStore.update(examesItem.id, { visible: true });
          return navItemsStore.getAll();
        }
      }
      return items;
    },
  });

  const [dark, setDark] = useState(() => localStorage.getItem('theme') === 'dark');
  const [cadastroOpen, setCadastroOpen] = useState(() =>
    CADASTRO_KEYS.some(k => window.location.pathname.startsWith(`/${k}`))
  );

  useEffect(() => {
    document.documentElement.classList.toggle('dark', dark);
    localStorage.setItem('theme', dark ? 'dark' : 'light');
  }, [dark]);

  useEffect(() => {
    qc.invalidateQueries({ queryKey: ['nav_items'] });
    if (CADASTRO_KEYS.some(k => location.pathname.startsWith(`/${k}`))) setCadastroOpen(true);
  }, [location.pathname]);

  useEffect(() => { setMobileOpen(false); }, [location.pathname]);

  const visibleItems = navItems.filter(i => i.visible).sort((a, b) => a.order - b.order);
  const navWithoutConfig = visibleItems.filter(i => !CADASTRO_KEYS.includes(i.key) && i.key !== 'configuracoes');
  const cadastroItems = visibleItems.filter(i => CADASTRO_KEYS.includes(i.key));
  const configItem = visibleItems.find(i => i.key === 'configuracoes');

  const isActive = (path: string) => path === '/' ? location.pathname === '/' : location.pathname.startsWith(path);
  const hasCadastroActive = cadastroItems.some(i => isActive(ROUTE_MAP[i.key] || '/'));

  const renderNavItem = (item: typeof navItems[0], indent = false) => {
    const Icon = ICON_MAP[item.key] || LayoutDashboard;
    const to = ROUTE_MAP[item.key] || '/';
    const active = isActive(to);
    const isCol = collapsed;
    return (
      <Link
        key={item.key}
        to={to}
        title={isCol ? item.label : undefined}
        className={cn(
          'group flex items-center gap-3 rounded-lg transition-all duration-150 mx-2',
          indent ? 'py-2 pl-10 pr-3 text-[0.8rem]' : 'py-2.5 px-3 text-[0.82rem]',
          isCol && !indent && 'justify-center px-0 mx-auto w-10 h-10',
          active
            ? 'bg-sidebar-primary/10 text-sidebar-primary font-semibold nav-active-glow'
            : 'text-sidebar-foreground hover:bg-white/[0.06] hover:text-white'
        )}
      >
        <Icon className={cn(
          'shrink-0 transition-colors duration-150',
          isCol && !indent ? 'h-5 w-5' : 'h-[17px] w-[17px]',
          active ? 'text-sidebar-primary' : 'text-sidebar-foreground/60 group-hover:text-white'
        )} />
        {(!isCol || indent) && <span className="truncate">{item.label}</span>}
      </Link>
    );
  };

  const sidebar = (mobile: boolean) => {
    const isCol = collapsed && !mobile;
    return (
      <div className="flex flex-col h-full select-none">
        {/* ---- Logo ---- */}
        <div className={cn(
          'flex flex-col items-center border-b border-white/[0.06]',
          isCol ? 'px-1 py-4' : 'px-5 py-6'
        )}>
          <div className={cn(
            'rounded-2xl bg-white/[0.05] p-2 transition-all',
            isCol ? 'p-1.5' : 'p-3'
          )}>
            <img src={logoColorida} alt="MedWork" className={cn('transition-all', isCol ? 'h-8' : 'h-16')} />
          </div>
          {!isCol && (
            <span className="mt-2.5 text-[1.1rem] font-bold tracking-[0.2em] text-white/85">
              VIS<span className="text-gradient font-extrabold">TEC</span>
            </span>
          )}
        </div>

        {/* ---- Nav ---- */}
        <nav className="flex-1 py-3 space-y-0.5 overflow-y-auto scrollbar-thin">
          {navWithoutConfig.map(i => renderNavItem(i))}

          {cadastroItems.length > 0 && (
            <>
              <button
                onClick={() => setCadastroOpen(!cadastroOpen)}
                className={cn(
                  'flex items-center gap-3 rounded-lg mx-2 w-[calc(100%-1rem)] transition-all',
                  isCol ? 'justify-center mx-auto w-10 h-10 px-0' : 'px-3 py-2.5 text-[0.82rem]',
                  hasCadastroActive ? 'text-sidebar-primary font-semibold' : 'text-sidebar-foreground hover:bg-white/[0.06] hover:text-white'
                )}
                title={isCol ? 'Cadastros' : undefined}
              >
                <FolderOpen className={cn('shrink-0', isCol ? 'h-5 w-5' : 'h-[17px] w-[17px]')} />
                {!isCol && (
                  <>
                    <span className="truncate flex-1 text-left">Cadastros</span>
                    <ChevronDown className={cn('h-3.5 w-3.5 transition-transform', !cadastroOpen && '-rotate-90')} />
                  </>
                )}
              </button>
              {cadastroOpen && !isCol && (
                <div className="space-y-0.5 animate-in fade-in slide-in-from-top-1 duration-200">
                  {cadastroItems.map(ci => renderNavItem(ci, true))}
                </div>
              )}
            </>
          )}
        </nav>

        {/* ---- Footer ---- */}
        <div className="border-t border-white/[0.06] p-2 space-y-1">
          {configItem && renderNavItem(configItem)}
          <div className={cn('flex items-center', isCol ? 'flex-col gap-1 pt-1' : 'justify-between px-1 pt-1')}>
            <button
              onClick={() => setDark(!dark)}
              className="h-8 w-8 flex items-center justify-center rounded-lg text-sidebar-foreground/50 hover:text-white hover:bg-white/[0.06] transition-colors"
              title={dark ? 'Modo claro' : 'Modo escuro'}
            >
              {dark ? <Sun className="h-4 w-4" /> : <Moon className="h-4 w-4" />}
            </button>
            {!mobile && (
              <button
                onClick={() => setCollapsed(!collapsed)}
                className="h-8 w-8 hidden md:flex items-center justify-center rounded-lg text-sidebar-foreground/50 hover:text-white hover:bg-white/[0.06] transition-colors"
                title={collapsed ? 'Expandir menu' : 'Recolher menu'}
              >
                {collapsed ? <PanelLeft className="h-4 w-4" /> : <PanelLeftClose className="h-4 w-4" />}
              </button>
            )}
          </div>
        </div>
      </div>
    );
  };

  return (
    <div className="min-h-screen flex bg-background">
      {/* Desktop sidebar - FIXED */}
      <aside className={cn(
        'hidden md:flex flex-col fixed top-0 left-0 h-screen bg-sidebar transition-all duration-200 z-30 border-r border-sidebar-border',
        collapsed ? 'w-[62px]' : 'w-[230px]'
      )}>
        {sidebar(false)}
      </aside>
      <div className={cn('hidden md:block shrink-0 transition-all duration-200', collapsed ? 'w-[62px]' : 'w-[230px]')} />

      {/* Mobile drawer */}
      {mobileOpen && (
        <div className="fixed inset-0 z-50 md:hidden">
          <div className="absolute inset-0 bg-black/60 backdrop-blur-sm" onClick={() => setMobileOpen(false)} />
          <aside className="absolute left-0 top-0 bottom-0 w-[270px] bg-sidebar shadow-2xl animate-in slide-in-from-left duration-200">
            <button
              onClick={() => setMobileOpen(false)}
              className="absolute top-4 right-3 h-8 w-8 flex items-center justify-center rounded-full bg-white/10 text-white/70 hover:text-white hover:bg-white/20 transition-colors z-10"
            >
              <X className="h-4 w-4" />
            </button>
            {sidebar(true)}
          </aside>
        </div>
      )}

      {/* Main */}
      <div className="flex-1 flex flex-col min-w-0">
        <header className="flex items-center gap-2.5 px-4 py-2.5 border-b border-border bg-card/90 backdrop-blur-lg md:hidden sticky top-0 z-20">
          <button
            onClick={() => setMobileOpen(true)}
            className="h-9 w-9 flex items-center justify-center rounded-xl text-foreground hover:bg-primary/10 transition-colors"
          >
            <Menu className="h-5 w-5" />
          </button>
          {location.pathname !== '/' && (
            <button
              onClick={() => navigate(-1)}
              className="h-9 w-9 flex items-center justify-center rounded-xl text-foreground hover:bg-primary/10 transition-colors"
            >
              <ArrowLeft className="h-5 w-5" />
            </button>
          )}
          <div className="flex items-center gap-2 ml-auto">
            <img src={logoColorida} alt="MedWork" className="h-7" />
            <span className="text-sm font-bold tracking-wider text-foreground">
              VIS<span className="text-gradient font-extrabold">TEC</span>
            </span>
          </div>
        </header>
        <main className="flex-1 overflow-y-auto">{children}</main>
      </div>
    </div>
  );
}
