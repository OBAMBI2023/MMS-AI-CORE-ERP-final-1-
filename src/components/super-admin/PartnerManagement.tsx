import { useEffect, useState } from "react";
import { useRouter } from "@tanstack/react-router";
import { ArrowLeft, Building2, CalendarPlus, KeyRound, MoreHorizontal, Pencil, Plus, ShieldBan } from "lucide-react";
import { toast } from "sonner";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Checkbox } from "@/components/ui/checkbox";
import {
  Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle,
} from "@/components/ui/dialog";
import {
  DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from "@/components/ui/select";
import {
  Table, TableBody, TableCell, TableHead, TableHeader, TableRow,
} from "@/components/ui/table";
import {
  createPartner,
  assignPartnerOffer,
  resetPartnerPassword,
  setPartnerTenants,
  updatePartner,
  type ManagedPartner,
  type PartnerManagementData,
} from "@/lib/partners.server";
import { PLATFORM_BRANDING } from "@/config/branding";

type EditorMode = "create" | "edit" | "tenants" | "password" | "offer";

function dateInputValue(date: Date) {
  const offset = date.getTimezoneOffset() * 60_000;
  return new Date(date.getTime() - offset).toISOString().slice(0, 10);
}

export function PartnerManagementView({ data }: { data: PartnerManagementData }) {
  const router = useRouter();
  const [mode, setMode] = useState<EditorMode | null>(null);
  const [partner, setPartner] = useState<ManagedPartner | null>(null);
  const [name, setName] = useState("");
  const [code, setCode] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [tenantIds, setTenantIds] = useState<string[]>([]);
  const [offerId, setOfferId] = useState("");
  const [startsAt, setStartsAt] = useState(dateInputValue(new Date()));
  const [expiresAt, setExpiresAt] = useState("");
  const [replaceActive, setReplaceActive] = useState(false);
  const [submitting, setSubmitting] = useState(false);

  useEffect(() => {
    if (!mode) setPassword("");
  }, [mode]);

  const open = (nextMode: EditorMode, selected?: ManagedPartner) => {
    const current = selected ?? null;
    setPartner(current);
    setName(current?.name ?? "");
    setCode(current?.code ?? "");
    setEmail(current?.email ?? "");
    setTenantIds(current?.tenantIds ?? []);
    setPassword("");
    if (nextMode === "offer") {
      const firstOffer = data.offers[0];
      const start = new Date();
      setOfferId(firstOffer?.id ?? "");
      setStartsAt(dateInputValue(start));
      setExpiresAt(firstOffer ? dateInputValue(new Date(start.getTime() + firstOffer.durationDays * 86_400_000)) : "");
      setReplaceActive(false);
    }
    setMode(nextMode);
  };

  const activeSubscription = partner
    ? data.subscriptions.find((subscription) =>
        subscription.partnerId === partner.id &&
        subscription.status === "active" &&
        new Date(subscription.expiresAt).getTime() > Date.now())
    : undefined;
  const selectedOffer = data.offers.find((offer) => offer.id === offerId);

  const selectOffer = (value: string) => {
    setOfferId(value);
    const offer = data.offers.find((item) => item.id === value);
    if (!offer || !startsAt) return;
    const start = new Date(`${startsAt}T00:00:00`);
    setExpiresAt(dateInputValue(new Date(start.getTime() + offer.durationDays * 86_400_000)));
  };

  const changeStart = (value: string) => {
    setStartsAt(value);
    if (!selectedOffer || !value) return;
    const start = new Date(`${value}T00:00:00`);
    setExpiresAt(dateInputValue(new Date(start.getTime() + selectedOffer.durationDays * 86_400_000)));
  };

  const refresh = async (message: string) => {
    toast.success(message);
    setMode(null);
    await router.invalidate();
  };

  const submitIdentity = async () => {
    setSubmitting(true);
    try {
      if (mode === "create") {
        await createPartner({ data: { name, code, email, password, tenantIds } });
        await refresh("Compte partenaire créé.");
      } else if (partner) {
        await updatePartner({
          data: {
            partnerId: partner.id,
            userId: partner.userId,
            name,
            code,
            email,
            isActive: partner.isActive,
          },
        });
        await refresh("Partenaire modifié.");
      }
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Opération impossible.");
    } finally {
      setSubmitting(false);
    }
  };

  const toggleStatus = async (selected: ManagedPartner) => {
    try {
      await updatePartner({
        data: {
          partnerId: selected.id,
          userId: selected.userId,
          name: selected.name,
          code: selected.code,
          email: selected.email,
          isActive: !selected.isActive,
        },
      });
      await refresh(selected.isActive ? "Partenaire suspendu immédiatement." : "Partenaire activé.");
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Opération impossible.");
    }
  };

  const submitTenants = async () => {
    if (!partner) return;
    setSubmitting(true);
    try {
      await setPartnerTenants({ data: { partnerId: partner.id, tenantIds } });
      await refresh("Attributions mises à jour.");
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Attribution impossible.");
    } finally {
      setSubmitting(false);
    }
  };

  const submitPassword = async () => {
    if (!partner) return;
    setSubmitting(true);
    try {
      await resetPartnerPassword({
        data: { partnerId: partner.id, userId: partner.userId, password },
      });
      await refresh("Mot de passe réinitialisé.");
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Réinitialisation impossible.");
    } finally {
      setSubmitting(false);
    }
  };

  const submitOffer = async () => {
    if (!partner || !offerId || !startsAt || !expiresAt) return;
    setSubmitting(true);
    try {
      await assignPartnerOffer({
        data: {
          partnerId: partner.id,
          offerId,
          startsAt: new Date(`${startsAt}T00:00:00`).toISOString(),
          expiresAt: new Date(`${expiresAt}T00:00:00`).toISOString(),
          replaceActive,
        },
      });
      await refresh(activeSubscription ? "Offre remplacée et abonnement activé." : "Offre attribuée avec succès.");
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Attribution impossible.");
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <main className="min-h-screen bg-muted/30 p-4 sm:p-6 xl:p-8">
      <div className="mx-auto max-w-7xl space-y-6">
        <div className="flex flex-col justify-between gap-4 sm:flex-row sm:items-center">
          <div>
            <Button variant="ghost" className="-ml-3 mb-2" asChild>
              <a href="/super-admin"><ArrowLeft /> Super Admin</a>
            </Button>
            <h1 className="text-2xl font-bold tracking-tight">Comptes Partenaires</h1>
            <p className="mt-1 text-sm text-muted-foreground">
              Gérez les accès plateforme et les portefeuilles de tenants {PLATFORM_BRANDING.shortName}.
            </p>
          </div>
          <Button onClick={() => open("create")}><Plus /> Nouveau partenaire</Button>
        </div>

        <Card className="overflow-hidden rounded-xl">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Partenaire</TableHead>
                <TableHead>Compte Auth</TableHead>
                <TableHead>Statut</TableHead>
                <TableHead>Tenants attribués</TableHead>
                <TableHead>Abonnement</TableHead>
                <TableHead className="w-56">Actions</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {data.partners.map((item) => (
                <TableRow key={item.id}>
                  <TableCell>
                    <p className="font-medium">{item.name}</p>
                    <p className="font-mono text-xs text-muted-foreground">{item.code}</p>
                  </TableCell>
                  <TableCell>{item.email}</TableCell>
                  <TableCell>
                    <Badge variant={item.isActive ? "default" : "secondary"}>
                      {item.isActive ? "Actif" : "Suspendu"}
                    </Badge>
                  </TableCell>
                  <TableCell>
                    <button className="flex items-center gap-2 text-left hover:underline" onClick={() => open("tenants", item)}>
                      <Building2 className="size-4" />
                      {item.tenantIds.length} tenant{item.tenantIds.length > 1 ? "s" : ""}
                    </button>
                  </TableCell>
                  <TableCell>
                    {(() => {
                      const subscription = data.subscriptions.find((row) =>
                        row.partnerId === item.id &&
                        row.status === "active" &&
                        new Date(row.expiresAt).getTime() > Date.now());
                      const offer = subscription
                        ? data.offers.find((row) => row.id === subscription.offerId)
                        : undefined;
                      return subscription ? (
                        <div>
                          <Badge variant="outline">{offer?.name ?? "Offre active"}</Badge>
                          <p className="mt-1 text-xs text-muted-foreground">Jusqu’au {new Date(subscription.expiresAt).toLocaleDateString("fr-FR")}</p>
                        </div>
                      ) : <span className="text-sm text-muted-foreground">Aucun</span>;
                    })()}
                  </TableCell>
                  <TableCell>
                    <div className="flex items-center justify-end gap-1">
                      <Button size="sm" variant="outline" onClick={() => open("offer", item)}>
                        <CalendarPlus /> Attribuer une offre
                      </Button>
                    <DropdownMenu>
                      <DropdownMenuTrigger asChild>
                        <Button variant="ghost" size="icon"><MoreHorizontal /></Button>
                      </DropdownMenuTrigger>
                      <DropdownMenuContent align="end">
                        <DropdownMenuItem onClick={() => open("edit", item)}><Pencil /> Modifier</DropdownMenuItem>
                        <DropdownMenuItem onClick={() => open("tenants", item)}><Building2 /> Attribuer des tenants</DropdownMenuItem>
                        <DropdownMenuItem onClick={() => open("password", item)}><KeyRound /> Réinitialiser le mot de passe</DropdownMenuItem>
                        <DropdownMenuItem onClick={() => void toggleStatus(item)}>
                          <ShieldBan /> {item.isActive ? "Suspendre" : "Activer"}
                        </DropdownMenuItem>
                      </DropdownMenuContent>
                    </DropdownMenu>
                    </div>
                  </TableCell>
                </TableRow>
              ))}
              {!data.partners.length && (
                <TableRow><TableCell colSpan={6} className="h-32 text-center text-muted-foreground">Aucun partenaire.</TableCell></TableRow>
              )}
            </TableBody>
          </Table>
        </Card>
      </div>

      <Dialog open={mode === "create" || mode === "edit"} onOpenChange={(value) => !value && setMode(null)}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>{mode === "create" ? "Créer un partenaire" : "Modifier le partenaire"}</DialogTitle>
            <DialogDescription>Le compte Auth est géré exclusivement côté serveur.</DialogDescription>
          </DialogHeader>
          <div className="space-y-4">
            <div className="space-y-2"><Label>Nom</Label><Input value={name} onChange={(event) => setName(event.target.value)} /></div>
            <div className="space-y-2"><Label>Code</Label><Input value={code} onChange={(event) => setCode(event.target.value.toLowerCase())} /></div>
            <div className="space-y-2"><Label>E-mail</Label><Input type="email" value={email} onChange={(event) => setEmail(event.target.value)} /></div>
            {mode === "create" && (
              <div className="space-y-2"><Label>Mot de passe initial</Label><Input type="password" value={password} onChange={(event) => setPassword(event.target.value)} /><p className="text-xs text-muted-foreground">12 caractères minimum.</p></div>
            )}
          </div>
          <DialogFooter><Button disabled={submitting || !name || !code || !email || (mode === "create" && password.length < 12)} onClick={() => void submitIdentity()}>{submitting ? "Enregistrement…" : "Enregistrer"}</Button></DialogFooter>
        </DialogContent>
      </Dialog>

      <Dialog open={mode === "tenants"} onOpenChange={(value) => !value && setMode(null)}>
        <DialogContent className="sm:max-w-xl">
          <DialogHeader><DialogTitle>Tenants de {partner?.name}</DialogTitle><DialogDescription>Seuls les tenants cochés seront visibles dans l’espace partenaire.</DialogDescription></DialogHeader>
          <div className="max-h-[55vh] space-y-2 overflow-y-auto">
            {data.tenants.map((tenant) => (
              <label key={tenant.id} className="flex cursor-pointer items-center gap-3 rounded-lg border p-3 hover:bg-muted">
                <Checkbox checked={tenantIds.includes(tenant.id)} onCheckedChange={(checked) => setTenantIds((current) => checked ? [...current, tenant.id] : current.filter((id) => id !== tenant.id))} />
                <span><span className="block text-sm font-medium">{tenant.name}</span><span className="block text-xs text-muted-foreground">/{tenant.slug}</span></span>
              </label>
            ))}
          </div>
          <DialogFooter><Button disabled={submitting} onClick={() => void submitTenants()}>{submitting ? "Enregistrement…" : "Enregistrer les attributions"}</Button></DialogFooter>
        </DialogContent>
      </Dialog>

      <Dialog open={mode === "password"} onOpenChange={(value) => !value && setMode(null)}>
        <DialogContent>
          <DialogHeader><DialogTitle>Réinitialiser le mot de passe</DialogTitle><DialogDescription>Définissez un mot de passe temporaire sécurisé pour {partner?.name}.</DialogDescription></DialogHeader>
          <div className="space-y-2"><Label>Nouveau mot de passe</Label><Input type="password" value={password} onChange={(event) => setPassword(event.target.value)} /><p className="text-xs text-muted-foreground">12 caractères minimum.</p></div>
          <DialogFooter><Button disabled={submitting || password.length < 12} onClick={() => void submitPassword()}>{submitting ? "Réinitialisation…" : "Réinitialiser"}</Button></DialogFooter>
        </DialogContent>
      </Dialog>

      <Dialog open={mode === "offer"} onOpenChange={(value) => !value && setMode(null)}>
        <DialogContent className="w-[calc(100%-2rem)] sm:max-w-lg">
          <DialogHeader>
            <DialogTitle>Attribuer une offre</DialogTitle>
            <DialogDescription>
              Crée un abonnement actif pour {partner?.name}. Les crédits et quotas proviennent de l’offre.
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4">
            <div className="space-y-2">
              <Label>Partenaire</Label>
              <Input value={partner?.name ?? ""} disabled />
            </div>
            <div className="space-y-2">
              <Label>Offre active</Label>
              <Select value={offerId} onValueChange={selectOffer}>
                <SelectTrigger><SelectValue placeholder="Sélectionner une offre" /></SelectTrigger>
                <SelectContent>
                  {data.offers.map((offer) => <SelectItem key={offer.id} value={offer.id}>{offer.name}</SelectItem>)}
                </SelectContent>
              </Select>
              {!data.offers.length && <p className="text-xs text-destructive">Aucune offre active disponible.</p>}
            </div>
            <div className="grid gap-4 sm:grid-cols-2">
              <div className="space-y-2"><Label>Date de début</Label><Input type="date" value={startsAt} onChange={(event) => changeStart(event.target.value)} /></div>
              <div className="space-y-2"><Label>Date de fin</Label><Input type="date" value={expiresAt} disabled /></div>
            </div>
            {selectedOffer && (
              <div className="rounded-lg border bg-muted/40 p-3 text-sm">
                <p className="font-medium">Résumé</p>
                <p className="mt-1 text-muted-foreground">
                  {selectedOffer.durationDays} jours · {selectedOffer.includedTenantCredits} crédits · {selectedOffer.maxTrials} essais de {selectedOffer.trialDays} jours
                </p>
              </div>
            )}
            {activeSubscription && (
              <label className="flex cursor-pointer items-start gap-3 rounded-lg border border-amber-300 bg-amber-50 p-3 text-sm dark:bg-amber-950/30">
                <Checkbox checked={replaceActive} onCheckedChange={(checked) => setReplaceActive(checked === true)} />
                <span>
                  <span className="block font-medium">Remplacer l’abonnement actif</span>
                  <span className="text-muted-foreground">L’ancien sera clôturé et conservé dans l’historique.</span>
                </span>
              </label>
            )}
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setMode(null)}>Annuler</Button>
            <Button
              disabled={submitting || !offerId || !startsAt || !expiresAt || expiresAt <= startsAt || Boolean(activeSubscription && !replaceActive)}
              onClick={() => void submitOffer()}
            >
              {submitting ? "Attribution…" : activeSubscription ? "Remplacer et attribuer" : "Attribuer"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </main>
  );
}
