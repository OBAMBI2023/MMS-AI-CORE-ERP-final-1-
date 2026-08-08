import { useRef, useState } from "react";
import { FilePlus2, Trash2 } from "lucide-react";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";
import { useTenant } from "@/providers/TenantProvider";
import { generateSafeId } from "@/lib/uuid";

export function ImageField({
  value,
  onChange,
  storage,
}: {
  value: string;
  onChange: (value: string) => void;
  storage?: { bucket: string; folder: string };
}) {
  const fileRef = useRef<HTMLInputElement>(null);
  const { profile } = useTenant();
  const [uploading, setUploading] = useState(false);
  const [preview, setPreview] = useState<string | null>(null);
  const [selectedName, setSelectedName] = useState<string | null>(null);
  const select = async (file?: File) => {
    if (!file) return;
    if (!file.type.startsWith("image/") && file.type !== "application/pdf") {
      toast.error("Veuillez sélectionner une image ou un PDF.");
      return;
    }
    if (file.size > 5 * 1024 * 1024) {
      toast.error("Le document ne doit pas dépasser 5 Mo.");
      return;
    }
    if (storage) {
      if (!profile?.tenant_id) return toast.error("Établissement introuvable.");
      setUploading(true);
      try {
        const extension = file.type === "application/pdf" ? "pdf" :
          file.type === "image/png" ? "png" : file.type === "image/webp" ? "webp" : "jpg";
        const path = `${profile.tenant_id}/${storage.folder}/${generateSafeId()}.${extension}`;
        const { error } = await supabase.storage
          .from(storage.bucket)
          .upload(path, file, { contentType: file.type });
        if (error) throw error;
        setSelectedName(file.name);
        setPreview(file.type.startsWith("image/") ? URL.createObjectURL(file) : null);
        onChange(path);
      } catch {
        toast.error("Impossible de préparer le fichier. Veuillez réessayer.");
      } finally {
        setUploading(false);
      }
      return;
    }
    const reader = new FileReader();
    reader.onload = () => onChange(String(reader.result ?? ""));
    reader.onerror = () => toast.error("Impossible de lire cette image.");
    reader.readAsDataURL(file);
  };

  return (
    <div className="space-y-3">
      {value && (preview || value.startsWith("data:image/")) && (
        <div className="relative overflow-hidden rounded-xl border border-border bg-muted/40">
          <img
            src={preview ?? value}
            alt="Aperçu de la pièce d'identité"
            className="h-40 w-full object-contain"
          />
          <button
            type="button"
            onClick={() => { onChange(""); setPreview(null); setSelectedName(null); }}
            className="absolute right-2 top-2 rounded-lg bg-background/90 p-2 text-destructive shadow"
            aria-label="Retirer le document"
          >
            <Trash2 className="h-4 w-4" />
          </button>
        </div>
      )}
      {value && (
        <div className="flex items-center justify-between gap-3 rounded-lg border px-3 py-2 text-sm">
          <span className="truncate">{selectedName ?? value.split("/").pop()}</span>
          <button type="button" className="text-destructive hover:underline" onClick={() => { onChange(""); setPreview(null); setSelectedName(null); }}>Retirer</button>
        </div>
      )}
      <div>
        <button
          disabled={uploading}
          type="button"
          onClick={() => fileRef.current?.click()}
          className="inline-flex items-center justify-center gap-2 rounded-xl border border-border px-3 py-2 text-sm font-medium hover:bg-muted disabled:opacity-50"
        >
          <FilePlus2 className="h-4 w-4" /> {uploading ? "Ajout…" : "Ajouter une pièce d’identité"}
        </button>
      </div>
      <input
        ref={fileRef}
        type="file"
        accept="image/*,application/pdf"
        className="sr-only"
        onChange={(e) => {
          select(e.target.files?.[0]);
          e.target.value = "";
        }}
      />
    </div>
  );
}
