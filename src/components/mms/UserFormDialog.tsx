import { useState } from "react";
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
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { toast } from "sonner";
import { Loader2, Plus, User, Mail, Phone, Shield, Lock, Eye, EyeOff } from "lucide-react";
import { createUser } from "@/lib/user-management.server";

export function UserFormDialog() {
  const [open, setOpen] = useState(false);
  const [showPassword, setShowPassword] = useState(false);
  const [formData, setFormData] = useState({
    email: "",
    password: "",
    confirmPassword: "",
    role_id: "",
    username: "",
    phone: "",
    status: "actif"
  });

  const qc = useQueryClient();
  const { data: roles } = useQuery({
    queryKey: ["roles"],
    queryFn: async () => {
      const { data, error } = await supabase.from("roles").select("id, name");
      if (error) throw error;
      return data;
    },
  });

  const mutation = useMutation({
    mutationFn: createUser,
    onSuccess: () => {
      toast.success("Utilisateur créé avec succès");
      setOpen(false);
      qc.invalidateQueries({ queryKey: ["users"] });
      setFormData({
        email: "",
        password: "",
        confirmPassword: "",
        role_id: "",
        username: "",
        phone: "",
        status: "actif"
      });
    },
    onError: (error: any) => {
      toast.error(error.message || "Erreur lors de la création");
    }
  });

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (formData.password !== formData.confirmPassword) {
      toast.error("Les mots de passe ne correspondent pas");
      return;
    }
    mutation.mutate({
      data: {
        email: formData.email,
        password: formData.password,
        role_id: formData.role_id,
        username: formData.username,
        phone: formData.phone,
        status: formData.status as any
      }
    });
  };

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button className="bg-[#2563EB] hover:bg-[#1D4ED8]">
          <Plus className="mr-2 h-4 w-4" /> Nouvel utilisateur
        </Button>
      </DialogTrigger>
      <DialogContent className="max-w-[760px] p-0 overflow-hidden rounded-[18px] shadow-2xl">
        <DialogHeader className="p-6 pb-2 bg-[#F8FAFC]">
          <div className="flex justify-between items-start">
            <div className="flex gap-4 items-center">
              <div className="p-3 bg-[#E0E7FF] rounded-full text-[#2563EB]">
                <User className="h-6 w-6" />
              </div>
              <div>
                <DialogTitle className="text-xl">Nouvel utilisateur</DialogTitle>
                <p className="text-sm text-gray-500">Créez un nouveau compte collaborateur et attribuez immédiatement ses permissions.</p>
              </div>
            </div>
          </div>
        </DialogHeader>
        <form onSubmit={handleSubmit}>
          <div className="p-6 grid grid-cols-2 gap-6">
            <div className="space-y-4">
              <div className="space-y-1.5">
                <Label>Nom d'utilisateur</Label>
                <div className="relative">
                  <User className="absolute left-3 top-2.5 h-4 w-4 text-gray-400" />
                  <Input className="pl-9" placeholder="Ex : ali.traore" value={formData.username} onChange={(e) => setFormData({...formData, username: e.target.value})} required disabled={mutation.isPending} />
                </div>
              </div>
              <div className="space-y-1.5">
                <Label>Email</Label>
                <div className="relative">
                  <Mail className="absolute left-3 top-2.5 h-4 w-4 text-gray-400" />
                  <Input className="pl-9" type="email" placeholder="Ex : ali@entreprise.ci" value={formData.email} onChange={(e) => setFormData({...formData, email: e.target.value})} required disabled={mutation.isPending} />
                </div>
              </div>
              <div className="space-y-1.5">
                <Label>Téléphone</Label>
                <div className="relative">
                  <Phone className="absolute left-3 top-2.5 h-4 w-4 text-gray-400" />
                  <Input className="pl-9" placeholder="Ex : 07 58 48 37 26" value={formData.phone} onChange={(e) => setFormData({...formData, phone: e.target.value})} disabled={mutation.isPending} />
                </div>
              </div>
            </div>
            <div className="space-y-4">
              <div className="space-y-1.5">
                <Label>Rôle</Label>
                <div className="relative">
                  <Shield className="absolute left-3 top-2.5 h-4 w-4 text-gray-400 z-10" />
                  <Select value={formData.role_id} onValueChange={(value) => setFormData({...formData, role_id: value})} required disabled={mutation.isPending}>
                    <SelectTrigger className="pl-9">
                      <SelectValue placeholder="Sélectionner un rôle" />
                    </SelectTrigger>
                    <SelectContent>
                      {roles?.map((role) => (
                        <SelectItem key={role.id} value={role.id}>{role.name}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
              </div>
              <div className="space-y-1.5">
                <Label>Mot de passe</Label>
                <div className="relative">
                  <Lock className="absolute left-3 top-2.5 h-4 w-4 text-gray-400" />
                  <Input className="pl-9 pr-9" type={showPassword ? "text" : "password"} placeholder="••••••••" value={formData.password} onChange={(e) => setFormData({...formData, password: e.target.value})} required disabled={mutation.isPending} />
                  <button type="button" className="absolute right-3 top-2.5 text-gray-400" onClick={() => setShowPassword(!showPassword)}>
                    {showPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                  </button>
                </div>
              </div>
              <div className="space-y-1.5">
                <Label>Confirmation</Label>
                <div className="relative">
                  <Lock className="absolute left-3 top-2.5 h-4 w-4 text-gray-400" />
                  <Input className="pl-9" type={showPassword ? "text" : "password"} placeholder="••••••••" value={formData.confirmPassword} onChange={(e) => setFormData({...formData, confirmPassword: e.target.value})} required disabled={mutation.isPending} />
                </div>
              </div>
              <div className="space-y-1.5">
                <Label>Statut</Label>
                <Select value={formData.status} onValueChange={(value) => setFormData({...formData, status: value})} required disabled={mutation.isPending}>
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
            <Button type="button" variant="outline" onClick={() => setOpen(false)} disabled={mutation.isPending}>Annuler</Button>
            <Button type="submit" className="bg-[#2563EB] hover:bg-[#1D4ED8]" disabled={mutation.isPending}>
              {mutation.isPending ? (
                <><Loader2 className="mr-2 h-4 w-4 animate-spin" /> Création du compte...</>
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
