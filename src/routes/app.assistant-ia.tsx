import { useState } from "react";
import { createFileRoute } from "@tanstack/react-router";
import { Activity, Bot, Coins, Crown, Database, History, Loader2, Send, ShieldCheck, TriangleAlert } from "lucide-react";
import { AppShell } from "@/components/mms/AppShell";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Textarea } from "@/components/ui/textarea";
import { Switch } from "@/components/ui/switch";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import {
  getTenantAiPortal,
  purchaseTenantAiCredits,
  toggleTenantAiAgent,
  type TenantAiPortal,
} from "@/lib/ai-platform.server";
import { formatCurrency } from "@/lib/mms/format";
import {
  askAssistant,
  confirmAssistantAction,
  getAssistantAccessState,
  type AssistantAccessState,
} from "@/lib/ai-assistant.server";

type AssistantResponse =
  | { kind: "result"; tool: string; data: unknown; sources: string[]; period?: { from: string; to: string } }
  | { kind: "error"; error: string; tool: string }
  | {
      kind: "confirmation";
      pendingAction: {
        id: string;
        action_type: string;
        payload: Record<string, unknown>;
        expires_at: string;
      };
    };

const suggestions = [
  "Quel est le chiffre d’affaires du jour ?",
  "Affiche les 10 dernières ventes",
  "Quels produits sont en rupture ou sous le seuil ?",
  "Donne-moi le résumé de cette semaine",
  "Propose un réapprovisionnement",
];

function AssistantPage() {
  const loaderData = Route.useLoaderData();
  const initialAccess = loaderData.access;
  const [access, setAccess] = useState<AssistantAccessState>(initialAccess);
  const [portal, setPortal] = useState<TenantAiPortal>(loaderData.portal);
  const [message, setMessage] = useState("");
  const [loading, setLoading] = useState(false);
  const [response, setResponse] = useState<AssistantResponse | null>(null);
  const [error, setError] = useState("");

  async function submit(text = message) {
    if (!text.trim()) return;
    setLoading(true);
    setError("");
    setResponse(null);
    try {
      setResponse(await askAssistant({ data: { message: text.trim() } }) as AssistantResponse);
      setAccess((current) => {
        const used = current.requestsUsed + 1;
        return {
          ...current,
          requestsUsed: used,
          remainingRequests:
            current.monthlyRequestLimit === null
              ? null
              : Math.max(0, current.monthlyRequestLimit - used),
          quotaExhausted:
            current.monthlyRequestLimit !== null && used >= current.monthlyRequestLimit,
        };
      });
      setMessage("");
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : "La demande a échoué.");
    } finally {
      setLoading(false);
    }
  }

  async function decide(confirmed: boolean) {
    if (response?.kind !== "confirmation") return;
    setLoading(true);
    setError("");
    try {
      const result = await confirmAssistantAction({
        data: { pendingActionId: response.pendingAction.id, confirmed },
      });
      setResponse({
        kind: "result",
        tool: response.pendingAction.action_type,
        data: result,
        sources: ["journal d’audit", "action serveur confirmée"],
      });
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : "L’action a échoué.");
    } finally {
      setLoading(false);
    }
  }

  async function toggleAgent(agentId: string, enabled: boolean) {
    try {
      await toggleTenantAiAgent({ data: { agentId, enabled } });
      setPortal((current) => ({ ...current, agents: current.agents.map((item) => item.id === agentId ? { ...item, enabled } : item) }));
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : "Activation impossible.");
    }
  }

  async function buyCredits(amount: number) {
    try {
      await purchaseTenantAiCredits({ data: { amount } });
      setPortal((current) => ({ ...current, creditBalance: current.creditBalance + amount }));
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : "Achat impossible.");
    }
  }

  if (!access.moduleEnabled || !access.permissionGranted || !access.valid) {
    const title = !access.moduleEnabled
      ? "Module Assistant IA non activé"
      : !access.permissionGranted
        ? "Accès Assistant IA non autorisé"
        : access.status === "expired"
          ? "Abonnement Assistant IA expiré"
          : access.status === "suspended"
            ? "Abonnement Assistant IA suspendu"
            : access.status === "cancelled"
              ? "Abonnement Assistant IA résilié"
              : "Assistant IA Premium";
    return (
      <AppShell title="Assistant IA" subtitle="Option premium indépendante de votre licence ERP">
        <div className="mx-auto max-w-3xl">
          <Card className="rounded-2xl p-8 text-center">
            <div className="mx-auto mb-4 grid size-14 place-items-center rounded-2xl bg-primary/10 text-primary">
              <Crown className="size-7" />
            </div>
            <h2 className="text-xl font-semibold">{title}</h2>
            <p className="mx-auto mt-3 max-w-xl text-sm text-muted-foreground">
              {!access.permissionGranted && access.moduleEnabled
                ? "Votre rôle ne possède pas la permission assistant.use. Contactez un administrateur de votre tenant."
                : "Un abonnement Assistant IA actif ou en période d’essai est requis. Il reste indépendant de votre licence AUREX ERP."}
            </p>
            {access.planName && <Badge className="mt-5">{access.planName}</Badge>}
            {access.expiresAt && (
              <p className="mt-3 text-xs text-muted-foreground">
                Expiration : {new Date(access.expiresAt).toLocaleString("fr-FR")}
              </p>
            )}
          </Card>
        </div>
      </AppShell>
    );
  }

  return (
    <AppShell
      title="Assistant IA"
      subtitle="Analyses sécurisées et actions ERP avec confirmation"
    >
      <div className="mx-auto max-w-5xl space-y-5">
        <Card className="flex flex-wrap items-center justify-between gap-3 rounded-2xl p-4">
          <div>
            <p className="text-sm font-semibold">Plan {access.planName ?? access.planCode}</p>
            <p className="text-xs text-muted-foreground">
              Période : {access.currentPeriodStart ? new Date(access.currentPeriodStart).toLocaleDateString("fr-FR") : "—"}
              {" → "}
              {access.currentPeriodEnd ? new Date(access.currentPeriodEnd).toLocaleDateString("fr-FR") : "—"}
            </p>
          </div>
          <Badge variant={access.quotaExhausted ? "destructive" : "outline"}>
            {access.remainingRequests ?? 0} requête{access.remainingRequests === 1 ? "" : "s"} restante{access.remainingRequests === 1 ? "" : "s"}
          </Badge>
        </Card>

        <div className="grid gap-4 sm:grid-cols-3">
          <Card className="rounded-2xl p-5"><Activity className="mb-3 size-5 text-primary" /><p className="text-2xl font-bold">{portal.requestsUsed.toLocaleString("fr-FR")}</p><p className="text-xs text-muted-foreground">Requêtes utilisées sur {portal.requestLimit?.toLocaleString("fr-FR") ?? "illimité"}</p></Card>
          <Card className="rounded-2xl p-5"><Database className="mb-3 size-5 text-primary" /><p className="text-2xl font-bold">{portal.tokensUsed.toLocaleString("fr-FR")}</p><p className="text-xs text-muted-foreground">Tokens consommés · {formatCurrency(portal.cost)}</p></Card>
          <Card className="rounded-2xl p-5"><Coins className="mb-3 size-5 text-primary" /><p className="text-2xl font-bold">{formatCurrency(portal.creditBalance)}</p><p className="text-xs text-muted-foreground">Crédits IA disponibles</p><Button size="sm" variant="outline" className="mt-3" onClick={() => void buyCredits(25)}>Acheter {formatCurrency(25)}</Button></Card>
        </div>

        <Card className="rounded-2xl p-5">
          <div className="mb-4"><h2 className="font-semibold">Agents inclus dans votre plan {portal.planCode ?? ""}</h2><p className="text-xs text-muted-foreground">Vous pouvez uniquement activer les agents autorisés par votre abonnement.</p></div>
          <div className="grid gap-3 sm:grid-cols-2">
            {portal.agents.map((agent) => <div key={agent.id} className="flex items-center justify-between gap-3 rounded-xl border p-4"><div><p className="font-medium">{agent.name}</p><p className="text-xs text-muted-foreground">{agent.description || `${agent.provider ?? ""} · ${agent.model ?? ""}`}</p></div><Switch checked={agent.enabled} onCheckedChange={(enabled) => void toggleAgent(agent.id, enabled)} /></div>)}
            {!portal.agents.length && <p className="text-sm text-muted-foreground">Aucun agent n’est inclus dans ce plan pour le moment.</p>}
          </div>
        </Card>

        <Card className="overflow-hidden rounded-2xl">
          <div className="flex items-center gap-2 p-5 pb-2"><History className="size-5 text-primary" /><h2 className="font-semibold">Historique récent</h2></div>
          <Table><TableHeader><TableRow><TableHead>Date</TableHead><TableHead>Appel</TableHead><TableHead>Tokens</TableHead><TableHead>Statut</TableHead></TableRow></TableHeader><TableBody>{portal.usage.slice(0, 10).map((row) => <TableRow key={row.id}><TableCell>{new Date(row.createdAt).toLocaleString("fr-FR")}</TableCell><TableCell>{row.toolName ?? row.requestType}</TableCell><TableCell>{row.tokens}</TableCell><TableCell><Badge variant={row.status === "error" ? "destructive" : "outline"}>{row.status}</Badge></TableCell></TableRow>)}</TableBody></Table>
        </Card>

        {access.quotaExhausted && (
          <Alert variant="destructive">
            <TriangleAlert className="h-4 w-4" />
            <AlertTitle>Quota Assistant IA épuisé</AlertTitle>
            <AlertDescription>
              Seul l’Assistant IA est bloqué. Votre ERP reste accessible. Le quota sera réinitialisé
              {access.currentPeriodEnd
                ? ` le ${new Date(access.currentPeriodEnd).toLocaleString("fr-FR")}.`
                : " à la prochaine période."}
            </AlertDescription>
          </Alert>
        )}
        <Alert>
          <ShieldCheck className="h-4 w-4" />
          <AlertTitle>Assistant limité et traçable</AlertTitle>
          <AlertDescription>
            Seuls les outils serveur autorisés peuvent accéder aux données. Chaque opération
            vérifie le tenant, le module et vos permissions. Aucune requête SQL n’est générée.
          </AlertDescription>
        </Alert>

        <Card className="rounded-2xl p-5">
          <div className="mb-4 flex items-center gap-3">
            <div className="grid h-10 w-10 place-items-center rounded-xl bg-primary/10 text-primary">
              <Bot className="h-5 w-5" />
            </div>
            <div>
              <h2 className="font-semibold">Que souhaitez-vous savoir ou préparer ?</h2>
              <p className="text-xs text-muted-foreground">
                Pour une action, donnez tous les champs utiles. Rien ne sera écrit sans votre confirmation.
              </p>
            </div>
          </div>
          <Textarea
            value={message}
            onChange={(event) => setMessage(event.target.value)}
            onKeyDown={(event) => {
              if (event.key === "Enter" && !event.shiftKey) {
                event.preventDefault();
                void submit();
              }
            }}
            placeholder="Ex. Créer un client nommé Awa Diallo, téléphone 06…"
            className="min-h-28"
            disabled={loading || access.quotaExhausted}
          />
          <div className="mt-3 flex flex-wrap items-center justify-between gap-3">
            <div className="flex flex-wrap gap-2">
              {suggestions.map((item) => (
                <button
                  key={item}
                  type="button"
                  onClick={() => void submit(item)}
                  disabled={loading || access.quotaExhausted}
                  className="rounded-full border px-3 py-1.5 text-xs text-muted-foreground transition-colors hover:border-primary hover:text-primary disabled:opacity-50"
                >
                  {item}
                </button>
              ))}
            </div>
            <Button onClick={() => void submit()} disabled={loading || access.quotaExhausted || !message.trim()}>
              {loading ? <Loader2 className="h-4 w-4 animate-spin" /> : <Send className="h-4 w-4" />}
              Envoyer
            </Button>
          </div>
        </Card>

        {error && (
          <Alert variant="destructive">
            <TriangleAlert className="h-4 w-4" />
            <AlertTitle>Erreur</AlertTitle>
            <AlertDescription>{error}</AlertDescription>
          </Alert>
        )}

        {response?.kind === "error" && (
          <Alert variant="destructive">
            <TriangleAlert className="h-4 w-4" />
            <AlertTitle>Informations insuffisantes</AlertTitle>
            <AlertDescription>{response.error}</AlertDescription>
          </Alert>
        )}

        {response?.kind === "confirmation" && (
          <Card className="rounded-2xl border-amber-500/40 p-5">
            <div className="flex items-start gap-3">
              <TriangleAlert className="mt-0.5 h-5 w-5 text-amber-600" />
              <div className="min-w-0 flex-1 space-y-3">
                <div>
                  <h3 className="font-semibold">Confirmation obligatoire</h3>
                  <p className="text-sm text-muted-foreground">
                    Vérifiez précisément les données ci-dessous avant l’écriture.
                  </p>
                </div>
                <Badge variant="outline">{response.pendingAction.action_type}</Badge>
                <pre className="max-h-80 overflow-auto rounded-xl bg-muted p-4 text-xs whitespace-pre-wrap">
                  {JSON.stringify(response.pendingAction.payload, null, 2)}
                </pre>
                <div className="flex gap-2">
                  <Button onClick={() => void decide(true)} disabled={loading}>
                    Confirmer et exécuter
                  </Button>
                  <Button variant="outline" onClick={() => void decide(false)} disabled={loading}>
                    Annuler
                  </Button>
                </div>
              </div>
            </div>
          </Card>
        )}

        {response?.kind === "result" && (
          <Card className="rounded-2xl p-5">
            <div className="mb-3 flex flex-wrap items-center justify-between gap-2">
              <h3 className="font-semibold">Résultat</h3>
              <Badge>{response.tool}</Badge>
            </div>
            {"period" in response && response.period && (
              <p className="mb-3 text-xs text-muted-foreground">
                Période : {response.period.from} → {response.period.to}
              </p>
            )}
            <pre className="max-h-[32rem] overflow-auto rounded-xl bg-muted p-4 text-sm whitespace-pre-wrap">
              {JSON.stringify(response.data, null, 2)}
            </pre>
            <div className="mt-4 flex items-start gap-2 text-xs text-muted-foreground">
              <Database className="mt-0.5 h-3.5 w-3.5 shrink-0" />
              <span>Données utilisées : {response.sources.join(", ")}</span>
            </div>
          </Card>
        )}
      </div>
    </AppShell>
  );
}

export const Route = createFileRoute("/app/assistant-ia")({
  beforeLoad: async () => {
    const [access, portal] = await Promise.all([getAssistantAccessState(), getTenantAiPortal()]);
    return { assistantAccess: { access, portal } };
  },
  loader: ({ context }) => context.assistantAccess,
  component: AssistantPage,
  head: () => ({
    meta: [
      { title: "Assistant IA — AUREX ERP" },
      { name: "description", content: "Assistant IA sécurisé et activable d’AUREX ERP." },
    ],
  }),
});
