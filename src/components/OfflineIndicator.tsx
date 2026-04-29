import { useEffect, useState } from "react";
import { CloudOff, CloudUpload, Download, X } from "lucide-react";

/**
 * Pequeno indicador no canto da tela:
 * - Online + sem prompt → invisível
 * - Offline → pill amarelo "Modo offline"
 * - Sincronizando após voltar → pill azul "Sincronizando…"
 * - PWA instalável → pill com botão "Instalar app" (1x por sessão)
 */
export function OfflineIndicator() {
  const [online, setOnline] = useState(navigator.onLine);
  const [showSync, setShowSync] = useState(false);
  const [installEvent, setInstallEvent] = useState<any>(null);
  const [installDismissed, setInstallDismissed] = useState(
    () => sessionStorage.getItem("vistec_install_dismissed") === "1"
  );

  useEffect(() => {
    const onUp = () => {
      setOnline(true);
      // mostra "sincronizando" por 3s quando volta
      setShowSync(true);
      setTimeout(() => setShowSync(false), 3500);
    };
    const onDown = () => setOnline(false);
    window.addEventListener("online", onUp);
    window.addEventListener("offline", onDown);

    const onInstall = (e: Event) => {
      e.preventDefault();
      setInstallEvent(e);
    };
    window.addEventListener("beforeinstallprompt", onInstall);

    return () => {
      window.removeEventListener("online", onUp);
      window.removeEventListener("offline", onDown);
      window.removeEventListener("beforeinstallprompt", onInstall);
    };
  }, []);

  const handleInstall = async () => {
    if (!installEvent) return;
    installEvent.prompt();
    await installEvent.userChoice;
    setInstallEvent(null);
  };

  const dismissInstall = () => {
    sessionStorage.setItem("vistec_install_dismissed", "1");
    setInstallDismissed(true);
  };

  // Prioridade: offline > sync > install
  if (!online) {
    return (
      <Pill variant="warning" icon={<CloudOff className="h-3.5 w-3.5" />}>
        Modo offline — alterações ficam pendentes
      </Pill>
    );
  }

  if (showSync) {
    return (
      <Pill variant="info" icon={<CloudUpload className="h-3.5 w-3.5" />}>
        Sincronizando…
      </Pill>
    );
  }

  if (installEvent && !installDismissed) {
    return (
      <Pill variant="primary" icon={<Download className="h-3.5 w-3.5" />}>
        <button onClick={handleInstall} className="font-semibold underline-offset-2 hover:underline">
          Instalar app
        </button>
        <button onClick={dismissInstall} className="ml-2 opacity-60 hover:opacity-100">
          <X className="h-3 w-3" />
        </button>
      </Pill>
    );
  }

  return null;
}

function Pill({
  children,
  icon,
  variant,
}: {
  children: React.ReactNode;
  icon?: React.ReactNode;
  variant: "warning" | "info" | "primary";
}) {
  const cls =
    variant === "warning"
      ? "bg-amber-500 text-white"
      : variant === "info"
      ? "bg-primary text-primary-foreground"
      : "bg-foreground text-background";
  return (
    <div className="fixed bottom-4 right-4 z-[100] print:hidden">
      <div
        className={`inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs font-medium shadow-lg ${cls}`}
      >
        {icon}
        <span className="inline-flex items-center">{children}</span>
      </div>
    </div>
  );
}
