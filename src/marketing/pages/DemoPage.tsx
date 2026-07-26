import { CheckCircle2, LogIn } from "lucide-react";
import { Link } from "@tanstack/react-router";

export function DemoPage() {
  return (
    <section className="px-5 py-24 lg:px-8">
      <div className="mx-auto grid max-w-6xl items-start gap-12 lg:grid-cols-2">
        <div>
          <p className="text-sm font-bold uppercase tracking-[0.2em] text-blue-600">Démonstration</p>
          <h1 className="mt-4 text-4xl font-extrabold tracking-tight text-slate-950 sm:text-5xl">
            Évaluez la solution à partir de vos besoins réels.
          </h1>
          <p className="mt-6 text-lg leading-8 text-slate-600">
            Découvrez l’organisation de la plateforme et identifiez les flux pertinents pour votre
            entreprise.
          </p>
          <div className="mt-8 space-y-4">
            {[
              "Présentation des espaces de gestion",
              "Parcours adapté à votre organisation",
              "Échange sur les accès et les responsabilités",
            ].map((item) => (
              <div key={item} className="flex items-center gap-3 text-sm font-medium text-slate-700">
                <CheckCircle2 className="h-5 w-5 text-blue-600" aria-hidden="true" />
                {item}
              </div>
            ))}
          </div>
        </div>

        <div className="rounded-3xl border border-slate-200 bg-slate-50 p-8 sm:p-10">
          <h2 className="text-2xl font-extrabold">Votre espace est déjà actif ?</h2>
          <p className="mt-3 leading-7 text-slate-600">
            Connectez-vous avec les identifiants fournis par votre organisation pour accéder à
            l’ERP.
          </p>
          <Link
            to="/login"
            className="mt-7 inline-flex items-center gap-2 rounded-xl bg-blue-600 px-5 py-3.5 text-sm font-bold text-white hover:bg-blue-700"
          >
            <LogIn className="h-4 w-4" aria-hidden="true" />
            Accéder à la connexion
          </Link>
          <p className="mt-6 border-t border-slate-200 pt-6 text-sm leading-6 text-slate-500">
            La demande d’essai et la création de compte ne sont pas encore disponibles en libre-service.
          </p>
        </div>
      </div>
    </section>
  );
}
