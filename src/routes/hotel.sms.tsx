import { useMemo, useState } from "react";
import { createFileRoute } from "@tanstack/react-router";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import {
  AlertCircle,
  CheckCircle2,
  Clock3,
  Eye,
  MessageSquareText,
  RefreshCw,
  Send,
  Settings2,
} from "lucide-react";
import { toast } from "sonner";
import { AppShell } from "@/components/mms/AppShell";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Switch } from "@/components/ui/switch";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Textarea } from "@/components/ui/textarea";
import { supabase } from "@/integrations/supabase/client";
import {
  HOTEL_SMS_LABELS,
  HOTEL_SMS_TYPES,
  hotelSmsTemplates,
  type HotelSmsType,
} from "@/lib/hotel-sms";
import { sendHotelSms, testOrangeSmsConnection } from "@/lib/hotel-sms.server";
import { useTenant } from "@/providers/TenantProvider";
import { usePermissions } from "@/hooks/use-permissions";

type Log = {
  id: string;
  reservation_id: string;
  guest_id: string;
  phone: string;
  message_type: HotelSmsType;
  message: string;
  provider: string;
  status: "sent" | "pending" | "failed";
  provider_message_id?: string;
  request_id?: string;
  http_status?: number;
  provider_error_code?: string;
  provider_error_message?: string;
  error_message?: string;
  estimated_cost?: number;
  currency?: string;
  created_at: string;
};
type Row = Log & { client: string; room: string; reference: string };
export const Route = createFileRoute("/hotel/sms")({ component: HotelSmsPage });
const statusBadge = (status: Log["status"]) =>
  status === "sent" ? (
    <Badge className="bg-emerald-600">Envoyé</Badge>
  ) : status === "failed" ? (
    <Badge variant="destructive">Échec</Badge>
  ) : (
    <Badge className="bg-amber-500">En attente</Badge>
  );
function HotelSmsPage() {
  const { profile, tenant } = useTenant(),
    tenantId = profile?.tenant_id,
    isHotel = tenant?.platform_type === "HOTEL",
    db = supabase as any,
    qc = useQueryClient();
  const subscription = useQuery({
    queryKey: ["sms-subscription", tenantId],
    enabled: Boolean(tenantId),
    queryFn: async () => {
      const { data, error } = await db.rpc("get_current_module_subscription", {
        p_module_code: "hotel_sms",
      });
      if (error) throw error;
      return Array.isArray(data) ? data[0] : data;
    },
  });
  const [search, setSearch] = useState(""),
    [status, setStatus] = useState("all"),
    [type, setType] = useState("all"),
    [room, setRoom] = useState("all"),
    [period, setPeriod] = useState("30"),
    [selected, setSelected] = useState<Row | null>(null);
  const query = useQuery({
    queryKey: ["hotel-sms-center", tenantId],
    enabled: Boolean(tenantId && isHotel),
    queryFn: async () => {
      const [l, g, r, rooms, s] = await Promise.all([
        db
          .from("hotel_sms_logs")
          .select("*")
          .eq("tenant_id", tenantId)
          .order("created_at", { ascending: false }),
        db.from("hotel_guests").select("id,first_name,last_name").eq("tenant_id", tenantId),
        db.from("hotel_reservations").select("id,room_id").eq("tenant_id", tenantId),
        db.from("hotel_rooms").select("id,number").eq("tenant_id", tenantId),
        db.from("hotel_sms_settings").select("*").eq("tenant_id", tenantId).maybeSingle(),
      ]);
      for (const x of [l, g, r, rooms, s]) if (x.error) throw x.error;
      const gm = new Map((g.data ?? []).map((x: any) => [x.id, `${x.first_name} ${x.last_name}`])),
        rm = new Map((r.data ?? []).map((x: any) => [x.id, x])),
        roomm = new Map((rooms.data ?? []).map((x: any) => [x.id, x.number]));
      return {
        rows: (l.data ?? []).map((x: Log) => {
          const reservation: any = rm.get(x.reservation_id);
          return {
            ...x,
            client: gm.get(x.guest_id) ?? "Client inconnu",
            room: roomm.get(reservation?.room_id) ?? "—",
            reference: x.reservation_id.slice(0, 8).toUpperCase(),
          } as Row;
        }),
        settings: s.data,
      };
    },
  });
  const rows = useMemo(() => {
    const cutoff = Date.now() - Number(period) * 86400000,
      q = search.toLowerCase();
    return (query.data?.rows ?? []).filter(
      (x: Row) =>
        (period === "all" || new Date(x.created_at).getTime() >= cutoff) &&
        (status === "all" || x.status === status) &&
        (type === "all" || x.message_type === type) &&
        (room === "all" || x.room === room) &&
        (!q || `${x.client} ${x.phone} ${x.reference}`.toLowerCase().includes(q)),
    );
  }, [query.data, period, status, type, room, search]);
  const today = (query.data?.rows ?? []).filter(
      (x: Row) => new Date(x.created_at).toDateString() === new Date().toDateString(),
    ),
    sent = today.filter((x: Row) => x.status === "sent").length,
    failed = today.filter((x: Row) => x.status === "failed").length,
    pending = today.filter((x: Row) => x.status === "pending").length;
  const retry = useMutation({
    mutationFn: (x: Row) =>
      sendHotelSms({
        data: {
          reservationId: x.reservation_id,
          messageType: x.message_type,
          message: x.message,
          retryOf: x.id,
        },
      }),
    onSuccess: (x) => {
      void qc.invalidateQueries({ queryKey: ["hotel-sms-center"] });
      void qc.invalidateQueries({ queryKey: ["sms-subscription"] });
      x.status === "failed" ? toast.error(x.error) : toast.success("SMS renvoyé");
    },
    onError: (e: Error) => toast.error(e.message),
  });
  if (!isHotel)
    return (
      <AppShell title="SMS Clients" subtitle="Service Premium SAOVIA">
        <div className="grid gap-4 md:grid-cols-3">
          <Card>
            <CardHeader>
              <CardTitle>Solde SMS</CardTitle>
            </CardHeader>
            <CardContent>
              <p className="text-4xl font-bold">{subscription.data?.credit_balance ?? 0}</p>
              <p className="text-sm text-muted-foreground">crédits disponibles</p>
            </CardContent>
          </Card>
          <Card className="md:col-span-2">
            <CardHeader>
              <CardTitle>Abonnement {subscription.data?.plan_name ?? "SMS"}</CardTitle>
            </CardHeader>
            <CardContent>
              <Badge className="bg-emerald-600">{subscription.data?.status ?? "actif"}</Badge>
              <p className="mt-3 text-sm text-muted-foreground">
                Notifications, marketing, confirmations et rappels. Les connecteurs métier adaptés à
                votre activité utilisent ce quota partagé.
              </p>
            </CardContent>
          </Card>
        </div>
      </AppShell>
    );
  return (
    <AppShell
      title="Centre SMS Hôtel"
      subtitle="Pilotage, diagnostic et automatisation des communications"
    >
      <Tabs defaultValue="history">
        <TabsList>
          <TabsTrigger value="history">
            <MessageSquareText />
            Historique
          </TabsTrigger>
          <TabsTrigger value="settings">
            <Settings2 />
            Paramètres SMS
          </TabsTrigger>
        </TabsList>
        <TabsContent value="history" className="space-y-4">
          <div className="grid gap-3 md:grid-cols-5">
            {[
              ["Envoyés aujourd’hui", today.length, Send],
              ["Réussis", sent, CheckCircle2],
              ["Échoués", failed, AlertCircle],
              ["En attente", pending, Clock3],
              [
                "Taux de réussite",
                today.length ? `${Math.round((sent / today.length) * 100)} %` : "—",
                CheckCircle2,
              ],
            ].map(([label, value, Icon]: any) => (
              <Card key={label}>
                <CardContent className="flex items-center justify-between p-4">
                  <div>
                    <p className="text-xs text-muted-foreground">{label}</p>
                    <p className="text-2xl font-bold">{value}</p>
                  </div>
                  <Icon className="size-5 text-primary" />
                </CardContent>
              </Card>
            ))}
          </div>
          <Card>
            <CardContent className="grid gap-3 p-4 md:grid-cols-5">
              <Input
                placeholder="Client, numéro ou réservation"
                value={search}
                onChange={(e) => setSearch(e.target.value)}
              />
              <Select value={period} onValueChange={setPeriod}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="7">7 derniers jours</SelectItem>
                  <SelectItem value="30">30 derniers jours</SelectItem>
                  <SelectItem value="90">90 derniers jours</SelectItem>
                  <SelectItem value="all">Toute la période</SelectItem>
                </SelectContent>
              </Select>
              <Select value={status} onValueChange={setStatus}>
                <SelectTrigger>
                  <SelectValue placeholder="Statut" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">Tous les statuts</SelectItem>
                  <SelectItem value="sent">Envoyé</SelectItem>
                  <SelectItem value="pending">En attente</SelectItem>
                  <SelectItem value="failed">Échec</SelectItem>
                </SelectContent>
              </Select>
              <Select value={type} onValueChange={setType}>
                <SelectTrigger>
                  <SelectValue placeholder="Type" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">Tous les types</SelectItem>
                  {HOTEL_SMS_TYPES.map((x) => (
                    <SelectItem key={x} value={x}>
                      {HOTEL_SMS_LABELS[x]}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
              <Select value={room} onValueChange={setRoom}>
                <SelectTrigger>
                  <SelectValue placeholder="Logement" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">Tous les logements</SelectItem>
                  {[...new Set((query.data?.rows ?? []).map((x: Row) => x.room))].map((x: any) => (
                    <SelectItem key={x} value={x}>
                      {x}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </CardContent>
          </Card>
          <Card>
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Client / numéro</TableHead>
                  <TableHead>Logement</TableHead>
                  <TableHead>Type</TableHead>
                  <TableHead>Statut</TableHead>
                  <TableHead>Date et heure</TableHead>
                  <TableHead>Coût</TableHead>
                  <TableHead>Diagnostic</TableHead>
                  <TableHead />
                </TableRow>
              </TableHeader>
              <TableBody>
                {query.isLoading ? (
                  <TableRow>
                    <TableCell colSpan={8}>Chargement…</TableCell>
                  </TableRow>
                ) : rows.length ? (
                  rows.map((x: Row) => (
                    <TableRow key={x.id}>
                      <TableCell>
                        <b>{x.client}</b>
                        <br />
                        <span className="text-muted-foreground">
                          {x.phone} · #{x.reference}
                        </span>
                      </TableCell>
                      <TableCell>{x.room}</TableCell>
                      <TableCell>{HOTEL_SMS_LABELS[x.message_type] ?? x.message_type}</TableCell>
                      <TableCell>{statusBadge(x.status)}</TableCell>
                      <TableCell>
                        {new Date(x.created_at).toLocaleString("fr-FR", {
                          dateStyle: "full",
                          timeStyle: "medium",
                        })}
                      </TableCell>
                      <TableCell>
                        {x.estimated_cost != null ? `${x.estimated_cost} ${x.currency ?? ""}` : "—"}
                      </TableCell>
                      <TableCell className="max-w-56">
                        <span
                          className={
                            x.status === "failed" ? "text-destructive" : "text-muted-foreground"
                          }
                        >
                          {x.provider_error_message ??
                            x.error_message ??
                            (x.http_status ? `HTTP ${x.http_status}` : "—")}
                        </span>
                      </TableCell>
                      <TableCell>
                        <div className="flex gap-1">
                          <Button size="sm" variant="outline" onClick={() => setSelected(x)}>
                            <Eye />
                            Voir
                          </Button>
                          {x.status === "failed" && (
                            <Button
                              size="sm"
                              onClick={() => retry.mutate(x)}
                              disabled={retry.isPending}
                            >
                              <RefreshCw />
                              Renvoyer
                            </Button>
                          )}
                        </div>
                      </TableCell>
                    </TableRow>
                  ))
                ) : (
                  <TableRow>
                    <TableCell colSpan={8}>Aucun SMS ne correspond aux filtres.</TableCell>
                  </TableRow>
                )}
              </TableBody>
            </Table>
          </Card>
        </TabsContent>
        <TabsContent value="settings">
          <SmsSettings
            tenantId={tenantId}
            profileId={profile?.id}
            initial={query.data?.settings}
            onSaved={() => qc.invalidateQueries({ queryKey: ["hotel-sms-center"] })}
          />
        </TabsContent>
      </Tabs>
      <MessageDialog row={selected} onClose={() => setSelected(null)} />
    </AppShell>
  );
}
function MessageDialog({ row, onClose }: { row: Row | null; onClose: () => void }) {
  return (
    <Dialog open={Boolean(row)} onOpenChange={(open) => !open && onClose()}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Message SMS</DialogTitle>
          <DialogDescription>
            {row?.client} · {row?.phone}
          </DialogDescription>
        </DialogHeader>
        <div className="space-y-3 text-sm">
          <div className="rounded border bg-muted/30 p-3 whitespace-pre-wrap">{row?.message}</div>
          {row?.status === "failed" && (
            <div className="rounded border border-destructive/30 bg-destructive/5 p-3">
              <b>Erreur fournisseur :</b> {row.provider_error_message ?? row.error_message}
              <br />
              <b>Code :</b> {row.provider_error_code ?? "—"} · <b>HTTP :</b>{" "}
              {row.http_status ?? "—"}
              <br />
              <b>Request ID :</b> {row.request_id ?? "—"}
            </div>
          )}
          <p>
            Fournisseur : {row?.provider} · ID message : {row?.provider_message_id ?? "—"}
          </p>
        </div>
      </DialogContent>
    </Dialog>
  );
}
function SmsSettings({
  tenantId,
  profileId,
  initial,
  onSaved,
}: {
  tenantId?: string | null;
  profileId?: string;
  initial: any;
  onSaved: () => void;
}) {
  const permissions = usePermissions(),
    canTest =
      permissions.data?.role === "Administrateur" ||
    ((permissions.data?.permissions as string[] | undefined)?.includes("hotel.sms.settings") ??
      false),
    [provider, setProvider] = useState(initial?.provider ?? "orange"),
    [automatic, setAutomatic] = useState(Boolean(initial?.automatic_sending_enabled)),
    [templates, setTemplates] = useState<Record<string, string>>(
      initial?.templates ?? hotelSmsTemplates,
    ),
    [connection, setConnection] = useState<{
      connected: boolean;
      status: "connected" | "configuration_error";
      message: string;
    } | null>(null);
  const save = useMutation({
    mutationFn: async () => {
      const { error } = await (supabase as any)
        .from("hotel_sms_settings")
        .upsert(
          {
            tenant_id: tenantId,
            provider,
            automatic_sending_enabled: automatic,
            templates,
            updated_by: profileId,
            updated_at: new Date().toISOString(),
          },
          { onConflict: "tenant_id" },
        );
      if (error) throw error;
    },
    onSuccess: () => {
      toast.success("Paramètres SMS enregistrés");
      onSaved();
    },
    onError: (e: Error) => toast.error(e.message),
  });
  const test = useMutation({
    mutationFn: () => testOrangeSmsConnection(),
    onSuccess: (result) => {
      setConnection(result);
      result.connected ? toast.success(result.message) : toast.error(result.message);
    },
    onError: () => {
      const message = "Impossible de vérifier la connexion Orange.";
      setConnection({ connected: false, status: "configuration_error", message });
      toast.error(message);
    },
  });
  return (
    <Card>
      <CardHeader>
        <CardTitle>Configuration du fournisseur</CardTitle>
      </CardHeader>
      <CardContent className="space-y-6">
        <div className="grid gap-4 md:grid-cols-2">
          <div>
            <Label>Fournisseur</Label>
            <Select
              value={provider}
              onValueChange={(value) => {
                setProvider(value);
                setConnection(null);
              }}
            >
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="orange">Orange</SelectItem>
                <SelectItem value="twilio">Twilio</SelectItem>
                <SelectItem value="infobip">Infobip</SelectItem>
              </SelectContent>
            </Select>
            <p className="mt-2 text-xs text-muted-foreground">
              Les identifiants API sont lus uniquement sur le serveur et ne sont jamais exposés au
              navigateur.
            </p>
          </div>
          <div className="flex items-center gap-3">
            {provider === "orange" && canTest && (
              <Button variant="outline" onClick={() => test.mutate()} disabled={test.isPending}>
                {test.isPending ? "Test en cours…" : "Tester la connexion Orange"}
              </Button>
            )}
            <Badge
              variant={!connection ? "outline" : connection.connected ? "default" : "destructive"}
              className={connection?.connected ? "bg-emerald-600" : undefined}
            >
              {!connection
                ? "Non testé"
                : connection.connected
                  ? "Connecté"
                  : "Erreur de configuration"}
            </Badge>
          </div>
        </div>
        <div className="flex items-center justify-between rounded border p-4">
          <div>
            <Label>Envoi automatique</Label>
            <p className="text-xs text-muted-foreground">
              Active les scénarios configurés pour ce tenant.
            </p>
          </div>
          <Switch checked={automatic} onCheckedChange={setAutomatic} />
        </div>
        <div className="grid gap-4 md:grid-cols-2">
          {(
            [
              "confirmation",
              "check_in",
              "check_out",
              "payment_received",
              "arrival_reminder",
              "cancellation",
            ] as HotelSmsType[]
          ).map((x) => (
            <div key={x}>
              <Label>{HOTEL_SMS_LABELS[x]}</Label>
              <Textarea
                rows={3}
                value={templates[x] ?? hotelSmsTemplates[x]}
                onChange={(e) => setTemplates({ ...templates, [x]: e.target.value })}
              />
            </div>
          ))}
        </div>
        <Button onClick={() => save.mutate()} disabled={save.isPending || !tenantId}>
          Enregistrer les paramètres
        </Button>
      </CardContent>
    </Card>
  );
}
