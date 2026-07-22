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
import { Loader2, Plus } from "lucide-react";
import { createUser } from "@/lib/user-management.server";

export function UserFormDialog() {
  const [open, setOpen] = useState(false);
  const [formData, setFormData] = useState({
    email: "",
    password: "",
    confirmPassword: "",
    role_id: "",
    full_name: "",
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
      toast.success("Utilisateur créé");
      setOpen(false);
      qc.invalidateQueries({ queryKey: ["users"] });
      setFormData({
        email: "",
        password: "",
        confirmPassword: "",
        role_id: "",
        full_name: "",
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
      email: formData.email,
      password: formData.password,
      role_id: formData.role_id,
      full_name: formData.full_name,
      username: formData.username,
      phone: formData.phone,
      status: formData.status as any
    });
  };

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button>
          <Plus className="mr-2 h-4 w-4" /> Nouvel utilisateur
        </Button>
      </DialogTrigger>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle>Nouvel utilisateur</DialogTitle>
        </DialogHeader>
        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="space-y-1.5">
            <Label>Nom complet</Label>
            <Input value={formData.full_name} onChange={(e) => setFormData({...formData, full_name: e.target.value})} required />
          </div>
          <div className="space-y-1.5">
            <Label>Nom d'utilisateur</Label>
            <Input value={formData.username} onChange={(e) => setFormData({...formData, username: e.target.value})} required />
          </div>
          <div className="space-y-1.5">
            <Label>Email</Label>
            <Input type="email" value={formData.email} onChange={(e) => setFormData({...formData, email: e.target.value})} required />
          </div>
          <div className="space-y-1.5">
            <Label>Téléphone</Label>
            <Input value={formData.phone} onChange={(e) => setFormData({...formData, phone: e.target.value})} />
          </div>
          <div className="space-y-1.5">
            <Label>Rôle</Label>
            <Select value={formData.role_id} onValueChange={(value) => setFormData({...formData, role_id: value})} required>
              <SelectTrigger>
                <SelectValue placeholder="Sélectionner un rôle" />
              </SelectTrigger>
              <SelectContent>
                {roles?.map((role) => (
                  <SelectItem key={role.id} value={role.id}>{role.name}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          <div className="space-y-1.5">
            <Label>Mot de passe</Label>
            <Input type="password" value={formData.password} onChange={(e) => setFormData({...formData, password: e.target.value})} required />
          </div>
          <div className="space-y-1.5">
            <Label>Confirmation du mot de passe</Label>
            <Input type="password" value={formData.confirmPassword} onChange={(e) => setFormData({...formData, confirmPassword: e.target.value})} required />
          </div>
          <div className="space-y-1.5">
            <Label>Statut</Label>
            <Select value={formData.status} onValueChange={(value) => setFormData({...formData, status: value})} required>
              <SelectTrigger>
                <SelectValue placeholder="Sélectionner un statut" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="actif">Actif</SelectItem>
                <SelectItem value="suspendu">Suspendu</SelectItem>
                <SelectItem value="archivé">Archivé</SelectItem>
              </SelectContent>
            </Select>
          </div>
          <DialogFooter>
            <Button type="submit" disabled={mutation.isPending}>
              {mutation.isPending && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
              Créer
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
