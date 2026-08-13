import { useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import {
  Loader2,
  MoreVertical,
  Key,
  Trash2,
  ToggleLeft,
  ToggleRight,
  ShieldAlert,
  UserPlus,
  Users as UsersIcon,
} from "lucide-react";
import { Section } from "@/components/hotel/HotelSettingsUi";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
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
import { UserFormDialog } from "@/components/mms/UserFormDialog";
import { ProfileAvatar } from "@/components/mms/ProfileAvatar";
import { supabase } from "@/integrations/supabase/client";
import { useTenant } from "@/providers/TenantProvider";
import { useActionPermission } from "@/hooks/use-action-permission";
import { deleteUser, resetUserPassword, toggleStatus } from "@/lib/user-management.server";
import { formatSupabaseError } from "@/lib/supabase-error";
import { cn } from "@/lib/utils";

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

export function HotelUsersAccessTab() {
  const qc = useQueryClient();
  const { profile, loading: tenantLoading } = useTenant();
  const tenantId = profile?.tenant_id;
  const canView = useActionPermission("hotel.users.view");
  const canManage = useActionPermission("hotel.users.manage");
  const [userToDelete, setUserToDelete] = useState<{ id: string; name: string } | null>(null);

  const usersQuery = useQuery({
    queryKey: ["hotel-users", tenantId],
    queryFn: async () => {
      if (!tenantId) return [];
      const { data, error } = await supabase
        .from("profiles")
        .select(
          "id, username, full_name, email, phone, status, last_login_at, avatar_url, roles(id, name)",
        )
        .eq("tenant_id", tenantId)
        .order("full_name");
      if (error) throw error;
      return data;
    },
    enabled: canView && !tenantLoading && Boolean(tenantId),
  });

  const toggleMutation = useMutation({
    mutationFn: toggleStatus,
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["hotel-users", tenantId] });
      toast.success("Statut mis à jour");
    },
    onError: (error: unknown) => toast.error(formatSupabaseError(error)),
  });

  const passwordMutation = useMutation({
    mutationFn: resetUserPassword,
    onSuccess: () => toast.success("Un email de réinitialisation a été envoyé."),
    onError: (error: unknown) => toast.error(formatSupabaseError(error)),
  });

  const deleteMutation = useMutation({
    mutationFn: deleteUser,
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["hotel-users", tenantId] });
      toast.success("Utilisateur supprimé");
      setUserToDelete(null);
    },
    onError: (error: unknown) => toast.error(formatSupabaseError(error)),
  });

  const rowPending =
    toggleMutation.isPending || passwordMutation.isPending || deleteMutation.isPending;

  if (!canView) {
    return (
      <Section title="Utilisateurs & accès" icon={<UsersIcon className="h-4 w-4" />}>
        <div className="flex items-start gap-3">
          <ShieldAlert className="mt-0.5 h-5 w-5 shrink-0 text-destructive" />
          <div>
            <p className="font-semibold">Accès restreint</p>
            <p className="text-sm text-muted-foreground">
              Vous n'avez pas la permission de consulter les utilisateurs de l'établissement.
            </p>
          </div>
        </div>
      </Section>
    );
  }

  const users = usersQuery.data ?? [];
  const getUserDisplayName = (user: (typeof users)[number]) =>
    user.full_name?.trim() || user.username?.trim() || user.email?.trim() || "—";

  const renderActionsMenu = (user: (typeof users)[number]) => (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Button
          variant="ghost"
          size="icon"
          className="h-8 w-8"
          disabled={rowPending}
          aria-label="Actions"
        >
          {rowPending ? (
            <Loader2 className="h-4 w-4 animate-spin" />
          ) : (
            <MoreVertical className="h-4 w-4" />
          )}
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end" className="w-56">
        <UserFormDialog user={user} accent="hotel" />
        <DropdownMenuItem onClick={() => passwordMutation.mutate({ data: { id: user.id } })}>
          <Key className="mr-2 h-4 w-4" /> Réinitialiser le mot de passe
        </DropdownMenuItem>
        <DropdownMenuItem
          onClick={() =>
            toggleMutation.mutate({
              data: {
                id: user.id,
                status: user.status === "active" ? "suspendu" : "actif",
              },
            })
          }
        >
          {user.status === "active" ? (
            <ToggleLeft className="mr-2 h-4 w-4" />
          ) : (
            <ToggleRight className="mr-2 h-4 w-4" />
          )}
          {user.status === "active" ? "Désactiver" : "Activer"}
        </DropdownMenuItem>
        <DropdownMenuSeparator />
        <DropdownMenuItem
          className="text-destructive focus:text-destructive"
          onClick={() => setUserToDelete({ id: user.id, name: user.full_name ?? "" })}
        >
          <Trash2 className="mr-2 h-4 w-4" /> Supprimer
        </DropdownMenuItem>
      </DropdownMenuContent>
    </DropdownMenu>
  );

  return (
    <Section
      title="Utilisateurs & accès"
      description="Gérez les membres de l'établissement, leurs rôles et leurs autorisations."
      icon={<UsersIcon className="h-4 w-4" />}
      action={
        canManage ? (
          <UserFormDialog
            triggerClassName="h-11 w-full gap-2 rounded-xl bg-primary hover:bg-primary/90 sm:h-9 sm:w-auto"
            triggerLabel="Ajouter un utilisateur"
            triggerIcon={UserPlus}
            accent="hotel"
            createTitle="Ajouter un utilisateur"
          />
        ) : undefined
      }
    >
      {usersQuery.isLoading ? (
        <div className="flex items-center gap-2 py-8 text-muted-foreground">
          <Loader2 className="h-4 w-4 animate-spin" /> Chargement…
        </div>
      ) : usersQuery.isError ? (
        <p className="text-sm text-destructive">{formatSupabaseError(usersQuery.error)}</p>
      ) : (
        <>
          <div className="space-y-3 sm:hidden">
            {users.map((user) => (
              <div key={user.id} className="min-w-0 rounded-xl border border-border p-4">
                <div className="flex items-start justify-between gap-2">
                  <div className="flex min-w-0 items-center gap-3">
                    <ProfileAvatar
                      path={user.avatar_url}
                      name={getUserDisplayName(user)}
                      email={user.email}
                      className="h-10 w-10 shrink-0"
                    />
                    <div className="min-w-0">
                      <p className="truncate font-medium">{getUserDisplayName(user)}</p>
                      <p className="truncate text-sm text-muted-foreground">{user.email}</p>
                    </div>
                  </div>
                  {canManage && <div className="shrink-0">{renderActionsMenu(user)}</div>}
                </div>

                <div className="mt-3 min-w-0">
                  <p className="text-xs font-medium text-muted-foreground">Rôle</p>
                  <Badge variant="outline" className="mt-1">
                    {(user.roles as any)?.name ?? "—"}
                  </Badge>
                </div>

                <div className="mt-3 flex items-start justify-between gap-3">
                  <div className="min-w-0">
                    <p className="text-xs font-medium text-muted-foreground">Statut</p>
                    <Badge
                      variant="outline"
                      className={cn(
                        "mt-1 font-medium",
                        STATUS_BADGE_CLASSES[user.status ?? ""] ?? "",
                      )}
                    >
                      {(user.status && STATUS_LABELS[user.status]) ?? user.status}
                    </Badge>
                  </div>
                </div>
              </div>
            ))}
            {users.length === 0 && (
              <div className="rounded-xl border border-border p-10 text-center text-sm text-muted-foreground">
                Aucun utilisateur pour cet établissement.
              </div>
            )}
          </div>

          <div className="hidden overflow-x-auto rounded-xl border border-border sm:block">
            <Table>
              <TableHeader>
                <TableRow className="hover:bg-transparent">
                  <TableHead className="py-3 text-xs uppercase tracking-wide">Nom</TableHead>
                  <TableHead className="py-3 text-xs uppercase tracking-wide">Email</TableHead>
                  <TableHead className="py-3 text-xs uppercase tracking-wide">Rôle</TableHead>
                  <TableHead className="py-3 text-xs uppercase tracking-wide">Statut</TableHead>
                  {canManage && (
                    <TableHead className="py-3 text-right text-xs uppercase tracking-wide">
                      Actions
                    </TableHead>
                  )}
                </TableRow>
              </TableHeader>
              <TableBody>
                {users.map((user) => (
                  <TableRow key={user.id}>
                    <TableCell className="py-3.5">
                      <div className="flex items-center gap-3">
                        <ProfileAvatar
                          path={user.avatar_url}
                          name={getUserDisplayName(user)}
                          email={user.email}
                          className="h-8 w-8 shrink-0"
                        />
                        <span className="truncate font-medium">{getUserDisplayName(user)}</span>
                      </div>
                    </TableCell>
                    <TableCell className="py-3.5 text-muted-foreground">{user.email}</TableCell>
                    <TableCell className="py-3.5">
                      <Badge variant="outline">{(user.roles as any)?.name ?? "—"}</Badge>
                    </TableCell>
                    <TableCell className="py-3.5">
                      <Badge
                        variant="outline"
                        className={cn("font-medium", STATUS_BADGE_CLASSES[user.status ?? ""] ?? "")}
                      >
                        {(user.status && STATUS_LABELS[user.status]) ?? user.status}
                      </Badge>
                    </TableCell>
                    {canManage && (
                      <TableCell className="py-3.5 text-right">
                        <div className="flex justify-end opacity-70 transition-opacity hover:opacity-100">
                          {renderActionsMenu(user)}
                        </div>
                      </TableCell>
                    )}
                  </TableRow>
                ))}
                {users.length === 0 && (
                  <TableRow className="hover:bg-transparent">
                    <TableCell
                      colSpan={canManage ? 5 : 4}
                      className="p-10 text-center text-sm text-muted-foreground"
                    >
                      Aucun utilisateur pour cet établissement.
                    </TableCell>
                  </TableRow>
                )}
              </TableBody>
            </Table>
          </div>
        </>
      )}

      <AlertDialog open={!!userToDelete} onOpenChange={(open) => !open && setUserToDelete(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Êtes-vous sûr ?</AlertDialogTitle>
            <AlertDialogDescription>
              Cette action est irréversible.{" "}
              {userToDelete?.name ? <strong>{userToDelete.name}</strong> : "L'utilisateur"} sera
              supprimé de l'authentification et de la base de données.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Annuler</AlertDialogCancel>
            <AlertDialogAction
              className="bg-destructive hover:bg-destructive/90"
              onClick={() =>
                userToDelete && deleteMutation.mutate({ data: { id: userToDelete.id } })
              }
            >
              Supprimer
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </Section>
  );
}
