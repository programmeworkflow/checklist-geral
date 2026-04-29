import { createRoot } from "react-dom/client";
import App from "./App.tsx";
import "./index.css";
import { registerSW } from "virtual:pwa-register";

// Service Worker — registra com prompt explícito.
// Quando há nova versão, o SW antigo continua servindo até o usuário
// aceitar a atualização (clicando no botão "Atualizar" do banner).
// Isso evita que deploys interrompam operações em andamento (saves,
// autosaves, fetches em curso).

const updateSW = registerSW({
  immediate: true,
  onNeedRefresh() {
    // Mostra banner DOM nativo no rodapé
    if (document.getElementById("__sw_update_banner")) return;
    const banner = document.createElement("div");
    banner.id = "__sw_update_banner";
    banner.innerHTML = `
      <div style="
        position: fixed; bottom: 16px; left: 50%; transform: translateX(-50%);
        background: #0C97C4; color: white; padding: 12px 18px;
        border-radius: 12px; box-shadow: 0 8px 28px rgba(0,0,0,0.18);
        font-family: 'DM Sans', sans-serif; font-size: 13px; font-weight: 500;
        display: flex; align-items: center; gap: 12px; z-index: 9999;
        animation: slideUp .25s ease;
      ">
        <span>Nova versão disponível</span>
        <button id="__sw_update_btn" style="
          background: white; color: #0C97C4; border: 0; padding: 6px 14px;
          border-radius: 8px; font-weight: 600; cursor: pointer;
          font-family: inherit; font-size: 12px;
        ">Atualizar</button>
        <button id="__sw_dismiss_btn" style="
          background: transparent; color: white; border: 0; opacity: .7;
          padding: 4px; cursor: pointer; font-size: 18px; line-height: 1;
        ">×</button>
      </div>
      <style>@keyframes slideUp { from { transform: translate(-50%, 100%); opacity: 0 } to { transform: translate(-50%, 0); opacity: 1 } }</style>
    `;
    document.body.appendChild(banner);
    document.getElementById("__sw_update_btn")?.addEventListener("click", () => {
      updateSW(true);
    });
    document.getElementById("__sw_dismiss_btn")?.addEventListener("click", () => {
      banner.remove();
    });
  },
  onOfflineReady() {
    // primeira instalação — pode ignorar silenciosamente
  },
  onRegisteredSW(_swUrl, registration) {
    if (!registration) return;
    setInterval(() => registration.update().catch(() => {}), 60 * 60 * 1000);
  },
});

createRoot(document.getElementById("root")!).render(<App />);
