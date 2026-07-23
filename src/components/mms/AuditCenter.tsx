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

export function AuditCenter() {
  const {
    data: logs,
    isLoading,
    refetch,
  } = useQuery({
    queryKey: ["audit-logs"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("audit_logs")
        .select("*")
        .order("created_at", { ascending: false });
      if (error) throw error;
      return data as AuditLog[];
    },
  });

  return (
    <div className="space-y-6">
      <Card className="p-6">
        <div className="flex items-center justify-between">
          <div>
            <h2 className="text-xl font-semibold flex items-center gap-2">
              <Shield className="h-5 w-5 text-primary" /> Journal de sécurité
            </h2>
            <p className="text-sm text-muted-foreground mt-1">
              Historique complet des connexions et des actions sensibles du système.
            </p>
          </div>
          <div className="flex items-center gap-2">
            <Button variant="outline" size="sm" onClick={() => refetch()} className="gap-2">
              <RefreshCcw className="h-4 w-4" /> Actualiser
            </Button>
            <span className="text-xs text-muted-foreground">
              Dernière synchro: {new Date().toLocaleTimeString()}
            </span>
          </div>
        </div>
      </Card>

      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        {[
          { label: "Connexions réussies", value: "1,234", color: "text-emerald-600" },
          { label: "Échecs", value: "45", color: "text-red-600" },
          { label: "Modifications", value: "128", color: "text-amber-600" },
          { label: "Utilisateurs actifs", value: "12", color: "text-blue-600" },
        ].map((kpi, i) => (
          <Card key={i} className="p-4">
            <div className={`text-2xl font-bold ${kpi.color}`}>{kpi.value}</div>
            <div className="text-xs text-muted-foreground">{kpi.label}</div>
          </Card>
        ))}
      </div>

      <Card className="p-4 flex gap-2">
        <Input placeholder="Rechercher..." className="max-w-xs" />
        <Button variant="outline" size="sm">
          <Filter className="h-4 w-4 mr-2" /> Filtres
        </Button>
        <Button variant="outline" size="sm" className="ml-auto">
          <Download className="h-4 w-4 mr-2" /> Exporter
        </Button>
        <Button variant="outline" size="sm">
          <Printer className="h-4 w-4" />
        </Button>
        <Button variant="outline" size="sm">
          <Copy className="h-4 w-4" />
        </Button>
        <Button variant="destructive" size="sm">
          <Trash2 className="h-4 w-4" /> Vider
        </Button>
      </Card>

      <Card className="overflow-hidden">
        {isLoading ? (
          <div className="p-10 flex items-center justify-center">
            <Loader2 className="h-6 w-6 animate-spin text-primary" />
          </div>
        ) : (
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
              {logs?.map((log) => (
                <tr key={log.id} className="border-t">
                  <td className="p-3">{new Date(log.created_at).toLocaleString()}</td>
                  <td className="p-3">{log.user_id || "Système"}</td>
                  <td className="p-3">{log.action}</td>
                  <td className="p-3">
                    <Badge variant="secondary">{log.module}</Badge>
                  </td>
                  <td className="p-3">
                    <Badge variant="outline">Succès</Badge>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </Card>
    </div>
  );
}
