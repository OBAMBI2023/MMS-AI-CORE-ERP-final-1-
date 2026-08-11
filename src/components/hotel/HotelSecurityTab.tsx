import { useMemo, useState, type ReactNode } from "react";
import { useMutation } from "@tanstack/react-query";
import { Eye, EyeOff, LockKeyhole, Loader2, Shield, ShieldCheck } from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { supabase } from "@/integrations/supabase/client";
import { changePassword } from "@/lib/security.server";
import { formatSupabaseError } from "@/lib/supabase-error";
import { cn } from "@/lib/utils";

const MIN_PASSWORD_LENGTH = 8;

function passwordStrength(pwd: string): { label: string; score: 0 | 1 | 2 | 3; barClass: string } {
  if (!pwd) return { label: "", score: 0, barClass: "bg-muted" };
  let variety = 0;
  if (/[a-z]/.test(pwd) && /[A-Z]/.test(pwd)) variety++;
  if (/\d/.test(pwd)) variety++;
  if (/[^A-Za-z0-9]/.test(pwd)) variety++;
  if (pwd.length >= 12) variety++;

  if (pwd.length < MIN_PASSWORD_LENGTH || variety === 0) {
    return { label: "Faible", score: 1, barClass: "bg-destructive" };
  }
  if (variety <= 2) {
    return { label: "Moyen", score: 2, barClass: "bg-amber-500" };
  }
  return { label: "Fort", score: 3, barClass: "bg-primary" };
}

function Field({
  label,
  error,
  children,
}: {
  label: string;
  error?: string;
  children: ReactNode;
}) {
  return (
    <div>
      <Label className="mb-1.5 block text-sm font-medium">{label}</Label>
      {children}
      {error && <p className="mt-1.5 text-xs text-destructive">{error}</p>}
    </div>
  );
}

function PasswordField({
  label,
  value,
  onChange,
  error,
  autoComplete,
}: {
  label: string;
  value: string;
  onChange: (value: string) => void;
  error?: string;
  autoComplete: string;
}) {
  const [visible, setVisible] = useState(false);
  return (
    <Field label={label} error={error}>
      <div className="relative">
        <Input
          type={visible ? "text" : "password"}
          value={value}
          onChange={(e) => onChange(e.target.value)}
          autoComplete={autoComplete}
          aria-invalid={Boolean(error)}
          className="h-11 pr-11"
        />
        <button
          type="button"
          onClick={() => setVisible((v) => !v)}
          className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground transition-colors hover:text-foreground"
          aria-label={visible ? "Masquer le mot de passe" : "Afficher le mot de passe"}
          aria-pressed={visible}
        >
          {visible ? <EyeOff className="size-4" /> : <Eye className="size-4" />}
        </button>
      </div>
    </Field>
  );
}

export function HotelSecurityTab() {
  const [currentPwd, setCurrentPwd] = useState("");
  const [newPwd, setNewPwd] = useState("");
  const [confirmPwd, setConfirmPwd] = useState("");
  const [errors, setErrors] = useState<{
    current?: string;
    next?: string;
    confirm?: string;
  }>({});

  const strength = useMemo(() => passwordStrength(newPwd), [newPwd]);
  const canSubmit =
    Boolean(currentPwd) &&
    newPwd.length >= MIN_PASSWORD_LENGTH &&
    newPwd !== currentPwd &&
    confirmPwd === newPwd;

  const changing = useMutation({
    mutationFn: async () => {
      const nextErrors: typeof errors = {};
      if (!currentPwd) nextErrors.current = "Le mot de passe actuel est obligatoire.";
      if (!newPwd) nextErrors.next = "Le nouveau mot de passe est obligatoire.";
      else if (newPwd.length < MIN_PASSWORD_LENGTH)
        nextErrors.next = `Le nouveau mot de passe doit contenir au moins ${MIN_PASSWORD_LENGTH} caractères.`;
      else if (currentPwd && newPwd === currentPwd)
        nextErrors.next = "Le nouveau mot de passe doit être différent de l'actuel.";
      if (!confirmPwd) nextErrors.confirm = "La confirmation est obligatoire.";
      else if (newPwd && confirmPwd !== newPwd)
        nextErrors.confirm = "La confirmation ne correspond pas au nouveau mot de passe.";
      setErrors(nextErrors);
      if (Object.keys(nextErrors).length > 0) {
        throw new Error("__validation__");
      }

      const {
        data: { user },
      } = await supabase.auth.getUser();
      if (!user?.email) throw new Error("Utilisateur non authentifié.");

      const { error: signInError } = await supabase.auth.signInWithPassword({
        email: user.email,
        password: currentPwd,
      });
      if (signInError) {
        setErrors((prev) => ({ ...prev, current: "Mot de passe actuel incorrect." }));
        throw new Error("__validation__");
      }

      await changePassword({ data: { newPassword: newPwd } });
    },
    onSuccess: () => {
      toast.success("Votre mot de passe a été modifié avec succès.");
      setCurrentPwd("");
      setNewPwd("");
      setConfirmPwd("");
      setErrors({});
    },
    onError: (error: Error) => {
      if (error.message === "__validation__") return;
      toast.error(formatSupabaseError(error));
    },
  });

  return (
    <div className="max-w-[680px]">
      <div className="rounded-2xl border border-border bg-card p-6 shadow-sm sm:p-8">
        <div className="flex flex-col gap-4 border-b border-border pb-5 sm:flex-row sm:items-start sm:justify-between">
          <div className="flex items-start gap-3">
            <div className="grid size-11 shrink-0 place-items-center rounded-full bg-primary/10 text-primary">
              <Shield className="size-5" />
            </div>
            <div>
              <h2 className="text-lg font-semibold">Sécurité du compte</h2>
              <p className="mt-0.5 text-sm text-muted-foreground">
                Modifiez votre mot de passe pour protéger l'accès à votre compte SAOVIA.
              </p>
            </div>
          </div>
          <span className="inline-flex shrink-0 items-center gap-1.5 self-start rounded-full bg-primary/10 px-3 py-1 text-xs font-medium text-primary">
            <ShieldCheck className="size-3.5" /> Compte protégé
          </span>
        </div>

        <div className="mt-6 space-y-5">
          <PasswordField
            label="Mot de passe actuel"
            value={currentPwd}
            onChange={(v) => {
              setCurrentPwd(v);
              if (errors.current) setErrors((prev) => ({ ...prev, current: undefined }));
            }}
            error={errors.current}
            autoComplete="current-password"
          />
          <div>
            <PasswordField
              label="Nouveau mot de passe"
              value={newPwd}
              onChange={(v) => {
                setNewPwd(v);
                if (errors.next) setErrors((prev) => ({ ...prev, next: undefined }));
              }}
              error={errors.next}
              autoComplete="new-password"
            />
            <div className="mt-2 flex items-center gap-2">
              <div className="flex h-1.5 flex-1 gap-1">
                {[1, 2, 3].map((segment) => (
                  <div
                    key={segment}
                    className={cn(
                      "h-full flex-1 rounded-full transition-colors",
                      segment <= strength.score ? strength.barClass : "bg-muted",
                    )}
                  />
                ))}
              </div>
              {strength.label && (
                <span
                  className={cn(
                    "shrink-0 text-[11px] font-medium",
                    strength.score === 1 && "text-destructive",
                    strength.score === 2 && "text-amber-600",
                    strength.score === 3 && "text-primary",
                  )}
                >
                  {strength.label}
                </span>
              )}
            </div>
            <p className="mt-1.5 text-[11px] text-muted-foreground">
              Minimum {MIN_PASSWORD_LENGTH} caractères.
            </p>
          </div>
          <PasswordField
            label="Confirmer le nouveau mot de passe"
            value={confirmPwd}
            onChange={(v) => {
              setConfirmPwd(v);
              if (errors.confirm) setErrors((prev) => ({ ...prev, confirm: undefined }));
            }}
            error={errors.confirm}
            autoComplete="new-password"
          />
        </div>

        <div className="mt-5 flex items-start gap-2.5 rounded-xl bg-primary/5 px-4 py-3">
          <ShieldCheck className="mt-0.5 size-4 shrink-0 text-primary" />
          <p className="text-sm text-muted-foreground">
            Pour votre sécurité, choisissez un mot de passe différent de celui utilisé actuellement.
          </p>
        </div>

        <Button
          onClick={() => changing.mutate()}
          disabled={!canSubmit || changing.isPending}
          className="mt-6 w-full gap-2 sm:w-auto"
        >
          {changing.isPending ? (
            <Loader2 className="size-4 animate-spin" />
          ) : (
            <LockKeyhole className="size-4" />
          )}
          Mettre à jour le mot de passe
        </Button>
      </div>
    </div>
  );
}
