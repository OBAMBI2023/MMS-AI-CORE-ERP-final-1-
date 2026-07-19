import { createFileRoute, redirect, useNavigate } from "@tanstack/react-router";
import { useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Loader2 } from "lucide-react";

export const Route = createFileRoute("/login")({
  component: LoginPage,
  beforeLoad: async () => {
    const { data: { session } } = await supabase.auth.getSession();
    if (session) {
      throw redirect({ to: "/" });
    }
  },
});

function LoginPage() {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [loading, setLoading] = useState(false);
  const navigate = useNavigate();

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    console.log("DEBUG: handleSubmit initiated");
    setLoading(true);
    
    try {
      console.log("DEBUG: Attempting signInWithPassword");
      const response = await supabase.auth.signInWithPassword({ email, password });
      console.log("DEBUG: Supabase Auth Response:", response);
      
      const { data, error } = response;
      
      if (error) {
        console.error("DEBUG: Login Error:", error);
        toast.error(`Erreur de connexion: ${error.message}`);
        return;
      }
      
      if (data.session) {
        console.log("DEBUG: Login Success. Session created, navigating to /");
        navigate({ to: "/" });
      } else {
        console.error("DEBUG: Login Success but no session returned:", data);
        toast.error("Connexion réussie mais aucune session active. Veuillez contacter l'administrateur.");
      }
      
    } catch (err) {
      console.error("DEBUG: Unexpected error during login:", err);
      toast.error("Une erreur inattendue est survenue.");
    } finally {
      console.log("DEBUG: handleSubmit finished, setLoading(false)");
      setLoading(false);
    }
  };

  return (
    <div className="flex min-h-screen items-center justify-center bg-background px-4">
      <div className="w-full max-w-sm space-y-6">
        <div className="text-center">
          <h1 className="text-2xl font-bold">Connexion MMS ERP</h1>
          <p className="text-muted-foreground mt-2">Accédez à votre espace sécurisé</p>
        </div>
        <form onSubmit={handleLogin} className="space-y-4">
          <div className="space-y-1.5">
            <Label>Email</Label>
            <Input type="email" value={email} onChange={(e) => setEmail(e.target.value)} required />
          </div>
          <div className="space-y-1.5">
            <Label>Mot de passe</Label>
            <Input type="password" value={password} onChange={(e) => setPassword(e.target.value)} required />
          </div>
          <Button className="w-full" disabled={loading}>
            {loading ? <Loader2 className="h-4 w-4 animate-spin" /> : "Se connecter"}
          </Button>
        </form>
      </div>
    </div>
  );
}
