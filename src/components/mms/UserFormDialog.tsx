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
import {
  Loader2,
  Plus,
  UserRound,
  Eye,
  EyeOff,
  Pencil,
  ShieldCheck,
  AtSign,
  Mail,
  Lock,
} from "lucide-react";
import { createUser, updateUser } from "@/lib/user-management.server";
import { useTenant } from "@/providers/TenantProvider";
import { formatSupabaseError } from "@/lib/supabase-error";
import { AvatarManager } from "@/components/mms/AvatarManager";
import { cn } from "@/lib/utils";

const fieldInputClass =
  "h-12 rounded-[12px] border-gray-200 bg-white pl-11 text-[15px] text-gray-900 shadow-none placeholder:text-gray-400 focus-visible:border-blue-500 focus-visible:ring-2 focus-visible:ring-blue-500/20 focus-visible:ring-offset-0";

const fieldSelectClass =
  "h-12 rounded-[12px] border-gray-200 bg-white pl-11 text-[15px] text-gray-900 shadow-none data-[placeholder]:text-gray-400 focus:border-blue-500 focus:ring-2 focus:ring-blue-500/20 focus:ring-offset-0";

const fieldLabelClass = "text-sm font-semibold text-gray-700";

const fieldIconClass = "pointer-events-none absolute left-3.5 top-1/2 h-4 w-4 -translate-y-1/2 text-gray-400";

export function UserFormDialog({
  user,
  triggerClassName,
}: {
  user?: any;
  triggerClassName?: string;
}) {
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
        full_name: formData.username,
        username: formData.username,
        status: "actif" as const,
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
          <Button className={cn("bg-[#2563EB] hover:bg-[#1D4ED8]", triggerClassName)}>
            <Plus className="mr-2 h-4 w-4" /> Nouvel utilisateur
          </Button>
        )}
      </DialogTrigger>
      <DialogContent
        className={cn(
          "flex w-[calc(100vw-24px)] flex-col gap-0 overflow-hidden rounded-2xl border-none p-0 shadow-2xl sm:w-[calc(100vw-48px)] max-h-[calc(100dvh-24px)]",
          isEdit ? "max-w-[960px]" : "max-w-[440px]",
        )}
      >
        <DialogHeader
          className={cn(
            "shrink-0 border-b border-gray-100 bg-white pr-12",
            isEdit ? "px-[18px] py-5 sm:px-8 sm:py-6" : "px-5 py-4 sm:px-6",
          )}
        >
          <div className="flex items-start gap-3">
            <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-blue-50 text-blue-600">
              <UserRound className="h-5 w-5" />
            </div>
            <div className="min-w-0 text-left">
              <DialogTitle className="text-lg font-semibold text-gray-900">
                {isEdit ? "Modifier l'utilisateur" : "Nouvel utilisateur"}
              </DialogTitle>
              <p className="mt-0.5 text-sm text-gray-500">
                {isEdit ? "Modifiez les informations du collaborateur." : "Ajoutez un collaborateur."}
              </p>
            </div>
          </div>
        </DialogHeader>
        <form onSubmit={handleSubmit} className="flex min-h-0 flex-1 flex-col">
          <div
            className={cn(
              "flex-1 overflow-y-auto overflow-x-hidden",
              isEdit ? "px-[18px] py-5 sm:px-8 sm:py-7" : "px-5 py-4 sm:px-6",
            )}
          >
            {isEdit && tenantId && (
              <div className="mb-6 border-b border-gray-100 pb-6">
                <AvatarManager
                  userId={user.id}
                  tenantId={tenantId}
                  name={formData.full_name}
                  email={user.email}
                  avatarPath={user.avatar_url}
                />
              </div>
            )}
            <div className="grid grid-cols-1 gap-x-7 gap-y-3.5 sm:grid-cols-2">
              {isEdit && (
                <div className="space-y-1.5">
                  <Label className={fieldLabelClass}>Nom complet</Label>
                  <div className="relative">
                    <UserRound className={fieldIconClass} />
                    <Input
                      className={fieldInputClass}
                      placeholder="Ex : Ali Traoré"
                      value={formData.full_name}
                      onChange={(e) => setFormData({ ...formData, full_name: e.target.value })}
                      required
                      disabled={mutation.isPending}
                    />
                  </div>
                </div>
              )}
              <div className="space-y-1.5">
                <Label className={fieldLabelClass}>Rôle</Label>
                <div className="relative">
                  <ShieldCheck className={fieldIconClass} />
                  <Select
                    value={formData.role_id}
                    onValueChange={(value) => setFormData({ ...formData, role_id: value })}
                    required
                    disabled={mutation.isPending}
                  >
                    <SelectTrigger className={fieldSelectClass}>
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
              </div>
              <div className="space-y-1.5">
                <Label className={fieldLabelClass}>Nom d'utilisateur</Label>
                <div className="relative">
                  <AtSign className={fieldIconClass} />
                  <Input
                    className={fieldInputClass}
                    placeholder="Ex : ali.traore"
                    value={formData.username}
                    onChange={(e) => setFormData({ ...formData, username: e.target.value })}
                    required
                    disabled={mutation.isPending}
                  />
                </div>
              </div>
              {!isEdit && (
                <div className="space-y-1.5">
                  <Label className={fieldLabelClass}>Email</Label>
                  <div className="relative">
                    <Mail className={fieldIconClass} />
                    <Input
                      className={fieldInputClass}
                      type="email"
                      placeholder="Ex : ali@entreprise.ci"
                      value={formData.email}
                      onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                      required
                      disabled={mutation.isPending}
                    />
                  </div>
                </div>
              )}
              {!isEdit && (
                <div className="space-y-1.5">
                  <Label className={fieldLabelClass}>Mot de passe</Label>
                  <div className="relative">
                    <Lock className={fieldIconClass} />
                    <Input
                      className={cn(fieldInputClass, "pr-11")}
                      type={showPassword ? "text" : "password"}
                      placeholder="••••••••"
                      value={formData.password}
                      onChange={(e) => setFormData({ ...formData, password: e.target.value })}
                      required
                      disabled={mutation.isPending}
                    />
                    <button
                      type="button"
                      className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 transition-colors hover:text-gray-600"
                      onClick={() => setShowPassword(!showPassword)}
                    >
                      {showPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                    </button>
                  </div>
                </div>
              )}
              {!isEdit && (
                <div className="space-y-1.5">
                  <Label className={fieldLabelClass}>Confirmation</Label>
                  <div className="relative">
                    <Lock className={fieldIconClass} />
                    <Input
                      className={fieldInputClass}
                      type={showPassword ? "text" : "password"}
                      placeholder="••••••••"
                      value={formData.confirmPassword}
                      onChange={(e) => setFormData({ ...formData, confirmPassword: e.target.value })}
                      required
                      disabled={mutation.isPending}
                    />
                  </div>
                </div>
              )}
              {isEdit && (
                <div className="space-y-1.5">
                  <Label className={fieldLabelClass}>Téléphone</Label>
                  <div className="relative">
                    <Input
                      className={cn(fieldInputClass, "pl-4")}
                      placeholder="Ex : 07 58 48 37 26"
                      value={formData.phone}
                      onChange={(e) => setFormData({ ...formData, phone: e.target.value })}
                      disabled={mutation.isPending}
                    />
                  </div>
                </div>
              )}
              {isEdit && (
                <div className="space-y-1.5">
                  <Label className={fieldLabelClass}>Statut</Label>
                  <Select
                    value={formData.status}
                    onValueChange={(value) => setFormData({ ...formData, status: value })}
                    required
                    disabled={mutation.isPending}
                  >
                    <SelectTrigger className={cn(fieldSelectClass, "pl-4")}>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="actif">● Actif</SelectItem>
                      <SelectItem value="suspendu">● Désactivé</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              )}
            </div>
          </div>
          <DialogFooter
            className={cn(
              "shrink-0 gap-2 border-t border-gray-100 bg-white",
              isEdit ? "px-[18px] py-4 sm:px-8 sm:py-5" : "px-5 py-4 sm:px-6",
            )}
          >
            <Button
              type="button"
              variant="ghost"
              onClick={() => setOpen(false)}
              disabled={mutation.isPending}
              className={cn(
                "h-12 rounded-[12px] text-gray-600 hover:bg-gray-100 hover:text-gray-900",
                !isEdit && "w-full sm:w-auto",
              )}
            >
              Annuler
            </Button>
            <Button
              type="submit"
              className={cn(
                "h-12 rounded-[12px] bg-[#2563EB] px-5 font-medium hover:bg-[#1D4ED8]",
                !isEdit && "w-full sm:w-auto",
              )}
              disabled={mutation.isPending}
            >
              {mutation.isPending ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  {isEdit ? "Enregistrement..." : "Création..."}
                </>
              ) : isEdit ? (
                "Enregistrer les modifications"
              ) : (
                <>
                  <Plus className="mr-2 h-4 w-4" />
                  Créer l'utilisateur
                </>
              )}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
