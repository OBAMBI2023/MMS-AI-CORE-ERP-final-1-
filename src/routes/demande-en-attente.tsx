import { createFileRoute } from "@tanstack/react-router";
import { Clock3 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { supabase } from "@/integrations/supabase/client";

export const Route = createFileRoute("/demande-en-attente")({ component: PendingPage });

function PendingPage() {
  return <main className="flex min-h-screen items-center justify-center bg-muted/30 p-4"><Card className="max-w-lg text-center"><CardContent className="space-y-5 p-8"><Clock3 className="mx-auto size-12 text-amber-500"/><h1 className="text-2xl font-semibold">Demande en attente de configuration</h1><p className="text-muted-foreground">Votre compte et votre espace provisoire ont été créés. Le Super Admin doit choisir votre offre et vos modules. Votre essai commencera uniquement après cette activation.</p><Button variant="outline" onClick={async () => { await supabase.auth.signOut(); location.href = "/login"; }}>Se déconnecter</Button></CardContent></Card></main>;
}
