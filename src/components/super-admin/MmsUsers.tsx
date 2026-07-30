import { useEffect, useState } from "react";
import { useQuery } from "@tanstack/react-query";
import {
  ArrowDownAZ,
  ArrowLeft,
  ArrowUpAZ,
  CalendarDays,
  KeyRound,
  Loader2,
  Search,
  Users,
} from "lucide-react";
import { toast } from "sonner";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { ProfileAvatar } from "@/components/mms/ProfileAvatar";
import {
  getMmsUsers,
  sendSuperAdminPasswordReset,
  type MmsUser,
} from "@/lib/super-admin-users.server";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";

type Sort = "name" | "created_at" | "last_login_at";
type Direction = "asc" | "desc";

function formatDate(value: string | null) {
  if (!value) return "Jamais";
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return "—";
  return new Intl.DateTimeFormat("fr-FR", {
    dateStyle: "medium",
    timeStyle: "short",
  }).format(date);
}

export function MmsUsersView() {
  const [input, setInput] = useState("");
  const [search, setSearch] = useState("");
  const [role, setRole] = useState("all");
  const [status, setStatus] = useState("all");
  const [sort, setSort] = useState<Sort>("name");
  const [direction, setDirection] = useState<Direction>("asc");
  const [page, setPage] = useState(1);
  const [resetUser, setResetUser] = useState<MmsUser | null>(null);
  const [sendingReset, setSendingReset] = useState(false);
  const pageSize = 20;

  useEffect(() => {
    const timer = window.setTimeout(() => {
      setSearch(input.trim());
      setPage(1);
    }, 300);
    return () => window.clearTimeout(timer);
  }, [input]);

  const query = useQuery({
    queryKey: ["super-admin", "mms-users", page, search, role, status, sort, direction],
    queryFn: () =>
      getMmsUsers({
        data: {
          page,
          pageSize,
          search,
          role: role === "all" ? undefined : role,
          status: status === "all" ? undefined : (status as "actif" | "suspendu" | "archivé"),
          sort,
          direction,
        },
      }),
    placeholderData: (previous) => previous,
  });

  const data = query.data;
  const setFilter = (setter: (value: string) => void, value: string) => {
    setter(value);
    setPage(1);
  };

  const confirmPasswordReset = async () => {
    if (!resetUser) return;
    setSendingReset(true);
    try {
      await sendSuperAdminPasswordReset({
        data: {
          userId: resetUser.id,
          redirectTo: new URL("/reset-password", window.location.origin).toString(),
        },
      });
      toast.success(`E-mail de réinitialisation envoyé à ${resetUser.email}.`);
      setResetUser(null);
    } catch (error) {
      toast.error(
        error instanceof Error
          ? error.message
          : "Impossible d’envoyer l’e-mail de réinitialisation.",
      );
    } finally {
      setSendingReset(false);
    }
  };

  return (
    <main className="min-h-screen bg-muted/30 p-4 sm:p-6 xl:p-8">
      <div className="mx-auto max-w-7xl space-y-6">
        <div>
          <Button variant="ghost" className="-ml-3 mb-2" asChild>
            <a href="/super-admin"><ArrowLeft /> Super Admin</a>
          </Button>
          <div className="flex flex-col gap-3 sm:flex-row sm:items-end sm:justify-between">
            <div>
              <h1 className="text-2xl font-bold tracking-tight">Utilisateurs MMS</h1>
              <p className="mt-1 text-sm text-muted-foreground">
                Consultation en lecture seule des comptes appartenant au tenant MMS.
              </p>
            </div>
            <Card className="flex items-center gap-3 rounded-xl px-4 py-3">
              <Users className="size-5 text-primary" />
              <div>
                <p className="text-xs text-muted-foreground">Total utilisateurs</p>
                <p className="text-xl font-bold">{data?.total ?? "—"}</p>
              </div>
            </Card>
          </div>
        </div>

        <Card className="rounded-xl p-4">
          <div className="grid gap-3 lg:grid-cols-[minmax(240px,1fr)_190px_170px_210px_auto]">
            <div className="relative">
              <Search className="absolute left-3 top-1/2 size-4 -translate-y-1/2 text-muted-foreground" />
              <Input
                value={input}
                onChange={(event) => setInput(event.target.value)}
                className="pl-9"
                placeholder="Rechercher un nom ou un e-mail"
                aria-label="Rechercher un utilisateur"
              />
            </div>
            <Select value={role} onValueChange={(value) => setFilter(setRole, value)}>
              <SelectTrigger aria-label="Filtrer par rôle"><SelectValue placeholder="Tous les rôles" /></SelectTrigger>
              <SelectContent>
                <SelectItem value="all">Tous les rôles</SelectItem>
                {data?.roles.map((item) => <SelectItem key={item.id} value={item.id}>{item.name}</SelectItem>)}
              </SelectContent>
            </Select>
            <Select value={status} onValueChange={(value) => setFilter(setStatus, value)}>
              <SelectTrigger aria-label="Filtrer par statut"><SelectValue placeholder="Tous les statuts" /></SelectTrigger>
              <SelectContent>
                <SelectItem value="all">Tous les statuts</SelectItem>
                <SelectItem value="actif">Actif</SelectItem>
                <SelectItem value="suspendu">Suspendu</SelectItem>
                <SelectItem value="archivé">Archivé</SelectItem>
              </SelectContent>
            </Select>
            <Select value={sort} onValueChange={(value) => { setSort(value as Sort); setPage(1); }}>
              <SelectTrigger aria-label="Trier les utilisateurs"><SelectValue /></SelectTrigger>
              <SelectContent>
                <SelectItem value="name">Tri : nom</SelectItem>
                <SelectItem value="created_at">Tri : date de création</SelectItem>
                <SelectItem value="last_login_at">Tri : dernière connexion</SelectItem>
              </SelectContent>
            </Select>
            <Button
              variant="outline"
              size="icon"
              onClick={() => setDirection((value) => value === "asc" ? "desc" : "asc")}
              aria-label={direction === "asc" ? "Tri croissant" : "Tri décroissant"}
              title={direction === "asc" ? "Tri croissant" : "Tri décroissant"}
            >
              {direction === "asc" ? <ArrowDownAZ /> : <ArrowUpAZ />}
            </Button>
          </div>
        </Card>

        {query.isError ? (
          <Card className="rounded-xl p-8 text-center text-destructive">
            {query.error instanceof Error ? query.error.message : "Impossible de charger les utilisateurs."}
          </Card>
        ) : (
          <Card className="overflow-hidden rounded-xl">
            <div className="overflow-x-auto">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Utilisateur</TableHead>
                    <TableHead>Adresse e-mail</TableHead>
                    <TableHead>Rôle</TableHead>
                    <TableHead>Statut</TableHead>
                    <TableHead>Création</TableHead>
                    <TableHead>Dernière connexion</TableHead>
                    <TableHead className="text-right">Actions</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {query.isLoading ? (
                    <TableRow><TableCell colSpan={7} className="h-40 text-center"><Loader2 className="mx-auto size-6 animate-spin" /><span className="sr-only">Chargement</span></TableCell></TableRow>
                  ) : data?.users.length ? data.users.map((user) => (
                    <TableRow key={user.id}>
                      <TableCell>
                        <div className="flex min-w-44 items-center gap-3">
                          <ProfileAvatar path={user.avatarUrl} name={user.fullName} email={user.email} className="size-10 shrink-0" />
                          <span className="font-medium">{user.fullName}</span>
                        </div>
                      </TableCell>
                      <TableCell className="whitespace-nowrap">{user.email}</TableCell>
                      <TableCell><Badge variant="outline">{user.role}</Badge></TableCell>
                      <TableCell>
                        <Badge variant={user.status === "actif" ? "default" : user.status === "suspendu" ? "destructive" : "secondary"} className="capitalize">
                          {user.status}
                        </Badge>
                      </TableCell>
                      <TableCell className="whitespace-nowrap"><CalendarDays className="mr-2 inline size-4 text-muted-foreground" />{formatDate(user.createdAt)}</TableCell>
                      <TableCell className="whitespace-nowrap">{formatDate(user.lastLoginAt)}</TableCell>
                      <TableCell className="text-right">
                        <Button
                          variant="outline"
                          size="sm"
                          className="whitespace-nowrap"
                          onClick={() => setResetUser(user)}
                          disabled={user.email === "Adresse e-mail indisponible"}
                        >
                          <KeyRound className="size-4" />
                          Réinitialiser le mot de passe
                        </Button>
                      </TableCell>
                    </TableRow>
                  )) : (
                    <TableRow>
                      <TableCell colSpan={7} className="h-52 text-center">
                        <Users className="mx-auto mb-3 size-9 text-muted-foreground/60" />
                        <p className="font-medium">Aucun utilisateur</p>
                        <p className="mt-1 text-sm text-muted-foreground">Aucun compte MMS ne correspond aux critères sélectionnés.</p>
                      </TableCell>
                    </TableRow>
                  )}
                </TableBody>
              </Table>
            </div>
            {data && data.total > 0 && (
              <div className="flex flex-col gap-3 border-t px-4 py-3 text-sm sm:flex-row sm:items-center sm:justify-between">
                <p className="text-muted-foreground">
                  {((data.page - 1) * data.pageSize) + 1}–{Math.min(data.page * data.pageSize, data.total)} sur {data.total}
                </p>
                <div className="flex items-center gap-2">
                  <Button variant="outline" size="sm" disabled={page <= 1 || query.isFetching} onClick={() => setPage((value) => value - 1)}>Précédent</Button>
                  <span>Page {data.page} sur {data.pageCount}</span>
                  <Button variant="outline" size="sm" disabled={page >= data.pageCount || query.isFetching} onClick={() => setPage((value) => value + 1)}>Suivant</Button>
                </div>
              </div>
            )}
          </Card>
        )}
      </div>
      <AlertDialog
        open={Boolean(resetUser)}
        onOpenChange={(open) => {
          if (!open && !sendingReset) setResetUser(null);
        }}
      >
        <AlertDialogContent className="max-w-[calc(100vw-2rem)] sm:max-w-lg">
          <AlertDialogHeader>
            <AlertDialogTitle>Réinitialiser le mot de passe ?</AlertDialogTitle>
            <AlertDialogDescription>
              Supabase enverra un lien sécurisé de création d’un nouveau mot de passe à{" "}
              <span className="break-all font-medium text-foreground">{resetUser?.email}</span>.
              Le mot de passe actuel ne sera ni consulté ni modifié directement.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel disabled={sendingReset}>Annuler</AlertDialogCancel>
            <AlertDialogAction
              onClick={(event) => {
                event.preventDefault();
                void confirmPasswordReset();
              }}
              disabled={sendingReset}
            >
              {sendingReset && <Loader2 className="size-4 animate-spin" />}
              Envoyer le lien
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </main>
  );
}
