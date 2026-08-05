import { useRef, useState } from "react";
import { Database, Download, RotateCcw, Upload } from "lucide-react";
import { toast } from "sonner";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from "@/components/ui/alert-dialog";
import { Button } from "@/components/ui/button";
import { EDITABLE_PARAMETRES_FIELDS, type ParametresForm } from "@/hooks/use-parametres-editor";

type QuickActionsProps = {
  form: ParametresForm;
  onImport: (patch: Partial<ParametresForm>) => void;
  onReset: () => void;
  isDirty: boolean;
};

function downloadJson(filename: string, data: unknown) {
  const blob = new Blob([JSON.stringify(data, null, 2)], { type: "application/json" });
  const url = URL.createObjectURL(blob);
  const link = document.createElement("a");
  link.href = url;
  link.download = filename;
  link.click();
  URL.revokeObjectURL(url);
}

export function QuickActions({ form, onImport, onReset, isDirty }: QuickActionsProps) {
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [resetOpen, setResetOpen] = useState(false);

  const exportConfig = () => {
    downloadJson(`parametres-${new Date().toISOString().slice(0, 10)}.json`, form);
    toast.success("Configuration exportée");
  };

  const createBackup = () => {
    downloadJson(`sauvegarde-parametres-${Date.now()}.json`, form);
    toast.success("Sauvegarde créée");
  };

  const importConfig = async (file: File) => {
    try {
      const text = await file.text();
      const parsed = JSON.parse(text) as Record<string, unknown>;
      const patch: Partial<ParametresForm> = {};
      for (const key of EDITABLE_PARAMETRES_FIELDS) {
        if (key in parsed) (patch as Record<string, unknown>)[key] = parsed[key];
      }
      if (Object.keys(patch).length === 0) {
        toast.error("Ce fichier ne contient aucun paramètre reconnu.");
        return;
      }
      onImport(patch);
      toast.success("Configuration importée — pensez à Enregistrer pour appliquer les changements.");
    } catch {
      toast.error("Fichier invalide. Importez un export JSON valide.");
    }
  };

  return (
    <section className="overflow-hidden rounded-2xl border bg-card shadow-sm">
      <div className="border-b px-5 py-4">
        <h2 className="font-semibold">Actions rapides</h2>
      </div>
      <div className="space-y-2 p-5">
        <Button type="button" variant="outline" className="w-full justify-start gap-2" onClick={exportConfig}>
          <Download className="h-4 w-4" />
          Exporter la configuration
        </Button>
        <Button
          type="button"
          variant="outline"
          className="w-full justify-start gap-2"
          onClick={() => fileInputRef.current?.click()}
        >
          <Upload className="h-4 w-4" />
          Importer une configuration
        </Button>
        <input
          ref={fileInputRef}
          type="file"
          accept="application/json"
          className="hidden"
          onChange={(event) => {
            const file = event.target.files?.[0];
            if (file) void importConfig(file);
            event.target.value = "";
          }}
        />
        <Button type="button" variant="outline" className="w-full justify-start gap-2" onClick={createBackup}>
          <Database className="h-4 w-4" />
          Créer une sauvegarde
        </Button>

        <AlertDialog open={resetOpen} onOpenChange={setResetOpen}>
          <AlertDialogTrigger asChild>
            <Button
              type="button"
              variant="outline"
              className="w-full justify-start gap-2 text-destructive hover:text-destructive"
              disabled={!isDirty}
            >
              <RotateCcw className="h-4 w-4" />
              Réinitialiser les paramètres
            </Button>
          </AlertDialogTrigger>
          <AlertDialogContent>
            <AlertDialogHeader>
              <AlertDialogTitle>Annuler les modifications non enregistrées ?</AlertDialogTitle>
              <AlertDialogDescription>
                Les champs reviendront à la dernière version enregistrée. Rien n’est encore
                enregistré, donc cette action n’efface aucune donnée sauvegardée.
              </AlertDialogDescription>
            </AlertDialogHeader>
            <AlertDialogFooter>
              <AlertDialogCancel>Annuler</AlertDialogCancel>
              <AlertDialogAction
                onClick={() => {
                  onReset();
                  setResetOpen(false);
                  toast.success("Modifications non enregistrées annulées");
                }}
              >
                Réinitialiser
              </AlertDialogAction>
            </AlertDialogFooter>
          </AlertDialogContent>
        </AlertDialog>
      </div>
    </section>
  );
}
