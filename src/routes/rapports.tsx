import { createFileRoute } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { TrendingUp, TrendingDown, ShoppingCart, FileText, Users, Wallet, Calendar } from "lucide-react";
import { useState, useMemo } from "react";
import { AppShell } from "@/components/mms/AppShell";
import { supabase } from "@/integrations/supabase/client";
import { formatFCFA } from "@/lib/mms/format";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";

export const Route = createFileRoute("/rapports")({
  component: RapportsPage,
  head: () => ({
    meta: [
      { title: "Rapports — MMS AI CORE" },
      { name: "description", content: "Tableau de bord et rapports d'activité." },
    ],
  }),
});

function useData() {
  return useQuery({
    queryKey: ["stats-data"],
    queryFn: async () => {
      const [ventes, depenses, achats, devis, clients] = await Promise.all([
        supabase.from("ventes").select("total, created_at"),
        supabase.from("depenses").select("amount, paid_at"),
        supabase.from("achats").select("total, created_at"),
        supabase.from("devis").select("id, status, total, created_at"),
        supabase.from("clients").select("id, created_at"),
      ]);
      return {
        ventes: ventes.data ?? [],
        depenses: depenses.data ?? [],
        achats: achats.data ?? [],
        devis: devis.data ?? [],
        clients: clients.data ?? [],
      };
    },
  });
}

function RapportsPage() {
  const { data, isLoading } = useData();
  const [month, setMonth] = useState(new Date().getMonth() + 1);
  const [year, setYear] = useState(new Date().getFullYear());

  const stats = useMemo(() => {
    if (!data) return null;

    const getStats = (m: number, y: number) => {
      const filtered = {
        ventes: data.ventes.filter(v => new Date(v.created_at).getMonth() + 1 === m && new Date(v.created_at).getFullYear() === y),
        depenses: data.depenses.filter(d => new Date(d.paid_at).getMonth() + 1 === m && new Date(d.paid_at).getFullYear() === y),
        achats: data.achats.filter(a => new Date(a.created_at).getMonth() + 1 === m && new Date(a.created_at).getFullYear() === y),
        devis: data.devis.filter(d => new Date(d.created_at).getMonth() + 1 === m && new Date(d.created_at).getFullYear() === y),
        clients: data.clients.filter(c => new Date(c.created_at).getMonth() + 1 === m && new Date(c.created_at).getFullYear() === y),
      };

      const sumV = filtered.ventes.reduce((s, r) => s + Number(r.total), 0);
      const sumD = filtered.depenses.reduce((s, r) => s + Number(r.amount), 0);
      const sumA = filtered.achats.reduce((s, r) => s + Number(r.total), 0);
      return {
        ventes: sumV,
        ventesCount: filtered.ventes.length,
        depenses: sumD,
        achats: sumA,
        benefice: sumV - sumD,
        devisCount: filtered.devis.length,
        clientsCount: filtered.clients.length,
      };
    };

    const target = getStats(month, year);
    const prevMonth = month === 1 ? getStats(12, year - 1) : getStats(month - 1, year);
    const prevYearSameMonth = getStats(month, year - 1);

    const compare = (targetVal: number, compareVal: number) => {
      const diff = targetVal - compareVal;
      const pct = compareVal === 0 ? 0 : (diff / compareVal) * 100;
      return { diff, pct };
    };

    return {
      target,
      vsPrev: {
        ventes: compare(target.ventes, prevMonth.ventes),
        ventesCount: compare(target.ventesCount, prevMonth.ventesCount),
        devisCount: compare(target.devisCount, prevMonth.devisCount),
        depenses: compare(target.depenses, prevMonth.depenses),
        achats: compare(target.achats, prevMonth.achats),
        benefice: compare(target.benefice, prevMonth.benefice),
        clientsCount: compare(target.clientsCount, prevMonth.clientsCount),
      },
      vsPrevYear: {
        ventes: compare(target.ventes, prevYearSameMonth.ventes),
      }
    };
  }, [data, month, year]);

  return (
    <AppShell title="Rapports" subtitle="Vue d'ensemble de l'activité">
      <div className="flex gap-4 mb-6">
        <Select value={String(month)} onValueChange={(v) => setMonth(Number(v))}>
          <SelectTrigger className="w-[180px]">
            <SelectValue placeholder="Mois" />
          </SelectTrigger>
          <SelectContent>
            {Array.from({ length: 12 }, (_, i) => i + 1).map(m => (
              <SelectItem key={m} value={String(m)}>{new Date(0, m - 1).toLocaleString('fr-FR', { month: 'long' })}</SelectItem>
            ))}
          </SelectContent>
        </Select>
        <Select value={String(year)} onValueChange={(v) => setYear(Number(v))}>
          <SelectTrigger className="w-[180px]">
            <SelectValue placeholder="Année" />
          </SelectTrigger>
          <SelectContent>
            {[...Array(5)].map((_, i) => new Date().getFullYear() - i).map(y => (
              <SelectItem key={y} value={String(y)}>{y}</SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>

      {isLoading ? (
        <div className="text-muted-foreground">Chargement...</div>
      ) : !stats ? (
        <div className="text-muted-foreground">Aucune donnée disponible.</div>
      ) : (
        <div className="space-y-6">
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
            <StatCard label="Chiffre d'affaires" value={stats.target.ventes} compare={stats.vsPrev.ventes} />
            <StatCard label="Nombre de ventes" value={stats.target.ventesCount} compare={stats.vsPrev.ventesCount} />
            <StatCard label="Nombre de devis" value={stats.target.devisCount} compare={stats.vsPrev.devisCount} />
            <StatCard label="Dépenses" value={stats.target.depenses} compare={stats.vsPrev.depenses} />
            <StatCard label="Achats" value={stats.target.achats} compare={stats.vsPrev.achats} />
            <StatCard label="Bénéfice" value={stats.target.benefice} compare={stats.vsPrev.benefice} />
            <StatCard label="Nouveaux clients" value={stats.target.clientsCount} compare={stats.vsPrev.clientsCount} />
          </div>
        </div>
      )}
    </AppShell>
  );
}

function StatCard({ label, value, compare }: { label: string; value: number; compare: { diff: number; pct: number } }) {
  const isCurrency = ["Chiffre d'affaires", "Dépenses", "Achats", "Bénéfice"].includes(label);
  const formattedValue = isCurrency ? formatFCFA(value) : value;
  const formattedDiff = isCurrency ? formatFCFA(Math.abs(compare.diff)) : Math.abs(compare.diff);
  
  return (
    <div className="rounded-2xl border border-border bg-card p-5">
      <div className="text-sm text-muted-foreground">{label}</div>
      <div className="text-2xl font-bold mt-1">{formattedValue}</div>
      <div className={`text-sm mt-2 flex items-center gap-1 ${compare.diff >= 0 ? "text-emerald-600" : "text-destructive"}`}>
        {compare.diff >= 0 ? <TrendingUp className="h-4 w-4" /> : <TrendingDown className="h-4 w-4" />}
        <span>{compare.diff >= 0 ? "+" : ""}{formattedDiff} ({compare.pct.toFixed(1)}%)</span>
      </div>
    </div>
  );
}
