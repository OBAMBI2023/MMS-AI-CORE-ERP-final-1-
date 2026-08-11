import { useEffect } from "react";
import { toast } from "sonner";

// Registers the PWA service worker in production only — in dev the dynamic
// import below is never reached, so `virtual:pwa-register` is never
// fetched/evaluated. registerType is "prompt" (see vite.config.ts): a
// waiting worker never activates on its own, so a user mid-edit on a sale
// or reservation is never force-reloaded. The toast lets them apply the
// update on their own terms, staying visible until they act.
export function PwaUpdatePrompt() {
  useEffect(() => {
    if (!import.meta.env.PROD) return;
    let cancelled = false;

    import("virtual:pwa-register").then(({ registerSW }) => {
      if (cancelled) return;
      const updateSW = registerSW({
        onNeedRefresh() {
          toast("Nouvelle version de SAOVIA disponible", {
            duration: Infinity,
            action: {
              label: "Mettre à jour",
              onClick: () => updateSW(true),
            },
          });
        },
      });
    });

    return () => {
      cancelled = true;
    };
  }, []);

  return null;
}
