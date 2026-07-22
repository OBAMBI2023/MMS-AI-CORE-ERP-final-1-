import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Button } from "@/components/ui/button";
import { UserFormDialog } from "@/components/mms/UserFormDialog";
import { Loader2, Plus, MoreHorizontal, UserCog, Key, Trash2, ToggleLeft, ToggleRight } from "lucide-react";
import { updateUser, deleteUser, resetUserPassword } from "@/lib/user-management.server";
import { toast } from "sonner";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";

export function UserManagement() {
  const qc = useQueryClient();
  const { data: users, isLoading } = useQuery({
    queryKey: ["users"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("profiles")
        .select(`
          id, username, full_name, phone, status, last_login_at, created_at,
          roles(id, name)
        `);
      if (error) throw error;
      return data;
    },
  });

  const deleteMutation = useMutation({
    mutationFn: deleteUser,
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["users"] });
      toast.success("Utilisateur supprimé");
    },
  });

  const passwordMutation = useMutation({
    mutationFn: resetUserPassword,
    onSuccess: () => {
      toast.success("Mot de passe réinitialisé");
    },
  });

  if (isLoading) return <Loader2 className="animate-spin" />;

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
                <TableCell>{user.username}</TableCell>
                <TableCell>{(user.roles as any)?.name}</TableCell>
                <TableCell>{user.status}</TableCell>
                <TableCell>
                  <DropdownMenu>
                    <DropdownMenuTrigger asChild>
                      <Button variant="ghost" size="icon"><MoreHorizontal className="h-4 w-4" /></Button>
                    </DropdownMenuTrigger>
                    <DropdownMenuContent align="end">
                      <DropdownMenuItem><UserCog className="mr-2 h-4 w-4" /> Modifier</DropdownMenuItem>
                      <DropdownMenuItem onClick={() => passwordMutation.mutate({ id: user.id })}><Key className="mr-2 h-4 w-4" /> Réinitialiser le mot de passe</DropdownMenuItem>
                      <DropdownMenuItem><ToggleLeft className="mr-2 h-4 w-4" /> Activer/Désactiver</DropdownMenuItem>
                      <DropdownMenuItem className="text-destructive" onClick={() => deleteMutation.mutate({ id: user.id })}><Trash2 className="mr-2 h-4 w-4" /> Supprimer</DropdownMenuItem>
                    </DropdownMenuContent>
                  </DropdownMenu>
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </div>
    </div>
  );
}
