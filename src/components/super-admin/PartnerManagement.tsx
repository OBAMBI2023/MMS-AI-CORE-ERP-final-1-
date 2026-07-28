import { useEffect, useState } from "react";
import { useRouter } from "@tanstack/react-router";
import { ArrowLeft, Building2, KeyRound, MoreHorizontal, Pencil, Plus, ShieldBan } from "lucide-react";
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
  Table, TableBody, TableCell, TableHead, TableHeader, TableRow,
} from "@/components/ui/table";
import {
  createPartner,
  resetPartnerPassword,
  setPartnerTenants,
  updatePartner,
  type ManagedPartner,
  type PartnerManagementData,
} from "@/lib/partners.server";

type EditorMode = "create" | "edit" | "tenants" | "password";

export function PartnerManagementView({ data }: { data: PartnerManagementData }) {
  const router = useRouter();
  const [mode, setMode] = useState<EditorMode | null>(null);
  const [partner, setPartner] = useState<ManagedPartner | null>(null);
  const [name, setName] = useState("");
  const [code, setCode] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [tenantIds, setTenantIds] = useState<string[]>([]);
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
    setMode(nextMode);
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
              Gérez les accès plateforme et les portefeuilles de tenants AUREX.
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
                <TableHead className="w-12">Actions</TableHead>
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
                  </TableCell>
                </TableRow>
              ))}
              {!data.partners.length && (
                <TableRow><TableCell colSpan={5} className="h-32 text-center text-muted-foreground">Aucun partenaire.</TableCell></TableRow>
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
    </main>
  );
}
