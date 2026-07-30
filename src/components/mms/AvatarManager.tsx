import { useEffect, useRef, useState } from "react";
import { Camera, ImageUp, Loader2, Trash2 } from "lucide-react";
import { useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { ProfileAvatar } from "@/components/mms/ProfileAvatar";
import { supabase } from "@/integrations/supabase/client";
import {
  AVATAR_BUCKET,
  AVATAR_MIME_TYPES,
  MAX_AVATAR_SIZE,
  avatarExtension,
  getInitials,
} from "@/lib/avatar";
import { formatSupabaseError } from "@/lib/supabase-error";

type AvatarManagerProps = {
  userId: string;
  tenantId: string;
  name?: string | null;
  email?: string | null;
  avatarPath?: string | null;
  onChanged?: (path: string | null) => void | Promise<void>;
};

export function AvatarManager({
  userId,
  tenantId,
  name,
  email,
  avatarPath,
  onChanged,
}: AvatarManagerProps) {
  const qc = useQueryClient();
  const inputRef = useRef<HTMLInputElement>(null);
  const [file, setFile] = useState<File | null>(null);
  const [previewUrl, setPreviewUrl] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    if (!file) {
      setPreviewUrl(null);
      return;
    }
    const url = URL.createObjectURL(file);
    setPreviewUrl(url);
    return () => URL.revokeObjectURL(url);
  }, [file]);

  const refresh = async (path: string | null) => {
    window.dispatchEvent(new CustomEvent("avatar-updated", { detail: { userId, path } }));
    await Promise.all([
      qc.invalidateQueries({ queryKey: ["userProfile"] }),
      qc.invalidateQueries({ queryKey: ["users", tenantId] }),
    ]);
    await onChanged?.(path);
  };

  const chooseFile = (selected?: File) => {
    if (!selected) return;
    if (!AVATAR_MIME_TYPES.includes(selected.type as (typeof AVATAR_MIME_TYPES)[number])) {
      toast.error("Format non pris en charge. Utilisez une image JPG, PNG ou WebP.");
      return;
    }
    if (selected.size > MAX_AVATAR_SIZE) {
      toast.error("La photo ne doit pas dépasser 5 Mo.");
      return;
    }
    setFile(selected);
  };

  const upload = async () => {
    if (!file || busy) return;
    setBusy(true);
    const path = `${tenantId}/${userId}.${avatarExtension(file)}`;
    try {
      const { error: uploadError } = await supabase.storage
        .from(AVATAR_BUCKET)
        .upload(path, file, { contentType: file.type, upsert: true });
      if (uploadError) throw uploadError;

      const { data: previousPath, error: profileError } = await (supabase as any).rpc(
        "set_profile_avatar",
        { target_user_id: userId, avatar_path: path },
      );
      if (profileError) {
        await supabase.storage.from(AVATAR_BUCKET).remove([path]);
        throw profileError;
      }
      if (previousPath && previousPath !== path) {
        await supabase.storage.from(AVATAR_BUCKET).remove([previousPath]);
      }

      setFile(null);
      await refresh(path);
      toast.success(avatarPath ? "Photo de profil remplacée." : "Photo de profil ajoutée.");
    } catch (error) {
      toast.error(formatSupabaseError(error));
    } finally {
      setBusy(false);
    }
  };

  const remove = async () => {
    if (!avatarPath || busy) return;
    setBusy(true);
    try {
      const { error } = await (supabase as any).rpc("set_profile_avatar", {
        target_user_id: userId,
        avatar_path: null,
      });
      if (error) throw error;
      const { error: removeError } = await supabase.storage.from(AVATAR_BUCKET).remove([avatarPath]);
      if (removeError) console.warn("Photo déréférencée mais objet non supprimé", removeError);
      setFile(null);
      await refresh(null);
      toast.success("Photo de profil supprimée.");
    } catch (error) {
      toast.error(formatSupabaseError(error));
    } finally {
      setBusy(false);
    }
  };

  return (
    <div className="space-y-4">
      <div className="flex flex-col items-center gap-4 sm:flex-row">
        {previewUrl ? (
          <div className="flex h-24 w-24 shrink-0 items-center justify-center overflow-hidden rounded-full bg-muted">
            <img src={previewUrl} alt="Prévisualisation de la photo" className="h-full w-full object-cover" />
          </div>
        ) : (
          <ProfileAvatar
            path={avatarPath}
            name={name}
            email={email}
            className="h-24 w-24"
            fallbackClassName="text-2xl"
          />
        )}
        <div className="flex-1 space-y-2 text-center sm:text-left">
          <p className="font-medium">{previewUrl ? "Aperçu avant validation" : "Photo de profil"}</p>
          <p className="text-xs text-muted-foreground">JPG, PNG ou WebP. 5 Mo maximum.</p>
          <div className="flex flex-wrap justify-center gap-2 sm:justify-start">
            <input
              ref={inputRef}
              type="file"
              accept="image/jpeg,image/png,image/webp"
              className="sr-only"
              onChange={(event) => {
                chooseFile(event.target.files?.[0]);
                event.target.value = "";
              }}
            />
            <Button type="button" variant="outline" size="sm" disabled={busy} onClick={() => inputRef.current?.click()}>
              <ImageUp className="mr-2 h-4 w-4" />
              {avatarPath ? "Remplacer" : "Choisir une photo"}
            </Button>
            {avatarPath && !file && (
              <Button type="button" variant="outline" size="sm" disabled={busy} onClick={remove} className="text-destructive">
                {busy ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <Trash2 className="mr-2 h-4 w-4" />}
                Supprimer
              </Button>
            )}
          </div>
        </div>
      </div>
      {file && (
        <div className="flex justify-end gap-2">
          <Button type="button" variant="ghost" disabled={busy} onClick={() => setFile(null)}>Annuler</Button>
          <Button type="button" disabled={busy} onClick={upload}>
            {busy ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <Camera className="mr-2 h-4 w-4" />}
            Valider la photo
          </Button>
        </div>
      )}
      {!avatarPath && !file && (
        <p className="sr-only">Aucune photo. Initiales affichées : {getInitials(name, email)}</p>
      )}
    </div>
  );
}
