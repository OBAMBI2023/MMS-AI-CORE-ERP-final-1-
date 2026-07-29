import { useState, useMemo } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
  DialogFooter,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Checkbox } from "@/components/ui/checkbox";
import { Label } from "@/components/ui/label";
import { toast } from "sonner";
import { Loader2, Plus, Pencil, Trash2 } from "lucide-react";
import { usePermissions } from "@/hooks/use-permissions";
import { useActionPermission } from "@/hooks/use-action-permission";
import { logAction } from "@/lib/audit.server";
import { useTenant } from "@/providers/TenantProvider";
import { formatSupabaseError } from "@/lib/supabase-error";

export function RolesManagement() {
  const qc = useQueryClient();
  const { data: userData } = useQuery({ queryKey: ["user"], queryFn: () => supabase.auth.getUser() });
  const permissionsQuery = usePermissions();
  const { roleId } = permissionsQuery.data || { roleId: null };
  const userId = userData?.data?.user?.id;
  const canDeleteRole = useActionPermission("roles.delete");
  const { profile, loading: tenantLoading } = useTenant();
  const tenantId = profile?.tenant_id;

  const { data: roles, isLoading } = useQuery({
    queryKey: ["roles", tenantId],
    queryFn: async () => {
      if (!tenantId) return [];
      const { data, error } = await supabase
        .from("roles")
        .select("*, role_permissions(permission_id, permissions(code))")
        .eq("tenant_id", tenantId);
      if (error) throw error;
      return data;
    },
    enabled: !tenantLoading && Boolean(tenantId),
  });

  const { data: allPermissions } = useQuery({
    queryKey: ["permissions"],
    queryFn: async () => {
      const { data, error } = await supabase.from("permissions").select("*");
      if (error) throw error;
      return data;
    },
  });

  const deleteRole = useMutation({
    mutationFn: async (role: any) => {
      if (!tenantId || role.tenant_id !== tenantId) {
        throw new Error("Ce rôle n'appartient pas au tenant actif.");
      }
      const { error } = await supabase
        .from("roles")
        .delete()
        .eq("id", role.id)
        .eq("tenant_id", tenantId);
      if (error) throw error;
      return role;
    },
    onSuccess: async (role) => {
      if (userId) {
        await logAction(userId, roleId ?? null, "delete", "roles", { role_name: role.name });
      }
      toast.success("Rôle supprimé");
      qc.invalidateQueries({ queryKey: ["roles", tenantId] });
    },
    onError: (error) => toast.error(formatSupabaseError(error)),
  });

  if (isLoading) return <Loader2 className="animate-spin h-8 w-8 mx-auto my-10" />;

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <h2 className="text-xl font-semibold">Gestion des rôles</h2>
        <RoleDialog permissions={allPermissions || []} tenantId={tenantId} />
      </div>
      <div className="grid gap-3">
        {roles?.map((role) => (
          <div
            key={role.id}
            className="p-4 border border-border rounded-xl bg-card flex items-center justify-between shadow-sm"
          >
            <div>
              <h3 className="font-semibold text-base">{role.name}</h3>
              <p className="text-sm text-muted-foreground">{role.description}</p>
            </div>
            <div className="flex gap-1">
              <RoleDialog role={role} permissions={allPermissions || []} tenantId={tenantId} />
              {canDeleteRole && (
                <Button
                    variant="ghost"
                    size="sm"
                    className="text-destructive hover:text-destructive/90"
                    onClick={() => {
                    if (confirm("Supprimer ce rôle ?")) deleteRole.mutate(role);
                    }}
                >
                    <Trash2 className="h-4 w-4" />
                </Button>
              )}
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}

function RoleDialog({
  role,
  permissions,
  tenantId,
}: {
  role?: any;
  permissions: any[];
  tenantId?: string;
}) {
  const qc = useQueryClient();
  const [open, setOpen] = useState(false);
  const [name, setName] = useState(role?.name || "");
  const [description, setDescription] = useState(role?.description || "");
  const [selectedPermissions, setSelectedPermissions] = useState<string[]>(
    role?.role_permissions?.map((rp: any) => rp.permission_id) || [],
  );

  const modules = useMemo(() => {
    const m: Record<string, typeof permissions> = {};
    permissions.forEach((p) => {
      const mod = p.code.split(".")[0];
      if (!m[mod]) m[mod] = [];
      m[mod].push(p);
    });
    return m;
  }, [permissions]);

  const saveRole = useMutation({
    mutationFn: async () => {
      if (!tenantId) throw new Error("Aucun tenant actif.");
      if (role) {
        if (role.tenant_id !== tenantId) {
          throw new Error("Ce rôle n'appartient pas au tenant actif.");
        }
        const { error: roleError } = await supabase
          .from("roles")
          .update({ name, description })
          .eq("id", role.id)
          .eq("tenant_id", tenantId);
        if (roleError) throw roleError;

        const { error: deleteError } = await supabase
          .from("role_permissions")
          .delete()
          .eq("role_id", role.id);
        if (deleteError) throw deleteError;
        if (selectedPermissions.length > 0) {
          const { error } = await supabase
            .from("role_permissions")
            .insert(selectedPermissions.map((pid) => ({ role_id: role.id, permission_id: pid })));
          if (error) throw error;
        }
      } else {
        const { data: newRole, error: roleError } = await supabase
          .from("roles")
          .insert({ name, description, tenant_id: tenantId })
          .select()
          .single();
        if (roleError) throw roleError;

        if (selectedPermissions.length > 0) {
          const { error } = await supabase
            .from("role_permissions")
            .insert(
              selectedPermissions.map((pid) => ({ role_id: newRole.id, permission_id: pid })),
            );
          if (error) throw error;
        }
      }
    },
    onSuccess: () => {
      toast.success("Rôle enregistré");
      setOpen(false);
      qc.invalidateQueries({ queryKey: ["roles", tenantId] });
    },
    onError: (error) => toast.error(formatSupabaseError(error)),
  });

  const toggleAll = (checked: boolean) => {
    if (checked) setSelectedPermissions(permissions.map((p) => p.id));
    else setSelectedPermissions([]);
  };

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button variant={role ? "outline" : "default"} size={role ? "icon" : "default"}>
          {role ? (
            <Pencil className="h-4 w-4" />
          ) : (
            <>
              <Plus className="h-4 w-4 mr-2" /> Créer
            </>
          )}
        </Button>
      </DialogTrigger>
      <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="text-xl">
            {role ? "Modifier le rôle" : "Créer un rôle"}
          </DialogTitle>
        </DialogHeader>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-6 py-4">
          <div className="space-y-4">
            <div className="space-y-1.5">
              <Label>Nom du rôle</Label>
              <Input value={name} onChange={(e) => setName(e.target.value)} />
            </div>
            <div className="space-y-1.5">
              <Label>Description</Label>
              <Textarea
                value={description}
                onChange={(e) => setDescription(e.target.value)}
                rows={4}
              />
            </div>
          </div>

          <div className="border rounded-xl p-4 bg-muted/30">
            <div className="flex items-center justify-between mb-4">
              <Label className="text-base">Permissions</Label>
              <div className="flex gap-1">
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => toggleAll(true)}
                  className="text-xs"
                >
                  Tout cocher
                </Button>
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => toggleAll(false)}
                  className="text-xs"
                >
                  Tout décocher
                </Button>
              </div>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              {Object.entries(modules).map(([mod, perms]) => (
                <div key={mod} className="space-y-2">
                  <h4 className="font-semibold text-sm capitalize text-muted-foreground">{mod}</h4>
                  {perms.map((p) => (
                    <div key={p.id} className="flex items-center space-x-2">
                      <Checkbox
                        id={p.id}
                        checked={
                          Array.isArray(selectedPermissions) && selectedPermissions.includes(p.id)
                        }
                        onCheckedChange={(checked) => {
                          if (checked) setSelectedPermissions([...selectedPermissions, p.id]);
                          else
                            setSelectedPermissions(selectedPermissions.filter((id) => id !== p.id));
                        }}
                      />
                      <label htmlFor={p.id} className="text-sm cursor-pointer">
                        {p.code.split(".")[1]}
                      </label>
                    </div>
                  ))}
                </div>
              ))}
            </div>
          </div>
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={() => setOpen(false)}>
            Annuler
          </Button>
          <Button onClick={() => saveRole.mutate()} disabled={saveRole.isPending}>
            {saveRole.isPending && <Loader2 className="h-4 w-4 mr-2 animate-spin" />}
            Enregistrer
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
