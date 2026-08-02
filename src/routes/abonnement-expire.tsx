import { createFileRoute } from "@tanstack/react-router";
import { CreditCard, LockKeyhole } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";

export const Route = createFileRoute("/abonnement-expire")({ component: ExpiredSubscriptionPage });

function ExpiredSubscriptionPage() {
  return <main className="flex min-h-screen items-center justify-center bg-muted/30 p-4">
    <Card className="w-full max-w-lg text-center">
      <CardHeader><LockKeyhole className="mx-auto size-12 text-amber-500"/><CardTitle>Votre essai est terminé</CardTitle></CardHeader>
      <CardContent className="space-y-5"><p className="text-muted-foreground">Votre compte reste accessible, mais les fonctions métier sont bloquées jusqu’à l’activation d’un abonnement.</p><Button asChild><a href="/tarifs"><CreditCard/>Voir les offres</a></Button></CardContent>
    </Card>
  </main>;
}
