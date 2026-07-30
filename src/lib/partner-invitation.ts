type AuthUser = { id: string; email?: string };
type AuthError = { code?: string; message: string; status?: number };

export const INVITATION_RATE_LIMIT_MESSAGE =
  "Limite d’envoi atteinte. Réessayez plus tard.";

export type ExistingInvitationAuth = {
  admin: {
    getUserById(userId: string): Promise<{
      data: { user: AuthUser | null };
      error: AuthError | null;
    }>;
  };
  resend(credentials: {
    type: "signup";
    email: string;
    options: { emailRedirectTo: string };
  }): Promise<{ error: AuthError | null }>;
};

function invitationError(error: AuthError): Error {
  const value = `${error.code ?? ""} ${error.message}`.toLowerCase();
  if (value.includes("invalid") && value.includes("email")) {
    return new Error("Adresse e-mail invalide. Vérifiez l'adresse de l'administrateur.");
  }
  if (value.includes("expired") || value.includes("otp_expired")) {
    return new Error("L'invitation a expiré et le nouveau lien n'a pas pu être envoyé.");
  }
  if (
    error.status === 429 ||
    value.includes("rate_limit") ||
    value.includes("rate limit") ||
    value.includes("too many")
  ) {
    return new Error(INVITATION_RATE_LIMIT_MESSAGE);
  }
  return new Error(error.message || "Impossible de renvoyer l'invitation.");
}

export async function resendExistingAuthInvitation(
  auth: ExistingInvitationAuth,
  input: { userId: string; email: string; redirectTo: string },
): Promise<void> {
  const { data, error: lookupError } = await auth.admin.getUserById(input.userId);
  if (lookupError) throw invitationError(lookupError);
  if (!data.user) throw new Error("Compte Auth introuvable. Aucun compte n'a été recréé.");

  const authEmail = data.user.email?.trim().toLowerCase();
  if (data.user.id !== input.userId || authEmail !== input.email.trim().toLowerCase()) {
    throw new Error("Le compte Auth ne correspond pas à l'administrateur du tenant.");
  }

  const { error: resendError } = await auth.resend({
    type: "signup",
    email: input.email,
    options: { emailRedirectTo: input.redirectTo },
  });
  if (resendError) throw invitationError(resendError);
}
