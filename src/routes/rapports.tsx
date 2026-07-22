import { createFileRoute } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import {
  TrendingUp,
  TrendingDown,
  ShoppingCart,
  FileText,
  Users,
  Wallet,
  Calendar,
  Download,
  Moon,
  Sun,
  PieChart as PieChartIcon,
  BarChart3,
} from "lucide-react";
import { useState, useMemo } from "react";
import { AppShell } from "@/components/mms/AppShell";
import { supabase } from "@/integrations/supabase/client";
import { formatFCFA } from "@/lib/mms/format";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { motion } from "framer-motion";
import {
  LineChart,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  PieChart,
  Pie,
  Cell,
  Legend,
} from "recharts";
import { Button } from "@/components/ui/button";

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
  const START_YEAR = 2022;
  const END_YEAR = 2030;
  const currentYear = Math.min(new Date().getFullYear(), END_YEAR);
  const [year, setYear] = useState(currentYear);

  const stats = useMemo(() => {
    if (!data) return null;

    const getStats = (m: number, y: number) => {
      const filtered = {
        ventes: data.ventes.filter(
          (v) =>
            new Date(v.created_at).getMonth() + 1 === m &&
            new Date(v.created_at).getFullYear() === y,
        ),
        depenses: data.depenses.filter(
          (d) =>
            new Date(d.paid_at).getMonth() + 1 === m && new Date(d.paid_at).getFullYear() === y,
        ),
        achats: data.achats.filter(
          (a) =>
            new Date(a.created_at).getMonth() + 1 === m &&
            new Date(a.created_at).getFullYear() === y,
        ),
        devis: data.devis.filter(
          (d) =>
            new Date(d.created_at).getMonth() + 1 === m &&
            new Date(d.created_at).getFullYear() === y,
        ),
        clients: data.clients.filter(
          (c) =>
            new Date(c.created_at).getMonth() + 1 === m &&
            new Date(c.created_at).getFullYear() === y,
        ),
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

    const compare = (targetVal: number, compareVal: number) => {
      const diff = targetVal - compareVal;
      const pct = compareVal === 0 ? 0 : (diff / compareVal) * 100;
      return { diff, pct };
    };

    return {
      target,
      vsPrev: {
        ventes: compare(target.ventes, prevMonth.ventes),
        depenses: compare(target.depenses, prevMonth.depenses),
        achats: compare(target.achats, prevMonth.achats),
        benefice: compare(target.benefice, prevMonth.benefice),
        devisCount: compare(target.devisCount, prevMonth.devisCount),
        clientsCount: compare(target.clientsCount, prevMonth.clientsCount),
      },
    };
  }, [data, month, year]);

  // Chart data
  const chartData = [
    { name: "Jan", sales: 4000 },
    { name: "Fév", sales: 3000 },
    { name: "Mar", sales: 2000 },
    { name: "Avr", sales: 2780 },
    { name: "Mai", sales: 1890 },
    { name: "Juin", sales: 2390 },
  ];

  const pieData = [
    { name: "Ventes", value: stats?.target.ventes || 0 },
    { name: "Achats", value: stats?.target.achats || 0 },
    { name: "Dépenses", value: stats?.target.depenses || 0 },
    { name: "Devis", value: stats?.target.devisCount || 0 },
    { name: "Clients", value: stats?.target.clientsCount || 0 },
  ];
  const COLORS = ["#0088FE", "#00C49F", "#FFBB28", "#FF8042", "#8884d8"];

  return (
    <AppShell title="Rapports" subtitle="Vue d'ensemble de l'activité">
      <div className="flex items-center justify-between mb-8">
        <div className="flex gap-4">
          <Select value={String(month)} onValueChange={(v) => setMonth(Number(v))}>
            <SelectTrigger className="w-[180px] rounded-xl">
              <SelectValue placeholder="Mois" />
            </SelectTrigger>
            <SelectContent>
              {Array.from({ length: 12 }, (_, i) => i + 1).map((m) => (
                <SelectItem key={m} value={String(m)}>
                  {new Date(0, m - 1).toLocaleString("fr-FR", { month: "long" })}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
          <Select value={String(year)} onValueChange={(v) => setYear(Number(v))}>
            <SelectTrigger className="w-[180px] rounded-xl">
              <SelectValue placeholder="Année" />
            </SelectTrigger>
            <SelectContent>
              {Array.from({ length: END_YEAR - START_YEAR + 1 }, (_, i) => START_YEAR + i).map((y) => (
                <SelectItem key={y} value={String(y)}>
                  {y}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
        <div className="flex items-center gap-2">
            <Button variant="outline" size="icon" className="rounded-xl"><Sun className="h-4 w-4"/></Button>
            <Button className="rounded-xl gap-2"><Download className="h-4 w-4"/> Exporter</Button>
        </div>
      </div>

      {isLoading ? (
        <div className="text-muted-foreground">Chargement...</div>
      ) : !stats ? (
        <div className="text-muted-foreground">Aucune donnée disponible.</div>
      ) : (
        <div className="space-y-8">
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-6 gap-4">
            <StatCard label="Chiffre d'affaires" value={stats.target.ventes} compare={stats.vsPrev.ventes} icon={Wallet} color="text-blue-500" />
            <StatCard label="Nombre de devis" value={stats.target.devisCount} compare={stats.vsPrev.devisCount} icon={FileText} color="text-orange-500" />
            <StatCard label="Dépenses" value={stats.target.depenses} compare={stats.vsPrev.depenses} icon={ShoppingCart} color="text-red-500" />
            <StatCard label="Achats" value={stats.target.achats} compare={stats.vsPrev.achats} icon={ShoppingCart} color="text-green-500" />
            <StatCard label="Bénéfice" value={stats.target.benefice} compare={stats.vsPrev.benefice} icon={BarChart3} color="text-indigo-500" />
            <StatCard label="Nouveaux clients" value={stats.target.clientsCount} compare={stats.vsPrev.clientsCount} icon={Users} color="text-purple-500" />
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
              <div className="rounded-2xl border border-border bg-card p-6 shadow-sm">
                  <h3 className="text-lg font-semibold mb-4">Évolution Chiffre d'affaires</h3>
                  <div className="h-[300px]">
                    <ResponsiveContainer width="100%" height="100%">
                        <LineChart data={chartData}>
                            <CartesianGrid strokeDasharray="3 3" vertical={false} />
                            <XAxis dataKey="name" />
                            <YAxis />
                            <Tooltip />
                            <Line type="monotone" dataKey="sales" stroke="#0088FE" strokeWidth={3} dot={{r: 4}} activeDot={{r: 6}} />
                        </LineChart>
                    </ResponsiveContainer>
                  </div>
              </div>
              <div className="rounded-2xl border border-border bg-card p-6 shadow-sm">
                  <h3 className="text-lg font-semibold mb-4">Répartition Activité</h3>
                  <div className="h-[300px] flex items-center justify-center">
                    <ResponsiveContainer width="100%" height="100%">
                        <PieChart>
                            <Pie data={pieData} dataKey="value" nameKey="name" cx="50%" cy="50%" innerRadius={60} outerRadius={80} paddingAngle={5}>
                                {pieData.map((entry, index) => (
                                    <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                                ))}
                            </Pie>
                            <Tooltip />
                            <Legend />
                        </PieChart>
                    </ResponsiveContainer>
                  </div>
              </div>
          </div>
        </div>
      )}
    </AppShell>
  );
}

function StatCard({
  label,
  value,
  compare,
  icon: Icon,
  color,
}: {
  label: string;
  value: number;
  compare: { diff: number; pct: number };
  icon: any;
  color: string;
}) {
  const isCurrency = ["Chiffre d'affaires", "Dépenses", "Achats", "Bénéfice"].includes(label);
  const formattedValue = isCurrency ? formatFCFA(value) : value;
  const formattedDiff = isCurrency ? formatFCFA(Math.abs(compare.diff)) : Math.abs(compare.diff);

  return (
    <motion.div
        whileHover={{y: -5}}
        className="rounded-2xl border border-border bg-card p-5 shadow-sm"
    >
      <div className="flex items-center justify-between mb-3">
          <div className={`p-2 rounded-full bg-slate-100 ${color}`}>
              <Icon className="h-5 w-5" />
          </div>
          <div className={`text-xs font-medium ${compare.diff >= 0 ? "text-emerald-600" : "text-destructive"}`}>
            {compare.diff >= 0 ? "+" : ""}{compare.pct.toFixed(1)}%
          </div>
      </div>
      <div className="text-sm text-muted-foreground">{label}</div>
      <div className="text-2xl font-bold mt-1">{formattedValue}</div>
    </motion.div>
  );
}
