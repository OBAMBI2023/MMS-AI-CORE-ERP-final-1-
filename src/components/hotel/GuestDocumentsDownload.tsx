import { useState } from "react";
import { Download, Loader2 } from "lucide-react";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";
import { useActionPermission } from "@/hooks/use-action-permission";
import { useTenant } from "@/providers/TenantProvider";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";

const BUCKET = "hotel-identity-documents";

type GuestDocumentRow = {
  id: string;
  tenant_id?: unknown;
  identity_document_path?: unknown;
};

function documentPaths(value: unknown): string[] {
  if (Array.isArray(value)) return value.flatMap(storagePath);
  if (typeof value !== "string" || !value.trim()) return [];
  try {
    const parsed: unknown = JSON.parse(value);
    if (Array.isArray(parsed)) return parsed.flatMap(storagePath);
  } catch {
    // The current schema stores one private path as plain text.
  }
  return storagePath(value);
}

function storagePath(value: unknown): string[] {
  if (typeof value !== "string" || !value.trim()) return [];
  const raw = value.trim();
  try {
    const url = new URL(raw);
    const marker = `/storage/v1/object/`;
    const markerIndex = url.pathname.indexOf(marker);
    if (markerIndex < 0) return [];
    const objectPath = url.pathname.slice(markerIndex + marker.length);
    const segments = objectPath.split("/").filter(Boolean);
    if (["public", "sign", "authenticated"].includes(segments[0])) segments.shift();
    if (segments.shift() !== BUCKET || !segments.length) return [];
    const path = decodeURIComponent(segments.join("/"));
    return path.trim() ? [path] : [];
  } catch {
    const path = raw.replace(/^\/+/, "");
    const bucketPrefix = `${BUCKET}/`;
    return path.startsWith(bucketPrefix) ? [path.slice(bucketPrefix.length)] : [path];
  }
}

function filename(path: string, index: number) {
  const storedName = path.split("/").pop();
  return storedName || `document-${index + 1}`;
}

export function GuestDocumentsDownload({ row }: { row: GuestDocumentRow }) {
  const { profile } = useTenant();
  const canViewIdentity = useActionPermission("hotel.guests.identity_view");
  const tenantId = profile?.tenant_id;
  const paths = documentPaths(row.identity_document_path).filter(
    (path) => Boolean(tenantId) && path.startsWith(`${tenantId}/identity-documents/`),
  );
  const [downloading, setDownloading] = useState(false);

  const downloadOne = async (requestedPath: string, index: number) => {
    if (!tenantId || !canViewIdentity) throw new Error("Téléchargement non autorisé.");

    // Re-read the tenant-scoped record immediately before signing. Database and
    // Storage RLS independently enforce the same identity-view permission.
    const { data: guest, error: guestError } = await (supabase as any)
      .from("hotel_guests")
      .select("tenant_id, identity_document_path")
      .eq("id", row.id)
      .eq("tenant_id", tenantId)
      .single();
    if (guestError || guest?.tenant_id !== tenantId) throw new Error("Voyageur inaccessible.");

    const currentPaths = documentPaths(guest.identity_document_path);
    if (!currentPaths.includes(requestedPath)) throw new Error("Ce document n’existe plus.");
    if (!requestedPath.startsWith(`${tenantId}/identity-documents/`)) {
      throw new Error("Chemin de document invalide.");
    }

    const { data, error } = await supabase.storage
      .from(BUCKET)
      .createSignedUrl(requestedPath, 60, { download: filename(requestedPath, index) });
    if (error || !data?.signedUrl) throw new Error("Document inaccessible.");

    const link = document.createElement("a");
    link.href = data.signedUrl;
    link.download = filename(requestedPath, index);
    document.body.appendChild(link);
    link.click();
    link.remove();
  };

  const run = async (selected: Array<{ path: string; index: number }>) => {
    setDownloading(true);
    try {
      for (const item of selected) await downloadOne(item.path, item.index);
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Téléchargement impossible.");
    } finally {
      setDownloading(false);
    }
  };

  if (!paths.length || !canViewIdentity) {
    return (
      <button type="button" disabled className="inline-flex items-center gap-1.5 rounded-lg p-2 text-muted-foreground opacity-50 sm:px-2.5" title="Aucun document">
        <Download className="h-4 w-4" />
        <span className="hidden sm:inline">Aucun document</span>
      </button>
    );
  }

  if (paths.length === 1) {
    return (
      <button type="button" disabled={downloading} onClick={() => void run([{ path: paths[0], index: 0 }])} className="inline-flex items-center gap-1.5 rounded-lg p-2 text-muted-foreground hover:bg-muted hover:text-foreground disabled:opacity-50 sm:px-2.5" aria-label="Télécharger les documents" title="Télécharger les documents">
        {downloading ? <Loader2 className="h-4 w-4 animate-spin" /> : <Download className="h-4 w-4" />}
        <span className="hidden lg:inline">Télécharger</span>
      </button>
    );
  }

  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <button type="button" disabled={downloading} className="inline-flex items-center gap-1.5 rounded-lg p-2 text-muted-foreground hover:bg-muted hover:text-foreground disabled:opacity-50 sm:px-2.5" aria-label="Télécharger les documents">
          {downloading ? <Loader2 className="h-4 w-4 animate-spin" /> : <Download className="h-4 w-4" />}
          <span className="hidden lg:inline">Télécharger</span>
        </button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end" className="w-64">
        <DropdownMenuLabel>Documents ({paths.length})</DropdownMenuLabel>
        {paths.map((path, index) => (
          <DropdownMenuItem key={`${path}-${index}`} onSelect={() => void run([{ path, index }])}>
            <Download /> <span className="truncate">{filename(path, index)}</span>
          </DropdownMenuItem>
        ))}
        <DropdownMenuSeparator />
        <DropdownMenuItem onSelect={() => void run(paths.map((path, index) => ({ path, index })))}>
          <Download /> Télécharger tout
        </DropdownMenuItem>
      </DropdownMenuContent>
    </DropdownMenu>
  );
}
