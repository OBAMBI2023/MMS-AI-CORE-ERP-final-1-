export const AVATAR_BUCKET = "avatars";
export const MAX_AVATAR_SIZE = 5 * 1024 * 1024;
export const AVATAR_MIME_TYPES = ["image/jpeg", "image/png", "image/webp"] as const;

export function getInitials(name?: string | null, email?: string | null) {
  const value = name?.trim() || email?.trim() || "Utilisateur";
  const words = value.split(/\s+/).filter(Boolean);
  if (words.length > 1) {
    return `${words[0][0]}${words[words.length - 1][0]}`.toUpperCase();
  }
  return value.slice(0, 2).toUpperCase();
}

export function avatarExtension(file: File) {
  if (file.type === "image/png") return "png";
  if (file.type === "image/webp") return "webp";
  return "jpg";
}
