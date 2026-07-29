import { useMemo, useState, type ReactNode } from "react";
import { useRouter } from "@tanstack/react-router";
import { Activity, ArrowLeft, Bot, BrainCircuit, Coins, Gauge, History, Pencil, Plus, Settings, Trash2, TriangleAlert } from "lucide-react";
import { toast } from "sonner";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Checkbox } from "@/components/ui/checkbox";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Switch } from "@/components/ui/switch";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Textarea } from "@/components/ui/textarea";
import { PLATFORM_BRANDING } from "@/config/branding";
import {
  deleteAiAgent, saveAiAgent, saveAiModel, saveAiQuota, saveAiSettings, setAiAgentStatus,
  type AiAgent, type AiModel, type AiPlatformData, type AiProvider,
} from "@/lib/ai-platform.server";
import { formatCurrency, getCurrency } from "@/lib/mms/format";

const providerNames: Record<AiProvider, string> = { openai: "OpenAI", anthropic: "Anthropic", google: "Google Gemini", mistral: "Mistral", ollama: "Ollama" };
const tabItems = [
  ["dashboard", "Dashboard IA", Gauge], ["agents", "Agents IA", Bot], ["models", "Modèles IA", BrainCircuit],
  ["plans", "Plans IA", Coins], ["quotas", "Quotas", Gauge], ["usage", "Utilisation", Activity],
  ["logs", "Historique / Logs", History], ["settings", "Paramètres IA", Settings],
] as const;

const blankAgent = (): Omit<AiAgent, "id"> => ({ name: "", code: "", description: "", modelId: null, systemPrompt: "", temperature: 0.2, isActive: true, moduleIds: [], planCodes: [] });

export function AiPlatformView({ data }: { data: AiPlatformData }) {
  const router = useRouter();
  const [agent, setAgent] = useState<(Omit<AiAgent, "id"> & { id?: string }) | null>(null);
  const [model, setModel] = useState<(Omit<AiModel, "id"> & { id?: string }) | null>(null);
  const [busy, setBusy] = useState(false);
  const errorRate = data.stats.requests ? (data.stats.errors / data.stats.requests) * 100 : 0;
  const refresh = async (message: string) => { toast.success(message); setAgent(null); setModel(null); await router.invalidate(); };
  const run = async (action: () => Promise<unknown>, message: string) => {
    setBusy(true);
    try { await action(); await refresh(message); }
    catch (error) { toast.error(error instanceof Error ? error.message : "Opération impossible."); }
    finally { setBusy(false); }
  };
  const usageByTenant = useMemo(() => {
    const values = new Map<string, { name: string; requests: number; tokens: number; cost: number }>();
    data.usage.forEach((row) => {
      const current = values.get(row.tenantId) ?? { name: row.tenantName, requests: 0, tokens: 0, cost: 0 };
      current.requests += 1; current.tokens += row.tokens; current.cost += row.cost; values.set(row.tenantId, current);
    });
    return [...values.entries()];
  }, [data.usage]);

  return (
    <main className="min-h-screen bg-[radial-gradient(circle_at_top_right,hsl(var(--primary)/.12),transparent_32%),hsl(var(--muted)/.3)] p-4 sm:p-6 xl:p-8">
      <div className="mx-auto max-w-[1500px] space-y-6">
        <header className="flex flex-col justify-between gap-4 sm:flex-row sm:items-center">
          <div>
            <Button variant="ghost" className="-ml-3 mb-2" asChild><a href="/super-admin"><ArrowLeft /> Super Admin</a></Button>
            <div className="flex items-center gap-3"><div className="grid size-12 place-items-center rounded-2xl bg-primary text-primary-foreground shadow-lg shadow-primary/25"><BrainCircuit /></div><div><h1 className="text-3xl font-bold tracking-tight">{PLATFORM_BRANDING.products.ai}</h1><p className="text-sm text-muted-foreground">Centre de contrôle des agents {PLATFORM_BRANDING.products.ai}</p></div></div>
          </div>
          <Button onClick={() => setAgent(blankAgent())}><Plus /> Nouvel agent</Button>
        </header>

        <Tabs defaultValue="dashboard" className="gap-5">
          <TabsList className="h-auto w-full justify-start gap-1 overflow-x-auto rounded-xl bg-background/80 p-1.5 shadow-sm">
            {tabItems.map(([value, label, Icon]) => <TabsTrigger key={value} value={value} className="gap-2 whitespace-nowrap"><Icon className="size-4" />{label}</TabsTrigger>)}
          </TabsList>

          <TabsContent value="dashboard" className="space-y-5">
            <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-5">
              {[
                ["Agents actifs", data.stats.activeAgents, Bot], ["Requêtes", data.stats.requests.toLocaleString("fr-FR"), Activity],
                ["Tokens", data.stats.tokens.toLocaleString("fr-FR"), BrainCircuit], ["Coût estimé", formatCurrency(data.stats.cost), Coins],
                ["Taux d’erreur", `${errorRate.toFixed(1)} %`, TriangleAlert],
              ].map(([label, value, Icon]: any) => <Card key={label} className="rounded-2xl p-5"><div className="mb-4 grid size-10 place-items-center rounded-xl bg-primary/10 text-primary"><Icon className="size-5" /></div><p className="text-2xl font-bold">{value}</p><p className="text-sm text-muted-foreground">{label}</p></Card>)}
            </div>
            <Card className="rounded-2xl p-6"><h2 className="font-semibold">État de la plateforme</h2><div className="mt-5 grid gap-4 md:grid-cols-3">{data.models.slice(0, 3).map((item) => <div key={item.id} className="rounded-xl border p-4"><Badge variant="outline">{providerNames[item.provider]}</Badge><p className="mt-3 font-medium">{item.name}</p><p className="text-xs text-muted-foreground">{item.modelKey}</p></div>)}</div></Card>
          </TabsContent>

          <TabsContent value="agents"><Card className="overflow-hidden rounded-2xl"><Table><TableHeader><TableRow><TableHead>Agent</TableHead><TableHead>Modèle</TableHead><TableHead>Modules ERP</TableHead><TableHead>Plans</TableHead><TableHead>Statut</TableHead><TableHead /></TableRow></TableHeader><TableBody>
            {data.agents.map((item) => <TableRow key={item.id}><TableCell><p className="font-medium">{item.name}</p><p className="font-mono text-xs text-muted-foreground">{item.code}</p></TableCell><TableCell>{data.models.find((m) => m.id === item.modelId)?.name ?? "Non défini"}</TableCell><TableCell>{item.moduleIds.length}</TableCell><TableCell className="space-x-1">{item.planCodes.map((code) => <Badge key={code} variant="secondary">{code}</Badge>)}</TableCell><TableCell><Switch checked={item.isActive} onCheckedChange={(checked) => void run(() => setAiAgentStatus({ data: { id: item.id, isActive: checked } }), checked ? "Agent activé." : "Agent désactivé.")} /></TableCell><TableCell><div className="flex justify-end gap-1"><Button size="icon" variant="ghost" onClick={() => setAgent(item)}><Pencil /></Button><Button size="icon" variant="ghost" className="text-destructive" onClick={() => confirm(`Supprimer l’agent « ${item.name} » ?`) && void run(() => deleteAiAgent({ data: { id: item.id } }), "Agent supprimé.")}><Trash2 /></Button></div></TableCell></TableRow>)}
            {!data.agents.length && <TableRow><TableCell colSpan={6} className="h-36 text-center text-muted-foreground">Aucun agent configuré.</TableCell></TableRow>}
          </TableBody></Table></Card></TabsContent>

          <TabsContent value="models" className="space-y-4"><div className="flex justify-end"><Button variant="outline" onClick={() => setModel({ provider: "openai", name: "", modelKey: "", inputCost: 0, outputCost: 0, contextWindow: null, isActive: true })}><Plus /> Ajouter un modèle</Button></div><div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">{data.models.map((item) => <Card key={item.id} className="rounded-2xl p-5"><div className="flex justify-between"><Badge>{providerNames[item.provider]}</Badge><Button variant="ghost" size="icon" onClick={() => setModel(item)}><Pencil /></Button></div><h3 className="mt-4 font-semibold">{item.name}</h3><p className="font-mono text-xs text-muted-foreground">{item.modelKey}</p><div className="mt-4 grid grid-cols-2 gap-2 text-xs"><span>Entrée: {formatCurrency(item.inputCost)}/M</span><span>Sortie: {formatCurrency(item.outputCost)}/M</span></div></Card>)}</div></TabsContent>

          <TabsContent value="plans"><div className="grid gap-4 md:grid-cols-3">{data.plans.map((plan) => <Card key={plan.code} className="rounded-2xl p-6"><Badge variant={plan.enabled ? "default" : "secondary"}>{plan.enabled ? "Disponible" : "Masqué"}</Badge><h3 className="mt-5 text-xl font-bold">{plan.name}</h3><p className="mt-2 text-3xl font-bold">{plan.price === null ? "Sur devis" : formatCurrency(plan.price)}<span className="text-sm font-normal text-muted-foreground"> / mois</span></p><p className="mt-5 text-sm text-muted-foreground">{data.agents.filter((a) => a.planCodes.includes(plan.code)).length} agents inclus</p></Card>)}</div></TabsContent>

          <TabsContent value="quotas"><div className="grid gap-4 md:grid-cols-3">{data.quotas.map((quota) => <QuotaCard key={quota.planCode} quota={quota} name={data.plans.find((p) => p.code === quota.planCode)?.name ?? quota.planCode} onSave={(next) => run(() => saveAiQuota({ data: next }), "Quota enregistré.")} />)}</div></TabsContent>

          <TabsContent value="usage"><Card className="overflow-hidden rounded-2xl"><Table><TableHeader><TableRow><TableHead>Tenant</TableHead><TableHead>Requêtes</TableHead><TableHead>Tokens</TableHead><TableHead>Coût estimé</TableHead></TableRow></TableHeader><TableBody>{usageByTenant.map(([id, row]) => <TableRow key={id}><TableCell className="font-medium">{row.name}</TableCell><TableCell>{row.requests}</TableCell><TableCell>{row.tokens.toLocaleString("fr-FR")}</TableCell><TableCell>{formatCurrency(row.cost)}</TableCell></TableRow>)}</TableBody></Table></Card></TabsContent>

          <TabsContent value="logs"><Card className="overflow-hidden rounded-2xl"><Table><TableHeader><TableRow><TableHead>Date</TableHead><TableHead>Tenant</TableHead><TableHead>Appel</TableHead><TableHead>Tokens</TableHead><TableHead>Coût</TableHead><TableHead>Statut</TableHead></TableRow></TableHeader><TableBody>{data.usage.slice(0, 250).map((row) => <TableRow key={row.id}><TableCell>{new Date(row.createdAt).toLocaleString("fr-FR")}</TableCell><TableCell>{row.tenantName}</TableCell><TableCell>{row.toolName ?? row.requestType}</TableCell><TableCell>{row.tokens}</TableCell><TableCell>{formatCurrency(row.cost)}</TableCell><TableCell><Badge variant={row.status === "error" ? "destructive" : "outline"}>{row.status}</Badge></TableCell></TableRow>)}</TableBody></Table></Card></TabsContent>

          <TabsContent value="settings"><SettingsForm data={data} onSave={(next) => run(() => saveAiSettings({ data: next }), "Paramètres enregistrés.")} /></TabsContent>
        </Tabs>
      </div>

      <AgentDialog agent={agent} data={data} busy={busy} onClose={() => setAgent(null)} onSave={(value) => run(() => saveAiAgent({ data: value }), value.id ? "Agent modifié." : "Agent créé.")} />
      <ModelDialog model={model} busy={busy} onClose={() => setModel(null)} onSave={(value) => run(() => saveAiModel({ data: value }), "Modèle enregistré.")} />
    </main>
  );
}

function AgentDialog({ agent, data, busy, onClose, onSave }: { agent: (Omit<AiAgent, "id"> & { id?: string }) | null; data: AiPlatformData; busy: boolean; onClose: () => void; onSave: (agent: any) => void }) {
  const [draft, setDraft] = useState(agent);
  if (!agent || !draft) return null;
  const toggle = (field: "moduleIds" | "planCodes", value: string, checked: boolean) => setDraft({ ...draft, [field]: checked ? [...draft[field], value] : draft[field].filter((item) => item !== value) });
  return <Dialog open onOpenChange={(open) => !open && onClose()}><DialogContent className="max-h-[92vh] overflow-y-auto sm:max-w-2xl"><DialogHeader><DialogTitle>{draft.id ? "Modifier l’agent" : "Nouvel agent IA"}</DialogTitle><DialogDescription>Définissez son modèle, ses modules ERP et les plans qui y ont accès.</DialogDescription></DialogHeader><div className="grid gap-4 sm:grid-cols-2"><Field label="Nom"><Input value={draft.name} onChange={(e) => setDraft({ ...draft, name: e.target.value })} /></Field><Field label="Code"><Input value={draft.code} onChange={(e) => setDraft({ ...draft, code: e.target.value.toLowerCase().replace(/[^a-z0-9_]/g, "_") })} /></Field><Field label="Modèle"><Select value={draft.modelId ?? "none"} onValueChange={(value) => setDraft({ ...draft, modelId: value === "none" ? null : value })}><SelectTrigger><SelectValue /></SelectTrigger><SelectContent><SelectItem value="none">Non défini</SelectItem>{data.models.map((item) => <SelectItem key={item.id} value={item.id}>{providerNames[item.provider]} · {item.name}</SelectItem>)}</SelectContent></Select></Field><Field label="Température"><Input type="number" min="0" max="2" step=".1" value={draft.temperature} onChange={(e) => setDraft({ ...draft, temperature: Number(e.target.value) })} /></Field><div className="sm:col-span-2"><Field label="Description"><Textarea value={draft.description} onChange={(e) => setDraft({ ...draft, description: e.target.value })} /></Field></div><div className="sm:col-span-2"><Field label="Prompt système"><Textarea className="min-h-28" value={draft.systemPrompt} onChange={(e) => setDraft({ ...draft, systemPrompt: e.target.value })} /></Field></div><ChoiceGrid label="Modules ERP">{data.modules.map((item) => <Check key={item.id} label={item.name} checked={draft.moduleIds.includes(item.id)} onChange={(checked) => toggle("moduleIds", item.id, checked)} />)}</ChoiceGrid><ChoiceGrid label="Plans IA">{data.plans.map((item) => <Check key={item.code} label={item.name} checked={draft.planCodes.includes(item.code)} onChange={(checked) => toggle("planCodes", item.code, checked)} />)}</ChoiceGrid></div><DialogFooter><Button variant="outline" onClick={onClose}>Annuler</Button><Button disabled={busy || !draft.name || !draft.code} onClick={() => onSave(draft)}>Enregistrer</Button></DialogFooter></DialogContent></Dialog>;
}

function ModelDialog({ model, busy, onClose, onSave }: { model: (Omit<AiModel, "id"> & { id?: string }) | null; busy: boolean; onClose: () => void; onSave: (model: any) => void }) {
  const [draft, setDraft] = useState(model); if (!model || !draft) return null;
  return <Dialog open onOpenChange={(open) => !open && onClose()}><DialogContent><DialogHeader><DialogTitle>Modèle IA</DialogTitle><DialogDescription>Configuration fournisseur et tarification par million de tokens.</DialogDescription></DialogHeader><div className="grid gap-4 sm:grid-cols-2"><Field label="Fournisseur"><Select value={draft.provider} onValueChange={(provider: AiProvider) => setDraft({ ...draft, provider })}><SelectTrigger><SelectValue /></SelectTrigger><SelectContent>{Object.entries(providerNames).map(([key, name]) => <SelectItem key={key} value={key}>{name}</SelectItem>)}</SelectContent></Select></Field><Field label="Nom"><Input value={draft.name} onChange={(e) => setDraft({ ...draft, name: e.target.value })} /></Field><Field label="Clé modèle"><Input value={draft.modelKey} onChange={(e) => setDraft({ ...draft, modelKey: e.target.value })} /></Field><Field label="Fenêtre de contexte"><Input type="number" value={draft.contextWindow ?? ""} onChange={(e) => setDraft({ ...draft, contextWindow: e.target.value ? Number(e.target.value) : null })} /></Field><Field label="Coût entrée / M"><Input type="number" step=".001" value={draft.inputCost} onChange={(e) => setDraft({ ...draft, inputCost: Number(e.target.value) })} /></Field><Field label="Coût sortie / M"><Input type="number" step=".001" value={draft.outputCost} onChange={(e) => setDraft({ ...draft, outputCost: Number(e.target.value) })} /></Field></div><DialogFooter><Button variant="outline" onClick={onClose}>Annuler</Button><Button disabled={busy || !draft.name || !draft.modelKey} onClick={() => onSave(draft)}>Enregistrer</Button></DialogFooter></DialogContent></Dialog>;
}

function QuotaCard({ quota, name, onSave }: { quota: AiPlatformData["quotas"][number]; name: string; onSave: (quota: any) => void }) {
  const [draft, setDraft] = useState(quota); return <Card className="space-y-4 rounded-2xl p-5"><h3 className="text-lg font-semibold">{name}</h3><Field label="Requêtes / mois"><Input type="number" value={draft.monthlyRequests} onChange={(e) => setDraft({ ...draft, monthlyRequests: Number(e.target.value) })} /></Field><Field label="Tokens / mois"><Input type="number" value={draft.monthlyTokens} onChange={(e) => setDraft({ ...draft, monthlyTokens: Number(e.target.value) })} /></Field><Field label={`Crédits inclus (${getCurrency()})`}><Input type="number" value={draft.includedCredits} onChange={(e) => setDraft({ ...draft, includedCredits: Number(e.target.value) })} /></Field><Field label="Agents maximum"><Input type="number" placeholder="Illimité" value={draft.maxAgents ?? ""} onChange={(e) => setDraft({ ...draft, maxAgents: e.target.value ? Number(e.target.value) : null })} /></Field><Button className="w-full" onClick={() => onSave(draft)}>Enregistrer</Button></Card>;
}

function SettingsForm({ data, onSave }: { data: AiPlatformData; onSave: (settings: AiPlatformData["settings"]) => void }) {
  const [draft, setDraft] = useState(data.settings); return <Card className="max-w-2xl space-y-5 rounded-2xl p-6"><div><h2 className="text-lg font-semibold">Paramètres globaux</h2><p className="text-sm text-muted-foreground">Ces réglages n’altèrent aucune logique métier ERP.</p></div><Field label="Modèle par défaut"><Select value={draft.defaultModelId ?? "none"} onValueChange={(value) => setDraft({ ...draft, defaultModelId: value === "none" ? null : value })}><SelectTrigger><SelectValue /></SelectTrigger><SelectContent><SelectItem value="none">Aucun</SelectItem>{data.models.map((item) => <SelectItem key={item.id} value={item.id}>{item.name}</SelectItem>)}</SelectContent></Select></Field><div className="flex items-center justify-between rounded-xl border p-4"><div><Label>Journalisation des appels</Label><p className="text-xs text-muted-foreground">Conserver les métriques et erreurs IA.</p></div><Switch checked={draft.loggingEnabled} onCheckedChange={(value) => setDraft({ ...draft, loggingEnabled: value })} /></div><Field label="Rétention des logs (jours)"><Input type="number" value={draft.retentionDays} onChange={(e) => setDraft({ ...draft, retentionDays: Number(e.target.value) })} /></Field><Field label={`Budget mensuel (${getCurrency()})`}><Input type="number" placeholder="Non limité" value={draft.monthlyBudget ?? ""} onChange={(e) => setDraft({ ...draft, monthlyBudget: e.target.value ? Number(e.target.value) : null })} /></Field><Button onClick={() => onSave(draft)}>Enregistrer les paramètres</Button></Card>;
}

function Field({ label, children }: { label: string; children: ReactNode }) { return <div className="space-y-2"><Label>{label}</Label>{children}</div>; }
function ChoiceGrid({ label, children }: { label: string; children: ReactNode }) { return <div><Label>{label}</Label><div className="mt-2 grid max-h-36 gap-2 overflow-y-auto rounded-xl border p-3">{children}</div></div>; }
function Check({ label, checked, onChange }: { label: string; checked: boolean; onChange: (checked: boolean) => void }) { return <label className="flex cursor-pointer items-center gap-2 text-sm"><Checkbox checked={checked} onCheckedChange={(value) => onChange(value === true)} />{label}</label>; }
