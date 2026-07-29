import { usePermissions } from "@/hooks/use-permissions";

export function useActionPermission(permission: string) {
  const { data, isLoading } = usePermissions();
  if (isLoading || !data) return false;
  
  // Admin has full access
  if (data.role === "Administrateur") return true;
  
  return (data.permissions as string[]).includes(permission);
}
