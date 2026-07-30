import { useState, useEffect } from "react";
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
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { toast } from "sonner";
import { Loader2, Plus, User, Mail, Phone, Shield, Lock, Eye, EyeOff, Pencil } from "lucide-react";
import { createUser, updateUser } from "@/lib/user-management.server";
import { useTenant } from "@/providers/TenantProvider";
import { formatSupabaseError } from "@/lib/supabase-error";
import { AvatarManager } from "@/components/mms/AvatarManager";

export function UserFormDialog({ user }: { user?: any }) {
  const { profile, loading: tenantLoading } = useTenant();
  const tenantId = profile?.tenant_id;
  const [open, setOpen] = useState(false);
  const [showPassword, setShowPassword] = useState(false);
  const isEdit = !!user;

  const [formData, setFormData] = useState({
    email: user?.username || "", // Assuming username is email based on current implementation
    password: "",
    confirmPassword: "",
    role_id: (user?.roles as any)?.id || "",
    full_name: user?.full_name || "",
    username: user?.username || "",
    phone: user?.phone || "",
    status: user?.status || "actif",
  });

  useEffect(() => {
    if (user) {
      setFormData({
        email: user.username || "",
        password: "",
        confirmPassword: "",
        role_id: (user.roles as any)?.id || "",
        full_name: user.full_name || "",
        username: user.username || "",
        phone: user.phone || "",
        status: user.status || "actif",
      });
    }
  }, [user]);

  const qc = useQueryClient();
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

  const createMutation = useMutation({
    mutationFn: createUser,
    onSuccess: () => {
      toast.success("Utilisateur créé");
      setOpen(false);
      qc.invalidateQueries({ queryKey: ["users", tenantId] });
      setFormData({
        email: "",
        password: "",
        confirmPassword: "",
        role_id: "",
        full_name: "",
        username: "",
        phone: "",
        status: "actif",
      });
    },
    onError: (error: any) => {
      toast.error(formatSupabaseError(error));
    },
  });

  const updateMutation = useMutation({
    mutationFn: updateUser,
    onSuccess: () => {
      toast.success("Utilisateur mis à jour");
      setOpen(false);
      qc.invalidateQueries({ queryKey: ["users", tenantId] });
    },
    onError: (error: any) => {
      toast.error(formatSupabaseError(error));
    },
  });

  const mutation = isEdit ? updateMutation : createMutation;

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (mutation.isPending) return;

    if (!isEdit && formData.password !== formData.confirmPassword) {
      toast.error("Les mots de passe ne correspondent pas");
      return;
    }

    if (isEdit) {
      const payload = {
        id: user.id,
        role_id: formData.role_id,
        status: formData.status as any,
        full_name: formData.full_name,
        username: formData.username,
        phone: formData.phone,
      };
      updateMutation.mutate({ data: payload });
    } else {
      const payload = {
        email: formData.email,
        password: formData.password,
        role_id: formData.role_id,
        full_name: formData.full_name,
        username: formData.username,
        phone: formData.phone,
        status: formData.status as any,
      };
      createMutation.mutate({ data: payload });
    }
  };

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        {isEdit ? (
          <button className="flex w-full items-center px-2 py-1.5 text-sm outline-none hover:bg-slate-100">
            <Pencil className="mr-2 h-4 w-4" /> Modifier
          </button>
        ) : (
          <Button className="bg-[#2563EB] hover:bg-[#1D4ED8]">
            <Plus className="mr-2 h-4 w-4" /> Nouvel utilisateur
          </Button>
        )}
      </DialogTrigger>
      <DialogContent className="max-w-[760px] p-0 overflow-hidden rounded-[18px] shadow-2xl">
        <DialogHeader className="p-6 pb-2 bg-[#F8FAFC]">
          <div className="flex justify-between items-start">
            <div className="flex gap-4 items-center">
              <div className="p-3 bg-[#E0E7FF] rounded-full text-[#2563EB]">
                <User className="h-6 w-6" />
              </div>
              <div>
                <DialogTitle className="text-xl">
                  {isEdit ? "Modifier l'utilisateur" : "Nouvel utilisateur"}
                </DialogTitle>
                <p className="text-sm text-gray-500">
                  {isEdit
                    ? "Modifiez les informations du collaborateur."
                    : "Créez un nouveau compte collaborateur et attribuez immédiatement ses permissions."}
                </p>
              </div>
            </div>
          </div>
        </DialogHeader>
        <form onSubmit={handleSubmit}>
          {isEdit && tenantId && (
            <div className="border-b px-6 py-5">
              <AvatarManager
                userId={user.id}
                tenantId={tenantId}
                name={formData.full_name}
                email={user.email}
                avatarPath={user.avatar_url}
              />
            </div>
          )}
          <div className="p-6 grid grid-cols-2 gap-6">
            <div className="space-y-4">
              <div className="space-y-1.5">
                <Label>Nom complet</Label>
                <Input
                  placeholder="Ex : Ali Traoré"
                  value={formData.full_name}
                  onChange={(e) => setFormData({ ...formData, full_name: e.target.value })}
                  required
                  disabled={mutation.isPending}
                />
              </div>
              <div className="space-y-1.5">
                <Label>Nom d'utilisateur</Label>
                <Input
                  placeholder="Ex : ali.traore"
                  value={formData.username}
                  onChange={(e) => setFormData({ ...formData, username: e.target.value })}
                  required
                  disabled={mutation.isPending}
                />
              </div>
              {!isEdit && (
                <div className="space-y-1.5">
                  <Label>Email</Label>
                  <Input
                    type="email"
                    placeholder="Ex : ali@entreprise.ci"
                    value={formData.email}
                    onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                    required
                    disabled={mutation.isPending}
                  />
                </div>
              )}
              <div className="space-y-1.5">
                <Label>Téléphone</Label>
                <Input
                  placeholder="Ex : 07 58 48 37 26"
                  value={formData.phone}
                  onChange={(e) => setFormData({ ...formData, phone: e.target.value })}
                  disabled={mutation.isPending}
                />
              </div>
            </div>
            <div className="space-y-4">
              <div className="space-y-1.5">
                <Label>Rôle</Label>
                <Select
                  value={formData.role_id}
                  onValueChange={(value) => setFormData({ ...formData, role_id: value })}
                  required
                  disabled={mutation.isPending}
                >
                  <SelectTrigger>
                    <SelectValue placeholder="Sélectionner un rôle" />
                  </SelectTrigger>
                  <SelectContent>
                    {roles?.map((role) => (
                      <SelectItem key={role.id} value={role.id}>
                        {role.name}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              {!isEdit && (
                <>
                  <div className="space-y-1.5">
                    <Label>Mot de passe</Label>
                    <div className="relative">
                      <Input
                        type={showPassword ? "text" : "password"}
                        placeholder="••••••••"
                        value={formData.password}
                        onChange={(e) => setFormData({ ...formData, password: e.target.value })}
                        required
                        disabled={mutation.isPending}
                      />
                      <button
                        type="button"
                        className="absolute right-3 top-2.5 text-gray-400"
                        onClick={() => setShowPassword(!showPassword)}
                      >
                        {showPassword ? (
                          <EyeOff className="h-4 w-4" />
                        ) : (
                          <Eye className="h-4 w-4" />
                        )}
                      </button>
                    </div>
                  </div>
                  <div className="space-y-1.5">
                    <Label>Confirmation</Label>
                    <Input
                      type={showPassword ? "text" : "password"}
                      placeholder="••••••••"
                      value={formData.confirmPassword}
                      onChange={(e) =>
                        setFormData({ ...formData, confirmPassword: e.target.value })
                      }
                      required
                      disabled={mutation.isPending}
                    />
                  </div>
                </>
              )}
              <div className="space-y-1.5">
                <Label>Statut</Label>
                <Select
                  value={formData.status}
                  onValueChange={(value) => setFormData({ ...formData, status: value })}
                  required
                  disabled={mutation.isPending}
                >
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="actif">● Actif</SelectItem>
                    <SelectItem value="suspendu">● Désactivé</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>
          </div>
          <DialogFooter className="p-6 bg-[#F8FAFC] border-t">
            <Button
              type="button"
              variant="outline"
              onClick={() => setOpen(false)}
              disabled={mutation.isPending}
            >
              Annuler
            </Button>
            <Button
              type="submit"
              className="bg-[#2563EB] hover:bg-[#1D4ED8]"
              disabled={mutation.isPending}
            >
              {mutation.isPending ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />{" "}
                  {isEdit ? "Enregistrement..." : "Création..."}
                </>
              ) : isEdit ? (
                "Enregistrer les modifications"
              ) : (
                "+ Créer l'utilisateur"
              )}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
