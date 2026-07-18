import { createFileRoute } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { TrendingUp, TrendingDown, ShoppingCart, FileText, Users, Wallet } from "lucide-react";
import { AppShell } from "@/components/mms/AppShell";
import { supabase } from "@/integrations/supabase/client";
import { formatFCFA } from "@/lib/mms/format";

export const Route = createFileRoute("/rapports")({
  component: RapportsPage,
  head: () => ({
    meta: [
      { title: "Rapports — MMS AI CORE" },
      { name: "description", content: "Tableau de bord et rapports d'activité." },
    ],
  }),
});

function useStats() {
  return useQuery({
    queryKey: ["stats"],
    queryFn: async () => {
      const [ventes, depenses, achats, devis, clients, fourns] = await Promise.all([
        supabase.from("ventes").select("total, created_at"),
        supabase.from("depenses").select("amount, paid_at"),
        supabase.from("achats").select("total, created_at"),
        supabase.from("devis").select("id, status, total"),
        supabase.from("clients").select("id", { count: "exact", head: true }),
        supabase.from("fournisseurs").select("id", { count: "exact", head: true }),
      ]);
      const now = new Date();
      const mStart = new Date(now.getFullYear(), now.getMonth(), 1);
      const inMonth = (d: string) => new Date(d) >= mStart;
      const sumV = (ventes.data ?? []).reduce((s, r) => s + Number(r.total), 0);
      const sumVMonth = (ventes.data ?? [])
        .filter((r) => inMonth(r.created_at))
        .reduce((s, r) => s + Number(r.total), 0);
      const sumD = (depenses.data ?? []).reduce((s, r) => s + Number(r.amount), 0);
      const sumDMonth = (depenses.data ?? [])
        .filter((r) => inMonth(r.paid_at))
        .reduce((s, r) => s + Number(r.amount), 0);
      const sumA = (achats.data ?? []).reduce((s, r) => s + Number(r.total), 0);
      const devisAccepte = (devis.data ?? []).filter((d) => d.status === "accepté").length;
      const devisEnAttente = (devis.data ?? []).filter(
        (d) => d.status === "brouillon" || d.status === "envoyé",
      ).length;
      return {
        ventesTotal: sumV,
        ventesMois: sumVMonth,
        depensesTotal: sumD,
        depensesMois: sumDMonth,
        achatsTotal: sumA,
        beneficeMois: sumVMonth - sumDMonth,
        devisAccepte,
        devisEnAttente,
        devisTotal: (devis.data ?? []).length,
        nbClients: clients.count ?? 0,
        nbFournisseurs: fourns.count ?? 0,
      };
    },
  });
}

function RapportsPage() {
  const { data, isLoading } = useStats();
  return (
    <AppShell title="Rapports" subtitle="Vue d'ensemble de l'activité">
      {isLoading || !data ? (
        <div className="text-muted-foreground">Chargement...</div>
      ) : (
        <div className="space-y-6">
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
            <StatCard
              icon={Wallet}
              label="Ventes du mois"
              value={formatFCFA(data.ventesMois)}
              accent="text-primary"
            />
            <StatCard
              icon={TrendingDown}
              label="Dépenses du mois"
              value={formatFCFA(data.depensesMois)}
              accent="text-destructive"
            />
            <StatCard
              icon={TrendingUp}
              label="Bénéfice net (mois)"
              value={formatFCFA(data.beneficeMois)}
              accent={data.beneficeMois >= 0 ? "text-emerald-600" : "text-destructive"}
            />
            <StatCard
              icon={ShoppingCart}
              label="Achats cumulés"
              value={formatFCFA(data.achatsTotal)}
              accent="text-foreground"
            />
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
            <MiniCard
              title="Devis"
              items={[
                { label: "Total", value: String(data.devisTotal) },
                { label: "Acceptés", value: String(data.devisAccepte) },
                { label: "En attente", value: String(data.devisEnAttente) },
              ]}
              icon={FileText}
            />
            <MiniCard
              title="Clients & Fournisseurs"
              items={[
                { label: "Clients", value: String(data.nbClients) },
                { label: "Fournisseurs", value: String(data.nbFournisseurs) },
              ]}
              icon={Users}
            />
            <MiniCard
              title="Cumul global"
              items={[
                { label: "Ventes", value: formatFCFA(data.ventesTotal) },
                { label: "Dépenses", value: formatFCFA(data.depensesTotal) },
              ]}
              icon={TrendingUp}
            />
          </div>
        </div>
      )}
    </AppShell>
  );
}

function StatCard({
  icon: Icon,
  label,
  value,
  accent,
}: {
  icon: React.ComponentType<{ className?: string }>;
  label: string;
  value: string;
  accent: string;
}) {
  return (
    <div className="rounded-2xl border border-border bg-card p-5">
      <div className="flex items-start justify-between">
        <div>
          <div className="text-xs text-muted-foreground uppercase tracking-wide">{label}</div>
          <div className={`text-2xl font-bold mt-2 ${accent}`}>{value}</div>
        </div>
        <div className="h-10 w-10 rounded-xl bg-primary/10 text-primary grid place-items-center">
          <Icon className="h-5 w-5" />
        </div>
      </div>
    </div>
  );
}

function MiniCard({
  title,
  items,
  icon: Icon,
}: {
  title: string;
  items: { label: string; value: string }[];
  icon: React.ComponentType<{ className?: string }>;
}) {
  return (
    <div className="rounded-2xl border border-border bg-card p-5">
      <div className="flex items-center gap-2 mb-4">
        <Icon className="h-4 w-4 text-primary" />
        <h3 className="font-semibold text-sm">{title}</h3>
      </div>
      <div className="space-y-2">
        {items.map((i) => (
          <div key={i.label} className="flex items-center justify-between text-sm">
            <span className="text-muted-foreground">{i.label}</span>
            <span className="font-semibold">{i.value}</span>
          </div>
        ))}
      </div>
    </div>
  );
}
