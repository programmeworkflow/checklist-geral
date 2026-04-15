import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Route, Routes } from "react-router-dom";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { Toaster } from "@/components/ui/toaster";
import { TooltipProvider } from "@/components/ui/tooltip";
import { AppLayout } from "@/components/AppLayout";
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
import Relatorios from "./pages/Relatorios";
import Settings from "./pages/Settings";
import NotFound from "./pages/NotFound";

const queryClient = new QueryClient();

const App = () => (
  <QueryClientProvider client={queryClient}>
    <TooltipProvider>
      <Toaster />
      <Sonner />
      <BrowserRouter>
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
            <Route path="/treinamentos" element={<Treinamentos />} />
            <Route path="/configuracoes" element={<Settings />} />
            <Route path="/settings" element={<Settings />} />
            <Route path="*" element={<NotFound />} />
          </Routes>
        </AppLayout>
      </BrowserRouter>
    </TooltipProvider>
  </QueryClientProvider>
);

export default App;
