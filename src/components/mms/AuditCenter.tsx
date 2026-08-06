import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import {
  Shield,
  Loader2,
  RefreshCcw,
  Search,
  Filter,
  Download,
  Printer,
  Copy,
  Trash2,
} from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip";
import { useTenant } from "@/providers/TenantProvider";
import { toast } from "sonner";

// Note: This is a placeholder structure, it will be expanded based on the audit_logs schema.
type AuditLog = {
  id: string;
  user_id: string | null;
  action: string;
  module: string;
  metadata: any;
  ip_address: string | null;
  user_agent: string | null;
  created_at: string;
};

type AuditActorProfile = {
  id: string;
  full_name: string | null;
  username: string | null;
  email: string | null;
  status: string | null;
};

function resolveAuditActor(userId: string | null, profile: AuditActorProfile | undefined) {
  if (!userId) {
    return { primary: "Système", secondary: null as string | null, deactivated: false };
  }
  if (!profile) {
    // Profile row is gone (user deleted) but the tenant-scoped log entry remains.
    return { primary: "Utilisateur supprimé", secondary: null as string | null, deactivated: false };
  }
  const primary =
    profile.full_name?.trim() ||
    profile.username?.trim() ||
    profile.email?.trim() ||
    "Utilisateur inconnu";
  const secondary = profile.email?.trim() && profile.email.trim() !== primary ? profile.email.trim() : null;
  const deactivated = !!profile.status && profile.status !== "active";
  return { primary, secondary, deactivated };
}

export function AuditCenter() {
  const { tenant } = useTenant();
  const tenantId = tenant?.id;

  const {
    data: logs,
    isLoading,
    refetch,
  } = useQuery({
    queryKey: ["audit-logs", tenantId],
    enabled: !!tenantId,
    queryFn: async () => {
      // RLS is the real security boundary (tenant_id = current_tenant_id()
      // in the audit_logs_select_tenant_admin policy). This explicit filter
      // is just query-shaping / defense-in-depth, not a security control.
      const { data, error } = await supabase
        .from("audit_logs")
        .select("*")
        .eq("tenant_id", tenantId as string)
        .order("created_at", { ascending: false });
      if (error) throw error;
      const auditLogs = data as AuditLog[];

      const userIds = Array.from(
        new Set(auditLogs.map((log) => log.user_id).filter((id): id is string => !!id)),
      );

      const profilesById = new Map<string, AuditActorProfile>();
      if (userIds.length > 0) {
        // RLS on profiles already restricts results to the caller's own tenant,
        // so this single batched lookup can never surface another tenant's users.
        const { data: profiles, error: profilesError } = await supabase
          .from("profiles")
          .select("id, full_name, username, email, status")
          .in("id", userIds);
        if (profilesError) throw profilesError;
        for (const profile of profiles ?? []) {
          profilesById.set(profile.id, profile as AuditActorProfile);
        }
      }

      return auditLogs.map((log) => ({
        ...log,
        actor: resolveAuditActor(log.user_id, log.user_id ? profilesById.get(log.user_id) : undefined),
      }));
    },
  });

  return (
    <div className="w-full min-w-0 space-y-4 sm:space-y-6">
      <Card className="p-4 sm:p-6">
        <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
          <div className="min-w-0">
            <h2 className="flex items-center gap-2 text-lg font-semibold sm:text-xl">
              <Shield className="h-5 w-5 shrink-0 text-primary" /> Journal de sécurité
            </h2>
            <p className="mt-1 text-sm text-muted-foreground">
              Historique complet des connexions et des actions sensibles du système.
            </p>
          </div>
          <div className="flex flex-wrap items-center gap-2 sm:shrink-0">
            <Button variant="outline" size="sm" onClick={() => refetch()} className="gap-2">
              <RefreshCcw className="h-4 w-4" /> Actualiser
            </Button>
            <span className="text-xs text-muted-foreground">
              Dernière synchro: {new Date().toLocaleTimeString()}
            </span>
          </div>
        </div>
      </Card>

      <div className="grid grid-cols-2 gap-2.5 sm:gap-4 md:grid-cols-4">
        {[
          { label: "Connexions réussies", value: "1,234", color: "text-emerald-600" },
          { label: "Échecs", value: "45", color: "text-red-600" },
          { label: "Modifications", value: "128", color: "text-amber-600" },
          { label: "Utilisateurs actifs", value: "12", color: "text-blue-600" },
        ].map((kpi, i) => (
          <Card key={i} className="p-3.5 sm:p-4">
            <div className={`text-xl font-bold sm:text-2xl ${kpi.color}`}>{kpi.value}</div>
            <div className="text-xs text-muted-foreground sm:text-xs">{kpi.label}</div>
          </Card>
        ))}
      </div>

      <Card className="flex flex-wrap items-center gap-2 p-2.5 sm:p-4">
        <Input placeholder="Rechercher..." className="w-full sm:w-auto sm:max-w-xs" />
        <Button variant="outline" size="sm" className="gap-2">
          <Filter className="h-4 w-4" /> Filtres
        </Button>
        <Button variant="outline" size="sm" className="gap-2 sm:ml-auto">
          <Download className="h-4 w-4" /> Exporter
        </Button>
        <Button variant="outline" size="sm" className="px-2.5">
          <Printer className="h-4 w-4" />
        </Button>
        <Button variant="outline" size="sm" className="px-2.5">
          <Copy className="h-4 w-4" />
        </Button>
        <Button variant="destructive" size="sm" className="gap-2">
          <Trash2 className="h-4 w-4" /> Vider
        </Button>
      </Card>

      {isLoading || !tenantId ? (
        <Card className="flex items-center justify-center p-10">
          <Loader2 className="h-6 w-6 animate-spin text-primary" />
        </Card>
      ) : (
        <>
          {/* Desktop / tablet table — unchanged from md breakpoint up */}
          <Card className="hidden overflow-hidden md:block">
            <table className="w-full text-sm">
              <thead className="bg-muted/50">
                <tr>
                  <th className="p-3 text-left font-medium">Date</th>
                  <th className="p-3 text-left font-medium">Utilisateur</th>
                  <th className="p-3 text-left font-medium">Action</th>
                  <th className="p-3 text-left font-medium">Module</th>
                  <th className="p-3 text-left font-medium">Statut</th>
                </tr>
              </thead>
              <tbody>
                <TooltipProvider delayDuration={200}>
                  {logs?.map((log) => (
                    <tr key={log.id} className="border-t">
                      <td className="p-3">{new Date(log.created_at).toLocaleString()}</td>
                      <td className="p-3 max-w-[220px]">
                        <Tooltip>
                          <TooltipTrigger asChild>
                            <div className="min-w-0">
                              <div className="flex items-center gap-1.5 truncate font-medium">
                                <span className="truncate">{log.actor.primary}</span>
                                {log.actor.deactivated && (
                                  <Badge variant="outline" className="shrink-0 text-[10px]">
                                    Désactivé
                                  </Badge>
                                )}
                              </div>
                              {log.actor.secondary && (
                                <div className="truncate text-xs text-muted-foreground">
                                  {log.actor.secondary}
                                </div>
                              )}
                            </div>
                          </TooltipTrigger>
                          <TooltipContent className="max-w-64 break-words">
                            {log.actor.secondary
                              ? `${log.actor.primary} · ${log.actor.secondary}`
                              : log.actor.primary}
                          </TooltipContent>
                        </Tooltip>
                      </td>
                      <td className="p-3">{log.action}</td>
                      <td className="p-3">
                        <Badge variant="secondary">{log.module}</Badge>
                      </td>
                      <td className="p-3">
                        <Badge variant="outline">Succès</Badge>
                      </td>
                    </tr>
                  ))}
                </TooltipProvider>
              </tbody>
            </table>
          </Card>

          {/* Mobile card list — replaces the table below md */}
          <div className="space-y-2.5 md:hidden">
            {logs?.length ? (
              logs.map((log) => (
                <div
                  key={log.id}
                  className="w-full rounded-xl border border-border bg-white p-3.5 shadow-sm dark:bg-card"
                >
                  <div className="flex items-start justify-between gap-2">
                    <div className="min-w-0 flex-1">
                      <div className="flex flex-wrap items-center gap-1.5 font-medium">
                        <span className="break-words">{log.actor.primary}</span>
                        {log.actor.deactivated && (
                          <Badge variant="outline" className="shrink-0 text-[10px]">
                            Désactivé
                          </Badge>
                        )}
                      </div>
                      {log.actor.secondary && (
                        <div className="mt-0.5 break-words text-xs text-muted-foreground">
                          {log.actor.secondary}
                        </div>
                      )}
                    </div>
                    <Badge variant="outline" className="shrink-0 text-[10px]">
                      Succès
                    </Badge>
                  </div>
                  <div className="mt-2.5 space-y-1.5 text-xs">
                    <div className="flex gap-1.5">
                      <span className="shrink-0 text-muted-foreground">Date :</span>
                      <span className="break-words">{new Date(log.created_at).toLocaleString()}</span>
                    </div>
                    <div className="flex gap-1.5">
                      <span className="shrink-0 text-muted-foreground">Action :</span>
                      <span className="break-words">{log.action}</span>
                    </div>
                    <div className="flex items-center gap-1.5">
                      <span className="shrink-0 text-muted-foreground">Module :</span>
                      <Badge variant="secondary" className="text-[10px]">
                        {log.module}
                      </Badge>
                    </div>
                  </div>
                </div>
              ))
            ) : (
              <Card className="p-6 text-center text-sm text-muted-foreground">
                Aucune activité enregistrée.
              </Card>
            )}
          </div>
        </>
      )}
    </div>
  );
}
