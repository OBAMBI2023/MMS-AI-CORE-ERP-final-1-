import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { useSignedUrl } from "@/hooks/use-signed-url";
import { AVATAR_BUCKET, getInitials } from "@/lib/avatar";
import { cn } from "@/lib/utils";
import { useEffect, useState } from "react";

export function ProfileAvatar({
  path,
  name,
  email,
  className,
  fallbackClassName,
}: {
  path?: string | null;
  name?: string | null;
  email?: string | null;
  className?: string;
  fallbackClassName?: string;
}) {
  const [refreshKey, setRefreshKey] = useState(0);
  useEffect(() => {
    const refresh = () => setRefreshKey((value) => value + 1);
    window.addEventListener("avatar-updated", refresh);
    return () => window.removeEventListener("avatar-updated", refresh);
  }, []);
  const url = useSignedUrl(path ?? null, AVATAR_BUCKET, refreshKey);

  return (
    <Avatar className={className}>
      {url && <AvatarImage src={url} alt={`Photo de profil de ${name || "l’utilisateur"}`} />}
      <AvatarFallback className={cn("bg-primary text-sm font-bold text-primary-foreground", fallbackClassName)}>
        {getInitials(name, email)}
      </AvatarFallback>
    </Avatar>
  );
}
