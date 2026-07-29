import { forwardRef, useEffect, useImperativeHandle, useRef, useState } from "react";

const SCRIPT_URL = "https://challenges.cloudflare.com/turnstile/v0/api.js?render=explicit";

type TurnstileApi = {
  render: (
    container: HTMLElement,
    options: {
      sitekey: string;
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

export type TurnstileHandle = {
  reset: () => void;
};

export const Turnstile = forwardRef<
  TurnstileHandle,
  {
    siteKey: string;
    onTokenChange: (token: string) => void;
  }
>(function Turnstile({ siteKey, onTokenChange }, ref) {
  const containerRef = useRef<HTMLDivElement>(null);
  const widgetIdRef = useRef<string | undefined>(undefined);
  const [error, setError] = useState("");

  useImperativeHandle(
    ref,
    () => ({
      reset: () => {
        onTokenChange("");
        setError("");
        if (widgetIdRef.current && window.turnstile) {
          window.turnstile.reset(widgetIdRef.current);
        }
      },
    }),
    [onTokenChange],
  );

  useEffect(() => {
    const container = containerRef.current;
    if (!container || !siteKey) return;

    let widgetId: string | undefined;
    let disposed = false;
    const renderWidget = () => {
      if (disposed || !window.turnstile || widgetId) return;
      widgetId = window.turnstile.render(container, {
        sitekey: siteKey,
        callback: (token) => {
          setError("");
          onTokenChange(token);
        },
        "expired-callback": () => onTokenChange(""),
        "error-callback": (code) => {
          onTokenChange("");
          setError(
            code
              ? `La protection anti-robot n'a pas pu se charger (Cloudflare ${code}).`
              : "La protection anti-robot n'a pas pu se charger.",
          );
        },
      });
      widgetIdRef.current = widgetId;
    };

    let script = document.querySelector<HTMLScriptElement>(`script[src="${SCRIPT_URL}"]`);
    if (!script) {
      script = document.createElement("script");
      script.src = SCRIPT_URL;
      script.async = true;
      script.defer = true;
      document.head.appendChild(script);
    }

    const handleScriptError = () =>
      setError(
        "Le script Cloudflare Turnstile est inaccessible. Vérifiez la CSP, le réseau ou le bloqueur de contenu.",
      );

    if (window.turnstile) renderWidget();
    else {
      script.addEventListener("load", renderWidget);
      script.addEventListener("error", handleScriptError);
    }

    return () => {
      disposed = true;
      script?.removeEventListener("load", renderWidget);
      script?.removeEventListener("error", handleScriptError);
      if (widgetId && window.turnstile) window.turnstile.remove(widgetId);
      widgetIdRef.current = undefined;
      onTokenChange("");
    };
  }, [siteKey, onTokenChange]);

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
