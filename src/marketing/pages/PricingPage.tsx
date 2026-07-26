import { ArrowRight, Check } from "lucide-react";
import { Link } from "@tanstack/react-router";

const includedCapabilities = [
  "Gestion des ventes et des devis",
  "Gestion des achats et des fournisseurs",
  "Suivi des clients, services et dépenses",
  "Rapports et paramètres d’entreprise",
  "Gestion des rôles et permissions",
] as const;

export function PricingPage() {
  return (
    <section className="px-5 py-24 lg:px-8">
      <div className="mx-auto max-w-5xl">
        <div className="mx-auto max-w-3xl text-center">
          <p className="text-sm font-bold uppercase tracking-[0.2em] text-blue-600">Tarifs</p>
          <h1 className="mt-4 text-4xl font-extrabold tracking-tight text-slate-950 sm:text-5xl">
            Une offre adaptée à votre organisation.
          </h1>
          <p className="mt-6 text-lg leading-8 text-slate-600">
            Les modalités sont établies selon votre contexte, vos utilisateurs et les besoins de
            votre entreprise. Échangez avec notre équipe pour obtenir une proposition.
          </p>
        </div>

        <div className="mx-auto mt-14 max-w-2xl rounded-3xl border border-blue-200 bg-blue-50/50 p-7 shadow-xl shadow-blue-600/5 sm:p-10">
          <p className="text-sm font-bold uppercase tracking-wider text-blue-700">Solution entreprise</p>
          <h2 className="mt-3 text-3xl font-extrabold text-slate-950">Tarification personnalisée</h2>
          <p className="mt-3 text-slate-600">
            Une étude simple de votre périmètre permet de définir l’accompagnement approprié.
          </p>
          <ul className="mt-8 space-y-4">
            {includedCapabilities.map((capability) => (
              <li key={capability} className="flex items-start gap-3 text-sm text-slate-700">
                <span className="mt-0.5 grid h-5 w-5 shrink-0 place-items-center rounded-full bg-blue-600 text-white">
                  <Check className="h-3 w-3" aria-hidden="true" />
                </span>
                {capability}
              </li>
            ))}
          </ul>
          <Link
            to="/demo"
            className="mt-9 inline-flex w-full items-center justify-center gap-2 rounded-xl bg-blue-600 px-5 py-3.5 text-sm font-bold text-white hover:bg-blue-700"
          >
            Échanger sur votre projet
            <ArrowRight className="h-4 w-4" aria-hidden="true" />
          </Link>
        </div>
      </div>
    </section>
  );
}
