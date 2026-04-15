import { useState, useEffect } from 'react';
import { Link, useLocation, useNavigate } from 'react-router-dom';
import {
  LayoutDashboard, ClipboardList, Building2, AlertTriangle,
  Shield, HardHat, GraduationCap, Settings, Menu, ChevronLeft,
  ChevronDown, ChevronRight, FolderOpen, Stethoscope, UserCheck,
  FileText, Sun, Moon, ArrowLeft,
  LucideIcon,
} from 'lucide-react';
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
  epis: '/epis',
  treinamentos: '/treinamentos',
  configuracoes: '/configuracoes',
};

const CADASTRO_KEYS = ['riscos', 'exames', 'medidas', 'profissionais'];

export function AppLayout({ children }: { children: React.ReactNode }) {
  const location = useLocation();
  const navigate = useNavigate();
  const [collapsed, setCollapsed] = useState(false);
  const [mobileOpen, setMobileOpen] = useState(false);
  const [navItems, setNavItems] = useState(() => {
    const items = navItemsStore.getAll();
    // Ensure 'exames' is always present and visible
    const examesItem = items.find(i => i.key === 'exames');
    if (examesItem && !examesItem.visible) {
      navItemsStore.update(examesItem.id, { visible: true });
      return navItemsStore.getAll();
    }
    if (!examesItem) {
      navItemsStore.add({ key: 'exames', label: 'Exames', visible: true, order: 5 } as any);
      return navItemsStore.getAll();
    }
    return items;
  });
  const [dark, setDark] = useState(() => {
    return localStorage.getItem('theme') === 'dark';
  });
  const [cadastroOpen, setCadastroOpen] = useState(() => {
    const path = window.location.pathname;
    return CADASTRO_KEYS.some(k => path.startsWith(`/${k === 'profissionais' ? 'profissionais' : k}`));
  });

  useEffect(() => {
    document.documentElement.classList.toggle('dark', dark);
    localStorage.setItem('theme', dark ? 'dark' : 'light');
  }, [dark]);

  useEffect(() => {
    setNavItems(navItemsStore.getAll());
    const path = location.pathname;
    if (CADASTRO_KEYS.some(k => path.startsWith(`/${k}`))) {
      setCadastroOpen(true);
    }
  }, [location.pathname]);

  const visibleItems = navItems
    .filter(item => item.visible)
    .sort((a, b) => a.order - b.order);

  const topLevelItems = visibleItems.filter(item => !CADASTRO_KEYS.includes(item.key));
  const cadastroItems = visibleItems.filter(item => CADASTRO_KEYS.includes(item.key));

  const isActive = (path: string) => {
    if (path === '/') return location.pathname === '/';
    return location.pathname.startsWith(path);
  };

  const hasCadastroActive = cadastroItems.some(item => isActive(ROUTE_MAP[item.key] || '/'));
  const showBackButton = location.pathname !== '/';

  const renderNavItem = (item: typeof navItems[0], indent = false) => {
    const Icon = ICON_MAP[item.key] || LayoutDashboard;
    const to = ROUTE_MAP[item.key] || '/';
    return (
      <Link
        key={item.key}
        to={to}
        onClick={() => setMobileOpen(false)}
        className={cn(
          'flex items-center gap-3 py-2.5 text-sm transition-colors rounded-md mx-2',
          indent ? 'pl-9 pr-4' : 'px-4',
          isActive(to)
            ? 'bg-sidebar-accent text-sidebar-primary font-medium'
            : 'text-sidebar-foreground hover:bg-sidebar-accent/50'
        )}
      >
        <Icon className="h-4 w-4 shrink-0" />
        {!collapsed && <span className="truncate">{item.label}</span>}
      </Link>
    );
  };

  const navWithoutConfig = topLevelItems.filter(item => item.key !== 'configuracoes');
  const configItem = topLevelItems.find(item => item.key === 'configuracoes');

  const sidebarContent = (
    <div className="flex flex-col h-full">
      <div className="flex flex-col items-center px-4 py-5 border-b border-sidebar-border bg-sidebar">
        <img src={logoColorida} alt="MedWork" className={cn(collapsed ? 'h-10' : 'h-16')} />
        {!collapsed && <span className="mt-1 text-base font-bold text-white tracking-wide">VIS<span className="font-extrabold">TEC</span></span>}
      </div>
      <nav className="flex-1 py-2 space-y-0.5 overflow-y-auto">
        {navWithoutConfig.map((item) => renderNavItem(item))}
        {cadastroItems.length > 0 && (
          <>
            <button
              onClick={() => setCadastroOpen(!cadastroOpen)}
              className={cn(
                'flex items-center gap-3 px-4 py-2.5 text-sm transition-colors rounded-md mx-2 w-[calc(100%-1rem)]',
                hasCadastroActive
                  ? 'text-sidebar-primary font-medium'
                  : 'text-sidebar-foreground hover:bg-sidebar-accent/50'
              )}
            >
              <FolderOpen className="h-4 w-4 shrink-0" />
              {!collapsed && (
                <>
                  <span className="truncate flex-1 text-left">Cadastros</span>
                  <ChevronDown className={cn('h-3.5 w-3.5 transition-transform shrink-0', !cadastroOpen && '-rotate-90')} />
                </>
              )}
            </button>
            {cadastroOpen && !collapsed && (
              <div className="space-y-0.5">
                {cadastroItems.map(ci => renderNavItem(ci, true))}
              </div>
            )}
          </>
        )}
      </nav>
      <div className="border-t border-sidebar-border p-2 space-y-0.5">
        {configItem && renderNavItem(configItem)}
        <div className="flex items-center justify-between px-2 pt-1">
          <Button
            variant="ghost"
            size="icon"
            className="text-sidebar-foreground hover:bg-sidebar-accent"
            onClick={() => setDark(!dark)}
            title={dark ? 'Modo claro' : 'Modo escuro'}
          >
            {dark ? <Sun className="h-4 w-4" /> : <Moon className="h-4 w-4" />}
          </Button>
          <div className="hidden md:block">
            <Button
              variant="ghost"
              size="icon"
              className="text-sidebar-foreground hover:bg-sidebar-accent"
              onClick={() => setCollapsed(!collapsed)}
            >
              <ChevronLeft className={cn('h-4 w-4 transition-transform', collapsed && 'rotate-180')} />
            </Button>
          </div>
        </div>
      </div>
    </div>
  );

  return (
    <div className="min-h-screen flex bg-background">
      <aside
        className={cn(
          'hidden md:flex flex-col bg-sidebar border-r border-sidebar-border transition-all duration-200 shrink-0',
          collapsed ? 'w-16' : 'w-56'
        )}
      >
        {sidebarContent}
      </aside>

      {mobileOpen && (
        <div className="fixed inset-0 z-40 md:hidden">
          <div className="absolute inset-0 bg-foreground/30" onClick={() => setMobileOpen(false)} />
          <aside className="absolute left-0 top-0 bottom-0 w-64 bg-sidebar z-50 shadow-xl">
            {sidebarContent}
          </aside>
        </div>
      )}

      <div className="flex-1 flex flex-col min-w-0">
        <header className="flex items-center gap-3 px-4 py-3 border-b border-border bg-card md:hidden">
          <Button variant="ghost" size="icon" onClick={() => setMobileOpen(true)}>
            <Menu className="h-5 w-5" />
          </Button>
          {showBackButton && (
            <Button variant="ghost" size="icon" onClick={() => navigate(-1)}>
              <ArrowLeft className="h-5 w-5" />
            </Button>
          )}
          <img src={logoColorida} alt="MedWork" className="h-9" />
          <span className="text-sm font-semibold text-foreground">VIS<span className="font-extrabold">TEC</span></span>
        </header>
        <main className="flex-1 overflow-y-auto">
          {children}
        </main>
      </div>
    </div>
  );
}
