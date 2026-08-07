import { useQuery } from "@tanstack/react-query";
import { LogIn, Loader2 } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { Card } from "@/components/ui/card";
import { useTenant } from "@/providers/TenantProvider";

type ConnectionLogRow = {
  id: string;
  user_id: string;
  email: string | null;
  created_at: string | null;
};

type ConnectionActorProfile = {
  id: string;
  full_name: string | null;
  username: string | null;
  email: string | null;
};

function resolveConnectionActorName(
  profile: ConnectionActorProfile | undefined,
  fallbackEmail: string | null,
) {
  return (
    profile?.full_name?.trim() ||
    profile?.username?.trim() ||
    profile?.email?.trim() ||
    fallbackEmail?.trim() ||
    "Utilisateur inconnu"
  );
}

export function RecentConnections() {
  const { tenant } = useTenant();
  const tenantId = tenant?.id;

  const { data: connections, isLoading } = useQuery({
    queryKey: ["recent-connections", tenantId],
    enabled: !!tenantId,
    queryFn: async () => {
      // RLS is the real security boundary ("Tenant admins can view connection
      // logs": tenant_id = current_tenant_id() AND is_admin()). The DB also
      // keeps at most 10 rows per tenant on write, so .limit(10) here is
      // query-shaping / defense-in-depth, not a security control.
      const { data, error } = await supabase
        .from("connection_logs")
        .select("id, user_id, email, created_at")
        .eq("tenant_id", tenantId as string)
        .order("created_at", { ascending: false })
        .limit(10);
      if (error) throw error;
      const rows = data as ConnectionLogRow[];

      const userIds = Array.from(new Set(rows.map((row) => row.user_id).filter(Boolean)));
      const profilesById = new Map<string, ConnectionActorProfile>();
      if (userIds.length > 0) {
        // RLS on profiles already restricts results to the caller's own
        // tenant, so this batched lookup can never surface another tenant's users.
        const { data: profiles, error: profilesError } = await supabase
          .from("profiles")
          .select("id, full_name, username, email")
          .in("id", userIds);
        if (profilesError) throw profilesError;
        for (const profile of profiles ?? []) {
          profilesById.set(profile.id, profile as ConnectionActorProfile);
        }
      }

      return rows.map((row) => ({
        ...row,
        actorName: resolveConnectionActorName(profilesById.get(row.user_id), row.email),
      }));
    },
  });

  return (
    <Card className="p-4 sm:p-6">
      <div className="mb-4">
        <h2 className="flex items-center gap-2 text-lg font-semibold sm:text-xl">
          <LogIn className="h-5 w-5 shrink-0 text-primary" /> Dernières connexions
        </h2>
        <p className="mt-1 text-sm text-muted-foreground">
          Les 10 dernières connexions des utilisateurs de votre entreprise.
        </p>
      </div>

      {isLoading || !tenantId ? (
        <div className="flex items-center justify-center p-10">
          <Loader2 className="h-6 w-6 animate-spin text-primary" />
        </div>
      ) : (
        <>
          {/* Desktop / tablet table — unchanged from md breakpoint up */}
          <div className="hidden overflow-hidden rounded-lg border md:block">
            <table className="w-full text-sm">
              <thead className="bg-muted/50">
                <tr>
                  <th className="p-3 text-left font-medium">Date et heure</th>
                  <th className="p-3 text-left font-medium">Utilisateur</th>
                  <th className="p-3 text-left font-medium">Email</th>
                </tr>
              </thead>
              <tbody>
                {connections?.length ? (
                  connections.map((row) => (
                    <tr key={row.id} className="border-t">
                      <td className="p-3">
                        {row.created_at ? new Date(row.created_at).toLocaleString() : "—"}
                      </td>
                      <td className="p-3 font-medium">{row.actorName}</td>
                      <td className="p-3 text-muted-foreground">{row.email ?? "—"}</td>
                    </tr>
                  ))
                ) : (
                  <tr>
                    <td colSpan={3} className="p-6 text-center text-muted-foreground">
                      Aucune connexion enregistrée.
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>

          {/* Mobile card list — replaces the table below md */}
          <div className="space-y-2.5 md:hidden">
            {connections?.length ? (
              connections.map((row) => (
                <div
                  key={row.id}
                  className="w-full rounded-xl border border-border bg-white p-3.5 shadow-sm dark:bg-card"
                >
                  <div className="font-medium">{row.actorName}</div>
                  <div className="mt-0.5 break-words text-xs text-muted-foreground">
                    {row.email ?? "—"}
                  </div>
                  <div className="mt-2 text-xs text-muted-foreground">
                    {row.created_at ? new Date(row.created_at).toLocaleString() : "—"}
                  </div>
                </div>
              ))
            ) : (
              <Card className="p-6 text-center text-sm text-muted-foreground">
                Aucune connexion enregistrée.
              </Card>
            )}
          </div>
        </>
      )}
    </Card>
  );
}
