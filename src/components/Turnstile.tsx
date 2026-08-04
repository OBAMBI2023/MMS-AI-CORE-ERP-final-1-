import { forwardRef, useEffect, useImperativeHandle, useRef, useState } from "react";

const SCRIPT_ID = "cloudflare-turnstile-script";
const SCRIPT_URL = "https://challenges.cloudflare.com/turnstile/v0/api.js?render=explicit";
const LOCAL_HOSTS = new Set(["localhost", "127.0.0.1", "192.168.1.66"]);

type TurnstileApi = {
  render: (
    container: HTMLElement,
    options: {
      sitekey: string;
      action: string;
      size?: "normal" | "flexible" | "compact";
      callback: (token: string) => void;
      "expired-callback": () => void;
      "error-callback": (errorCode?: string) => void;
    },
  ) => string;
  reset: (widgetId: string) => void;
  remove: (widgetId: string) => void;
};

declare global {
  interface Window {
    turnstile?: TurnstileApi;
  }
}

let turnstileScriptPromise: Promise<TurnstileApi> | undefined;

function loadTurnstile(): Promise<TurnstileApi> {
  if (window.turnstile) return Promise.resolve(window.turnstile);
  if (turnstileScriptPromise) return turnstileScriptPromise;

  turnstileScriptPromise = new Promise((resolve, reject) => {
    let script = document.getElementById(SCRIPT_ID) as HTMLScriptElement | null;
    if (!script) {
      script = document.createElement("script");
      script.id = SCRIPT_ID;
      script.src = SCRIPT_URL;
      script.async = true;
      script.defer = true;
      document.head.appendChild(script);
    }

    const cleanup = () => {
      script?.removeEventListener("load", handleLoad);
      script?.removeEventListener("error", handleError);
    };
    const handleLoad = () => {
      cleanup();
      if (window.turnstile) resolve(window.turnstile);
      else reject(new Error("L'API Turnstile n'est pas disponible après le chargement du script."));
    };
    const handleError = () => {
      cleanup();
      turnstileScriptPromise = undefined;
      reject(new Error("Le script Cloudflare Turnstile est inaccessible."));
    };

    script.addEventListener("load", handleLoad, { once: true });
    script.addEventListener("error", handleError, { once: true });
  });
  return turnstileScriptPromise;
}

function turnstileErrorMessage(code?: string): string {
  if (code === "110200") {
    return `Ce domaine (${window.location.hostname}) n'est pas autorisé par le widget Cloudflare Turnstile. Ajoutez-le dans la liste des noms d'hôte du widget.`;
  }
  const localHint = LOCAL_HOSTS.has(window.location.hostname)
    ? " Vérifiez que ce domaine local est autorisé et que VITE_TURNSTILE_SITE_KEY désigne ce widget."
    : "";
  return `La protection anti-robot est indisponible${code ? ` (Cloudflare ${code})` : ""}.${localHint}`;
}

export type TurnstileHandle = { reset: () => void };

export const Turnstile = forwardRef<
  TurnstileHandle,
  {
    siteKey: string;
    onTokenChange: (token: string) => void;
    size?: "normal" | "flexible" | "compact";
  }
>(function Turnstile({ siteKey, onTokenChange, size = "normal" }, ref) {
  const containerRef = useRef<HTMLDivElement>(null);
  const widgetIdRef = useRef<string | undefined>(undefined);
  const [error, setError] = useState("");

  useImperativeHandle(
    ref,
    () => ({
      reset: () => {
        onTokenChange("");
        setError("");
        if (widgetIdRef.current && window.turnstile) window.turnstile.reset(widgetIdRef.current);
      },
    }),
    [onTokenChange],
  );

  useEffect(() => {
    const container = containerRef.current;
    if (!container || !siteKey.trim()) return;

    let disposed = false;
    setError("");
    loadTurnstile()
      .then((api) => {
        if (disposed || widgetIdRef.current || !container.isConnected) return;
        widgetIdRef.current = api.render(container, {
          sitekey: siteKey.trim(),
          action: "trial_signup",
          size,
          callback: (token) => {
            if (disposed) return;
            setError("");
            onTokenChange(token);
          },
          "expired-callback": () => !disposed && onTokenChange(""),
          "error-callback": (code) => {
            if (disposed) return;
            onTokenChange("");
            setError(turnstileErrorMessage(code));
          },
        });
      })
      .catch((loadError: unknown) => {
        if (disposed) return;
        const detail = loadError instanceof Error ? loadError.message : "Erreur inconnue.";
        setError(
          LOCAL_HOSTS.has(window.location.hostname)
            ? `${detail} En développement local, vérifiez le réseau, le bloqueur de contenu et les domaines autorisés du widget.`
            : detail,
        );
      });

    return () => {
      disposed = true;
      const widgetId = widgetIdRef.current;
      widgetIdRef.current = undefined;
      if (widgetId && window.turnstile) window.turnstile.remove(widgetId);
      onTokenChange("");
    };
  }, [siteKey, onTokenChange, size]);

  return (
    <div>
      <div ref={containerRef} className="min-h-[65px]" />
      {error && (
        <p role="alert" className="mt-2 text-xs text-red-600">
          {error}
        </p>
      )}
    </div>
  );
});
