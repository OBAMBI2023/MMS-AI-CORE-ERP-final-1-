import { Area, AreaChart, Bar, BarChart, CartesianGrid, ResponsiveContainer, Tooltip, XAxis, YAxis } from "recharts";
import { formatCurrency } from "@/lib/mms/format";

type HistoryPoint = { day: string; revenus: number; occupation: number };
const axis = { axisLine: false, tickLine: false, tick: { fill: "#94A3B8", fontSize: 10 } };
const tooltip = { contentStyle: { borderRadius: 12, border: "1px solid #E2E8F0", fontSize: 12 } };

export default function HotelDashboardCharts({ history, revenue, occupancy }: { history: HistoryPoint[]; revenue: number; occupancy: number }) {
  return <div className="grid gap-5 lg:grid-cols-2">
    <Chart title="Évolution des revenus" value={formatCurrency(revenue)}>
      <AreaChart data={history} margin={{ left: -20, right: 4, top: 12 }}><defs><linearGradient id="hotelRevenue" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stopColor="#C9A227" stopOpacity={0.35} /><stop offset="1" stopColor="#C9A227" stopOpacity={0.02} /></linearGradient></defs><Grid /><XAxis dataKey="day" {...axis} /><YAxis {...axis} /><Tooltip {...tooltip} /><Area type="monotone" dataKey="revenus" stroke="#C9A227" strokeWidth={2.5} fill="url(#hotelRevenue)" /></AreaChart>
    </Chart>
    <Chart title="Taux d’occupation" value={`${occupancy}%`}>
      <BarChart data={history} margin={{ left: -25, right: 4, top: 12 }}><Grid /><XAxis dataKey="day" {...axis} /><YAxis domain={[0, 100]} {...axis} /><Tooltip {...tooltip} /><Bar dataKey="occupation" fill="#0F172A" radius={[6, 6, 2, 2]} barSize={22} /></BarChart>
    </Chart>
  </div>;
}

function Grid() { return <CartesianGrid strokeDasharray="3 5" vertical={false} stroke="#E8ECF2" />; }
function Chart({ title, value, children }: { title: string; value: string; children: React.ReactElement }) {
  return <div className="hotel-panel"><div className="flex justify-between"><div><p className="text-[10px] font-semibold uppercase tracking-[.16em] text-[#B08B13]">7 derniers jours</p><h3 className="mt-1 font-semibold">{title}</h3></div><div className="text-right"><b>{value}</b><p className="text-[10px] text-slate-400">Mise à jour en direct</p></div></div><div className="mt-3 h-[220px]"><ResponsiveContainer>{children}</ResponsiveContainer></div></div>;
}
