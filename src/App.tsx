import { useEffect } from "react";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Route, Routes, Navigate, useLocation } from "react-router-dom";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { Toaster } from "@/components/ui/toaster";
import { TooltipProvider } from "@/components/ui/tooltip";
import { AppLayout } from "@/components/AppLayout";
import { OfflineIndicator } from "@/components/OfflineIndicator";
import { seedDefaults } from "@/lib/storage";
import { useAuth } from "@/hooks/useAuth";
import Dashboard from "./pages/Dashboard";
import ChecklistList from "./pages/ChecklistList";
import Checklist from "./pages/Checklist";
import Empresas from "./pages/Empresas";
import EmpresaDetail from "./pages/EmpresaDetail";
import Riscos from "./pages/Riscos";
import Medidas from "./pages/Medidas";
import Epis from "./pages/Epis";
import Treinamentos from "./pages/Treinamentos";
import Exames from "./pages/Exames";
import Profissionais from "./pages/Profissionais";
import Cargos from "./pages/Cargos";
import Setores from "./pages/Setores";
import Relatorios from "./pages/Relatorios";
import Settings from "./pages/Settings";
import Login from "./pages/Login";
import PromptIA from "./pages/PromptIA";
import NotFound from "./pages/NotFound";

const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      // Sempre buscar dados frescos quando o usuário voltar à aba ou
      // reconectar internet. Evita que mudanças feitas em outro lugar
      // (outra aba, outro device, post-deploy) fiquem invisíveis.
      refetchOnWindowFocus: true,
      refetchOnReconnect: true,
      staleTime: 10_000, // 10s — depois disso, considera dado stale
      retry: 1,
    },
  },
});

function ProtectedRoutes() {
  const { isAuthenticated, isLoading } = useAuth();
  const location = useLocation();

  // Aguarda profissionais carregarem antes de decidir
  if (isLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="animate-pulse text-sm text-muted-foreground">Carregando…</div>
      </div>
    );
  }

  if (!isAuthenticated) {
    return <Navigate to="/login" replace state={{ from: location }} />;
  }

  return (
    <AppLayout>
      <Routes>
        <Route path="/" element={<Dashboard />} />
        <Route path="/empresas" element={<Empresas />} />
        <Route path="/empresas/:id" element={<EmpresaDetail />} />
        <Route path="/checklists" element={<ChecklistList />} />
        <Route path="/checklist" element={<Checklist />} />
        <Route path="/checklist/:id" element={<Checklist />} />
        <Route path="/relatorios" element={<Relatorios />} />
        <Route path="/riscos" element={<Riscos />} />
        <Route path="/medidas" element={<Medidas />} />
        <Route path="/epis" element={<Epis />} />
        <Route path="/exames" element={<Exames />} />
        <Route path="/profissionais" element={<Profissionais />} />
        <Route path="/cargos" element={<Cargos />} />
        <Route path="/setores" element={<Setores />} />
        <Route path="/treinamentos" element={<Treinamentos />} />
        <Route path="/prompt-ia" element={<PromptIA />} />
        <Route path="/configuracoes" element={<Settings />} />
        <Route path="/settings" element={<Settings />} />
        <Route path="*" element={<NotFound />} />
      </Routes>
    </AppLayout>
  );
}

const App = () => {
  useEffect(() => { seedDefaults(); }, []);
  return (
    <QueryClientProvider client={queryClient}>
      <TooltipProvider>
        <Toaster />
        <Sonner />
        <OfflineIndicator />
        <BrowserRouter>
          <Routes>
            <Route path="/login" element={<Login />} />
            <Route path="/*" element={<ProtectedRoutes />} />
          </Routes>
        </BrowserRouter>
      </TooltipProvider>
    </QueryClientProvider>
  );
};

export default App;
