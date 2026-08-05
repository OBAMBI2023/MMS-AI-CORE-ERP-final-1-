import { useRef, useState } from "react";
import { Building2, Loader2, Trash2, Upload } from "lucide-react";
import { toast } from "sonner";
import { BrandLogo } from "@/components/branding/BrandLogo";
import { Button } from "@/components/ui/button";
import { useSignedUrl } from "@/hooks/use-signed-url";
import { supabase } from "@/integrations/supabase/client";
import { cn } from "@/lib/utils";

const BUCKET = "company-assets";
const MAX_FILE_SIZE = 2 * 1024 * 1024;
const ACCEPTED_TYPES = ["image/png", "image/jpeg", "image/jpg", "image/svg+xml"];

function formatError(error: unknown) {
  const value = error as { message?: string };
  return value?.message || "Une erreur inattendue est survenue.";
}

type FileDropUploaderProps = {
  currentPath: string | null;
  tenantId: string;
  folder: string;
  label: string;
  onChange: (path: string | null) => void;
  variant?: "avatar" | "dropzone";
};

/**
 * Shared logo / signature / cachet uploader. `variant="avatar"` renders the
 * compact square preview (Logo), `variant="dropzone"` renders the drag-and-drop
 * panel used for Signature / Cachet in the Documents tab.
 */
export function FileDropUploader({
  currentPath,
  tenantId,
  folder,
  label,
  onChange,
  variant = "avatar",
}: FileDropUploaderProps) {
  const inputRef = useRef<HTMLInputElement>(null);
  const previewUrl = useSignedUrl(currentPath);
  const [busy, setBusy] = useState(false);
  const [dragOver, setDragOver] = useState(false);

  const upload = async (file: File) => {
    if (!ACCEPTED_TYPES.includes(file.type)) {
      toast.error("Format non pris en charge. Utilisez PNG, JPG ou SVG.");
      return;
    }
    if (file.size > MAX_FILE_SIZE) {
      toast.error("Le fichier ne doit pas dépasser 2 Mo.");
      return;
    }
    setBusy(true);
    try {
      const extension = file.name.split(".").pop()?.toLowerCase() || "png";
      const path = `${tenantId}/${folder}/${Date.now()}.${extension}`;
      const { error } = await supabase.storage
        .from(BUCKET)
        .upload(path, file, { contentType: file.type, upsert: false });
      if (error) throw error;
      const previous = currentPath;
      onChange(path);
      if (previous) await supabase.storage.from(BUCKET).remove([previous]);
      toast.success(currentPath ? `${label} remplacé(e)` : `${label} importé(e)`);
    } catch (error) {
      toast.error(formatError(error));
    } finally {
      setBusy(false);
    }
  };

  const remove = async () => {
    if (!currentPath) return;
    setBusy(true);
    try {
      const { error } = await supabase.storage.from(BUCKET).remove([currentPath]);
      if (error) throw error;
      onChange(null);
      toast.success(`${label} supprimé(e)`);
    } catch (error) {
      toast.error(formatError(error));
    } finally {
      setBusy(false);
    }
  };

  const input = (
    <input
      ref={inputRef}
      type="file"
      className="hidden"
      accept={ACCEPTED_TYPES.join(",")}
      onChange={(event) => {
        const file = event.target.files?.[0];
        if (file) void upload(file);
        event.target.value = "";
      }}
    />
  );

  if (variant === "dropzone") {
    return (
      <div
        className={cn(
          "flex flex-col items-center gap-3 rounded-xl border-2 border-dashed p-8 text-center transition-colors",
          dragOver ? "border-primary bg-primary/5" : "border-muted-foreground/25",
        )}
        onDragOver={(event) => {
          event.preventDefault();
          setDragOver(true);
        }}
        onDragLeave={() => setDragOver(false)}
        onDrop={(event) => {
          event.preventDefault();
          setDragOver(false);
          const file = event.dataTransfer.files?.[0];
          if (file) void upload(file);
        }}
      >
        {previewUrl ? (
          <div className="flex size-20 items-center justify-center overflow-hidden rounded-xl border bg-background p-2">
            <BrandLogo context="dashboard" src={previewUrl} alt={label} />
          </div>
        ) : (
          <div className="flex size-12 items-center justify-center rounded-full bg-primary/10 text-primary">
            {busy ? <Loader2 className="h-5 w-5 animate-spin" /> : <Upload className="h-5 w-5" />}
          </div>
        )}
        <p className="font-medium">Glissez un fichier ici</p>
        <p className="text-xs text-muted-foreground">PNG, JPG, SVG — max 2 Mo</p>
        <div className="flex gap-2">
          <Button type="button" variant="outline" size="sm" disabled={busy} onClick={() => inputRef.current?.click()}>
            {currentPath ? "Remplacer" : "Choisir un fichier"}
          </Button>
          {currentPath && (
            <Button type="button" variant="ghost" size="sm" className="gap-1.5 text-destructive hover:text-destructive" disabled={busy} onClick={remove}>
              <Trash2 className="h-4 w-4" />
              Supprimer
            </Button>
          )}
        </div>
        {input}
      </div>
    );
  }

  return (
    <div className="flex flex-col items-center gap-5 rounded-xl border border-dashed bg-muted/20 p-6 sm:flex-row sm:text-left">
      <div className="flex size-28 shrink-0 items-center justify-center overflow-hidden rounded-2xl border bg-background shadow-sm">
        {busy ? (
          <Loader2 className="h-6 w-6 animate-spin text-primary" />
        ) : previewUrl ? (
          <BrandLogo context="dashboard" src={previewUrl} alt={label} />
        ) : (
          <Building2 className="h-9 w-9 text-muted-foreground/60" />
        )}
      </div>
      <div className="flex-1 text-center sm:text-left">
        <p className="font-medium">{label}</p>
        <p className="mt-1 text-sm text-muted-foreground">PNG, JPG ou SVG · 2 Mo maximum</p>
        <div className="mt-4 flex flex-wrap justify-center gap-2 sm:justify-start">
          <Button type="button" variant="outline" size="sm" className="gap-2" disabled={busy} onClick={() => inputRef.current?.click()}>
            <Upload className="h-4 w-4" />
            {currentPath ? "Remplacer" : "Importer"}
          </Button>
          {currentPath && (
            <Button type="button" variant="ghost" size="sm" className="gap-2 text-destructive hover:text-destructive" disabled={busy} onClick={remove}>
              <Trash2 className="h-4 w-4" />
              Supprimer
            </Button>
          )}
        </div>
      </div>
      {input}
    </div>
  );
}
