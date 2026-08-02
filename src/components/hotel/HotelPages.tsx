import { useMemo } from "react";
import { useQuery } from "@tanstack/react-query";
import { AppShell } from "@/components/mms/AppShell";
import { ResourceTable, type FieldDef, type ColumnDef } from "@/components/mms/ResourceTable";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { supabase } from "@/integrations/supabase/client";
import { formatCurrency, formatDate } from "@/lib/mms/format";
import { useActionPermission } from "@/hooks/use-action-permission";
import { exportHotelReportCsv } from "@/lib/hotel-reports.server";
import { toast } from "sonner";
import { useState } from "react";

type Row = { id:string; [key:string]:unknown };
const db=supabase as any;

export function HotelRoomsPage(){
 const fields:FieldDef[]=[{name:"number",label:"Numéro",required:true},{name:"capacity",label:"Capacité",type:"number",required:true},{name:"rate",label:"Tarif",type:"number",step:"0.01",required:true},{name:"status",label:"État",type:"select",options:["available","occupied","maintenance","cleaning","out_of_service"],required:true}];
 const columns:ColumnDef<Row>[]=[{header:"Numéro",cell:r=>String(r.number)},{header:"Capacité",cell:r=>String(r.capacity)},{header:"Tarif",cell:r=>formatCurrency(Number(r.rate))},{header:"État",cell:r=>String(r.status)}];
 return <AppShell title="Chambres et logements" subtitle="Capacités, tarifs, équipements et disponibilité"><ResourceTable table="hotel_rooms" singular="Logement" plural="Logements" fields={fields} columns={columns} searchFields={["number","status"]} orderBy={{column:"number",ascending:true}}/></AppShell>;
}

export function HotelGuestsPage(){
 const fields:FieldDef[]=[{name:"first_name",label:"Prénom",required:true},{name:"last_name",label:"Nom",required:true},{name:"phone",label:"Téléphone",type:"tel"},{name:"email",label:"E-mail",type:"email"},{name:"nationality",label:"Nationalité"},{name:"identity_type",label:"Type de pièce"},{name:"identity_number",label:"N° de pièce"},{name:"address",label:"Adresse",type:"textarea"},{name:"notes",label:"Notes",type:"textarea"}];
 const columns:ColumnDef<Row>[]=[{header:"Voyageur",cell:r=>`${r.first_name} ${r.last_name}`},{header:"Téléphone",cell:r=>String(r.phone??"—")},{header:"E-mail",cell:r=>String(r.email??"—")},{header:"Pièce",cell:r=>String(r.identity_number??"—")}];
 return <AppShell title="Clients / Voyageurs" subtitle="Identités, contacts, accompagnants et historique"><ResourceTable table="hotel_guests" singular="Voyageur" plural="Voyageurs" fields={fields} columns={columns} searchFields={["first_name","last_name","phone","identity_number"]} orderBy={{column:"created_at"}}/></AppShell>;
}

function useHotelData(){return useQuery({queryKey:["hotel-overview"],queryFn:async()=>{
 const [rooms,reservations,expenses]=await Promise.all([db.from("hotel_rooms").select("*"),db.from("hotel_reservation_balances").select("*"),db.from("depenses").select("amount,paid_at")]);
 for(const result of [rooms,reservations,expenses]) if(result.error) throw result.error;
 return {rooms:rooms.data??[],reservations:reservations.data??[],expenses:expenses.data??[]};
 }});}

export function HotelDashboardPage(){const {data}=useHotelData(); const today=new Date().toISOString().slice(0,10); const r=data?.reservations??[]; const rooms=data?.rooms??[];
 const occupied=r.filter((x:any)=>x.check_in<=today&&x.check_out>today&&!["cancelled","no_show"].includes(x.status)).length;
 const revenue=r.reduce((s:number,x:any)=>s+Number(x.paid_total??0),0); const expenses=(data?.expenses??[]).reduce((s:number,x:any)=>s+Number(x.amount),0);
 const stats=[["Disponibles",Math.max(0,rooms.length-occupied)],["Occupées",occupied],["Arrivées",r.filter((x:any)=>x.check_in===today).length],["Départs",r.filter((x:any)=>x.check_out===today).length],["Réservations",r.filter((x:any)=>!["cancelled","no_show"].includes(x.status)).length],["Revenus",formatCurrency(revenue)],["Dépenses",formatCurrency(expenses)],["Taux d’occupation",rooms.length?`${Math.round(occupied/rooms.length*100)} %`:"0 %"]];
 return <AppShell title="Tableau de bord Hôtel" subtitle="Activité de l’établissement en temps réel"><div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">{stats.map(([label,value])=><Card key={label as string}><CardHeader className="pb-2"><CardTitle className="text-sm text-muted-foreground">{label}</CardTitle></CardHeader><CardContent className="text-2xl font-bold">{value}</CardContent></Card>)}</div></AppShell>}

export function HotelReportsPage(){const {data}=useHotelData(); const rows=data?.reservations??[]; const paid=rows.reduce((s:number,r:any)=>s+Number(r.paid_total??0),0); const due=rows.reduce((s:number,r:any)=>s+Number(r.balance_due??0),0); const expenses=(data?.expenses??[]).reduce((s:number,r:any)=>s+Number(r.amount),0); const canExport=useActionPermission("hotel.reports.export"); const [exporting,setExporting]=useState(false);
 const csv=async()=>{if(!canExport)return;setExporting(true);try{const result=await exportHotelReportCsv();const url=URL.createObjectURL(new Blob([result.csv],{type:"text/csv;charset=utf-8"}));const a=document.createElement("a");a.href=url;a.download=result.filename;a.click();URL.revokeObjectURL(url);}catch(error){toast.error(error instanceof Error?error.message:"Export refusé.");}finally{setExporting(false)}};
 return <AppShell title="Rapports Hôtel" subtitle="Occupation, CA, impayés, dépenses et résultat net" actions={canExport?<button className="rounded-md bg-primary px-3 py-2 text-sm text-primary-foreground disabled:opacity-50" disabled={exporting} onClick={()=>void csv()}>{exporting?"Export…":"Exporter CSV"}</button>:null}><div className="grid gap-4 md:grid-cols-3">{[["CA encaissé",paid],["Impayés",due],["Dépenses",expenses],["Résultat net",paid-expenses]].map(([l,v])=><Card key={l as string}><CardHeader><CardTitle className="text-sm">{l}</CardTitle></CardHeader><CardContent className="text-xl font-bold">{formatCurrency(Number(v))}</CardContent></Card>)}</div><div className="mt-6 rounded-xl border"><table className="w-full text-sm"><thead><tr className="border-b"><th className="p-3 text-left">Arrivée</th><th>Départ</th><th>Total</th><th>Solde</th></tr></thead><tbody>{rows.map((r:any)=><tr className="border-b" key={r.id}><td className="p-3">{formatDate(r.check_in)}</td><td>{formatDate(r.check_out)}</td><td>{formatCurrency(Number(r.grand_total))}</td><td>{formatCurrency(Number(r.balance_due))}</td></tr>)}</tbody></table></div></AppShell>}

export function HotelSettingsPage(){const fields:FieldDef[]=[{name:"establishment_name",label:"Établissement"},{name:"check_in_time",label:"Heure d’arrivée"},{name:"check_out_time",label:"Heure de départ"},{name:"tax_rate",label:"Taxes (%)",type:"number",step:"0.001"},{name:"cancellation_policy",label:"Politique d’annulation",type:"textarea"}]; const columns:ColumnDef<Row>[]=[{header:"Établissement",cell:r=>String(r.establishment_name??"—")},{header:"Arrivée",cell:r=>String(r.check_in_time)},{header:"Départ",cell:r=>String(r.check_out_time)},{header:"Taxes",cell:r=>`${r.tax_rate}%`}]; return <AppShell title="Paramètres Hôtel"><ResourceTable table="hotel_settings" singular="Configuration" plural="Configurations" fields={fields} columns={columns}/></AppShell>}
