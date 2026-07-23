import { useState, useMemo } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Switch } from "@/components/ui/switch";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { toast } from "sonner";
import { Loader2, Save } from "lucide-react";

const MODULE_MAP: Record<string, string> = {
  "Dashboard": "dashboard.view",
  "Ventes": "ventes.view",
  "Devis": "ventes.view",
  "Clients": "clients.view",
  "Produits & Services": "ventes.view",
  "Achats": "achats.view",
  "Fournisseurs": "achats.view",
  "Dépenses": "ventes.view",
  "Rapports": "ventes.view",
  "Assistant IA": "assistant.use",
  "Paramètres": "settings.manage"
};

const ACTION_MAP: Record<string, string> = {
  "Voir": "view",
  "Créer": "create",
  "Modifier": "edit",
  "Supprimer": "delete",
  "Export PDF": "export",
  "Export Excel": "export",
  "Encaisser": "process"
};

export function PermissionsTab() {
  const qc = useQueryClient();
  
  const { data: roles, isLoading: rolesLoading } = useQuery({
    queryKey: ["roles"],
    queryFn: async () => {
      const { data, error } = await supabase.from("roles").select("*, role_permissions(permission_id, permissions(code))");
      if (error) throw error;
      return data;
    },
  });

  const { data: allPermissions, isLoading: permsLoading } = useQuery({
    queryKey: ["permissions"],
    queryFn: async () => {
      const { data, error } = await supabase.from("permissions").select("*");
      if (error) throw error;
      return data;
    },
  });

  const safePermissions = useMemo(() => Array.isArray(allPermissions) ? allPermissions : [], [allPermissions]);

  const [permissionsState, setPermissionsState] = useState<Record<string, Record<string, boolean>>>({});
  const [initialized, setInitialized] = useState(false);

  useMemo(() => {
    if (roles && safePermissions.length > 0 && !initialized) {
      const newState: Record<string, Record<string, boolean>> = {};
      roles.forEach(role => {
        newState[role.id] = {};
        safePermissions.forEach(perm => {
          newState[role.id][perm.id] = role.role_permissions.some(rp => rp.permission_id === perm.id);
        });
      });
      setPermissionsState(newState);
      setInitialized(true);
    }
  }, [roles, safePermissions, initialized]);

  const savePermissions = useMutation({
    mutationFn: async () => {
      // Calculate diff and apply
      for (const roleId in permissionsState) {
        for (const permId in permissionsState[roleId]) {
          const isEnabled = permissionsState[roleId][permId];
          const role = roles?.find(r => r.id === roleId);
          const currentEnabled = role?.role_permissions.some(rp => rp.permission_id === permId);

          if (isEnabled && !currentEnabled) {
            // Add
            const { error } = await supabase.from("role_permissions").insert({ role_id: roleId, permission_id: permId });
            if (error) throw error;
          } else if (!isEnabled && currentEnabled) {
            // Remove
            const { error } = await supabase.from("role_permissions").delete().eq("role_id", roleId).eq("permission_id", permId);
            if (error) throw error;
          }
        }
      }
    },
    onSuccess: () => {
      toast.success("Permissions enregistrées avec succès.");
      qc.invalidateQueries({ queryKey: ["roles"] });
    },
    onError: (e: Error) => toast.error(e.message),
  });

  if (rolesLoading || permsLoading) return <Loader2 className="animate-spin h-8 w-8 mx-auto my-10" />;

  const adminRoleId = roles?.find(r => r.name === 'Administrateur')?.id;

  const togglePermission = (roleId: string, permId: string) => {
    setPermissionsState(prev => ({
      ...prev,
      [roleId]: {
        ...prev[roleId],
        [permId]: !prev[roleId][permId]
      }
    }));
  };

  const renderTable = (items: Record<string, string>, type: 'module' | 'action') => (
    <div className="border rounded-xl bg-card shadow-sm mb-6">
        <div className="p-4 border-b">
            <h3 className="font-semibold text-lg">{type === 'module' ? 'CARTE 1 : Modules' : 'CARTE 2 : Actions'}</h3>
        </div>
        <Table>
            <TableHeader>
                <TableRow>
                    <TableHead className="w-[200px]">{type === 'module' ? 'Module' : 'Action'}</TableHead>
                    {roles?.map(role => <TableHead key={role.id} className="text-center">{role.name}</TableHead>)}
                </TableRow>
            </TableHeader>
            <TableBody>
                {Object.entries(items).map(([label, codeSnippet]) => {
                    const perm = safePermissions?.find(p => p.code.includes(codeSnippet));
                    if (!perm) return null;
                    return (
                        <TableRow key={label}>
                            <TableCell className="font-medium">{label}</TableCell>
                            {roles?.map(role => (
                                <TableCell key={role.id} className="text-center">
                                    <Switch
                                        checked={permissionsState[role.id]?.[perm.id]}
                                        onCheckedChange={() => togglePermission(role.id, perm.id)}
                                        disabled={role.id === adminRoleId}
                                    />
                                </TableCell>
                            ))}
                        </TableRow>
                    );
                })}
            </TableBody>
        </Table>
    </div>
  );

  return (
    <div className="space-y-6">
      {renderTable(MODULE_MAP, 'module')}
      {renderTable(ACTION_MAP, 'action')}
      <div className="flex justify-end">
        <Button onClick={() => savePermissions.mutate()} disabled={savePermissions.isPending} className="gap-2">
            {savePermissions.isPending ? <Loader2 className="animate-spin h-4 w-4" /> : <Save className="h-4 w-4" />}
            💾 Enregistrer les permissions
        </Button>
      </div>
    </div>
  );
}

