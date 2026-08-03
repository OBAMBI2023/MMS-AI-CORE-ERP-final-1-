import { useMemo, useState } from "react";
import { useQuery } from "@tanstack/react-query";
import {
  Area, AreaChart, Bar, BarChart, CartesianGrid, Cell, Legend, Line, LineChart,
  Pie, PieChart, ResponsiveContainer, Tooltip, XAxis, YAxis,
} from "recharts";
import { CalendarDays, Download, Printer, TrendingDown, TrendingUp } from "lucide-react";
import { AppShell } from "@/components/mms/AppShell";
import { useActionPermission } from "@/hooks/use-action-permission";
import { useTenant } from "@/providers/TenantProvider";
import { supabase } from "@/integrations/supabase/client";
import { formatCurrency, formatDate } from "@/lib/mms/format";
import { sanitizeCsvCell } from "@/lib/hotel-reports-csv";
import { useCompanySettings } from "@/hooks/use-company-settings";
import { createHotelPdf, finishHotelPdf, formatHotelPdfAmount, formatHotelPdfDate, hotelPdfTable } from "@/lib/mms/hotel-pdf-engine";
import { downloadPdf } from "@/lib/mms/download-pdf";

type PeriodKey = "today" | "last7" | "month" | "previousMonth" | "year" | "custom";
type DataRow = Record<string, any>;
type Range = { from: string; to: string };
const COLORS = ["#C9A227", "#0F172A", "#2E8B73", "#6B8EC9", "#D87869", "#8B5CF6"];
const invalidStatuses = new Set(["cancelled", "no_show"]);
const db = supabase as any;

const dateKey = (date: Date) => {
  const year = date.getFullYear();
  return `${year}-${String(date.getMonth() + 1).padStart(2, "0")}-${String(date.getDate()).padStart(2, "0")}`;
};
const parseDay = (value: string) => new Date(`${value.slice(0, 10)}T12:00:00`);
const addDays = (value: string, amount: number) => {
  const date = parseDay(value); date.setDate(date.getDate() + amount); return dateKey(date);
};
const periodRange = (period: PeriodKey, custom: Range): Range => {
  const now = new Date(); const today = dateKey(now);
  if (period === "today") return { from: today, to: today };
  if (period === "last7") return { from: addDays(today, -6), to: today };
  if (period === "month") return { from: dateKey(new Date(now.getFullYear(), now.getMonth(), 1)), to: today };
  if (period === "previousMonth") return { from: dateKey(new Date(now.getFullYear(), now.getMonth() - 1, 1)), to: dateKey(new Date(now.getFullYear(), now.getMonth(), 0)) };
  if (period === "year") return { from: `${now.getFullYear()}-01-01`, to: today };
  return custom.from <= custom.to ? custom : { from: custom.to, to: custom.from };
};
const daysIn = ({ from, to }: Range) => {
  const days: string[] = []; for (let day = from; day <= to; day = addDays(day, 1)) days.push(day); return days;
};
const intersects = (row: DataRow, range: Range) => row.check_in <= range.to && row.check_out > range.from;
const dayLabel = (day: string, long = false) => new Intl.DateTimeFormat("fr-FR", long ? { day: "2-digit", month: "short", year: "numeric" } : { day: "2-digit", month: "short" }).format(parseDay(day));
const csv = (rows: unknown[][]) => `\ufeff${rows.map((row) => row.map(sanitizeCsvCell).join(";")).join("\n")}`;
const download = (content: BlobPart, type: string, name: string) => {
  const url = URL.createObjectURL(new Blob([content], { type })); const link = document.createElement("a");
  link.href = url; link.download = name; link.click(); setTimeout(() => URL.revokeObjectURL(url), 0);
};

function useReportData(tenantId?: string) {
  return useQuery({
    queryKey: ["hotel-reports", tenantId], enabled: Boolean(tenantId),
    queryFn: async () => {
      if (!tenantId) throw new Error("Aucun établissement actif.");
      const queries = [
        db.from("hotel_rooms").select("id,tenant_id,number,status").eq("tenant_id", tenantId),
        db.from("hotel_reservation_balances").select("*").eq("tenant_id", tenantId),
        db.from("hotel_reservation_payments").select("id,tenant_id,reservation_id,amount,method,paid_at").eq("tenant_id", tenantId),
        db.from("hotel_guests").select("id,tenant_id,first_name,last_name").eq("tenant_id", tenantId),
        db.from("depenses").select("id,tenant_id,room_id,amount,paid_at").eq("tenant_id", tenantId),
      ];
      const [rooms, reservations, payments, guests, expenses] = await Promise.all(queries);
      for (const result of [rooms, reservations, payments, guests, expenses]) if (result.error) throw result.error;
      const safe = (rows: DataRow[]) => (rows ?? []).filter((row) => row.tenant_id === tenantId);
      return { rooms: safe(rooms.data), reservations: safe(reservations.data), payments: safe(payments.data), guests: safe(guests.data), expenses: safe(expenses.data) };
    },
  });
}

export function HotelReportsPage() {
  const { profile } = useTenant(); const tenantId = profile?.tenant_id;
  const { settings, logoUrl } = useCompanySettings(tenantId);
  const query = useReportData(tenantId); const canExport = useActionPermission("hotel.reports.export");
  const today = dateKey(new Date());
  const [period, setPeriod] = useState<PeriodKey>("month");
  const [custom, setCustom] = useState<Range>({ from: addDays(today, -6), to: today });
  const range = periodRange(period, custom); const days = useMemo(() => daysIn(range), [range.from, range.to]);
  const report = useMemo(() => buildReport(query.data, range, days), [query.data, range.from, range.to, days]);

  const exportCsv = () => {
    if (!canExport) return;
    const rows: unknown[][] = [
      ["Rapport Hôtel", `${range.from} au ${range.to}`], [], ["Indicateur", "Valeur"],
      ["Revenus encaissés", report.paid], ["Dépenses", report.expenses], ["Résultat net", report.net],
      ["Taux d'occupation (%)", report.occupancy], ["Réservations", report.reservationCount], ["Nuitées", report.nights],
      ["Solde restant", report.due], ["Panier moyen", report.averageBasket], [],
      ["Performance des logements"], ["Logement", "Réservations", "Nuitées", "Occupation (%)", "Revenus", "Solde"],
      ...report.roomPerformance.map((row: DataRow) => [row.name, row.reservations, row.nights, row.occupancy, row.revenue, row.due]), [],
      ["Derniers encaissements"], ["Date", "Client", "Réservation", "Montant", "Mode de paiement"],
      ...report.recentPayments.map((row: DataRow) => [row.date, row.client, row.reservation, row.amount, row.method]),
    ];
    download(csv(rows), "text/csv;charset=utf-8", `rapport-hotel-${range.from}-${range.to}.csv`);
  };
  const exportPdf = async () => {
    if (!canExport) return;
    const { doc, tenant, y } = await createHotelPdf("Rapport Hôtel", settings, logoUrl, [
      { label: "Du", value: formatHotelPdfDate(range.from) }, { label: "Au", value: formatHotelPdfDate(range.to) },
      { label: "Réservations", value: String(report.reservationCount) }, { label: "Occupation", value: `${report.occupancy.toFixed(1)} %` },
    ], "landscape");
    let nextY = hotelPdfTable(doc, ["Revenus", "Dépenses", "Résultat net", "Nuitées", "Solde", "Panier moyen"], [[formatHotelPdfAmount(report.paid), formatHotelPdfAmount(report.expenses), formatHotelPdfAmount(report.net), report.nights, formatHotelPdfAmount(report.due), formatHotelPdfAmount(report.averageBasket)]], y + 2);
    nextY = hotelPdfTable(doc, ["Logement", "Réservations", "Nuitées", "Occupation", "Revenus", "Solde"], report.roomPerformance.map((row: DataRow) => [row.name, row.reservations, row.nights, `${Number(row.occupancy || 0).toFixed(1)} %`, formatHotelPdfAmount(row.revenue), formatHotelPdfAmount(row.due)]), nextY + 8);
    hotelPdfTable(doc, ["Date", "Client", "Réservation", "Montant", "Mode"], report.recentPayments.map((row: DataRow) => [formatHotelPdfDate(row.date), row.client, row.reservation, formatHotelPdfAmount(row.amount), row.method]), nextY + 8);
    finishHotelPdf(doc, tenant);
    await downloadPdf(doc, `rapport-hotel-${range.from}-${range.to}.pdf`);
  };
  const actions = canExport ? <div className="flex flex-wrap gap-2 print:hidden"><Action onClick={exportPdf} icon={Download}>PDF</Action><Action onClick={exportCsv} icon={Download}>CSV</Action><Action onClick={() => window.print()} icon={Printer}>Imprimer</Action></div> : undefined;

  return <AppShell title="Rapports Hôtel" subtitle="Performance financière et opérationnelle fiable" actions={actions}>
    <div className="space-y-5 pb-8 print:space-y-3">
      <section className="hotel-panel print:hidden"><div className="flex flex-col gap-4 lg:flex-row lg:items-end lg:justify-between"><div><p className="text-[10px] font-semibold uppercase tracking-[.2em] text-[#B08B13]">Période d’analyse</p><h2 className="mt-1 text-lg font-semibold">Vue consolidée de l’établissement</h2></div><div className="flex flex-wrap gap-2">{([['today',"Aujourd’hui"],['last7','7 derniers jours'],['month','Ce mois'],['previousMonth','Mois précédent'],['year','Cette année'],['custom','Période personnalisée']] as [PeriodKey,string][]).map(([key,label]) => <button key={key} onClick={() => setPeriod(key)} className={`rounded-xl px-3 py-2 text-xs font-medium transition ${period === key ? "bg-[#0F172A] text-white shadow" : "border border-slate-200 bg-white hover:border-[#C9A227] dark:bg-slate-900"}`}>{label}</button>)}</div></div>{period === "custom" && <div className="mt-4 flex flex-wrap gap-3"><DateField label="Du" value={custom.from} onChange={(from) => setCustom({ ...custom, from })}/><DateField label="Au" value={custom.to} onChange={(to) => setCustom({ ...custom, to })}/></div>}</section>
      {query.isLoading ? <Empty text="Chargement du rapport…"/> : query.error ? <Empty text={`Impossible de charger le rapport : ${query.error.message}`}/> : !report.hasData ? <Empty text="Aucune donnée pour cette période."/> : <>
        <section className="grid grid-cols-2 gap-3 lg:grid-cols-4 2xl:grid-cols-8"><Kpi label="Revenus encaissés" value={formatCurrency(report.paid)} positive/><Kpi label="Dépenses" value={formatCurrency(report.expenses)}/><Kpi label="Résultat net" value={formatCurrency(report.net)} positive={report.net >= 0}/><Kpi label="Taux d’occupation" value={`${report.occupancy.toFixed(1)} %`}/><Kpi label="Réservations" value={String(report.reservationCount)}/><Kpi label="Nuitées" value={String(report.nights)}/><Kpi label="Solde restant" value={formatCurrency(report.due)}/><Kpi label="Panier moyen" value={formatCurrency(report.averageBasket)}/></section>
        <section className="grid gap-5 xl:grid-cols-2"><Chart title="Courbe des revenus encaissés"><AreaChart data={report.timeline}><ChartGrid/><XAxis dataKey="label" {...axis}/><YAxis {...axis}/><MoneyTooltip/><Area type="monotone" dataKey="revenus" name="Revenus encaissés" stroke={COLORS[0]} fill="#C9A22733" strokeWidth={2.5}/></AreaChart></Chart><Chart title="Comparaison revenus et dépenses"><BarChart data={report.timeline}><ChartGrid/><XAxis dataKey="label" {...axis}/><YAxis {...axis}/><MoneyTooltip/><Legend/><Bar dataKey="revenus" name="Revenus" fill={COLORS[0]} radius={[5,5,0,0]}/><Bar dataKey="depenses" name="Dépenses" fill={COLORS[4]} radius={[5,5,0,0]}/></BarChart></Chart><Chart title="Courbe du taux d’occupation"><LineChart data={report.timeline}><ChartGrid/><XAxis dataKey="label" {...axis}/><YAxis domain={[0,100]} {...axis}/><Tooltip formatter={(v) => `${Number(v).toFixed(1)} %`}/><Line type="monotone" dataKey="occupation" name="Occupation" stroke={COLORS[2]} strokeWidth={2.5} dot={false}/></LineChart></Chart><PiePanel title="Répartition des réservations par statut" data={report.statusDistribution}/><Chart title="Revenus par logement"><BarChart data={report.roomRevenue} layout="vertical" margin={{ left: 25 }}><ChartGrid/><XAxis type="number" {...axis}/><YAxis type="category" dataKey="name" width={90} {...axis}/><MoneyTooltip/><Bar dataKey="value" name="Revenus" fill={COLORS[1]} radius={[0,5,5,0]}/></BarChart></Chart><PiePanel title="Répartition par mode de paiement" data={report.paymentDistribution}/></section>
        <RoomExpenseTable rows={report.roomFinancials}/>
        <DataTables report={report}/>
      </>}
    </div>
  </AppShell>;
}

function buildReport(data: any, range: Range, days: string[]) {
  const rooms = data?.rooms ?? [], reservations = (data?.reservations ?? []).filter((r: DataRow) => !invalidStatuses.has(r.status)), guests = data?.guests ?? [];
  const reservationIds = new Set(reservations.map((r: DataRow) => r.id));
  const periodReservations = reservations.filter((r: DataRow) => intersects(r, range)); const periodIds = new Set(periodReservations.map((r: DataRow) => r.id));
  const payments = (data?.payments ?? []).filter((p: DataRow) => reservationIds.has(p.reservation_id) && p.paid_at.slice(0,10) >= range.from && p.paid_at.slice(0,10) <= range.to);
  const expensesRows = (data?.expenses ?? []).filter((e: DataRow) => e.paid_at.slice(0,10) >= range.from && e.paid_at.slice(0,10) <= range.to);
  const roomMap = new Map(rooms.map((r: DataRow) => [r.id, r])); const guestMap = new Map(guests.map((g: DataRow) => [g.id, g])); const reservationMap = new Map(reservations.map((r: DataRow) => [r.id, r]));
  const availableRooms = rooms.filter((r: DataRow) => !["maintenance", "out_of_service"].includes(r.status)); const availableIds = new Set(availableRooms.map((r: DataRow) => r.id));
  const occupiedKeys = new Set<string>();
  for (const reservation of periodReservations) for (const day of days) if (availableIds.has(reservation.room_id) && reservation.check_in <= day && reservation.check_out > day) occupiedKeys.add(`${reservation.room_id}:${day}`);
  const paid = payments.reduce((sum: number, row: DataRow) => sum + Number(row.amount || 0), 0); const expenses = expensesRows.reduce((sum: number, row: DataRow) => sum + Number(row.amount || 0), 0);
  const nights = occupiedKeys.size; const availableNights = availableRooms.length * days.length; const due = periodReservations.reduce((sum: number, row: DataRow) => sum + Math.max(0, Number(row.balance_due || 0)), 0);
  const timeline = days.map((day) => { const occupied = [...occupiedKeys].filter((key) => key.endsWith(`:${day}`)).length; return { day, label: dayLabel(day), revenus: payments.filter((p: DataRow) => p.paid_at.slice(0,10) === day).reduce((s: number,p: DataRow) => s + Number(p.amount),0), depenses: expensesRows.filter((e: DataRow) => e.paid_at.slice(0,10) === day).reduce((s: number,e: DataRow) => s + Number(e.amount),0), occupation: availableRooms.length ? occupied / availableRooms.length * 100 : 0 }; });
  const roomPerformance = availableRooms.map((room: DataRow) => { const stays = periodReservations.filter((r: DataRow) => r.room_id === room.id); const ids = new Set(stays.map((r: DataRow) => r.id)); const roomNights = [...occupiedKeys].filter((key) => key.startsWith(`${room.id}:`)).length; return { name: room.number, reservations: stays.length, nights: roomNights, occupancy: days.length ? roomNights / days.length * 100 : 0, revenue: payments.filter((p: DataRow) => ids.has(p.reservation_id)).reduce((s: number,p: DataRow) => s + Number(p.amount),0), due: stays.reduce((s: number,r: DataRow) => s + Math.max(0,Number(r.balance_due || 0)),0) }; }).sort((a: any,b: any) => b.revenue-a.revenue);
  const roomFinancials = rooms.map((room: DataRow) => { const reservationRoomIds = new Set(reservations.filter((r: DataRow) => r.room_id === room.id).map((r: DataRow) => r.id)); const revenue = payments.filter((p: DataRow) => reservationRoomIds.has(p.reservation_id)).reduce((sum: number, p: DataRow) => sum + Number(p.amount || 0), 0); const roomExpenses = expensesRows.filter((e: DataRow) => e.room_id === room.id).reduce((sum: number, e: DataRow) => sum + Number(e.amount || 0), 0); return { name: room.number, revenue, expenses: roomExpenses, net: revenue - roomExpenses }; }).sort((a: DataRow, b: DataRow) => b.revenue - a.revenue);
  const group = (rows: DataRow[], key: (row: DataRow) => string, value: (row: DataRow) => number) => [...rows.reduce((map: Map<string,number>,row) => map.set(key(row), (map.get(key(row)) ?? 0) + value(row)), new Map()).entries()].map(([name,value]) => ({name,value}));
  const statusLabels: Record<string,string> = { pending:"En attente", confirmed:"Confirmée", checked_in:"En séjour", checked_out:"Terminée" };
  const recentPayments = payments.slice().sort((a: DataRow,b: DataRow) => b.paid_at.localeCompare(a.paid_at)).slice(0,10).map((p: DataRow) => { const r: any = reservationMap.get(p.reservation_id); const g: any = guestMap.get(r?.guest_id); return { date:p.paid_at, client:g ? `${g.first_name} ${g.last_name}` : "—", reservation:`#${String(p.reservation_id).slice(0,8)}`, amount:Number(p.amount), method:p.method || "Non renseigné" }; });
  return { hasData: periodReservations.length + payments.length + expensesRows.length > 0, paid, expenses, net: paid-expenses, occupancy: availableNights ? nights/availableNights*100 : 0, reservationCount:periodReservations.length, nights, due, averageBasket:periodReservations.length ? paid/periodReservations.length : 0, timeline, roomPerformance, roomFinancials, roomRevenue:roomPerformance.filter((r:any)=>r.revenue>0).map((r:any)=>({name:r.name,value:r.revenue})), statusDistribution:group(periodReservations,(r)=>statusLabels[r.status] ?? r.status,()=>1), paymentDistribution:group(payments,(p)=>p.method || "Non renseigné",(p)=>Number(p.amount)), recentPayments, range, periodIds, roomMap };
}

const axis = { axisLine:false, tickLine:false, tick:{ fill:"#94A3B8", fontSize:10 } };
function ChartGrid(){ return <CartesianGrid strokeDasharray="3 5" vertical={false} stroke="#E8ECF2"/>; }
function MoneyTooltip(){ return <Tooltip formatter={(value) => formatCurrency(Number(value))} contentStyle={{borderRadius:12,border:"1px solid #E2E8F0",fontSize:12}}/>; }
function Chart({title,children}:{title:string;children:React.ReactElement}){ return <div className="hotel-panel"><h3 className="font-semibold">{title}</h3><div className="mt-4 h-72"><ResponsiveContainer>{children}</ResponsiveContainer></div></div>; }
function PiePanel({title,data}:{title:string;data:{name:string;value:number}[]}){ return <div className="hotel-panel"><h3 className="font-semibold">{title}</h3>{data.length ? <div className="h-72"><ResponsiveContainer><PieChart><Pie data={data} dataKey="value" nameKey="name" innerRadius={52} outerRadius={82} paddingAngle={3}>{data.map((item,index)=><Cell key={item.name} fill={COLORS[index%COLORS.length]}/>)}</Pie><Tooltip formatter={(value)=>Number(value).toLocaleString("fr-FR")}/><Legend/></PieChart></ResponsiveContainer></div>:<p className="grid h-72 place-items-center text-sm text-slate-400">Aucune donnée sur la période.</p>}</div>; }
function Kpi({label,value,positive}:{label:string;value:string;positive?:boolean}){ const Icon=positive===false?TrendingDown:TrendingUp; return <div className="rounded-2xl border border-slate-200/80 bg-white p-4 shadow-[0_8px_30px_rgba(15,23,42,.045)] dark:border-white/10 dark:bg-slate-900"><Icon className={`size-4 ${positive===false?"text-rose-500":"text-[#C9A227]"}`}/><p className="mt-3 text-[10px] font-semibold uppercase tracking-[.08em] text-slate-500">{label}</p><p className="mt-1 truncate text-xl font-bold text-[#0F172A] dark:text-white">{value}</p></div>; }
function Action({onClick,icon:Icon,children}:{onClick:()=>void;icon:any;children:React.ReactNode}){ return <button type="button" onClick={onClick} className="inline-flex items-center gap-2 rounded-xl border border-slate-200 bg-white px-3 py-2 text-sm font-medium hover:border-[#C9A227] dark:bg-slate-900"><Icon className="size-4"/>{children}</button>; }
function DateField({label,value,onChange}:{label:string;value:string;onChange:(v:string)=>void}){ return <label className="text-xs text-slate-500">{label}<span className="mt-1 flex items-center gap-2 rounded-xl border px-3 py-2 text-slate-900 dark:text-white"><CalendarDays className="size-4"/><input type="date" value={value} onChange={(e)=>onChange(e.target.value)} className="bg-transparent outline-none"/></span></label>; }
function Empty({text}:{text:string}){ return <div className="hotel-panel grid min-h-72 place-items-center text-center text-sm text-slate-400">{text}</div>; }
function RoomExpenseTable({rows}:{rows:DataRow[]}){ return <TablePanel title="Dépenses par logement"><table className="w-full min-w-[600px] text-sm"><thead><tr>{["Logement","Revenus","Dépenses","Résultat net"].map(h=><th key={h} className="border-b p-3 text-left text-xs text-slate-500">{h}</th>)}</tr></thead><tbody>{rows.map((r)=><tr key={r.name} className="border-b last:border-0"><td className="p-3 font-medium">{r.name}</td><td>{formatCurrency(r.revenue)}</td><td>{formatCurrency(r.expenses)}</td><td className={r.net < 0 ? "text-rose-600" : "text-emerald-700"}>{formatCurrency(r.net)}</td></tr>)}</tbody></table></TablePanel>; }
function DataTables({report}:{report:ReturnType<typeof buildReport>}){ return <section className="grid gap-5 xl:grid-cols-2"><TablePanel title="Performance des logements"><table className="w-full min-w-[650px] text-sm"><thead><tr>{["Logement","Réservations","Nuitées","Occupation","Revenus","Solde"].map(h=><th key={h} className="border-b p-3 text-left text-xs text-slate-500">{h}</th>)}</tr></thead><tbody>{report.roomPerformance.map((r:any)=><tr key={r.name} className="border-b last:border-0"><td className="p-3 font-medium">{r.name}</td><td>{r.reservations}</td><td>{r.nights}</td><td>{r.occupancy.toFixed(1)} %</td><td>{formatCurrency(r.revenue)}</td><td>{formatCurrency(r.due)}</td></tr>)}</tbody></table></TablePanel><TablePanel title="Derniers encaissements"><table className="w-full min-w-[650px] text-sm"><thead><tr>{["Date","Client","Réservation","Montant","Mode de paiement"].map(h=><th key={h} className="border-b p-3 text-left text-xs text-slate-500">{h}</th>)}</tr></thead><tbody>{report.recentPayments.map((r:any,index:number)=><tr key={`${r.reservation}-${r.date}-${index}`} className="border-b last:border-0"><td className="p-3">{formatDate(r.date)}</td><td>{r.client}</td><td>{r.reservation}</td><td className="font-medium">{formatCurrency(r.amount)}</td><td>{r.method}</td></tr>)}</tbody></table></TablePanel></section>; }
function TablePanel({title,children}:{title:string;children:React.ReactNode}){ return <div className="hotel-panel overflow-hidden p-0"><h3 className="p-5 pb-3 font-semibold">{title}</h3><div className="overflow-x-auto">{children}</div></div>; }
