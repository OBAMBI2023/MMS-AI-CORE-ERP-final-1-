import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { ChevronDown, User, Settings, LogOut } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useNavigate } from "@tanstack/react-router";
import { toast } from "sonner";
import { useQuery } from "@tanstack/react-query";
import { ProfileAvatar } from "./ProfileAvatar";
import { AvatarManager } from "./AvatarManager";
import { Skeleton } from "@/components/ui/skeleton";
import { useTenant } from "@/providers/TenantProvider";
import { useActionPermission } from "@/hooks/use-action-permission";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { useState } from "react";

export function UserMenu() {
  const navigate = useNavigate();
  const [profileOpen, setProfileOpen] = useState(false);
  const { tenant, refreshTenant } = useTenant();
  const parametresRoute = tenant?.platform_type === "HOTEL" ? "/hotel/parametres" : "/parametres";
  // Governed by the hotel.settings.view RBAC permission, not the
  // Administrateur role name — see the identical fix/rationale in
  // HotelParametresPage.tsx, the page this link points to. The ERP branch
  // (platform_type !== "HOTEL") is untouched: /parametres there is
  // deliberately Administrateur-only regardless of RBAC (see
  // isAdminOnlyRoute in route-permissions.ts), and the actual route guard
  // enforces that independently of this link's visibility. The hook is
  // called unconditionally (Rules of Hooks) and the platform check is
  // applied to its result instead.
  const hasHotelSettingsView = useActionPermission("hotel.settings.view");
  const canSeeSettings = tenant?.platform_type === "HOTEL" ? hasHotelSettingsView : true;

  const { data: profile, isLoading: profileLoading } = useQuery({
    queryKey: ["userProfile"],
    queryFn: async () => {
      const {
        data: { user },
      } = await supabase.auth.getUser();
      if (!user) return null;

      const { data, error } = await supabase
        .from("profiles")
        .select("id, tenant_id, email, full_name, avatar_url, roles(name)")
        .eq("id", user.id)
        .single();

      if (error) throw error;
      return data as {
        id: string;
        tenant_id: string;
        email: string | null;
        full_name: string | null;
        avatar_url: string | null;
        roles: { name: string } | null;
      };
    },
  });

  const handleSignOut = async () => {
    try {
      const { error } = await supabase.auth.signOut();
      if (error) throw error;
      navigate({ to: "/login" });
    } catch (err: any) {
      toast.error("Erreur lors de la déconnexion");
      console.error(err);
    }
  };

  // Never render "Utilisateur" / "Rôle inconnu" while the profile query is
  // still resolving — that text means "genuinely unknown", not "loading".
  const name = profile?.full_name || "Utilisateur";
  const role = profile?.roles?.name || "Rôle inconnu";

  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <button className="flex items-center gap-2 rounded-full px-3 py-1.5 transition-colors hover:bg-muted">
          {profileLoading ? (
            <>
              <Skeleton className="h-8 w-8 rounded-full" />
              <div className="hidden md:flex flex-col items-start gap-1">
                <Skeleton className="h-3.5 w-20" />
                <Skeleton className="h-3 w-16" />
              </div>
            </>
          ) : (
            <>
              <ProfileAvatar path={profile?.avatar_url} name={name} email={profile?.email} className="h-8 w-8" />
              <div className="hidden md:flex flex-col items-start text-left">
                <span className="text-sm font-medium">{name}</span>
                <span className="text-xs text-muted-foreground">{role}</span>
              </div>
            </>
          )}
          <ChevronDown className="h-4 w-4 text-muted-foreground" />
        </button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end" className="w-56">
        <DropdownMenuLabel>Mon compte</DropdownMenuLabel>
        <DropdownMenuSeparator />
        <DropdownMenuItem onSelect={() => setProfileOpen(true)}>
          <User className="mr-2 h-4 w-4" />
          <span>Mon profil</span>
        </DropdownMenuItem>
        {canSeeSettings && (
          <DropdownMenuItem onClick={() => navigate({ to: parametresRoute })}>
            <Settings className="mr-2 h-4 w-4" />
            <span>Paramètres</span>
          </DropdownMenuItem>
        )}
        <DropdownMenuSeparator />
        <DropdownMenuItem className="text-destructive" onClick={handleSignOut}>
          <LogOut className="mr-2 h-4 w-4" />
          <span>Déconnexion</span>
        </DropdownMenuItem>
      </DropdownMenuContent>
      <Dialog open={profileOpen} onOpenChange={setProfileOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Mon profil</DialogTitle>
            <DialogDescription>Ajoutez, remplacez ou supprimez votre photo de profil.</DialogDescription>
          </DialogHeader>
          {profile && (
            <AvatarManager
              userId={profile.id}
              tenantId={profile.tenant_id}
              name={profile.full_name}
              email={profile.email}
              avatarPath={profile.avatar_url}
              onChanged={async () => {
                await refreshTenant();
              }}
            />
          )}
        </DialogContent>
      </Dialog>
    </DropdownMenu>
  );
}
