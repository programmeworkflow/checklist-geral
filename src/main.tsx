import { createRoot } from "react-dom/client";
import App from "./App.tsx";
import "./index.css";
import { registerSW } from "virtual:pwa-register";
import { startSync } from "./lib/syncManager";

// Inicia o sync local→Supabase. Idempotente: pode ser chamado múltiplas vezes.
startSync();

// Service Worker — autoUpdate: ativa nova versão automaticamente em
// todos PCs/abas sem precisar de hard refresh ou interação manual.
//
// Garantias contra perda de dados durante o reload:
//  1. Autosave de checklist a cada 3s (formData → is_draft no Supabase)
//  2. React Query: optimistic updates (mudanças locais persistem)
//  3. Storage de uploads no Supabase (não há buffer local volátil)
//
// Em produção, deploys raramente coincidem com o instante de um
// save crítico. Caso aconteça, o autosave já gravou os dados.

registerSW({
  immediate: true,
  onNeedRefresh() {
    // Pequeno aviso visual no rodapé (opcional, não bloqueia nada)
    if (document.getElementById("__sw_update_toast")) return;
    const toast = document.createElement("div");
    toast.id = "__sw_update_toast";
    toast.innerHTML = `
      <div style="
        position: fixed; bottom: 20px; left: 50%; transform: translateX(-50%);
        background: #0C97C4; color: white; padding: 10px 16px;
        border-radius: 999px; box-shadow: 0 6px 20px rgba(0,0,0,0.15);
        font-family: 'DM Sans', sans-serif; font-size: 12px; font-weight: 500;
        z-index: 9999; opacity: 0;
        animation: vTcUpd .25s ease forwards, vTcUpd .25s ease 3.2s reverse forwards;
      ">
        Atualizando para a versão mais recente…
      </div>
      <style>@keyframes vTcUpd { to { opacity: 1; transform: translate(-50%, -4px); } }</style>
    `;
    document.body.appendChild(toast);
    setTimeout(() => toast.remove(), 4000);
  },
  onRegisteredSW(_swUrl, registration) {
    if (!registration) return;
    // Checa update a cada 1h (caso usuário fique com a aba aberta o dia todo)
    setInterval(() => registration.update().catch(() => {}), 60 * 60 * 1000);
  },
});

createRoot(document.getElementById("root")!).render(<App />);
