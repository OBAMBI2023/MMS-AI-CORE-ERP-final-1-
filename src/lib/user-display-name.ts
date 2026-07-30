type UserNameSource = {
  full_name?: string | null;
  first_name?: string | null;
  last_name?: string | null;
  display_name?: string | null;
  email?: string | null;
};

function clean(value: string | null | undefined) {
  return value?.trim() || null;
}

export function resolveUserDisplayName(source: UserNameSource): string {
  const fullName = clean(source.full_name);
  if (fullName) return fullName;

  const firstAndLastName = [clean(source.first_name), clean(source.last_name)]
    .filter(Boolean)
    .join(" ");
  if (firstAndLastName) return firstAndLastName;

  const displayName = clean(source.display_name);
  if (displayName) return displayName;

  const emailLocalPart = clean(source.email)?.split("@", 1)[0]?.trim();
  if (emailLocalPart) return emailLocalPart;

  return "Utilisateur";
}
