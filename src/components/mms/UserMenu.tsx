import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { ChevronDown, User, Settings, LogOut } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useNavigate } from "@tanstack/react-router";
import { toast } from "sonner";
import { useQuery } from "@tanstack/react-query";

export function UserMenu() {
  const navigate = useNavigate();

  const { data: profile } = useQuery({
    queryKey: ["userProfile"],
    queryFn: async () => {
      const {
        data: { user },
      } = await supabase.auth.getUser();
      if (!user) return null;

      const { data, error } = await supabase
        .from("profiles")
        .select("full_name, roles(name)")
        .eq("id", user.id)
        .single();

      if (error) throw error;
      return data as { full_name: string; roles: { name: string } | null };
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

  const name = profile?.full_name || "Utilisateur";
  const role = profile?.roles?.name || "Rôle inconnu";

  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <button className="flex items-center gap-2 px-3 py-1.5 rounded-full hover:bg-muted transition-colors">
          <Avatar className="h-8 w-8">
            <AvatarFallback className="bg-primary text-white text-sm font-bold">
              {name.substring(0, 2).toUpperCase()}
            </AvatarFallback>
          </Avatar>
          <div className="hidden md:flex flex-col items-start text-left">
            <span className="text-sm font-medium">{name}</span>
            <span className="text-xs text-muted-foreground">{role}</span>
          </div>
          <ChevronDown className="h-4 w-4 text-muted-foreground" />
        </button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end" className="w-56">
        <DropdownMenuLabel>Mon compte</DropdownMenuLabel>
        <DropdownMenuSeparator />
        <DropdownMenuItem>
          <User className="mr-2 h-4 w-4" />
          <span>Mon profil</span>
        </DropdownMenuItem>
        <DropdownMenuItem onClick={() => navigate({ to: "/parametres" })}>
          <Settings className="mr-2 h-4 w-4" />
          <span>Paramètres</span>
        </DropdownMenuItem>
        <DropdownMenuSeparator />
        <DropdownMenuItem className="text-destructive" onClick={handleSignOut}>
          <LogOut className="mr-2 h-4 w-4" />
          <span>Déconnexion</span>
        </DropdownMenuItem>
      </DropdownMenuContent>
    </DropdownMenu>
  );
}
