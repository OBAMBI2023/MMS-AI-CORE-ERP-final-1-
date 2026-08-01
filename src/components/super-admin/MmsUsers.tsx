import { useEffect, useRef, useState } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import {
  ArrowDownAZ, ArrowLeft, ArrowUpAZ, Building2, CalendarDays, KeyRound,
  Loader2, LogOut, MoreHorizontal, Search, ShieldCheck, UserCheck, UserX, Users,
} from "lucide-react";
import { toast } from "sonner";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { ProfileAvatar } from "@/components/mms/ProfileAvatar";
import {
  listAllTenantUsers, mutateTenantUser, sendSuperAdminPasswordReset,
  type AllTenantUsersResult, type TenantUser,
} from "@/lib/super-admin-users.server";
import {
  AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent,
  AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import {
  DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";

type Sort = "name" | "tenant" | "created_at" | "last_login_at";
type Direction = "asc" | "desc";
type PendingAction = { user: TenantUser; action: "suspend" | "reactivate" | "revoke_sessions" | "reset" };

function formatDate(value: string | null) {
  if (!value) return "Jamais";
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return "—";
  return new Intl.DateTimeFormat("fr-FR", { dateStyle: "medium", timeStyle: "short" }).format(date);
}

function statusLabel(status: string) {
  if (status === "active") return "Actif";
  if (status === "suspended") return "Suspendu";
  if (status === "archived") return "Archivé";
  return status;
}

export function MmsUsersView() {
  const queryClient = useQueryClient();
  const [input, setInput] = useState("");
  const [search, setSearch] = useState("");
  const [tenantId, setTenantId] = useState("all");
  const [roleId, setRoleId] = useState("all");
  const [status, setStatus] = useState("all");
  const [sort, setSort] = useState<Sort>("name");
  const [direction, setDirection] = useState<Direction>("asc");
  const [page, setPage] = useState(1);
  const [pending, setPending] = useState<PendingAction | null>(null);
  const [reason, setReason] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const submittingRef = useRef(false);

  useEffect(() => {
    const timer = window.setTimeout(() => { setSearch(input.trim()); setPage(1); }, 300);
    return () => window.clearTimeout(timer);
  }, [input]);

  const queryKey = [
    "super-admin", "all-tenant-users", page, search, tenantId, roleId, status, sort, direction,
  ] as const;
  const query = useQuery({
    queryKey,
    queryFn: () => listAllTenantUsers({ data: {
      page, search,
      tenantId: tenantId === "all" ? undefined : tenantId,
      roleId: roleId === "all" ? undefined : roleId,
      status: status === "all" ? undefined : status as "active" | "suspended" | "archived",
      sort, direction,
    } }),
    placeholderData: (previous) => previous,
  });

  const changeFilter = (setter: (value: string) => void, value: string) => {
    setter(value);
    setPage(1);
  };

  const closeDialog = () => {
    if (!submitting) {
      setPending(null);
      setReason("");
    }
  };

  const confirmAction = async () => {
    if (!pending || submittingRef.current) return;
    submittingRef.current = true;
    setSubmitting(true);
    try {
      if (pending.action === "reset") {
        await sendSuperAdminPasswordReset({ data: {
          userId: pending.user.id,
        } });
        toast.success(`E-mail de réinitialisation envoyé à ${pending.user.email}.`);
      } else {
        const result = await mutateTenantUser({ data: {
          userId: pending.user.id,
          action: pending.action,
          reason: reason.trim() || undefined,
        } });
        if (pending.action !== "revoke_sessions") {
          const nextStatus = pending.action === "suspend" ? "suspended" : "active";
          queryClient.setQueryData<AllTenantUsersResult>(queryKey, (current) => {
            if (!current) return current;
            const wasActive = pending.user.status === "active";
            return {
              ...current,
              users: current.users.map((user) =>
                user.id === pending.user.id ? { ...user, status: nextStatus } : user),
              stats: {
                ...current.stats,
                active: current.stats.active + (nextStatus === "active" ? 1 : wasActive ? -1 : 0),
                suspended: current.stats.suspended + (nextStatus === "suspended" ? 1 : wasActive ? 0 : -1),
              },
            };
          });
        }
        toast.success(
          pending.action === "suspend" ? "Utilisateur suspendu." :
          pending.action === "reactivate" ? "Utilisateur réactivé." :
          "Sessions de l’utilisateur révoquées.",
        );
        for (const warning of result.warnings ?? []) {
          toast.warning(warning);
        }
      }
      setPending(null);
      setReason("");
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "L’opération a échoué.");
    } finally {
      submittingRef.current = false;
      setSubmitting(false);
    }
  };

  const data = query.data;
  const statCards = [
    ["Total utilisateurs", data?.stats.total, Users],
    ["Actifs", data?.stats.active, UserCheck],
    ["Suspendus", data?.stats.suspended, UserX],
    ["Tenants représentés", data?.stats.tenants, Building2],
  ] as const;

  return (
    <main className="min-h-screen bg-muted/30 p-4 sm:p-6 xl:p-8">
      <div className="mx-auto max-w-[1500px] space-y-6">
        <div>
          <Button variant="ghost" className="-ml-3 mb-2" asChild>
            <a href="/super-admin"><ArrowLeft /> Super Admin</a>
          </Button>
          <h1 className="text-2xl font-bold tracking-tight">Gestion globale des utilisateurs</h1>
          <p className="mt-1 text-sm text-muted-foreground">Comptes de tous les tenants, administrés de manière sécurisée.</p>
        </div>

        <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
          {statCards.map(([label, value, Icon]) => (
            <Card key={label} className="flex items-center gap-3 rounded-xl p-4">
              <Icon className="size-5 text-primary" />
              <div><p className="text-xs text-muted-foreground">{label}</p><p className="text-xl font-bold">{value ?? "—"}</p></div>
            </Card>
          ))}
        </div>

        <Card className="rounded-xl p-4">
          <div className="grid gap-3 xl:grid-cols-[minmax(240px,1fr)_200px_190px_170px_210px_auto]">
            <div className="relative"><Search className="absolute left-3 top-1/2 size-4 -translate-y-1/2 text-muted-foreground" /><Input value={input} onChange={(e) => setInput(e.target.value)} className="pl-9" placeholder="Rechercher un nom ou un e-mail" /></div>
            <Select value={tenantId} onValueChange={(v) => changeFilter(setTenantId, v)}><SelectTrigger><SelectValue placeholder="Tous les tenants" /></SelectTrigger><SelectContent><SelectItem value="all">Tous les tenants</SelectItem>{data?.tenants.map((item) => <SelectItem key={item.id} value={item.id}>{item.name}</SelectItem>)}</SelectContent></Select>
            <Select value={roleId} onValueChange={(v) => changeFilter(setRoleId, v)}><SelectTrigger><SelectValue placeholder="Tous les rôles" /></SelectTrigger><SelectContent><SelectItem value="all">Tous les rôles</SelectItem>{data?.roles.map((item) => <SelectItem key={item.id} value={item.id}>{item.name}</SelectItem>)}</SelectContent></Select>
            <Select value={status} onValueChange={(v) => changeFilter(setStatus, v)}><SelectTrigger><SelectValue placeholder="Tous les statuts" /></SelectTrigger><SelectContent><SelectItem value="all">Tous les statuts</SelectItem><SelectItem value="active">Actif</SelectItem><SelectItem value="suspended">Suspendu</SelectItem><SelectItem value="archived">Archivé</SelectItem></SelectContent></Select>
            <Select value={sort} onValueChange={(v) => { setSort(v as Sort); setPage(1); }}><SelectTrigger><SelectValue /></SelectTrigger><SelectContent><SelectItem value="name">Tri : nom</SelectItem><SelectItem value="tenant">Tri : tenant</SelectItem><SelectItem value="created_at">Tri : création</SelectItem><SelectItem value="last_login_at">Tri : connexion</SelectItem></SelectContent></Select>
            <Button variant="outline" size="icon" onClick={() => setDirection((v) => v === "asc" ? "desc" : "asc")} title="Inverser le tri">{direction === "asc" ? <ArrowDownAZ /> : <ArrowUpAZ />}</Button>
          </div>
        </Card>

        {query.isError ? (
          <Card className="rounded-xl p-8 text-center text-destructive">{query.error instanceof Error ? query.error.message : "Impossible de charger les utilisateurs."}</Card>
        ) : (
          <Card className="overflow-hidden rounded-xl">
            <div className="overflow-x-auto"><Table>
              <TableHeader><TableRow><TableHead>Utilisateur</TableHead><TableHead>Tenant</TableHead><TableHead>Adresse e-mail</TableHead><TableHead>Rôle</TableHead><TableHead>Statut</TableHead><TableHead>Création</TableHead><TableHead>Dernière connexion</TableHead><TableHead className="text-right">Actions</TableHead></TableRow></TableHeader>
              <TableBody>
                {query.isLoading ? <TableRow><TableCell colSpan={8} className="h-40 text-center"><Loader2 className="mx-auto size-6 animate-spin" /></TableCell></TableRow> :
                data?.users.length ? data.users.map((user) => {
                  const active = user.status === "active";
                  return <TableRow key={user.id}>
                    <TableCell><div className="flex min-w-44 items-center gap-3"><ProfileAvatar path={user.avatarUrl} name={user.fullName} email={user.email} className="size-10 shrink-0" /><div><span className="font-medium">{user.fullName}</span>{user.isSelf && <p className="text-xs text-muted-foreground">Votre compte</p>}</div></div></TableCell>
                    <TableCell><Badge variant="outline"><Building2 className="mr-1 size-3" />{user.tenantName}</Badge></TableCell>
                    <TableCell className="whitespace-nowrap">{user.email}</TableCell><TableCell><Badge variant="secondary">{user.role}</Badge></TableCell>
                    <TableCell><Badge variant={active ? "default" : "destructive"}>{statusLabel(user.status)}</Badge></TableCell>
                    <TableCell className="whitespace-nowrap"><CalendarDays className="mr-2 inline size-4 text-muted-foreground" />{formatDate(user.createdAt)}</TableCell><TableCell className="whitespace-nowrap">{formatDate(user.lastLoginAt)}</TableCell>
                    <TableCell className="text-right"><DropdownMenu><DropdownMenuTrigger asChild><Button variant="ghost" size="icon" aria-label={`Actions pour ${user.fullName}`}><MoreHorizontal /></Button></DropdownMenuTrigger><DropdownMenuContent align="end">
                      {active ? <DropdownMenuItem disabled={user.isSelf} className="text-destructive" onSelect={() => setPending({ user, action: "suspend" })}><UserX /> Suspendre</DropdownMenuItem> : <DropdownMenuItem disabled={user.isSelf} onSelect={() => setPending({ user, action: "reactivate" })}><UserCheck /> Réactiver</DropdownMenuItem>}
                      <DropdownMenuItem disabled={user.isSelf} onSelect={() => setPending({ user, action: "revoke_sessions" })}><LogOut /> Déconnecter maintenant</DropdownMenuItem><DropdownMenuSeparator />
                      <DropdownMenuItem disabled={user.email === "Adresse e-mail indisponible"} onSelect={() => setPending({ user, action: "reset" })}><KeyRound /> Réinitialiser le mot de passe</DropdownMenuItem>
                    </DropdownMenuContent></DropdownMenu></TableCell>
                  </TableRow>;
                }) : <TableRow><TableCell colSpan={8} className="h-52 text-center"><Users className="mx-auto mb-3 size-9 text-muted-foreground/60" /><p className="font-medium">Aucun utilisateur</p><p className="mt-1 text-sm text-muted-foreground">Aucun compte ne correspond aux critères sélectionnés.</p></TableCell></TableRow>}
              </TableBody>
            </Table></div>
            {data && data.total > 0 && <div className="flex flex-col gap-3 border-t px-4 py-3 text-sm sm:flex-row sm:items-center sm:justify-between"><p className="text-muted-foreground">{((data.page - 1) * data.pageSize) + 1}–{Math.min(data.page * data.pageSize, data.total)} sur {data.total} · 30 maximum par page</p><div className="flex items-center gap-2"><Button variant="outline" size="sm" disabled={page <= 1 || query.isFetching} onClick={() => setPage((v) => v - 1)}>Précédent</Button><span>Page {data.page} sur {data.pageCount}</span><Button variant="outline" size="sm" disabled={page >= data.pageCount || query.isFetching} onClick={() => setPage((v) => v + 1)}>Suivant</Button></div></div>}
          </Card>
        )}
      </div>

      <AlertDialog open={Boolean(pending)} onOpenChange={(open) => { if (!open) closeDialog(); }}><AlertDialogContent><AlertDialogHeader>
        <AlertDialogTitle>{pending?.action === "suspend" ? "Suspendre cet utilisateur ?" : pending?.action === "reactivate" ? "Réactiver cet utilisateur ?" : pending?.action === "revoke_sessions" ? "Révoquer toutes ses sessions ?" : "Réinitialiser le mot de passe ?"}</AlertDialogTitle>
        <AlertDialogDescription>{pending?.action === "suspend" ? `${pending.user.fullName} sera refusé lors de ses prochaines vérifications d’accès.` : pending?.action === "revoke_sessions" ? `Toutes les sessions Supabase Auth de ${pending?.user.fullName} seront révoquées. Votre session restera active.` : pending?.action === "reactivate" ? `${pending.user.fullName} pourra de nouveau accéder à l’ERP.` : `Un lien sécurisé sera envoyé à ${pending?.user.email}.`}</AlertDialogDescription>
      </AlertDialogHeader>
      {pending && pending.action !== "reset" && <Input value={reason} onChange={(e) => setReason(e.target.value)} placeholder="Motif facultatif" maxLength={500} />}
      <AlertDialogFooter><AlertDialogCancel disabled={submitting}>Annuler</AlertDialogCancel><AlertDialogAction onClick={(e) => { e.preventDefault(); void confirmAction(); }} disabled={submitting}>{submitting && <Loader2 className="size-4 animate-spin" />}<ShieldCheck className="size-4" /> Confirmer</AlertDialogAction></AlertDialogFooter>
      </AlertDialogContent></AlertDialog>
    </main>
  );
}
