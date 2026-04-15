import { useState, useEffect } from 'react';
import { Link, useLocation, useNavigate } from 'react-router-dom';
import {
  LayoutDashboard, ClipboardList, Building2, AlertTriangle,
  Shield, HardHat, GraduationCap, Settings, Menu, ChevronLeft,
  ChevronDown, FolderOpen, Stethoscope, UserCheck,
  FileText, Sun, Moon, ArrowLeft, X,
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
  const [dark, setDark] = useState(() => localStorage.getItem('theme') === 'dark');
  const [cadastroOpen, setCadastroOpen] = useState(() => {
    return CADASTRO_KEYS.some(k => window.location.pathname.startsWith(`/${k}`));
  });

  useEffect(() => {
    document.documentElement.classList.toggle('dark', dark);
    localStorage.setItem('theme', dark ? 'dark' : 'light');
  }, [dark]);

  useEffect(() => {
    setNavItems(navItemsStore.getAll());
    if (CADASTRO_KEYS.some(k => location.pathname.startsWith(`/${k}`))) {
      setCadastroOpen(true);
    }
  }, [location.pathname]);

  // Close mobile on route change
  useEffect(() => { setMobileOpen(false); }, [location.pathname]);

  const visibleItems = navItems.filter(item => item.visible).sort((a, b) => a.order - b.order);
  const topLevelItems = visibleItems.filter(item => !CADASTRO_KEYS.includes(item.key));
  const cadastroItems = visibleItems.filter(item => CADASTRO_KEYS.includes(item.key));

  const isActive = (path: string) => {
    if (path === '/') return location.pathname === '/';
    return location.pathname.startsWith(path);
  };

  const hasCadastroActive = cadastroItems.some(item => isActive(ROUTE_MAP[item.key] || '/'));
  const showBackButton = location.pathname !== '/';

  const navWithoutConfig = topLevelItems.filter(item => item.key !== 'configuracoes');
  const configItem = topLevelItems.find(item => item.key === 'configuracoes');

  const renderNavItem = (item: typeof navItems[0], indent = false) => {
    const Icon = ICON_MAP[item.key] || LayoutDashboard;
    const to = ROUTE_MAP[item.key] || '/';
    const active = isActive(to);
    return (
      <Link
        key={item.key}
        to={to}
        className={cn(
          'group flex items-center gap-3 py-2.5 text-[0.82rem] rounded-lg mx-2 transition-all duration-150',
          indent ? 'pl-10 pr-3' : 'px-3',
          collapsed && !indent && 'justify-center px-0 mx-1',
          active
            ? 'bg-gradient-to-r from-primary/20 to-primary/5 text-primary font-semibold shadow-sm border border-primary/10'
            : 'text-sidebar-foreground hover:bg-white/5 hover:translate-x-0.5'
        )}
      >
        <Icon className={cn('h-[18px] w-[18px] shrink-0 transition-colors', active ? 'text-primary' : 'text-sidebar-foreground/70 group-hover:text-sidebar-foreground')} />
        {!collapsed && <span className="truncate">{item.label}</span>}
      </Link>
    );
  };

  const sidebarContent = (isMobile: boolean) => (
    <div className="flex flex-col h-full">
      {/* Logo + Name */}
      <div className={cn(
        'flex flex-col items-center border-b border-white/10 bg-gradient-to-b from-white/[0.04] to-transparent',
        collapsed && !isMobile ? 'px-2 py-4' : 'px-4 py-5'
      )}>
        <img
          src={logoColorida}
          alt="MedWork"
          className={cn('transition-all duration-200', collapsed && !isMobile ? 'h-9' : 'h-[72px]')}
        />
        {(!collapsed || isMobile) && (
          <span className="mt-2 text-lg font-bold tracking-widest text-white/90">
            VIS<span className="font-extrabold text-primary">TEC</span>
          </span>
        )}
      </div>

      {/* Navigation */}
      <nav className="flex-1 py-3 space-y-0.5 overflow-y-auto scrollbar-thin">
        {navWithoutConfig.map((item) => renderNavItem(item))}

        {cadastroItems.length > 0 && (
          <>
            <button
              onClick={() => setCadastroOpen(!cadastroOpen)}
              className={cn(
                'flex items-center gap-3 px-3 py-2.5 text-[0.82rem] rounded-lg mx-2 w-[calc(100%-1rem)] transition-all',
                collapsed && !isMobile && 'justify-center px-0 mx-1',
                hasCadastroActive
                  ? 'text-primary font-semibold'
                  : 'text-sidebar-foreground hover:bg-white/5'
              )}
            >
              <FolderOpen className="h-[18px] w-[18px] shrink-0" />
              {(!collapsed || isMobile) && (
                <>
                  <span className="truncate flex-1 text-left">Cadastros</span>
                  <ChevronDown className={cn('h-3.5 w-3.5 transition-transform shrink-0', !cadastroOpen && '-rotate-90')} />
                </>
              )}
            </button>
            {cadastroOpen && (!collapsed || isMobile) && (
              <div className="space-y-0.5">
                {cadastroItems.map(ci => renderNavItem(ci, true))}
              </div>
            )}
          </>
        )}
      </nav>

      {/* Footer: Config + Theme + Collapse */}
      <div className="border-t border-white/10 p-2 space-y-1 bg-black/10">
        {configItem && renderNavItem(configItem)}
        <div className={cn(
          'flex items-center gap-1 px-1 pt-1',
          collapsed && !isMobile ? 'flex-col' : 'justify-between'
        )}>
          <Button
            variant="ghost"
            size="icon"
            className="h-8 w-8 text-sidebar-foreground/70 hover:text-sidebar-foreground hover:bg-white/10 rounded-lg"
            onClick={() => setDark(!dark)}
            title={dark ? 'Modo claro' : 'Modo escuro'}
          >
            {dark ? <Sun className="h-4 w-4" /> : <Moon className="h-4 w-4" />}
          </Button>
          {!isMobile && (
            <Button
              variant="ghost"
              size="icon"
              className="h-8 w-8 text-sidebar-foreground/70 hover:text-sidebar-foreground hover:bg-white/10 rounded-lg hidden md:inline-flex"
              onClick={() => setCollapsed(!collapsed)}
              title={collapsed ? 'Expandir' : 'Recolher'}
            >
              <ChevronLeft className={cn('h-4 w-4 transition-transform duration-200', collapsed && 'rotate-180')} />
            </Button>
          )}
        </div>
      </div>
    </div>
  );

  return (
    <div className="min-h-screen flex bg-background">
      {/* Desktop Sidebar - FIXED */}
      <aside
        className={cn(
          'hidden md:flex flex-col fixed top-0 left-0 h-screen bg-sidebar border-r border-sidebar-border transition-all duration-200 z-30',
          collapsed ? 'w-[60px]' : 'w-56'
        )}
      >
        {sidebarContent(false)}
      </aside>

      {/* Spacer to push content */}
      <div className={cn('hidden md:block shrink-0 transition-all duration-200', collapsed ? 'w-[60px]' : 'w-56')} />

      {/* Mobile Drawer */}
      {mobileOpen && (
        <div className="fixed inset-0 z-50 md:hidden">
          <div className="absolute inset-0 bg-black/50 backdrop-blur-sm" onClick={() => setMobileOpen(false)} />
          <aside className="absolute left-0 top-0 bottom-0 w-[280px] bg-sidebar shadow-2xl animate-in slide-in-from-left duration-200">
            <button
              onClick={() => setMobileOpen(false)}
              className="absolute top-4 right-4 text-white/60 hover:text-white z-10"
            >
              <X className="h-5 w-5" />
            </button>
            {sidebarContent(true)}
          </aside>
        </div>
      )}

      {/* Main Content */}
      <div className="flex-1 flex flex-col min-w-0">
        {/* Mobile Header */}
        <header className="flex items-center gap-3 px-4 py-3 border-b border-border bg-card/80 backdrop-blur-md md:hidden sticky top-0 z-20">
          <Button
            variant="ghost"
            size="icon"
            className="h-9 w-9 rounded-xl hover:bg-primary/10"
            onClick={() => setMobileOpen(true)}
          >
            <Menu className="h-5 w-5" />
          </Button>
          {showBackButton && (
            <Button
              variant="ghost"
              size="icon"
              className="h-9 w-9 rounded-xl hover:bg-primary/10"
              onClick={() => navigate(-1)}
            >
              <ArrowLeft className="h-5 w-5" />
            </Button>
          )}
          <div className="flex items-center gap-2 ml-auto">
            <img src={logoColorida} alt="MedWork" className="h-8" />
            <span className="text-sm font-bold tracking-wide text-foreground">
              VIS<span className="font-extrabold text-primary">TEC</span>
            </span>
          </div>
        </header>

        <main className="flex-1 overflow-y-auto">
          {children}
        </main>
      </div>
    </div>
  );
}
