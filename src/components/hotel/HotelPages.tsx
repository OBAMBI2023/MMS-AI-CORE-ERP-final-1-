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
import { Link } from "@tanstack/react-router";
import { jsPDF } from "jspdf";
import { createXlsx } from "@/lib/mms/xlsx-export";
import { Archive, Printer, Trash2 } from "lucide-react";
import { useCompanySettings } from "@/hooks/use-company-settings";
import { GuestDocumentsDownload } from "@/components/hotel/GuestDocumentsDownload";
import { createHotelListPdf } from "@/lib/mms/hotel-pdf-engine";
import { downloadPdf } from "@/lib/mms/download-pdf";
import { useTenant } from "@/providers/TenantProvider";
import { useQueryClient } from "@tanstack/react-query";
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle } from "@/components/ui/alert-dialog";
export { HotelRoomsPage } from "@/components/hotel/HotelRoomsCrud";
export { HotelReportsPage } from "@/components/hotel/HotelReportsPage";

type Row = { id: string; [key: string]: unknown };
const db = supabase as any;
const IDENTITY_BUCKET = "hotel-identity-documents";

function escapePrintHtml(value: unknown) {
  return String(value ?? "")
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;")
    .replaceAll("'", "&#039;");
}

function printGuestList(rows: Row[], hotelName: string) {
  const printWindow = window.open("", "_blank", "width=900,height=700");
  if (!printWindow) throw new Error("Autorisez les fenêtres contextuelles pour imprimer la liste.");
  printWindow.opener = null;

  const printedAt = new Intl.DateTimeFormat("fr-FR", {
    dateStyle: "long",
    timeStyle: "short",
  }).format(new Date());
  const body = rows
    .map((row) => {
      const fullName = `${String(row.first_name ?? "")} ${String(row.last_name ?? "")}`.trim();
      const documentStatus = row.identity_document_path ? "Document disponible" : "Non fourni";
      return `<tr><td>${escapePrintHtml(fullName || "—")}</td><td>${escapePrintHtml(row.phone || "—")}</td><td>${documentStatus}</td></tr>`;
    })
    .join("");

  printWindow.document.write(`<!doctype html>
<html lang="fr"><head><meta charset="utf-8"><title>Liste des clients / voyageurs</title>
<style>
  @page { size: A4; margin: 16mm; }
  * { box-sizing: border-box; }
  body { margin: 0; color: #172033; font-family: Arial, Helvetica, sans-serif; font-size: 11pt; }
  header { margin-bottom: 20px; border-bottom: 2px solid #172033; padding-bottom: 12px; }
  .hotel { margin: 0 0 6px; font-size: 12pt; font-weight: 700; }
  h1 { margin: 0 0 10px; font-size: 20pt; }
  .meta { display: flex; justify-content: space-between; gap: 16px; color: #4b5563; font-size: 9.5pt; }
  table { width: 100%; border-collapse: collapse; table-layout: fixed; }
  th, td { border: 1px solid #cbd5e1; padding: 9px 10px; text-align: left; vertical-align: top; overflow-wrap: anywhere; }
  th { background: #eef2f7; font-size: 9pt; text-transform: uppercase; }
  th:nth-child(1) { width: 42%; } th:nth-child(2) { width: 30%; } th:nth-child(3) { width: 28%; }
  tr { break-inside: avoid; }
  thead { display: table-header-group; }
</style></head><body>
<header><p class="hotel">${escapePrintHtml(hotelName)}</p><h1>Liste des clients / voyageurs</h1>
<div class="meta"><span>Imprimé le ${escapePrintHtml(printedAt)}</span><span>Total : ${rows.length} client${rows.length > 1 ? "s" : ""}</span></div></header>
<table><thead><tr><th>Nom complet</th><th>Téléphone</th><th>Statut du document</th></tr></thead><tbody>${body}</tbody></table>
<script>window.addEventListener("load", function () { window.print(); });<\/script>
</body></html>`);
  printWindow.document.close();
}

function GuestRemovalAction({ row, hasHistory }: { row: Row; hasHistory: boolean }) {
  const { profile } = useTenant();
  const qc = useQueryClient();
  const [linked, setLinked] = useState(hasHistory);
  const [open, setOpen] = useState(false);
  const [busy, setBusy] = useState(false);
  const tenantId = profile?.tenant_id;

  const prepare = async () => {
    if (!tenantId) return toast.error("Établissement introuvable.");
    setBusy(true);
    const { data, error } = await db.from("hotel_reservations").select("id").eq("tenant_id", tenantId).eq("guest_id", row.id).limit(1);
    setBusy(false);
    if (error) return toast.error("Impossible de vérifier l’historique du client.");
    setLinked(Boolean(data?.length));
    setOpen(true);
  };

  const apply = async () => {
    if (!tenantId) return;
    setBusy(true);
    try {
      if (linked) {
        const { error } = await db.from("hotel_guests").update({ archived_at: new Date().toISOString() }).eq("tenant_id", tenantId).eq("id", row.id);
        if (error) throw new Error("Impossible d’archiver ce client.");
        toast.success("Client archivé");
      } else {
        const { data: reservations, error: checkError } = await db.from("hotel_reservations").select("id").eq("tenant_id", tenantId).eq("guest_id", row.id).limit(1);
        if (checkError) throw new Error("Impossible de vérifier l’historique du client.");
        if (reservations?.length) {
          setLinked(true);
          throw new Error("Ce client possède un historique. Vous pouvez l’archiver, mais pas supprimer ses réservations.");
        }
        const path = typeof row.identity_document_path === "string" ? row.identity_document_path : "";
        const validPath = path.startsWith(`${tenantId}/identity-documents/`) ? path : null;
        const { error } = await db.from("hotel_guests").delete().eq("tenant_id", tenantId).eq("id", row.id);
        if (error) throw new Error("Impossible de supprimer ce client.");
        if (validPath) {
          const { error: storageError } = await supabase.storage.from(IDENTITY_BUCKET).remove([validPath]);
          if (storageError) toast.warning("Client supprimé, mais le document n’a pas pu être nettoyé.");
        }
        toast.success("Client supprimé");
      }
      setOpen(false);
      qc.invalidateQueries({ queryKey: ["hotel_guests"] });
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Opération impossible.");
    } finally { setBusy(false); }
  };

  return <>
    <button type="button" disabled={busy} onClick={() => void prepare()} className="p-2 rounded-lg hover:bg-muted text-muted-foreground hover:text-foreground" aria-label="Supprimer ou archiver">
      {linked || hasHistory ? <Archive className="h-4 w-4" /> : <Trash2 className="h-4 w-4" />}
    </button>
    <AlertDialog open={open} onOpenChange={setOpen}>
      <AlertDialogContent>
        <AlertDialogHeader>
          <AlertDialogTitle>{linked ? "Archiver ce client ?" : "Supprimer ce client ?"}</AlertDialogTitle>
          <AlertDialogDescription>{linked ? "Ce client possède un historique. Vous pouvez l’archiver, mais pas supprimer ses réservations." : "Le client et sa pièce d’identité seront définitivement supprimés."}</AlertDialogDescription>
        </AlertDialogHeader>
        <AlertDialogFooter><AlertDialogCancel>Annuler</AlertDialogCancel><AlertDialogAction disabled={busy} onClick={(event) => { event.preventDefault(); void apply(); }}>{linked ? "Archiver le client" : "Supprimer"}</AlertDialogAction></AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  </>;
}

export function HotelGuestsPage() {
  const { companyName, settings, logoUrl } = useCompanySettings();
  const { tenant } = useTenant();
  const reservationGuests = useQuery({
    queryKey: ["hotel-guest-reservation-links"],
    queryFn: async () => {
      const { data, error } = await db.from("hotel_reservations").select("guest_id");
      if (error) throw error;
      return new Set<string>((data ?? []).map((item: { guest_id?: string }) => item.guest_id).filter(Boolean));
    },
  });
  const fields: FieldDef[] = [
    {
      name: "full_name",
      label: "Nom complet",
      required: true,
      placeholder: "Ex. Awa Diallo",
      colSpan: 2,
    },
    {
      name: "phone",
      label: "Téléphone",
      type: "tel",
      required: true,
      placeholder: "Ex. +225 07 00 00 00 00",
      colSpan: 2,
    },
    {
      name: "identity_document_path",
      label: "Photo de la pièce d’identité (optionnelle)",
      type: "image",
      colSpan: 2,
    },
  ];
  const toPayload = (values: Record<string, unknown>) => {
    const fullName = String(values.full_name ?? "")
      .trim()
      .replace(/\s+/g, " ");
    const [firstName, ...lastParts] = fullName.split(" ");
    return {
      first_name: firstName,
      last_name: lastParts.join(" ") || firstName,
      phone: values.phone,
      identity_document_path: values.identity_document_path,
    };
  };
  const columns: ColumnDef<Row>[] = [
    { header: "Nom complet", cell: (r) => `${r.first_name} ${r.last_name}` },
    { header: "Téléphone", cell: (r) => String(r.phone ?? "—") },
  ];
  const print = async (rows: Row[]) => {
    try {
      const pdf = await createHotelListPdf({
        title: "Liste des voyageurs",
        filename: `voyageurs-${new Date().toISOString().slice(0, 10)}.pdf`,
        head: ["Nom complet", "Téléphone", "Pièce d’identité"],
        body: rows.map((row) => [
          `${String(row.first_name ?? "")} ${String(row.last_name ?? "")}`.trim(),
          row.phone as string,
          row.identity_document_path ? "Document disponible" : "Non fourni",
        ]),
        settings: { ...settings, company_name: tenant?.name?.trim() || companyName },
        logoUrl,
      });
      await downloadPdf(pdf.doc, pdf.filename);
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Impression impossible.");
    }
  };
  return (
    <AppShell
      title="Clients / Voyageurs"
      subtitle="Identités, contacts, accompagnants et historique"
    >
      <ResourceTable
        table="hotel_guests"
        singular="Client"
        plural="Clients"
        fields={fields}
        prepareCreatePayload={toPayload}
        prepareEditValues={(row) => ({
          full_name: `${row.first_name} ${row.last_name}`,
          phone: row.phone,
          identity_document_path: row.identity_document_path,
        })}
        prepareEditPayload={toPayload}
        columns={columns}
        renderRowActions={(row) => <><GuestDocumentsDownload row={row} /><GuestRemovalAction row={row} hasHistory={reservationGuests.data?.has(row.id) ?? false} /></>}
        hideDeleteAction
        filterRows={(row) => !row.archived_at}
        searchFields={["first_name", "last_name", "phone"]}
        orderBy={{ column: "created_at" }}
        selectable
        imageStorage={{ bucket: "hotel-identity-documents", folder: "identity-documents" }}
        renderActions={(visibleRows) => (
          <button type="button" disabled={visibleRows.length === 0} onClick={() => print(visibleRows)} className="inline-flex items-center gap-2 rounded-xl border border-border px-4 py-2 text-sm font-medium hover:bg-muted disabled:opacity-50">
            <Printer className="h-4 w-4" />
            Imprimer la liste clients
          </button>
        )}
      />
    </AppShell>
  );
}

function useHotelData() {
  return useQuery({
    queryKey: ["hotel-overview"],
    queryFn: async () => {
      const [rooms, reservations, expenses] = await Promise.all([
        db.from("hotel_rooms").select("*"),
        db.from("hotel_reservation_balances").select("*"),
        db.from("depenses").select("amount,paid_at"),
      ]);
      for (const result of [rooms, reservations, expenses]) if (result.error) throw result.error;
      return {
        rooms: rooms.data ?? [],
        reservations: reservations.data ?? [],
        expenses: expenses.data ?? [],
      };
    },
  });
}

export function HotelDashboardPage() {
  const { data } = useHotelData();
  const today = new Date().toISOString().slice(0, 10);
  const r = data?.reservations ?? [];
  const rooms = data?.rooms ?? [];
  const occupied = r.filter(
    (x: any) =>
      x.check_in <= today && x.check_out > today && !["cancelled", "no_show"].includes(x.status),
  ).length;
  const revenue = r.reduce((s: number, x: any) => s + Number(x.paid_total ?? 0), 0);
  const expenses = (data?.expenses ?? []).reduce((s: number, x: any) => s + Number(x.amount), 0);
  const stats = [
    ["Disponibles", Math.max(0, rooms.length - occupied)],
    ["Occupées", occupied],
    ["Arrivées", r.filter((x: any) => x.check_in === today).length],
    ["Départs", r.filter((x: any) => x.check_out === today).length],
    ["Réservations", r.filter((x: any) => !["cancelled", "no_show"].includes(x.status)).length],
    ["Revenus", formatCurrency(revenue)],
    ["Dépenses", formatCurrency(expenses)],
    [
      "Taux d’occupation",
      rooms.length ? `${Math.round((occupied / rooms.length) * 100)} %` : "0 %",
    ],
  ];
  return (
    <AppShell title="Tableau de bord Hôtel" subtitle="Activité de l’établissement en temps réel">
      <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
        {stats.map(([label, value]) => (
          <Card key={label as string}>
            <CardHeader className="pb-2">
              <CardTitle className="text-sm text-muted-foreground">{label}</CardTitle>
            </CardHeader>
            <CardContent className="text-2xl font-bold">{value}</CardContent>
          </Card>
        ))}
      </div>
    </AppShell>
  );
}

function LegacyHotelReportsPage() {
  const { data } = useHotelData();
  const rows = data?.reservations ?? [];
  const paid = rows.reduce((s: number, r: any) => s + Number(r.paid_total ?? 0), 0);
  const due = rows.reduce((s: number, r: any) => s + Number(r.balance_due ?? 0), 0);
  const expenses = (data?.expenses ?? []).reduce((s: number, r: any) => s + Number(r.amount), 0);
  const canExport = useActionPermission("hotel.reports.export");
  const [exporting, setExporting] = useState(false);
  const csv = async () => {
    if (!canExport) return;
    setExporting(true);
    try {
      const result = await exportHotelReportCsv();
      const url = URL.createObjectURL(new Blob([result.csv], { type: "text/csv;charset=utf-8" }));
      const a = document.createElement("a");
      a.href = url;
      a.download = result.filename;
      a.click();
      URL.revokeObjectURL(url);
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Export refusé.");
    } finally {
      setExporting(false);
    }
  };
  const download = (blob: Blob, name: string) => {
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = name;
    a.click();
    URL.revokeObjectURL(url);
  };
  const excel = () => {
    if (!canExport) return;
    const file = createXlsx(
      ["Arrivée", "Départ", "Statut", "Nuits", "Total", "Payé", "Solde"],
      rows.map((r: any) => [
        r.check_in,
        r.check_out,
        r.status,
        Number(r.nights),
        Number(r.grand_total),
        Number(r.paid_total),
        Number(r.balance_due),
      ]),
    );
    download(
      new Blob([file], {
        type: "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
      }),
      `rapport-hotel-${new Date().toISOString().slice(0, 10)}.xlsx`,
    );
  };
  const pdf = () => {
    if (!canExport) return;
    const doc = new jsPDF();
    doc.setFontSize(18);
    doc.text("Rapport Hôtel", 14, 18);
    doc.setFontSize(11);
    doc.text(`Revenus encaissés : ${formatCurrency(paid)}`, 14, 30);
    doc.text(`Dépenses : ${formatCurrency(expenses)}`, 14, 38);
    doc.text(`Résultat net : ${formatCurrency(paid - expenses)}`, 14, 46);
    rows
      .slice(0, 28)
      .forEach((r: any, i: number) =>
        doc.text(
          `${formatDate(r.check_in)} - ${formatDate(r.check_out)} | ${formatCurrency(Number(r.grand_total))} | solde ${formatCurrency(Number(r.balance_due))}`,
          14,
          60 + i * 7,
        ),
      );
    doc.save(`rapport-hotel-${new Date().toISOString().slice(0, 10)}.pdf`);
  };
  const actions = canExport ? (
    <div className="flex gap-2">
      <button className="rounded-md border px-3 py-2 text-sm" onClick={pdf}>
        PDF
      </button>
      <button className="rounded-md border px-3 py-2 text-sm" onClick={excel}>
        Excel
      </button>
      <button
        className="rounded-md bg-primary px-3 py-2 text-sm text-primary-foreground disabled:opacity-50"
        disabled={exporting}
        onClick={() => void csv()}
      >
        {exporting ? "Export…" : "CSV"}
      </button>
    </div>
  ) : null;
  return (
    <AppShell
      title="Rapports Hôtel"
      subtitle="Occupation, revenus, dépenses et réservations"
      actions={actions}
    >
      <div className="grid gap-4 md:grid-cols-4">
        {[
          ["CA encaissé", paid],
          ["Impayés", due],
          ["Dépenses", expenses],
          ["Résultat net", paid - expenses],
        ].map(([l, v]) => (
          <Card key={l as string}>
            <CardHeader>
              <CardTitle className="text-sm">{l}</CardTitle>
            </CardHeader>
            <CardContent className="text-xl font-bold">{formatCurrency(Number(v))}</CardContent>
          </Card>
        ))}
      </div>
      <div className="mt-6 rounded-xl border">
        <table className="w-full text-sm">
          <thead>
            <tr className="border-b">
              <th className="p-3 text-left">Arrivée</th>
              <th>Départ</th>
              <th>Total</th>
              <th>Solde</th>
            </tr>
          </thead>
          <tbody>
            {rows.map((r: any) => (
              <tr className="border-b" key={r.id}>
                <td className="p-3">{formatDate(r.check_in)}</td>
                <td>{formatDate(r.check_out)}</td>
                <td>{formatCurrency(Number(r.grand_total))}</td>
                <td>{formatCurrency(Number(r.balance_due))}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </AppShell>
  );
}

export function HotelSettingsPage() {
  const fields: FieldDef[] = [
    { name: "establishment_name", label: "Établissement" },
    { name: "check_in_time", label: "Heure d’arrivée" },
    { name: "check_out_time", label: "Heure de départ" },
    { name: "tax_rate", label: "Taxes (%)", type: "number", step: "0.001" },
    { name: "cancellation_policy", label: "Politique d’annulation", type: "textarea" },
  ];
  const columns: ColumnDef<Row>[] = [
    { header: "Établissement", cell: (r) => String(r.establishment_name ?? "—") },
    { header: "Arrivée", cell: (r) => String(r.check_in_time) },
    { header: "Départ", cell: (r) => String(r.check_out_time) },
    { header: "Taxes", cell: (r) => `${r.tax_rate}%` },
  ];
  const typeFields: FieldDef[] = [
    { name: "name", label: "Type", required: true },
    { name: "capacity", label: "Capacité", type: "number", required: true },
    { name: "base_rate", label: "Tarif de base", type: "number", required: true },
  ];
  const typeColumns: ColumnDef<Row>[] = [
    { header: "Type", cell: (r) => String(r.name) },
    { header: "Capacité", cell: (r) => String(r.capacity) },
    { header: "Tarif", cell: (r) => formatCurrency(Number(r.base_rate)) },
  ];
  return (
    <AppShell title="Paramètres" subtitle="Informations hôtel, types, taxes, utilisateurs et rôles">
      <div className="space-y-6">
        <div className="hotel-panel">
          <h2 className="mb-4 font-semibold">Informations de l’hôtel et préférences</h2>
          <ResourceTable
            table="hotel_settings"
            singular="Configuration"
            plural="Configurations"
            fields={fields}
            columns={columns}
          />
        </div>
        <div className="hotel-panel">
          <h2 className="mb-4 font-semibold">Types de chambres</h2>
          <ResourceTable
            table="hotel_room_types"
            singular="Type de chambre"
            plural="Types de chambres"
            fields={typeFields}
            columns={typeColumns}
            searchFields={["name"]}
          />
        </div>
        <div className="grid gap-4 md:grid-cols-2">
          <Link to="/settings/users" className="hotel-panel transition hover:border-[#C9A227]">
            <b>Utilisateurs</b>
            <p className="mt-1 text-sm text-slate-500">Invitations, comptes et accès.</p>
          </Link>
          <Link to="/parametres" className="hotel-panel transition hover:border-[#C9A227]">
            <b>Rôles et permissions</b>
            <p className="mt-1 text-sm text-slate-500">
              Gérer les rôles avec les écrans sécurisés existants.
            </p>
          </Link>
        </div>
      </div>
    </AppShell>
  );
}
