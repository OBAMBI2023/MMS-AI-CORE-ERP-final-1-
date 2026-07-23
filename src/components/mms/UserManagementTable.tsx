import { useState } from "react";
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
import { Button } from "@/components/ui/button";
import { UserFormDialog } from "@/components/mms/UserFormDialog";
import { Loader2, MoreHorizontal, Key, Trash2, ToggleLeft, ToggleRight } from "lucide-react";
import { deleteUser, resetUserPassword, toggleStatus } from "@/lib/user-management.server";
import { toast } from "sonner";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
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
  AlertDialogTrigger,
} from "@/components/ui/alert-dialog";
import { usePermissions } from "@/hooks/use-permissions";
import { useActionPermission } from "@/hooks/use-action-permission";
import { logAction } from "@/lib/audit.server";

export function UserManagement() {
  const qc = useQueryClient();
  const [userToDelete, setUserToDelete] = useState<string | null>(null);
  const [userToDeleteName, setUserToDeleteName] = useState<string | null>(null);
  const { data: userData } = useQuery({ queryKey: ["user"], queryFn: () => supabase.auth.getUser() });
  const permissionsQuery = usePermissions();
  const { roleId } = permissionsQuery.data || { roleId: null };
  const userId = userData?.data?.user?.id;
  const canDeleteUser = useActionPermission("users.delete");

  const { data: users, isLoading } = useQuery({
    queryKey: ["users"],
    queryFn: async () => {
      const { data, error } = await supabase.from("profiles").select(`
          id, username, full_name, email, phone, status, last_login_at, created_at,
          roles(id, name)
        `);
      if (error) throw error;
      return data;
    },
  });

  const deleteMutation = useMutation({
    mutationFn: deleteUser,
    onSuccess: async (_, variables) => {
      if (userId && userToDeleteName) {
        await logAction(userId, roleId, "delete", "users", { user_name: userToDeleteName });
      }
      qc.invalidateQueries({ queryKey: ["users"] });
      toast.success("Utilisateur supprimé");
      setUserToDelete(null);
      setUserToDeleteName(null);
    },
    onError: (error: any) => {
      toast.error(error.message || "Erreur lors de la suppression");
    },
  });

  const toggleMutation = useMutation({
    mutationFn: toggleStatus,
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["users"] });
      toast.success("Statut mis à jour");
    },
    onError: (error: any) => {
      toast.error(error.message || "Erreur lors de la mise à jour");
    },
  });

  const passwordMutation = useMutation({
    mutationFn: resetUserPassword,
    onSuccess: () => {
      toast.success("Un email de réinitialisation a été envoyé.");
    },
    onError: (error: any) => {
      toast.error(error.message || "Erreur lors de la réinitialisation");
    },
  });

  if (isLoading)
    return (
      <div className="flex justify-center p-10">
        <Loader2 className="animate-spin h-8 w-8" />
      </div>
    );

  return (
    <div className="space-y-4">
      <div className="flex justify-between items-center">
        <h2 className="text-xl font-semibold">Utilisateurs</h2>
        <UserFormDialog />
      </div>

      <div className="border rounded-lg">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Nom</TableHead>
              <TableHead>Email</TableHead>
              <TableHead>Rôle</TableHead>
              <TableHead>Statut</TableHead>
              <TableHead>Actions</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {users?.map((user) => (
              <TableRow key={user.id}>
                <TableCell>{user.full_name}</TableCell>
                <TableCell>{user.email}</TableCell>
                <TableCell>{(user.roles as any)?.name}</TableCell>
                <TableCell className="capitalize">
                  {user.status === "suspendu" ? "Inactif" : user.status}
                </TableCell>
                <TableCell>
                  <DropdownMenu>
                    <DropdownMenuTrigger asChild>
                      <Button
                        variant="ghost"
                        size="icon"
                        disabled={
                          toggleMutation.isPending ||
                          passwordMutation.isPending ||
                          deleteMutation.isPending
                        }
                      >
                        {toggleMutation.isPending ||
                        passwordMutation.isPending ||
                        deleteMutation.isPending ? (
                          <Loader2 className="h-4 w-4 animate-spin" />
                        ) : (
                          <MoreHorizontal className="h-4 w-4" />
                        )}
                      </Button>
                    </DropdownMenuTrigger>
                    <DropdownMenuContent align="end">
                      <UserFormDialog user={user} />
                      <DropdownMenuItem
                        onClick={() =>
                          passwordMutation.mutate({
                            data: {
                              id: user.id,
                            },
                          })
                        }
                      >
                        <Key className="mr-2 h-4 w-4" /> Réinitialiser le mot de passe
                      </DropdownMenuItem>
                      <DropdownMenuItem
                        onClick={() =>
                          toggleMutation.mutate({
                            data: {
                              id: user.id,
                              status: user.status === "actif" ? "suspendu" : "actif",
                            },
                          })
                        }
                      >
                        {user.status === "actif" ? (
                          <ToggleLeft className="mr-2 h-4 w-4" />
                        ) : (
                          <ToggleRight className="mr-2 h-4 w-4" />
                        )}
                        {user.status === "actif" ? "Désactiver" : "Activer"}
                      </DropdownMenuItem>
                      {canDeleteUser && (
                          <DropdownMenuItem
                            className="text-destructive"
                            onClick={() => {
                                setUserToDelete(user.id);
                                setUserToDeleteName(user.full_name);
                            }}
                          >
                            <Trash2 className="mr-2 h-4 w-4" /> Supprimer
                          </DropdownMenuItem>
                      )}
                    </DropdownMenuContent>
                  </DropdownMenu>
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </div>

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
