import { zodResolver } from "@hookform/resolvers/zod";
import { useMutation } from "@tanstack/react-query";
import { KeyRound, Loader2 } from "lucide-react";
import { useForm } from "react-hook-form";
import { toast } from "sonner";
import * as z from "zod";
import { Panel } from "@/components/settings/tabs/GeneralTab";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { supabase } from "@/integrations/supabase/client";

const passwordSchema = z
  .object({
    currentPassword: z.string().min(1, "Le mot de passe actuel est requis"),
    newPassword: z.string().min(8, "Le mot de passe doit contenir au moins 8 caractères"),
    confirmPassword: z.string(),
  })
  .refine((values) => values.newPassword === values.confirmPassword, {
    message: "Les mots de passe ne correspondent pas",
    path: ["confirmPassword"],
  })
  .refine((values) => values.currentPassword !== values.newPassword, {
    message: "Le nouveau mot de passe doit être différent de l’actuel",
    path: ["newPassword"],
  });

type PasswordValues = z.infer<typeof passwordSchema>;

export function SecurityTab() {
  const {
    register,
    handleSubmit,
    reset,
    formState: { errors },
  } = useForm<PasswordValues>({ resolver: zodResolver(passwordSchema) });

  const changePassword = useMutation({
    mutationFn: async (values: PasswordValues) => {
      const {
        data: { user },
      } = await supabase.auth.getUser();
      if (!user?.email) throw new Error("Session introuvable. Reconnectez-vous.");

      const { error: verifyError } = await supabase.auth.signInWithPassword({
        email: user.email,
        password: values.currentPassword,
      });
      if (verifyError) throw new Error("Le mot de passe actuel est incorrect.");

      const { error: updateError } = await supabase.auth.updateUser({ password: values.newPassword });
      if (updateError) throw new Error(updateError.message || "Impossible de modifier le mot de passe.");
    },
    onSuccess: () => {
      toast.success("Mot de passe modifié avec succès");
      reset();
    },
    onError: (error) => {
      toast.error(error instanceof Error ? error.message : "Une erreur inattendue est survenue.");
    },
  });

  return (
    <Panel title="Mot de passe" description="Modifiez le mot de passe de votre compte." icon={<KeyRound className="h-5 w-5" />}>
      <form onSubmit={handleSubmit((values) => changePassword.mutate(values))} className="max-w-md space-y-5">
        <div className="space-y-2">
          <Label htmlFor="currentPassword">
            Mot de passe actuel<span className="ml-1 text-destructive">*</span>
          </Label>
          <Input
            id="currentPassword"
            type="password"
            autoComplete="current-password"
            {...register("currentPassword")}
            aria-invalid={Boolean(errors.currentPassword)}
          />
          {errors.currentPassword && (
            <p role="alert" className="text-xs text-destructive">{errors.currentPassword.message}</p>
          )}
        </div>
        <div className="space-y-2">
          <Label htmlFor="newPassword">
            Nouveau mot de passe<span className="ml-1 text-destructive">*</span>
          </Label>
          <Input
            id="newPassword"
            type="password"
            autoComplete="new-password"
            {...register("newPassword")}
            aria-invalid={Boolean(errors.newPassword)}
          />
          {errors.newPassword && (
            <p role="alert" className="text-xs text-destructive">{errors.newPassword.message}</p>
          )}
        </div>
        <div className="space-y-2">
          <Label htmlFor="confirmPassword">
            Confirmer le nouveau mot de passe<span className="ml-1 text-destructive">*</span>
          </Label>
          <Input
            id="confirmPassword"
            type="password"
            autoComplete="new-password"
            {...register("confirmPassword")}
            aria-invalid={Boolean(errors.confirmPassword)}
          />
          {errors.confirmPassword && (
            <p role="alert" className="text-xs text-destructive">{errors.confirmPassword.message}</p>
          )}
        </div>
        <Button type="submit" className="gap-2" disabled={changePassword.isPending}>
          {changePassword.isPending && <Loader2 className="h-4 w-4 animate-spin" />}
          Changer le mot de passe
        </Button>
      </form>
    </Panel>
  );
}
