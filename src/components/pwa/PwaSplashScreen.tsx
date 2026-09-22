import { useEffect, useState } from "react";
import { HOTEL_BACKGROUND_COLOR, HOTEL_BRANDING_ASSETS } from "@/lib/hotel/hotel-branding";

// Minimum time the splash stays visible once shown, purely so the fade-in
// doesn't get cut off by a fast load — never the reason it disappears.
const MIN_VISIBLE_MS = 500;
// Safety cap: if `load` never fires (slow network, a stalled request), the
// splash still leaves on its own so it can never block the app.
const MAX_WAIT_MS = 2500;
const FADE_OUT_MS = 400;

type Phase = "visible" | "leaving" | "gone";

// Rendered unconditionally (including during SSR) so the markup exists in
// the very first HTML: whether it's actually shown is decided purely by the
// `@media (display-mode: standalone)` CSS rule in styles.css, not by JS.
// That means a plain browser tab never sees this component do anything —
// only an installed/home-screen-launched SAOVIA shows it. It mounts once
// per full document load (TanStack Router client-side navigations don't
// remount the root), so it never reappears on a route change.
export function PwaSplashScreen({ isHotelHost = false }: { isHotelHost?: boolean }) {
  const [phase, setPhase] = useState<Phase>("visible");

  useEffect(() => {
    if (typeof window === "undefined") return;

    const start = Date.now();
    let settled = false;

    const leave = () => {
      if (settled) return;
      settled = true;
      const elapsed = Date.now() - start;
      const remaining = Math.max(0, MIN_VISIBLE_MS - elapsed);
      window.setTimeout(() => setPhase("leaving"), remaining);
    };

    // The real signal: the document and its initial resources (styles,
    // fonts, first images) have actually finished loading.
    if (document.readyState === "complete") {
      leave();
    } else {
      window.addEventListener("load", leave, { once: true });
    }

    // Safety net only — not the primary condition. Guarantees the splash
    // never blocks the app if `load` is unusually slow to fire.
    const maxWaitTimer = window.setTimeout(leave, MAX_WAIT_MS);

    return () => {
      window.removeEventListener("load", leave);
      window.clearTimeout(maxWaitTimer);
    };
  }, []);

  useEffect(() => {
    if (phase !== "leaving") return;
    const timer = window.setTimeout(() => setPhase("gone"), FADE_OUT_MS);
    return () => window.clearTimeout(timer);
  }, [phase]);

  if (phase === "gone") return null;

  return (
    <div
      className="pwa-splash fixed inset-0 z-[9999] flex-col items-center justify-center"
      style={{ backgroundColor: isHotelHost ? HOTEL_BACKGROUND_COLOR : "#071B49" }}
      data-leaving={phase === "leaving" ? "true" : undefined}
      aria-hidden="true"
    >
      {isHotelHost ? (
        // Full-bleed 1080x1920 splash composition (background, waves,
        // loading ring and copy are baked into the image itself) — unlike
        // the generic branch below, this isn't a small logo mark centered
        // on a plain color, so it's rendered edge-to-edge instead of inside
        // the padded flex container.
        <img
          src={HOTEL_BRANDING_ASSETS.splash}
          alt="SAOVIA HOTEL"
          className="pwa-splash-logo absolute inset-0 h-full w-full object-cover"
          width={1080}
          height={1920}
          decoding="async"
        />
      ) : (
        <div
          className="flex flex-col items-center justify-center px-6"
          style={{
            paddingTop: "env(safe-area-inset-top)",
            paddingBottom: "env(safe-area-inset-bottom)",
            paddingLeft: "env(safe-area-inset-left)",
            paddingRight: "env(safe-area-inset-right)",
          }}
        >
          <img
            src="/splash/saovia-splash-logo.png"
            alt="SAOVIA"
            className="pwa-splash-logo h-auto w-44 max-w-[60vw] sm:w-56"
            width={700}
            height={556}
            decoding="async"
          />
        </div>
      )}
    </div>
  );
}
