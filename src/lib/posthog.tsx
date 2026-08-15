import { useEffect, useRef } from "react";
import posthog from "posthog-js";
import { PostHogProvider } from "@posthog/react";
import { readEnvVar } from "@/integrations/supabase/env";

let initialized = false;

function getPosthogConfig() {
  return {
    token: readEnvVar("VITE_POSTHOG_PROJECT_TOKEN"),
    host: readEnvVar("VITE_POSTHOG_HOST"),
  };
}

export function PosthogRootProvider({ children }: { children: React.ReactNode }) {
  useEffect(() => {
    if (initialized || typeof window === "undefined") return;
    const { token, host } = getPosthogConfig();
    if (!token || !host) return;

    posthog.init(token, {
      api_host: host,
      capture_pageview: false,
      capture_pageleave: true,
      disable_session_recording: false,
      loaded: (client) => {
        client.set_config({
          capture_pageview: false,
          capture_pageleave: true,
          persistence: "localStorage",
        });
      },
    });

    initialized = true;
  }, []);

  return (
    <PostHogProvider client={posthog}>
      <PosthogNavigationTracker />
      {children}
    </PostHogProvider>
  );
}

function PosthogNavigationTracker() {
  useEffect(() => {
    if (typeof window === "undefined" || !(posthog as any).__loaded) return;

    const capturePageview = () => {
      posthog.capture("$pageview");
    };

    capturePageview();
    window.addEventListener("popstate", capturePageview);

    const originalPushState = window.history.pushState;
    const originalReplaceState = window.history.replaceState;

    window.history.pushState = function (...args) {
      originalPushState.apply(this, args as never);
      capturePageview();
    };
    window.history.replaceState = function (...args) {
      originalReplaceState.apply(this, args as never);
      capturePageview();
    };

    return () => {
      window.removeEventListener("popstate", capturePageview);
      window.history.pushState = originalPushState;
      window.history.replaceState = originalReplaceState;
    };
  }, []);

  return null;
}
