import { useQuery } from "@tanstack/react-query";
import { LogIn } from "lucide-react";
import { Section } from "@/components/hotel/HotelSettingsUi";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Skeleton } from "@/components/ui/skeleton";
import { supabase } from "@/integrations/supabase/client";
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

function resolveActorName(profile: ConnectionActorProfile | undefined, fallbackEmail: string | null) {
  return (
    profile?.full_name?.trim() ||
    profile?.username?.trim() ||
    profile?.email?.trim() ||
    fallbackEmail?.trim() ||
    "Utilisateur inconnu"
  );
}

function formatConnectionTimestamp(value: string | null) {
  if (!value) return "—";
  const date = new Date(value);
  if (isNaN(date.getTime())) return "—";
  return date.toLocaleString("fr-FR", {
    day: "2-digit",
    month: "2-digit",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
    second: "2-digit",
  });
}

export function HotelAuditLogTab() {
  const { tenant } = useTenant();
  const tenantId = tenant?.id;

  const connectionsQuery = useQuery({
    queryKey: ["hotel-recent-connections", tenantId],
    enabled: Boolean(tenantId),
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
        actorName: resolveActorName(profilesById.get(row.user_id), row.email),
      }));
    },
  });

  const connections = connectionsQuery.data ?? [];
  const isLoading = connectionsQuery.isLoading || !tenantId;

  return (
    <Section
      title="Dernières connexions"
      description="Les 10 dernières connexions des utilisateurs de votre établissement."
      icon={<LogIn className="h-4 w-4" />}
    >
      {isLoading ? (
        <div className="space-y-2">
          {Array.from({ length: 4 }).map((_, i) => (
            <Skeleton key={i} className="h-12 w-full rounded-lg" />
          ))}
        </div>
      ) : (
        <>
          {/* Desktop / tablet table */}
          <div className="hidden overflow-hidden rounded-xl border border-border md:block">
            <Table>
              <TableHeader>
                <TableRow className="bg-muted/40">
                  <TableHead>Date et heure</TableHead>
                  <TableHead>Utilisateur</TableHead>
                  <TableHead>Email</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {connections.length ? (
                  connections.map((row) => (
                    <TableRow key={row.id}>
                      <TableCell className="whitespace-nowrap text-muted-foreground">
                        {formatConnectionTimestamp(row.created_at)}
                      </TableCell>
                      <TableCell className="font-medium">{row.actorName}</TableCell>
                      <TableCell className="text-muted-foreground">{row.email ?? "—"}</TableCell>
                    </TableRow>
                  ))
                ) : (
                  <TableRow>
                    <TableCell colSpan={3} className="py-8 text-center text-muted-foreground">
                      Aucune connexion enregistrée.
                    </TableCell>
                  </TableRow>
                )}
              </TableBody>
            </Table>
          </div>

          {/* Mobile card list */}
          <div className="space-y-2.5 md:hidden">
            {connections.length ? (
              connections.map((row) => (
                <div
                  key={row.id}
                  className="rounded-xl border border-border bg-card p-3.5 shadow-sm"
                >
                  <div className="font-medium">{row.actorName}</div>
                  <div className="mt-0.5 break-words text-xs text-muted-foreground">
                    {row.email ?? "—"}
                  </div>
                  <div className="mt-2 text-xs text-muted-foreground">
                    {formatConnectionTimestamp(row.created_at)}
                  </div>
                </div>
              ))
            ) : (
              <div className="rounded-xl border border-border bg-card p-6 text-center text-sm text-muted-foreground">
                Aucune connexion enregistrée.
              </div>
            )}
          </div>
        </>
      )}
    </Section>
  );
}
