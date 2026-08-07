import { useState } from "react";
import { useRouter } from "@tanstack/react-router";
import { toast } from "sonner";
import { Layers3, Pencil, Plus, Trash2 } from "lucide-react";
import {
  saveModulePack,
  removeModulePack,
  type SuperAdminDashboard,
  type SuperAdminModulePack,
} from "@/lib/super-admin.server";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Checkbox } from "@/components/ui/checkbox";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { Textarea } from "@/components/ui/textarea";

export function ModulePacksSection({
  packs,
  modules,
}: {
  packs: SuperAdminModulePack[];
  modules: SuperAdminDashboard["modules"];
}) {
  const router = useRouter();
  const [editing, setEditing] = useState<SuperAdminModulePack | null>(null);
  const [dialogOpen, setDialogOpen] = useState(false);
  const [name, setName] = useState("");
  const [code, setCode] = useState("");
  const [description, setDescription] = useState("");
  const [active, setActive] = useState(true);
  const [moduleIds, setModuleIds] = useState<string[]>([]);
  const [submitting, setSubmitting] = useState(false);
  const [removalTarget, setRemovalTarget] = useState<SuperAdminModulePack | null>(null);
  const [removing, setRemoving] = useState(false);

  const openEditor = (pack?: SuperAdminModulePack) => {
    setEditing(pack ?? null);
    setName(pack?.name ?? "");
    setCode(pack?.code ?? "");
    setDescription(pack?.description ?? "");
    setActive(pack?.is_active ?? true);
    setModuleIds(pack?.moduleIds ?? []);
    setDialogOpen(true);
  };

  const submit = async () => {
    setSubmitting(true);
    try {
      await saveModulePack({
        data: {
          id: editing?.id ?? null,
          name,
          code,
          description: description || null,
          isActive: active,
          moduleIds,
        },
      });
      toast.success(editing ? "Pack mis à jour." : "Pack créé.");
      setDialogOpen(false);
      await router.invalidate();
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Impossible d’enregistrer le pack.");
    } finally {
      setSubmitting(false);
    }
  };

  const confirmRemove = async () => {
    if (!removalTarget) return;
    setRemoving(true);
    try {
      await removeModulePack({ data: { packId: removalTarget.id } });
      toast.success("Pack supprimé.");
      setRemovalTarget(null);
      await router.invalidate();
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Impossible de supprimer le pack.");
    } finally {
      setRemoving(false);
    }
  };

  return (
    <section id="packs-modules" className="scroll-mt-24 space-y-4">
      <div className="flex items-center justify-between gap-4">
        <div>
          <h2 className="text-lg font-semibold">Packs de modules</h2>
          <p className="text-sm text-muted-foreground">
            Regroupez les modules SAOVIA et attribuez-les depuis le panneau de contrôle d’un tenant.
          </p>
        </div>
        <Button onClick={() => openEditor()}>
          <Plus /> Nouveau pack
        </Button>
      </div>
      <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
        {packs.length === 0 ? (
          <Card className="p-5 text-sm text-muted-foreground md:col-span-2 xl:col-span-4">
            Aucun pack de modules enregistré.
          </Card>
        ) : (
          packs.map((pack) => (
            <Card key={pack.id} className="flex flex-col rounded-xl border-border/70 p-5 shadow-sm">
              <div className="flex items-start justify-between gap-3">
                <div className="flex size-10 items-center justify-center rounded-xl bg-blue-50 text-blue-600 dark:bg-blue-950">
                  <Layers3 className="size-5" />
                </div>
                <Badge variant={pack.is_active ? "default" : "secondary"}>
                  {pack.is_active ? "Actif" : "Inactif"}
                </Badge>
              </div>
              <h3 className="mt-4 font-semibold">{pack.name}</h3>
              <p className="mt-1 font-mono text-xs text-muted-foreground">{pack.code}</p>
              <p className="mt-3 min-h-10 text-sm text-muted-foreground">
                {pack.description ?? "Aucune description"}
              </p>
              <p className="mt-3 text-xs font-medium">
                {pack.moduleIds.length} module{pack.moduleIds.length > 1 ? "s" : ""}
              </p>
              <div className="mt-4 flex gap-2 border-t pt-4">
                <Button
                  variant="outline"
                  size="sm"
                  className="flex-1"
                  onClick={() => openEditor(pack)}
                >
                  <Pencil /> Modifier
                </Button>
                <Button variant="ghost" size="icon" onClick={() => setRemovalTarget(pack)}>
                  <Trash2 className="size-4 text-destructive" />
                </Button>
              </div>
            </Card>
          ))
        )}
      </div>

      <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
        <DialogContent className="flex max-h-[90vh] w-[calc(100%-2rem)] min-w-0 flex-col gap-0 overflow-hidden p-0 sm:max-w-2xl">
          <DialogHeader className="shrink-0 px-4 pb-4 pt-6 sm:px-6">
            <DialogTitle>{editing ? "Modifier le pack" : "Créer un pack"}</DialogTitle>
            <DialogDescription>
              La composition sera enregistrée de façon atomique avec le pack.
            </DialogDescription>
          </DialogHeader>
          <div className="grid min-w-0 flex-1 gap-4 overflow-x-hidden overflow-y-auto px-4 py-2 sm:grid-cols-2 sm:px-6">
            <div className="space-y-2">
              <Label htmlFor="pack-name">Nom</Label>
              <Input
                id="pack-name"
                value={name}
                onChange={(event) => setName(event.target.value)}
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="pack-code">Code</Label>
              <Input
                id="pack-code"
                value={code}
                onChange={(event) => setCode(event.target.value.toLowerCase())}
              />
            </div>
            <div className="space-y-2 sm:col-span-2">
              <Label htmlFor="pack-description">Description</Label>
              <Textarea
                id="pack-description"
                value={description}
                onChange={(event) => setDescription(event.target.value)}
              />
            </div>
            <div className="flex items-center justify-between rounded-lg border p-3 sm:col-span-2">
              <Label htmlFor="pack-active">Pack actif</Label>
              <Switch id="pack-active" checked={active} onCheckedChange={setActive} />
            </div>
            <div className="space-y-2 sm:col-span-2">
              <Label>Modules inclus</Label>
              <div className="grid max-h-64 gap-2 overflow-y-auto rounded-lg border p-3 sm:grid-cols-2">
                {modules.map((module) => (
                  <label
                    key={module.id}
                    className="flex cursor-pointer items-start gap-3 rounded-md p-2 hover:bg-muted"
                  >
                    <Checkbox
                      checked={moduleIds.includes(module.id)}
                      onCheckedChange={(checked) =>
                        setModuleIds((current) =>
                          checked
                            ? [...current, module.id]
                            : current.filter((id) => id !== module.id),
                        )
                      }
                    />
                    <span>
                      <span className="block text-sm font-medium">{module.name}</span>
                      <span className="block text-xs text-muted-foreground">{module.code}</span>
                    </span>
                  </label>
                ))}
              </div>
            </div>
          </div>
          <DialogFooter className="sticky bottom-0 shrink-0 gap-2 border-t bg-background px-4 py-4 sm:px-6">
            <Button variant="outline" onClick={() => setDialogOpen(false)}>
              Annuler
            </Button>
            <Button
              disabled={submitting || !name.trim() || !code.trim()}
              onClick={() => void submit()}
            >
              {submitting ? "Enregistrement…" : "Enregistrer"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <AlertDialog
        open={Boolean(removalTarget)}
        onOpenChange={(open) => !open && setRemovalTarget(null)}
      >
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Supprimer le pack « {removalTarget?.name} » ?</AlertDialogTitle>
            <AlertDialogDescription>
              Cette action est irréversible. Les tenants utilisant déjà ce pack conservent leurs
              modules actuels, mais le pack ne pourra plus être attribué.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel disabled={removing}>Annuler</AlertDialogCancel>
            <AlertDialogAction
              disabled={removing}
              onClick={(event) => {
                event.preventDefault();
                void confirmRemove();
              }}
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
            >
              {removing ? "Suppression…" : "Supprimer"}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </section>
  );
}
