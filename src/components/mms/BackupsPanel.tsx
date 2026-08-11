import { useEffect, useMemo, useState, type ReactNode } from "react";
import {
  AlertCircle,
  CheckCircle2,
  ClipboardList,
  DatabaseBackup,
  Download,
  Loader2,
  RotateCcw,
} from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Separator } from "@/components/ui/separator";
import { Switch } from "@/components/ui/switch";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { useActionPermission } from "@/hooks/use-action-permission";
import { useSignedUrl } from "@/hooks/use-signed-url";
import { useTenantBackups, type TenantBackup } from "@/hooks/use-tenant-backups";
import type { Tables } from "@/integrations/supabase/types";
import type { LucideIcon } from "lucide-react";

// Sauvegardes: shared backup UI, used by both the ERP Paramètres page
// (src/routes/parametres.tsx) and the Hotel Paramètres page
// (src/components/hotel/HotelParametresPage.tsx). Platform differences are
// expressed entirely through props — permissionView/permissionCreate pick
// the right RBAC namespace (backup.* vs hotel.backups.*), moduleOptions
// carries the platform's already-resolved, already-enabled module list. No
// platform-specific color classes are used anywhere in this file: every
// Button/Badge relies on the default variant (bg-primary, etc.), which the
// `.hotel-theme` class already re-themes to petrol/emerald for the whole
// Hotel shell — this component never needs to know which platform it's
// rendering under to look right.

type BackupSettingsFields = Pick<
  Tables<"parametres">,
  "backup_auto_enabled" | "backup_auto_frequency" | "backup_last_success_at" | "email"
>;

export interface BackupModuleOption {
  code: string;
  label: string;
  icon: LucideIcon;
}

export interface BackupsPanelProps {
  /** RBAC permission code that must be held to see this panel at all (defense-in-depth; the caller should also gate the tab itself). */
  permissionView: string;
  /** RBAC permission code required to create a backup or change automation settings. */
  permissionCreate: string;
  form: Partial<BackupSettingsFields>;
  update: (
    key: "backup_auto_enabled" | "backup_auto_frequency",
    value: boolean | string | null,
  ) => void;
  /** When provided, automation toggles persist immediately (ERP's per-field autosave). When omitted, the panel only calls update() and relies on the caller's own top-level Save button (Hotel's convention). */
  onSave?: (patch: Partial<BackupSettingsFields>) => void;
  moduleOptions: BackupModuleOption[];
  moduleOptionsLoading?: boolean;
}

const BACKUP_STATUS_LABELS: Record<string, string> = {
  en_attente: "En attente",
  en_cours: "En cours",
  terminee: "Terminée",
  echec: "Échec",
};

function BackupStatusBadge({ status }: { status: string }) {
  if (status === "terminee") {
    return (
      <Badge variant="outline" className="gap-1.5 border-emerald-200 text-emerald-700">
        <CheckCircle2 className="h-3.5 w-3.5" /> {BACKUP_STATUS_LABELS[status]}
      </Badge>
    );
  }
  if (status === "echec") {
    return (
      <Badge variant="destructive" className="gap-1.5">
        <AlertCircle className="h-3.5 w-3.5" /> {BACKUP_STATUS_LABELS[status]}
      </Badge>
    );
  }
  if (status === "en_cours") {
    return (
      <Badge variant="secondary" className="gap-1.5">
        <Loader2 className="h-3.5 w-3.5 animate-spin" /> {BACKUP_STATUS_LABELS[status]}
      </Badge>
    );
  }
  return (
    <Badge variant="outline" className="gap-1.5 text-amber-600">
      <AlertCircle className="h-3.5 w-3.5" /> {BACKUP_STATUS_LABELS[status] ?? status}
    </Badge>
  );
}

function BackupDownloadButton({ backup }: { backup: TenantBackup }) {
  const url = useSignedUrl(backup.storage_path, "backup-archives");
  if (backup.status !== "terminee" || !backup.storage_path) return null;
  return (
    <Button variant="outline" size="sm" className="gap-1.5" disabled={!url} asChild={Boolean(url)}>
      {url ? (
        <a href={url} download>
          <Download className="h-3.5 w-3.5" /> Télécharger
        </a>
      ) : (
        <span>
          <Loader2 className="h-3.5 w-3.5 animate-spin" />
        </span>
      )}
    </Button>
  );
}

function PanelCard({
  title,
  description,
  icon,
  children,
}: {
  title: string;
  description?: string;
  icon?: ReactNode;
  children: ReactNode;
}) {
  return (
    <section className="rounded-2xl border border-border bg-card shadow-sm">
      <header className="flex items-start gap-3 border-b border-border px-6 py-4">
        {icon && <div className="mt-0.5 rounded-lg bg-primary/10 p-2 text-primary">{icon}</div>}
        <div className="min-w-0 flex-1">
          <h2 className="text-base font-semibold">{title}</h2>
          {description && <p className="mt-0.5 text-xs text-muted-foreground">{description}</p>}
        </div>
      </header>
      <div className="p-6">{children}</div>
    </section>
  );
}

function PanelField({
  label,
  hint,
  children,
}: {
  label: string;
  hint?: string;
  children: ReactNode;
}) {
  return (
    <div className="space-y-1.5">
      <Label className="text-xs font-medium text-muted-foreground">{label}</Label>
      {children}
      {hint && <p className="text-[11px] text-muted-foreground">{hint}</p>}
    </div>
  );
}

export function BackupsPanel({
  permissionView,
  permissionCreate,
  form,
  update,
  onSave,
  moduleOptions,
  moduleOptionsLoading,
}: BackupsPanelProps) {
  const canView = useActionPermission(permissionView);
  const canCreate = useActionPermission(permissionCreate);
  const {
    data: backups,
    isLoading: backupsLoading,
    createBackup,
    retryBackup,
  } = useTenantBackups();
  const [selectedModules, setSelectedModules] = useState<string[]>([]);

  const moduleLabelMap = useMemo(
    () => Object.fromEntries(moduleOptions.map((m) => [m.code, m.label])),
    [moduleOptions],
  );

  useEffect(() => {
    if (moduleOptions.length > 0 && selectedModules.length === 0) {
      setSelectedModules(moduleOptions.map((m) => m.code));
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [moduleOptions.length]);

  if (!canView) return null;

  const isRunning = (backups ?? []).some(
    (b) => b.status === "en_attente" || b.status === "en_cours",
  );

  const toggleModule = (code: string) => {
    setSelectedModules((prev) =>
      prev.includes(code) ? prev.filter((c) => c !== code) : [...prev, code],
    );
  };

  const setAutoEnabled = (checked: boolean) => {
    update("backup_auto_enabled", checked);
    onSave?.({ backup_auto_enabled: checked });
  };

  const setAutoFrequency = (value: string) => {
    update("backup_auto_frequency", value);
    onSave?.({ backup_auto_frequency: value as BackupSettingsFields["backup_auto_frequency"] });
  };

  const lastSuccess = form.backup_last_success_at
    ? new Intl.DateTimeFormat("fr-FR", { dateStyle: "long", timeStyle: "short" }).format(
        new Date(form.backup_last_success_at),
      )
    : null;

  return (
    <div className="space-y-6">
      <PanelCard
        title="Sauvegarde des données"
        description="Protégez et exportez les données de votre entreprise."
        icon={<DatabaseBackup className="h-4 w-4" />}
      >
        <p className="mb-4 text-sm">
          {lastSuccess ? (
            <>
              Dernière sauvegarde réussie :{" "}
              <span className="font-medium text-foreground">{lastSuccess}</span>
            </>
          ) : (
            <span className="text-muted-foreground">
              Aucune sauvegarde effectuée pour le moment.
            </span>
          )}
        </p>

        {!canCreate ? (
          <p className="text-sm text-muted-foreground">
            Vous n'avez pas la permission de créer une sauvegarde. Consultez l'historique
            ci-dessous.
          </p>
        ) : (
          <>
            <p className="mb-2 text-xs font-medium text-muted-foreground">Modules à sauvegarder</p>
            {moduleOptionsLoading ? (
              <div className="flex items-center gap-2 text-sm text-muted-foreground">
                <Loader2 className="h-4 w-4 animate-spin" /> Chargement des modules…
              </div>
            ) : moduleOptions.length === 0 ? (
              <p className="text-sm text-muted-foreground">Aucun module activé pour ce compte.</p>
            ) : (
              <div className="mb-4 grid grid-cols-2 gap-3 sm:grid-cols-3">
                {moduleOptions.map((m) => (
                  <label key={m.code} className="flex cursor-pointer items-center gap-2 text-sm">
                    <Checkbox
                      checked={selectedModules.includes(m.code)}
                      onCheckedChange={() => toggleModule(m.code)}
                    />
                    <m.icon className="h-3.5 w-3.5 text-muted-foreground" />
                    {m.label}
                  </label>
                ))}
              </div>
            )}

            <Button
              className="gap-2"
              disabled={selectedModules.length === 0 || isRunning || createBackup.isPending}
              onClick={() => createBackup.mutate(selectedModules)}
            >
              {isRunning || createBackup.isPending ? (
                <Loader2 className="h-4 w-4 animate-spin" />
              ) : (
                <DatabaseBackup className="h-4 w-4" />
              )}
              {isRunning ? "Sauvegarde en cours…" : "Créer une sauvegarde"}
            </Button>
          </>
        )}
      </PanelCard>

      <PanelCard
        title="Sauvegarde automatique"
        description="Planifiez des sauvegardes régulières et automatiques."
        icon={<RotateCcw className="h-4 w-4" />}
      >
        <div className="mb-4 flex items-center justify-between">
          <div>
            <p className="text-sm font-medium">Activer la sauvegarde automatique</p>
            <p className="text-xs text-muted-foreground">
              Le lien de téléchargement sera envoyé à l'email de réception ci-dessous.
            </p>
          </div>
          <Switch
            checked={form.backup_auto_enabled ?? false}
            disabled={!canCreate}
            onCheckedChange={setAutoEnabled}
          />
        </div>
        {form.backup_auto_enabled && (
          <PanelField label="Fréquence">
            <Select
              value={form.backup_auto_frequency ?? undefined}
              disabled={!canCreate}
              onValueChange={setAutoFrequency}
            >
              <SelectTrigger className="max-w-xs">
                <SelectValue placeholder="Choisir une fréquence" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="quotidienne">Quotidienne</SelectItem>
                <SelectItem value="hebdomadaire">Hebdomadaire</SelectItem>
                <SelectItem value="mensuelle">Mensuelle</SelectItem>
              </SelectContent>
            </Select>
          </PanelField>
        )}
        <Separator className="my-4" />
        <PanelField label="Email de réception" hint="Modifiable dans l'onglet Général.">
          <Input value={form.email ?? ""} disabled />
        </PanelField>
      </PanelCard>

      <PanelCard
        title="Historique"
        description="Les 10 dernières sauvegardes."
        icon={<ClipboardList className="h-4 w-4" />}
      >
        {backupsLoading ? (
          <div className="flex items-center gap-2 text-sm text-muted-foreground">
            <Loader2 className="h-4 w-4 animate-spin" /> Chargement…
          </div>
        ) : !backups || backups.length === 0 ? (
          <p className="text-sm text-muted-foreground">Aucune sauvegarde pour le moment.</p>
        ) : (
          <div className="overflow-x-auto">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Date</TableHead>
                  <TableHead>Type</TableHead>
                  <TableHead>Modules</TableHead>
                  <TableHead>Enregistrements</TableHead>
                  <TableHead>Statut</TableHead>
                  <TableHead className="text-right">Action</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {backups.map((b) => (
                  <TableRow key={b.id}>
                    <TableCell className="whitespace-nowrap">
                      {new Intl.DateTimeFormat("fr-FR", {
                        dateStyle: "short",
                        timeStyle: "short",
                      }).format(new Date(b.created_at))}
                    </TableCell>
                    <TableCell>
                      <Badge variant="outline">
                        {b.backup_type === "manuel" ? "Manuel" : "Automatique"}
                      </Badge>
                    </TableCell>
                    <TableCell className="max-w-[220px] truncate text-xs text-muted-foreground">
                      {(Array.isArray(b.modules) ? (b.modules as string[]) : [])
                        .map((m) => moduleLabelMap[m] ?? m)
                        .join(", ")}
                    </TableCell>
                    <TableCell>{b.record_count ?? "—"}</TableCell>
                    <TableCell>
                      <BackupStatusBadge status={b.status} />
                    </TableCell>
                    <TableCell className="text-right">
                      <div className="flex justify-end gap-2">
                        <BackupDownloadButton backup={b} />
                        {b.status === "echec" && canCreate && (
                          <Button
                            variant="outline"
                            size="sm"
                            className="gap-1.5"
                            disabled={retryBackup.isPending}
                            onClick={() => retryBackup.mutate(b)}
                          >
                            <RotateCcw className="h-3.5 w-3.5" /> Réessayer
                          </Button>
                        )}
                      </div>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </div>
        )}
      </PanelCard>
    </div>
  );
}
