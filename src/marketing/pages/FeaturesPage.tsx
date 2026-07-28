import {
  BarChart3,
  FileText,
  KeyRound,
  Receipt,
  Settings,
  ShoppingCart,
  Truck,
  Users,
} from "lucide-react";
import { MarketingCta } from "../components/MarketingCta";

const features = [
  { icon: ShoppingCart, title: "Ventes", description: "Gérez vos opérations de vente dans un espace dédié." },
  { icon: FileText, title: "Devis", description: "Préparez et suivez vos documents commerciaux." },
  { icon: Users, title: "Clients", description: "Centralisez les informations utiles à la relation client." },
  { icon: Truck, title: "Achats et fournisseurs", description: "Structurez vos approvisionnements et partenaires." },
  { icon: Receipt, title: "Dépenses", description: "Enregistrez et consultez les dépenses de l’activité." },
  { icon: BarChart3, title: "Rapports", description: "Accédez à une lecture consolidée de vos opérations." },
  { icon: KeyRound, title: "Rôles et permissions", description: "Adaptez les accès aux responsabilités de chaque utilisateur." },
  { icon: Settings, title: "Paramètres", description: "Configurez l’environnement selon votre organisation." },
] as const;

export function FeaturesPage() {
  return (
    <>
      <section className="bg-slate-950 px-5 py-24 text-white lg:px-8">
        <div className="mx-auto max-w-4xl text-center">
          <p className="text-sm font-bold uppercase tracking-[0.2em] text-blue-400">Fonctionnalités</p>
          <h1 className="mt-4 text-4xl font-extrabold tracking-tight sm:text-5xl">
            Les outils métier réunis dans un même environnement.
          </h1>
          <p className="mx-auto mt-6 max-w-2xl text-lg leading-8 text-slate-300">
            AUREX ERP organise les principaux flux de gestion sans fragmenter les informations.
          </p>
        </div>
      </section>
      <section className="px-5 py-20 lg:px-8">
        <div className="mx-auto grid max-w-7xl gap-5 sm:grid-cols-2 lg:grid-cols-4">
          {features.map((feature) => (
            <article key={feature.title} className="rounded-2xl border border-slate-200 p-6 shadow-sm">
              <span className="grid h-11 w-11 place-items-center rounded-xl bg-blue-50 text-blue-600">
                <feature.icon className="h-5 w-5" aria-hidden="true" />
              </span>
              <h2 className="mt-5 text-lg font-bold">{feature.title}</h2>
              <p className="mt-2 text-sm leading-6 text-slate-600">{feature.description}</p>
            </article>
          ))}
        </div>
      </section>
      <MarketingCta />
    </>
  );
}
