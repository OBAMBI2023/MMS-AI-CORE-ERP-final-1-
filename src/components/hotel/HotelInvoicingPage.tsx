import { useMemo, useState, type ReactElement } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { Download, Eye, Plus, Printer, Search, WalletCards } from "lucide-react";
import { toast } from "sonner";
import { AppShell } from "@/components/mms/AppShell";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { supabase } from "@/integrations/supabase/client";
import { useTenant } from "@/providers/TenantProvider";
import { useCompanySettings } from "@/hooks/use-company-settings";
import { useActionPermission } from "@/hooks/use-action-permission";
import { formatCurrency, formatDate } from "@/lib/mms/format";
import { createHotelInvoicePdf } from "@/lib/mms/hotel-invoice-pdf";
import { downloadPdf } from "@/lib/mms/download-pdf";
import { hotelPaymentStatus, hotelPaymentStatusLabels, type HotelPaymentStatus } from "@/lib/hotel-invoicing";

const db = supabase as any;
const emptyPayment = { amount: "", method: "Espèces", reference: "", notes: "" };
const statusClass: Record<HotelPaymentStatus,string> = {
  non_paye:"border-orange-200 bg-orange-50 text-orange-700", avance_versee:"border-amber-200 bg-amber-50 text-amber-700",
  partiellement_paye:"border-blue-200 bg-blue-50 text-blue-700", solde:"border-emerald-200 bg-emerald-50 text-emerald-700",
  rembourse:"border-slate-200 bg-slate-100 text-slate-600",
};

export function HotelInvoicingPage() {
  const { profile } = useTenant();
  const tenantId = profile?.tenant_id;
  const qc = useQueryClient();
  const { settings, logoUrl } = useCompanySettings(tenantId);
  const canCreate = useActionPermission("hotel.invoices.create");
  const canCollect = useActionPermission("hotel.invoices.collect");
  const canExport = useActionPermission("hotel.invoices.export");
  const [search,setSearch] = useState("");
  const [createOpen,setCreateOpen] = useState(false);
  const [reservationId,setReservationId] = useState("");
  const [selected,setSelected] = useState<any>(null);
  const [collecting,setCollecting] = useState<any>(null);
  const [payment,setPayment] = useState(emptyPayment);

  const query = useQuery({ queryKey:["hotel-invoicing",tenantId], enabled:Boolean(tenantId), queryFn:async()=>{
    const [invoices,reservations,guests,rooms,payments,hotelSettings] = await Promise.all([
      db.from("hotel_invoice_balances").select("*").eq("tenant_id",tenantId).order("issued_at",{ascending:false}),
      db.from("hotel_reservation_balances").select("*").eq("tenant_id",tenantId).order("check_in",{ascending:false}),
      db.from("hotel_guests").select("id,first_name,last_name,phone,email").eq("tenant_id",tenantId),
      db.from("hotel_rooms").select("id,number").eq("tenant_id",tenantId),
      db.from("hotel_reservation_payments").select("id,reservation_id,amount,method,paid_at,reference,notes").eq("tenant_id",tenantId).order("paid_at",{ascending:false}),
      db.from("hotel_settings").select("payment_methods").eq("tenant_id",tenantId).maybeSingle(),
    ]);
    for(const result of [invoices,reservations,guests,rooms,payments,hotelSettings]) if(result.error) throw result.error;
    return { invoices:invoices.data??[], reservations:reservations.data??[], guests:guests.data??[], rooms:rooms.data??[], payments:payments.data??[], methods:hotelSettings.data?.payment_methods??["Espèces","Carte","Virement"] };
  }});
  const guests = new Map((query.data?.guests??[]).map((row:any)=>[row.id,row]));
  const rooms = new Map((query.data?.rooms??[]).map((row:any)=>[row.id,row]));
  const invoiceReservationIds = new Set((query.data?.invoices??[]).map((row:any)=>row.reservation_id));
  const available = (query.data?.reservations??[]).filter((row:any)=>!invoiceReservationIds.has(row.id));
  const rows = useMemo(()=>(query.data?.invoices??[]).filter((row:any)=>{
    const guest:any=guests.get(row.guest_id), room:any=rooms.get(row.room_id);
    return `${row.number} ${guest?.first_name??""} ${guest?.last_name??""} ${guest?.phone??""} ${room?.number??""}`.toLowerCase().includes(search.toLowerCase());
  }),[query.data,search]);
  const refresh=()=>qc.invalidateQueries({queryKey:["hotel-invoicing",tenantId]});
  const createInvoice=useMutation({mutationFn:async()=>{
    if(!tenantId||!reservationId) throw new Error("Sélectionnez une réservation.");
    const result=await db.from("hotel_invoices").insert({tenant_id:tenantId,reservation_id:reservationId,number:""}).select("id").single();
    if(result.error) throw result.error;
  },onSuccess:()=>{toast.success("Facture créée");setCreateOpen(false);setReservationId("");refresh();},onError:(error:Error)=>toast.error(error.message.includes("duplicate")?"Cette réservation possède déjà une facture.":error.message)});
  const collect=useMutation({mutationFn:async()=>{
    const amount=Number(payment.amount);
    if(!collecting||!Number.isFinite(amount)||amount<=0) throw new Error("Saisissez un montant valide.");
    if(amount>Number(collecting.balance_due)) throw new Error("Le versement dépasse le solde restant.");
    const result=await db.rpc("collect_hotel_invoice_payment",{requested_invoice_id:collecting.invoice_id,requested_amount:amount,requested_method:payment.method,requested_reference:payment.reference||null,requested_notes:payment.notes||null});
    if(result.error) throw result.error;
  },onSuccess:()=>{toast.success("Versement encaissé");setCollecting(null);setPayment(emptyPayment);refresh();},onError:(error:Error)=>toast.error(error.message)});
  const paymentsFor=(row:any)=>(query.data?.payments??[]).filter((p:any)=>p.reservation_id===row.reservation_id);
  const statusFor=(row:any)=>hotelPaymentStatus(Number(row.grand_total),Number(row.paid_total),paymentsFor(row).length);
  const generate=async(row:any,print=false)=>{try{
    const guest:any=guests.get(row.guest_id),room:any=rooms.get(row.room_id);
    const pdf=await createHotelInvoicePdf({...row,id:row.reservation_id,invoiceNumber:row.number,issuedAt:row.issued_at,guestName:guest?`${guest.first_name} ${guest.last_name}`:"—",guestPhone:guest?.phone,roomNumber:room?.number??"—",payments:paymentsFor(row)},settings,logoUrl);
    if(print){pdf.doc.autoPrint();window.open(pdf.doc.output("bloburl"),"_blank","noopener,noreferrer");}else await downloadPdf(pdf.doc,pdf.filename);
  }catch(error){console.error(error);toast.error("Impossible de générer la facture PDF.");}};

  return <AppShell title="Facturation" subtitle="Factures, créances et encaissements clients" actions={canCreate?<Button onClick={()=>setCreateOpen(true)}><Plus className="mr-2 size-4"/>Créer une facture</Button>:undefined}>
    <section className="hotel-panel mb-5 grid gap-4 md:grid-cols-3">
      <Metric label="Montant facturé" value={(query.data?.invoices??[]).reduce((s:number,r:any)=>s+Number(r.grand_total||0),0)}/>
      <Metric label="Montant encaissé" value={(query.data?.invoices??[]).reduce((s:number,r:any)=>s+Number(r.paid_total||0),0)}/>
      <Metric label="Créances clients" value={(query.data?.invoices??[]).reduce((s:number,r:any)=>s+Math.max(0,Number(r.balance_due||0)),0)}/>
    </section>
    <section className="hotel-panel">
      <div className="mb-4 flex items-center gap-3"><div className="relative max-w-md flex-1"><Search className="absolute left-3 top-2.5 size-4 text-muted-foreground"/><Input value={search} onChange={e=>setSearch(e.target.value)} placeholder="Facture, client, téléphone, logement…" className="pl-9"/></div></div>
      <div className="overflow-x-auto"><table className="w-full min-w-[1180px] text-sm"><thead><tr>{["N° facture","Client","Téléphone","Réservation","Logement","Montant total","Montant payé","Solde restant","Statut","Actions"].map(h=><th key={h} className="border-b p-3 text-left text-xs text-muted-foreground">{h}</th>)}</tr></thead><tbody>
        {rows.map((row:any)=>{const guest:any=guests.get(row.guest_id),room:any=rooms.get(row.room_id),status=statusFor(row);return <tr key={row.invoice_id} className="border-b last:border-0"><td className="p-3 font-semibold">{row.number}</td><td>{guest?`${guest.first_name} ${guest.last_name}`:"—"}</td><td>{guest?.phone??"—"}</td><td>#{String(row.reservation_id).slice(0,8)}</td><td>{room?.number??"—"}</td><td>{formatCurrency(Number(row.grand_total))}</td><td>{formatCurrency(Number(row.paid_total))}</td><td className="font-semibold">{formatCurrency(Math.max(0,Number(row.balance_due)))}</td><td><Badge variant="outline" className={statusClass[status]}>{hotelPaymentStatusLabels[status]}</Badge></td><td><div className="flex gap-1"><IconButton label="Voir" onClick={()=>setSelected(row)}><Eye/></IconButton>{canCollect&&status!=="solde"&&<IconButton label="Encaisser" onClick={()=>{setCollecting(row);setPayment({...emptyPayment,amount:String(Math.max(0,Number(row.balance_due)))})}}><WalletCards/></IconButton>}{canExport&&<><IconButton label="Imprimer" onClick={()=>generate(row,true)}><Printer/></IconButton><IconButton label="Télécharger PDF" onClick={()=>generate(row)}><Download/></IconButton></>}</div></td></tr>})}
        {!rows.length&&<tr><td colSpan={10} className="p-12 text-center text-muted-foreground">Aucune facture trouvée.</td></tr>}
      </tbody></table></div>
    </section>
    <Dialog open={createOpen} onOpenChange={setCreateOpen}><DialogContent><DialogHeader><DialogTitle>Créer une facture</DialogTitle><DialogDescription>Une seule facture principale peut être créée par réservation.</DialogDescription></DialogHeader><Label>Réservation client</Label><Select value={reservationId} onValueChange={setReservationId}><SelectTrigger><SelectValue placeholder="Choisir une réservation"/></SelectTrigger><SelectContent>{available.map((r:any)=>{const g:any=guests.get(r.guest_id),room:any=rooms.get(r.room_id);return <SelectItem key={r.id} value={r.id}>{g?`${g.first_name} ${g.last_name}`:"Client"} · {room?.number??"—"} · {formatCurrency(Number(r.grand_total))}</SelectItem>})}</SelectContent></Select><DialogFooter><Button variant="outline" onClick={()=>setCreateOpen(false)}>Annuler</Button><Button disabled={!reservationId||createInvoice.isPending} onClick={()=>createInvoice.mutate()}>Créer</Button></DialogFooter></DialogContent></Dialog>
    <Dialog open={Boolean(collecting)} onOpenChange={open=>!open&&setCollecting(null)}><DialogContent><DialogHeader><DialogTitle>Encaisser un versement</DialogTitle><DialogDescription>Solde actuel : {formatCurrency(Number(collecting?.balance_due||0))}. Le statut sera recalculé automatiquement.</DialogDescription></DialogHeader><div className="grid gap-3"><Label>Montant</Label><Input type="number" min="0.01" step="0.01" max={collecting?.balance_due} value={payment.amount} onChange={e=>setPayment({...payment,amount:e.target.value})}/><Label>Mode de paiement</Label><Select value={payment.method} onValueChange={method=>setPayment({...payment,method})}><SelectTrigger><SelectValue/></SelectTrigger><SelectContent>{(query.data?.methods??[]).map((m:string)=><SelectItem key={m} value={m}>{m}</SelectItem>)}</SelectContent></Select><Label>Référence (optionnel)</Label><Input value={payment.reference} onChange={e=>setPayment({...payment,reference:e.target.value})}/><Label>Note (optionnel)</Label><Input value={payment.notes} onChange={e=>setPayment({...payment,notes:e.target.value})}/></div><DialogFooter><Button variant="outline" onClick={()=>setCollecting(null)}>Annuler</Button><Button disabled={collect.isPending} onClick={()=>collect.mutate()}>Valider l’encaissement</Button></DialogFooter></DialogContent></Dialog>
    <Dialog open={Boolean(selected)} onOpenChange={open=>!open&&setSelected(null)}><DialogContent className="max-w-2xl"><DialogHeader><DialogTitle>Facture {selected?.number}</DialogTitle><DialogDescription>Émise le {selected?formatDate(selected.issued_at):""}</DialogDescription></DialogHeader>{selected&&<div className="grid gap-5"><div className="grid grid-cols-3 gap-3"><Metric label="Total" value={Number(selected.grand_total)}/><Metric label="Payé" value={Number(selected.paid_total)}/><Metric label="Solde" value={Math.max(0,Number(selected.balance_due))}/></div><div><h3 className="mb-2 font-semibold">Historique des versements</h3><div className="max-h-64 overflow-auto rounded-lg border">{paymentsFor(selected).map((p:any)=><div key={p.id} className="flex justify-between gap-4 border-b p-3 text-sm last:border-0"><span>{formatDate(p.paid_at)} · {p.method}{p.reference?` · ${p.reference}`:""}</span><strong>{formatCurrency(Number(p.amount))}</strong></div>)}{!paymentsFor(selected).length&&<p className="p-5 text-center text-muted-foreground">Aucun versement.</p>}</div></div></div>}<DialogFooter>{canExport&&<Button onClick={()=>generate(selected)}><Download className="mr-2 size-4"/>Télécharger PDF</Button>}</DialogFooter></DialogContent></Dialog>
  </AppShell>;
}

function Metric({label,value}:{label:string;value:number}){return <div className="rounded-xl border bg-card p-4"><p className="text-xs text-muted-foreground">{label}</p><p className="mt-1 text-xl font-bold">{formatCurrency(value)}</p></div>}
function IconButton({label,onClick,children}:{label:string;onClick:()=>void;children:ReactElement}){return <Button size="icon" variant="ghost" title={label} aria-label={label} onClick={onClick}>{children}</Button>}
