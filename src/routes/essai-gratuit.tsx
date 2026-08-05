import { createFileRoute, redirect } from "@tanstack/react-router";
import { supabase } from "@/integrations/supabase/client";
import { TrialSignupPage } from "@/marketing/pages/TrialSignupPage";

export const Route = createFileRoute("/essai-gratuit")({
  beforeLoad: async () => {
    const {
      data: { session },
    } = await supabase.auth.getSession();
    if (session) throw redirect({ to: "/app" });
  },
  component: TrialSignupPage,
});
