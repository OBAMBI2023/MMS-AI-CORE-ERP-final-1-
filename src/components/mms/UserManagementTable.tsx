import { useEffect, useMemo, useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { UserFormDialog } from "@/components/mms/UserFormDialog";
import {
  Loader2,
  MoreVertical,
  Key,
  Trash2,
  ToggleLeft,
  ToggleRight,
  RefreshCw,
  Search,
  Filter,
  Eye,
  Users,
  CheckCircle2,
  UserX,
  Shield,
  ShieldCheck,
  ChevronLeft,
  ChevronRight,
} from "lucide-react";
import { deleteUser, resetUserPassword, toggleStatus } from "@/lib/user-management.server";
import { toast } from "sonner";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
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
import { usePermissions } from "@/hooks/use-permissions";
import { useActionPermission } from "@/hooks/use-action-permission";
import { logAction } from "@/lib/audit.server";
import { useTenant } from "@/providers/TenantProvider";
import { useCompanySettings } from "@/hooks/use-company-settings";
import { formatSupabaseError } from "@/lib/supabase-error";
import { formatDate, formatDateTime } from "@/lib/mms/format";
import { ProfileAvatar } from "@/components/mms/ProfileAvatar";
import { DataExportMenu, type ExportColumn } from "@/components/mms/DataExportMenu";
import { cn } from "@/lib/utils";

// public.profiles.status stocke des valeurs techniques anglaises ; l'UI reste en français.
const STATUS_LABELS: Record<string, string> = {
  active: "Actif",
  suspended: "Suspendu",
  archived: "Archivé",
};

const STATUS_BADGE_CLASSES: Record<string, string> = {
  active:
    "border-emerald-200 bg-emerald-50 text-emerald-700 dark:border-emerald-500/20 dark:bg-emerald-500/10 dark:text-emerald-300",
  suspended:
    "border-red-200 bg-red-50 text-red-700 dark:border-red-500/20 dark:bg-red-500/10 dark:text-red-300",
  archived:
    "border-gray-200 bg-gray-100 text-gray-600 dark:border-white/10 dark:bg-white/5 dark:text-gray-400",
};

const ROLE_BADGE_PALETTE = [
  "border-indigo-200 bg-indigo-50 text-indigo-700 dark:border-indigo-500/20 dark:bg-indigo-500/10 dark:text-indigo-300",
  "border-sky-200 bg-sky-50 text-sky-700 dark:border-sky-500/20 dark:bg-sky-500/10 dark:text-sky-300",
  "border-violet-200 bg-violet-50 text-violet-700 dark:border-violet-500/20 dark:bg-violet-500/10 dark:text-violet-300",
  "border-teal-200 bg-teal-50 text-teal-700 dark:border-teal-500/20 dark:bg-teal-500/10 dark:text-teal-300",
  "border-orange-200 bg-orange-50 text-orange-700 dark:border-orange-500/20 dark:bg-orange-500/10 dark:text-orange-300",
  "border-pink-200 bg-pink-50 text-pink-700 dark:border-pink-500/20 dark:bg-pink-500/10 dark:text-pink-300",
];

function roleBadgeClass(roleName: string | null | undefined) {
  if (!roleName) return "border-transparent bg-muted text-muted-foreground";
  let hash = 0;
  for (let i = 0; i < roleName.length; i++) hash = (hash * 31 + roleName.charCodeAt(i)) >>> 0;
  return ROLE_BADGE_PALETTE[hash % ROLE_BADGE_PALETTE.length];
}

const PAGE_SIZE = 8;

function UserActionsMenu({
  user,
  canDelete,
  pending,
  onView,
  onResetPassword,
  onToggleStatus,
  onRequestDelete,
}: {
  user: any;
  canDelete: boolean;
  pending: boolean;
  onView: () => void;
  onResetPassword: () => void;
  onToggleStatus: () => void;
  onRequestDelete: () => void;
}) {
  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Button
          variant="ghost"
          size="icon"
          className="h-8 w-8 shrink-0"
          disabled={pending}
          aria-label="Actions"
        >
          {pending ? (
            <Loader2 className="h-4 w-4 animate-spin" />
          ) : (
            <MoreVertical className="h-4 w-4" />
          )}
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end" className="w-52">
        <DropdownMenuItem onClick={onView}>
          <Eye className="mr-2 h-4 w-4" /> Voir
        </DropdownMenuItem>
        <UserFormDialog user={user} />
        <DropdownMenuItem onClick={onResetPassword}>
          <Key className="mr-2 h-4 w-4" /> Réinitialiser le mot de passe
        </DropdownMenuItem>
        <DropdownMenuItem onClick={onToggleStatus}>
          {user.status === "active" ? (
            <ToggleLeft className="mr-2 h-4 w-4" />
          ) : (
            <ToggleRight className="mr-2 h-4 w-4" />
          )}
          {user.status === "active" ? "Désactiver" : "Activer"}
        </DropdownMenuItem>
        {canDelete && (
          <>
            <DropdownMenuSeparator />
            <DropdownMenuItem className="text-destructive focus:text-destructive" onClick={onRequestDelete}>
              <Trash2 className="mr-2 h-4 w-4" /> Supprimer
            </DropdownMenuItem>
          </>
        )}
      </DropdownMenuContent>
    </DropdownMenu>
  );
}

export function UserManagement() {
  const qc = useQueryClient();
  const [userToDelete, setUserToDelete] = useState<string | null>(null);
  const [userToDeleteName, setUserToDeleteName] = useState<string | null>(null);
  const [viewUser, setViewUser] = useState<any | null>(null);
  const [search, setSearch] = useState("");
  const [debouncedSearch, setDebouncedSearch] = useState("");
  const [roleFilter, setRoleFilter] = useState("all");
  const [statusFilter, setStatusFilter] = useState("all");
  const [page, setPage] = useState(1);
  const { data: userData } = useQuery({ queryKey: ["user"], queryFn: () => supabase.auth.getUser() });
  const permissionsQuery = usePermissions();
  const { roleId } = permissionsQuery.data || { roleId: null };
  const userId = userData?.data?.user?.id;
  const canDeleteUser = useActionPermission("users.delete");
  const canExport = useActionPermission("users.export");
  const { profile, loading: tenantLoading } = useTenant();
  const tenantId = profile?.tenant_id;
  const { settings, logoUrl, companyName } = useCompanySettings();

  const {
    data: users,
    isLoading,
    isFetching,
    refetch,
  } = useQuery({
    queryKey: ["users", tenantId],
    queryFn: async () => {
      if (!tenantId) return [];
      const { data, error } = await supabase.from("profiles").select(`
          id, username, full_name, email, phone, status, last_login_at, created_at, avatar_url,
          roles(id, name)
        `).eq("tenant_id", tenantId);
      if (error) throw error;
      return data;
    },
    enabled: !tenantLoading && Boolean(tenantId),
  });

  const { data: roles } = useQuery({
    queryKey: ["roles", tenantId],
    queryFn: async () => {
      if (!tenantId) return [];
      const { data, error } = await supabase
        .from("roles")
        .select("id, name")
        .eq("tenant_id", tenantId);
      if (error) throw error;
      return data;
    },
    enabled: !tenantLoading && Boolean(tenantId),
  });

  useEffect(() => {
    const t = setTimeout(() => setDebouncedSearch(search.trim().toLowerCase()), 300);
    return () => clearTimeout(t);
  }, [search]);

  useEffect(() => {
    setPage(1);
  }, [debouncedSearch, roleFilter, statusFilter]);

  const deleteMutation = useMutation({
    mutationFn: deleteUser,
    onSuccess: async (_, variables) => {
      if (userId && userToDeleteName) {
        await logAction(userId, roleId ?? null, "delete", "users", {
          user_name: userToDeleteName,
        });
      }
      qc.invalidateQueries({ queryKey: ["users", tenantId] });
      toast.success("Utilisateur supprimé");
      setUserToDelete(null);
      setUserToDeleteName(null);
    },
    onError: (error: any) => {
      toast.error(formatSupabaseError(error));
    },
  });

  const toggleMutation = useMutation({
    mutationFn: toggleStatus,
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["users", tenantId] });
      toast.success("Statut mis à jour");
    },
    onError: (error: any) => {
      toast.error(formatSupabaseError(error));
    },
  });

  const passwordMutation = useMutation({
    mutationFn: resetUserPassword,
    onSuccess: () => {
      toast.success("Un email de réinitialisation a été envoyé.");
    },
    onError: (error: any) => {
      toast.error(formatSupabaseError(error));
    },
  });

  const rowActionPending =
    toggleMutation.isPending || passwordMutation.isPending || deleteMutation.isPending;

  const stats = useMemo(() => {
    const list = users ?? [];
    const active = list.filter((u) => u.status === "active").length;
    const suspended = list.filter((u) => u.status === "suspended").length;
    const rolesAssigned = new Set(
      list.map((u) => (u.roles as any)?.id).filter((id): id is string => Boolean(id)),
    ).size;
    return { total: list.length, active, suspended, rolesAssigned };
  }, [users]);

  const filteredUsers = useMemo(() => {
    const list = users ?? [];
    return list.filter((u) => {
      const matchesSearch =
        !debouncedSearch ||
        u.full_name?.toLowerCase().includes(debouncedSearch) ||
        u.email?.toLowerCase().includes(debouncedSearch) ||
        u.username?.toLowerCase().includes(debouncedSearch);
      const matchesRole = roleFilter === "all" || (u.roles as any)?.id === roleFilter;
      const matchesStatus = statusFilter === "all" || u.status === statusFilter;
      return matchesSearch && matchesRole && matchesStatus;
    });
  }, [users, debouncedSearch, roleFilter, statusFilter]);

  const totalPages = Math.max(1, Math.ceil(filteredUsers.length / PAGE_SIZE));
  const paginatedUsers = useMemo(
    () => filteredUsers.slice((page - 1) * PAGE_SIZE, page * PAGE_SIZE),
    [filteredUsers, page],
  );

  const hasActiveFilters = debouncedSearch !== "" || roleFilter !== "all" || statusFilter !== "all";
  const resetFilters = () => {
    setSearch("");
    setDebouncedSearch("");
    setRoleFilter("all");
    setStatusFilter("all");
  };

  const exportColumns: ExportColumn<any>[] = [
    { header: "Nom complet", value: (r) => r.full_name },
    { header: "Nom d'utilisateur", value: (r) => r.username },
    { header: "Email", value: (r) => r.email },
    { header: "Téléphone", value: (r) => r.phone },
    { header: "Rôle", value: (r) => (r.roles as any)?.name },
    { header: "Statut", value: (r) => (r.status && STATUS_LABELS[r.status]) ?? r.status },
    { header: "Créé le", value: (r) => formatDate(r.created_at) },
  ];

  const openView = (user: any) => setViewUser(user);
  const requestDelete = (user: any) => {
    setUserToDelete(user.id);
    setUserToDeleteName(user.full_name);
  };
  const runToggleStatus = (user: any) =>
    toggleMutation.mutate({
      data: { id: user.id, status: user.status === "active" ? "suspendu" : "actif" },
    });
  const runResetPassword = (user: any) => passwordMutation.mutate({ data: { id: user.id } });

  if (isLoading)
    return (
      <div className="flex justify-center p-16">
        <Loader2 className="animate-spin h-8 w-8 text-primary" />
      </div>
    );

  return (
    <div className="mx-auto w-full min-w-0 max-w-7xl space-y-5 sm:space-y-6">
      {/* Header actions — desktop/tablet */}
      <div className="hidden md:flex md:flex-wrap md:items-center md:justify-end md:gap-2">
        <Button
          variant="outline"
          size="icon"
          className="shrink-0"
          onClick={() => refetch()}
          disabled={isFetching}
          title="Actualiser"
          aria-label="Actualiser"
        >
          <RefreshCw className={cn("h-4 w-4", isFetching && "animate-spin")} />
        </Button>
        {canExport && (
          <DataExportMenu
            data={filteredUsers}
            columns={exportColumns}
            filename={`Utilisateurs_${companyName || "Entreprise"}`}
            pdfTitle="Liste des utilisateurs"
            companySettings={settings}
            logoUrl={logoUrl}
            triggerVariant="outline"
          />
        )}
        <UserFormDialog />
      </div>

      {/* Header actions — mobile */}
      <div className="grid grid-cols-3 gap-2 md:hidden">
        <Button
          variant="secondary"
          className="h-11 flex-col gap-0.5 rounded-2xl px-1 text-[11px] font-medium leading-none shadow-sm [&_svg]:size-4"
          onClick={() => refetch()}
          disabled={isFetching}
          aria-label="Actualiser"
        >
          <RefreshCw className={cn("h-4 w-4", isFetching && "animate-spin")} />
          Actualiser
        </Button>
        {canExport ? (
          <DataExportMenu
            data={filteredUsers}
            columns={exportColumns}
            filename={`Utilisateurs_${companyName || "Entreprise"}`}
            pdfTitle="Liste des utilisateurs"
            companySettings={settings}
            logoUrl={logoUrl}
            triggerVariant="secondary"
            triggerClassName="h-11 w-full flex-col gap-0.5 rounded-2xl px-1 text-[11px] font-medium leading-none shadow-sm [&_svg]:size-4"
          />
        ) : (
          <div />
        )}
        <UserFormDialog
          triggerClassName="h-11 w-full flex-col gap-0.5 rounded-2xl bg-blue-600 px-1 text-[11px] font-medium leading-none text-white shadow-md shadow-blue-600/25 hover:bg-blue-700 [&_svg]:size-4 [&_svg]:mr-0"
        />
      </div>

      {/* KPI cards — desktop/tablet */}
      <div className="hidden gap-4 md:grid md:grid-cols-2 lg:grid-cols-4">
        <Card className="border-gray-200 bg-white p-4 shadow-sm dark:bg-card">
          <div className="flex items-start justify-between gap-2">
            <div className="min-w-0">
              <p className="text-2xl font-bold">{stats.total}</p>
              <p className="mt-0.5 text-xs text-muted-foreground">Utilisateurs totaux</p>
            </div>
            <div className="grid h-9 w-9 shrink-0 place-items-center rounded-xl bg-blue-500/10 text-blue-600 dark:text-blue-400">
              <Users className="h-4 w-4" />
            </div>
          </div>
        </Card>
        <Card className="border-gray-200 bg-white p-4 shadow-sm dark:bg-card">
          <div className="flex items-start justify-between gap-2">
            <div className="min-w-0">
              <p className="text-2xl font-bold text-emerald-600 dark:text-emerald-400">
                {stats.active}
              </p>
              <p className="mt-0.5 text-xs text-muted-foreground">Utilisateurs actifs</p>
            </div>
            <div className="grid h-9 w-9 shrink-0 place-items-center rounded-xl bg-emerald-500/10 text-emerald-600 dark:text-emerald-400">
              <CheckCircle2 className="h-4 w-4" />
            </div>
          </div>
        </Card>
        <Card className="border-gray-200 bg-white p-4 shadow-sm dark:bg-card">
          <div className="flex items-start justify-between gap-2">
            <div className="min-w-0">
              <p className="text-2xl font-bold text-amber-600 dark:text-amber-400">
                {stats.suspended}
              </p>
              <p className="mt-0.5 text-xs text-muted-foreground">Utilisateurs suspendus</p>
            </div>
            <div className="grid h-9 w-9 shrink-0 place-items-center rounded-xl bg-amber-500/10 text-amber-600 dark:text-amber-400">
              <UserX className="h-4 w-4" />
            </div>
          </div>
        </Card>
        <Card className="border-gray-200 bg-white p-4 shadow-sm dark:bg-card">
          <div className="flex items-start justify-between gap-2">
            <div className="min-w-0">
              <p className="text-2xl font-bold text-violet-600 dark:text-violet-400">
                {stats.rolesAssigned}
              </p>
              <p className="mt-0.5 text-xs text-muted-foreground">Rôles attribués</p>
            </div>
            <div className="grid h-9 w-9 shrink-0 place-items-center rounded-xl bg-violet-500/10 text-violet-600 dark:text-violet-400">
              <Shield className="h-4 w-4" />
            </div>
          </div>
        </Card>
      </div>

      {/* KPI cards — mobile */}
      <div className="grid grid-cols-2 gap-3 md:hidden">
        <Card className="overflow-hidden border-gray-100 bg-white p-0 shadow-[0_2px_10px_rgba(0,0,0,0.05)] dark:bg-card">
          <div className="flex items-start justify-between gap-2 p-3.5">
            <div className="min-w-0">
              <p className="text-xl font-bold leading-tight">{stats.total}</p>
              <p className="mt-0.5 text-[11px] leading-tight text-muted-foreground">
                Utilisateurs totaux
              </p>
            </div>
            <div className="grid h-9 w-9 shrink-0 place-items-center rounded-full bg-blue-500/10 text-blue-600 dark:text-blue-400">
              <Users className="h-4 w-4" />
            </div>
          </div>
          <div className="h-1 w-full bg-blue-500" />
        </Card>
        <Card className="overflow-hidden border-gray-100 bg-white p-0 shadow-[0_2px_10px_rgba(0,0,0,0.05)] dark:bg-card">
          <div className="flex items-start justify-between gap-2 p-3.5">
            <div className="min-w-0">
              <p className="text-xl font-bold leading-tight text-emerald-600 dark:text-emerald-400">
                {stats.active}
              </p>
              <p className="mt-0.5 text-[11px] leading-tight text-muted-foreground">
                Utilisateurs actifs
              </p>
            </div>
            <div className="grid h-9 w-9 shrink-0 place-items-center rounded-full bg-emerald-500/10 text-emerald-600 dark:text-emerald-400">
              <CheckCircle2 className="h-4 w-4" />
            </div>
          </div>
          <div className="h-1 w-full bg-emerald-500" />
        </Card>
        <Card className="overflow-hidden border-gray-100 bg-white p-0 shadow-[0_2px_10px_rgba(0,0,0,0.05)] dark:bg-card">
          <div className="flex items-start justify-between gap-2 p-3.5">
            <div className="min-w-0">
              <p className="text-xl font-bold leading-tight text-amber-600 dark:text-amber-400">
                {stats.suspended}
              </p>
              <p className="mt-0.5 text-[11px] leading-tight text-muted-foreground">
                Utilisateurs suspendus
              </p>
            </div>
            <div className="grid h-9 w-9 shrink-0 place-items-center rounded-full bg-amber-500/10 text-amber-600 dark:text-amber-400">
              <UserX className="h-4 w-4" />
            </div>
          </div>
          <div className="h-1 w-full bg-amber-500" />
        </Card>
        <Card className="overflow-hidden border-gray-100 bg-white p-0 shadow-[0_2px_10px_rgba(0,0,0,0.05)] dark:bg-card">
          <div className="flex items-start justify-between gap-2 p-3.5">
            <div className="min-w-0">
              <p className="text-xl font-bold leading-tight text-violet-600 dark:text-violet-400">
                {stats.rolesAssigned}
              </p>
              <p className="mt-0.5 text-[11px] leading-tight text-muted-foreground">
                Rôles attribués
              </p>
            </div>
            <div className="grid h-9 w-9 shrink-0 place-items-center rounded-full bg-violet-500/10 text-violet-600 dark:text-violet-400">
              <Shield className="h-4 w-4" />
            </div>
          </div>
          <div className="h-1 w-full bg-violet-500" />
        </Card>
      </div>

      {/* Filters — desktop/tablet */}
      <Card className="hidden border-gray-200 bg-white p-4 dark:bg-card md:block">
        <div className="flex flex-row flex-wrap items-center gap-2.5">
          <div className="relative max-w-xs flex-1">
            <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
            <Input
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Rechercher un utilisateur (nom, email...)"
              className="pl-9"
            />
          </div>
          <div className="flex w-auto items-center gap-2">
            <Select value={roleFilter} onValueChange={setRoleFilter}>
              <SelectTrigger className="w-[170px]">
                <SelectValue placeholder="Tous les rôles" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">Tous les rôles</SelectItem>
                {roles?.map((role) => (
                  <SelectItem key={role.id} value={role.id}>
                    {role.name}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
            <Select value={statusFilter} onValueChange={setStatusFilter}>
              <SelectTrigger className="w-[170px]">
                <SelectValue placeholder="Tous les statuts" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">Tous les statuts</SelectItem>
                <SelectItem value="active">Actif</SelectItem>
                <SelectItem value="suspended">Suspendu</SelectItem>
                <SelectItem value="archived">Archivé</SelectItem>
              </SelectContent>
            </Select>
          </div>
          <Button
            variant="outline"
            size="sm"
            className="gap-2 ml-auto"
            onClick={resetFilters}
            disabled={!hasActiveFilters}
          >
            <Filter className="h-4 w-4" /> Filtres
          </Button>
        </div>
      </Card>

      {/* Filters — mobile */}
      <Card className="border-gray-100 bg-white p-4 shadow-[0_2px_10px_rgba(0,0,0,0.05)] dark:bg-card md:hidden">
        <div className="flex flex-col gap-3">
          <div className="relative w-full">
            <Search className="pointer-events-none absolute left-4 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
            <Input
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Rechercher un utilisateur (nom, email...)"
              className="h-14 rounded-2xl pl-11 text-[15px]"
            />
          </div>
          <div className="grid grid-cols-2 gap-2.5">
            <Select value={roleFilter} onValueChange={setRoleFilter}>
              <SelectTrigger className="h-11 w-full rounded-xl">
                <SelectValue placeholder="Tous les rôles" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">Tous les rôles</SelectItem>
                {roles?.map((role) => (
                  <SelectItem key={role.id} value={role.id}>
                    {role.name}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
            <Select value={statusFilter} onValueChange={setStatusFilter}>
              <SelectTrigger className="h-11 w-full rounded-xl">
                <SelectValue placeholder="Tous les statuts" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">Tous les statuts</SelectItem>
                <SelectItem value="active">Actif</SelectItem>
                <SelectItem value="suspended">Suspendu</SelectItem>
                <SelectItem value="archived">Archivé</SelectItem>
              </SelectContent>
            </Select>
          </div>
          <Button
            variant="outline"
            className="h-11 w-full gap-2 rounded-xl"
            onClick={resetFilters}
            disabled={!hasActiveFilters}
          >
            <Filter className="h-4 w-4" /> Filtres avancés
          </Button>
        </div>
      </Card>

      {/* Desktop / tablet table */}
      <Card className="hidden overflow-hidden border-gray-200 bg-white dark:bg-card md:block">
        <Table>
          <TableHeader>
            <TableRow className="hover:bg-transparent">
              <TableHead className="text-xs uppercase tracking-wide">Utilisateur</TableHead>
              <TableHead className="text-xs uppercase tracking-wide">Email</TableHead>
              <TableHead className="text-xs uppercase tracking-wide">Rôle</TableHead>
              <TableHead className="text-xs uppercase tracking-wide">Statut</TableHead>
              <TableHead className="text-right text-xs uppercase tracking-wide">Actions</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {paginatedUsers.map((user) => (
              <TableRow key={user.id}>
                <TableCell>
                  <div className="flex items-center gap-3">
                    <ProfileAvatar
                      path={user.avatar_url}
                      name={user.full_name}
                      email={user.email}
                      className="h-9 w-9 shrink-0"
                    />
                    <div className="min-w-0">
                      <div className="truncate font-medium">{user.full_name}</div>
                      <div className="truncate text-xs text-muted-foreground">
                        Depuis le {formatDate(user.created_at)}
                      </div>
                    </div>
                  </div>
                </TableCell>
                <TableCell className="text-muted-foreground">{user.email}</TableCell>
                <TableCell>
                  <Badge variant="outline" className={cn("font-medium", roleBadgeClass((user.roles as any)?.name))}>
                    {(user.roles as any)?.name ?? "—"}
                  </Badge>
                </TableCell>
                <TableCell>
                  <Badge
                    variant="outline"
                    className={cn("font-medium", STATUS_BADGE_CLASSES[user.status ?? ""] ?? "")}
                  >
                    {(user.status && STATUS_LABELS[user.status]) ?? user.status}
                  </Badge>
                </TableCell>
                <TableCell className="text-right">
                  <UserActionsMenu
                    user={user}
                    canDelete={canDeleteUser}
                    pending={rowActionPending}
                    onView={() => openView(user)}
                    onResetPassword={() => runResetPassword(user)}
                    onToggleStatus={() => runToggleStatus(user)}
                    onRequestDelete={() => requestDelete(user)}
                  />
                </TableCell>
              </TableRow>
            ))}
            {paginatedUsers.length === 0 && (
              <TableRow className="hover:bg-transparent">
                <TableCell colSpan={5} className="p-10 text-center text-sm text-muted-foreground">
                  Aucun utilisateur ne correspond à ces critères.
                </TableCell>
              </TableRow>
            )}
          </TableBody>
        </Table>
      </Card>

      {/* Mobile card list */}
      <div className="space-y-3.5 md:hidden">
        {paginatedUsers.map((user) => (
          <div
            key={user.id}
            className="w-full rounded-[18px] border border-gray-100 bg-white p-4 shadow-[0_2px_12px_rgba(0,0,0,0.05)] dark:bg-card"
          >
            <div className="flex items-start justify-between gap-2">
              <div className="flex min-w-0 items-center gap-3">
                <ProfileAvatar
                  path={user.avatar_url}
                  name={user.full_name}
                  email={user.email}
                  className="h-11 w-11 shrink-0"
                />
                <div className="min-w-0">
                  <div className="truncate font-semibold">{user.full_name}</div>
                  <div className="truncate text-xs text-muted-foreground">{user.email}</div>
                </div>
              </div>
              <UserActionsMenu
                user={user}
                canDelete={canDeleteUser}
                pending={rowActionPending}
                onView={() => openView(user)}
                onResetPassword={() => runResetPassword(user)}
                onToggleStatus={() => runToggleStatus(user)}
                onRequestDelete={() => requestDelete(user)}
              />
            </div>
            <div className="mt-3.5 flex flex-wrap items-center gap-1.5 border-t border-gray-100 pt-3 dark:border-white/10">
              <Badge
                variant="outline"
                className={cn("rounded-full text-[11px] font-medium", roleBadgeClass((user.roles as any)?.name))}
              >
                {(user.roles as any)?.name ?? "—"}
              </Badge>
              <Badge
                variant="outline"
                className={cn(
                  "rounded-full text-[11px] font-medium",
                  STATUS_BADGE_CLASSES[user.status ?? ""] ?? "",
                )}
              >
                {(user.status && STATUS_LABELS[user.status]) ?? user.status}
              </Badge>
              <span className="ml-auto shrink-0 text-[11px] text-muted-foreground">
                {formatDate(user.created_at)}
              </span>
            </div>
          </div>
        ))}
        {paginatedUsers.length === 0 && (
          <Card className="rounded-[18px] border-gray-100 bg-white p-6 text-center text-sm text-muted-foreground shadow-[0_2px_12px_rgba(0,0,0,0.05)] dark:bg-card">
            Aucun utilisateur ne correspond à ces critères.
          </Card>
        )}
      </div>

      {/* Pagination */}
      {filteredUsers.length > 0 && (
        <div className="flex flex-col items-center justify-between gap-3 sm:flex-row">
          <p className="text-sm text-muted-foreground">
            Affichage de {(page - 1) * PAGE_SIZE + 1}–{Math.min(page * PAGE_SIZE, filteredUsers.length)}{" "}
            sur {filteredUsers.length} utilisateur{filteredUsers.length > 1 ? "s" : ""}
          </p>
          <div className="flex items-center gap-1.5">
            <Button
              variant="outline"
              size="icon"
              className="h-8 w-8"
              disabled={page <= 1}
              onClick={() => setPage((p) => Math.max(1, p - 1))}
              aria-label="Page précédente"
            >
              <ChevronLeft className="h-4 w-4" />
            </Button>
            <span className="px-2 text-sm text-muted-foreground">
              Page {page} / {totalPages}
            </span>
            <Button
              variant="outline"
              size="icon"
              className="h-8 w-8"
              disabled={page >= totalPages}
              onClick={() => setPage((p) => Math.min(totalPages, p + 1))}
              aria-label="Page suivante"
            >
              <ChevronRight className="h-4 w-4" />
            </Button>
          </div>
        </div>
      )}

      {/* Info section */}
      <Card className="flex items-start gap-3 border-gray-200 bg-gray-50/70 p-4 dark:bg-card/60">
        <div className="grid h-8 w-8 shrink-0 place-items-center rounded-lg bg-primary/10 text-primary">
          <ShieldCheck className="h-4 w-4" />
        </div>
        <div className="min-w-0">
          <p className="text-sm font-medium">À propos des utilisateurs</p>
          <p className="mt-0.5 text-xs text-muted-foreground">
            Invitez de nouveaux utilisateurs, attribuez-leur des rôles et gérez leurs permissions
            pour contrôler l'accès aux modules et aux données de votre entreprise.
          </p>
        </div>
      </Card>

      {/* View user dialog */}
      <Dialog open={!!viewUser} onOpenChange={(open) => !open && setViewUser(null)}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-3">
              <ProfileAvatar
                path={viewUser?.avatar_url}
                name={viewUser?.full_name}
                email={viewUser?.email}
                className="h-10 w-10"
              />
              <div className="min-w-0">
                <div className="truncate">{viewUser?.full_name}</div>
                <div className="truncate text-xs font-normal text-muted-foreground">
                  {viewUser?.email}
                </div>
              </div>
            </DialogTitle>
          </DialogHeader>
          <div className="space-y-3 text-sm">
            <div className="flex items-center justify-between gap-3 border-b pb-2">
              <span className="text-muted-foreground">Nom d'utilisateur</span>
              <span className="font-medium">{viewUser?.username ?? "—"}</span>
            </div>
            <div className="flex items-center justify-between gap-3 border-b pb-2">
              <span className="text-muted-foreground">Téléphone</span>
              <span className="font-medium">{viewUser?.phone ?? "—"}</span>
            </div>
            <div className="flex items-center justify-between gap-3 border-b pb-2">
              <span className="text-muted-foreground">Rôle</span>
              <Badge variant="outline" className={roleBadgeClass((viewUser?.roles as any)?.name)}>
                {(viewUser?.roles as any)?.name ?? "—"}
              </Badge>
            </div>
            <div className="flex items-center justify-between gap-3 border-b pb-2">
              <span className="text-muted-foreground">Statut</span>
              <Badge variant="outline" className={STATUS_BADGE_CLASSES[viewUser?.status ?? ""] ?? ""}>
                {viewUser?.status ? (STATUS_LABELS[viewUser.status] ?? viewUser.status) : "—"}
              </Badge>
            </div>
            <div className="flex items-center justify-between gap-3 border-b pb-2">
              <span className="text-muted-foreground">Créé le</span>
              <span className="font-medium">{formatDate(viewUser?.created_at)}</span>
            </div>
            <div className="flex items-center justify-between gap-3">
              <span className="text-muted-foreground">Dernière connexion</span>
              <span className="font-medium">
                {viewUser?.last_login_at ? formatDateTime(viewUser.last_login_at) : "Jamais"}
              </span>
            </div>
          </div>
        </DialogContent>
      </Dialog>

      <AlertDialog open={!!userToDelete} onOpenChange={() => {setUserToDelete(null); setUserToDeleteName(null);}}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Êtes-vous sûr ?</AlertDialogTitle>
            <AlertDialogDescription>
              Cette action est irréversible. L'utilisateur sera supprimé de l'authentification et de
              la base de données.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Annuler</AlertDialogCancel>
            <AlertDialogAction
              className="bg-destructive hover:bg-destructive/90"
              onClick={() => userToDelete && deleteMutation.mutate({ data: { id: userToDelete } })}
            >
              Supprimer
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
