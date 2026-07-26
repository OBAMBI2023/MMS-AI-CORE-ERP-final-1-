import { Link } from "@tanstack/react-router";
import { ShieldAlert } from "lucide-react";

export function ForbiddenPage() {
  return (
    <div className="flex min-h-screen items-center justify-center bg-background px-4">
      <div className="max-w-md text-center">
        <div className="mx-auto flex h-20 w-20 items-center justify-center rounded-full bg-destructive/10 text-destructive">
          <ShieldAlert className="h-10 w-10" />
        </div>
        <h1 className="mt-6 text-3xl font-bold tracking-tight text-foreground">Accès refusé</h1>
        <p className="mt-4 text-muted-foreground">
          Vous n'avez pas les permissions nécessaires pour accéder à cette page. Veuillez contacter
          votre administrateur si vous pensez qu'il s'agit d'une erreur.
        </p>
        <div className="mt-8">
          <Link
            to="/login"
            className="inline-flex items-center justify-center rounded-md bg-primary px-4 py-2 text-sm font-medium text-primary-foreground transition-colors hover:bg-primary/90"
          >
            Retour à mon espace
          </Link>
        </div>
      </div>
    </div>
  );
}
