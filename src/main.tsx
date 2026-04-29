import { createRoot } from "react-dom/client";
import App from "./App.tsx";
import "./index.css";
import { registerSW } from "virtual:pwa-register";

// Service Worker — registra silenciosamente.
// `autoUpdate`: força reload na próxima visita após detectar versão nova.
registerSW({
  immediate: true,
  onRegisteredSW(_swUrl, registration) {
    if (!registration) return;
    // Checa update a cada 1h (caso usuário fique com app aberto)
    setInterval(() => registration.update().catch(() => {}), 60 * 60 * 1000);
  },
});

createRoot(document.getElementById("root")!).render(<App />);
