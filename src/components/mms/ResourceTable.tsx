import { useMemo, useRef, useState, type ReactNode } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Plus, Search, Pencil, Trash2, X, Loader2, FilePlus2 } from "lucide-react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";
import { usePermissions } from "@/hooks/use-permissions";
import { useActionPermission } from "@/hooks/use-action-permission";
import { logAction } from "@/lib/audit.server";
import { useTenant } from "@/providers/TenantProvider";
import { Checkbox } from "@/components/ui/checkbox";
import { generateSafeId } from "@/lib/uuid";

// Dynamic table access — cast client so table names typed as string are accepted.
const db = supabase as unknown as {
  from: (table: string) => {
    select: (columns: string) => {
      order: (
        col: string,
        opts?: { ascending?: boolean },
      ) => Promise<{ data: unknown[] | null; error: Error | null }>;
    } & Promise<{ data: unknown[] | null; error: Error | null }>;
    delete: () => { eq: (col: string, val: unknown) => Promise<{ error: Error | null }> };
    update: (payload: Record<string, unknown>) => {
      eq: (col: string, val: unknown) => Promise<{ error: Error | null }>;
    };
    insert: (payload: Record<string, unknown>) => Promise<{ error: Error | null }>;
  };
};

export type FieldType =
  "text" | "textarea" | "number" | "email" | "tel" | "date" | "select" | "image";

export interface FieldDef {
  name: string;
  label: string;
  type?: FieldType;
  required?: boolean;
  options?: readonly (string | { value: string; label: string })[];
  placeholder?: string;
  colSpan?: 1 | 2;
  step?: string;
  hidden?: (values: Record<string, unknown>) => boolean;
  requiredWhen?: (values: Record<string, unknown>) => boolean;
  createOption?: {
    label: string;
    inputLabel: string;
    onCreate: (name: string) => Promise<{ value: string; label: string }>;
  };
}

export interface ColumnDef<T> {
  header: string;
  cell: (row: T) => ReactNode;
  className?: string;
}

export interface ResourceTableProps<T extends { id: string }> {
  table: string;
  singular: string;
  plural: string;
  fields: FieldDef[];
  columns: ColumnDef<T>[];
  searchFields?: string[];
  orderBy?: { column: string; ascending?: boolean };
  defaultValues?: Partial<T>;
  renderActions?: (data: T[]) => ReactNode;
  renderRowActions?: (row: T) => ReactNode;
  deletePermission?: string;
  entityName?: string;
  createFields?: FieldDef[];
  prepareCreatePayload?: (values: Record<string, unknown>) => Record<string, unknown>;
  prepareEditValues?: (row: T) => Record<string, unknown>;
  prepareEditPayload?: (values: Record<string, unknown>) => Record<string, unknown>;
  saveErrorMessage?: (error: unknown) => string;
  selectable?: boolean;
  renderSelectionActions?: (selected: T[], clear: () => void) => ReactNode;
  imageStorage?: { bucket: string; folder: string };
  deleteRow?: (row: T) => Promise<void>;
  deleteErrorMessage?: string;
  filterRows?: (row: T) => boolean;
  hideDeleteAction?: boolean;
}

export function ResourceTable<T extends { id: string; [k: string]: unknown }>(
  props: ResourceTableProps<T>,
) {
  const {
    table,
    singular,
    plural,
    fields,
    columns,
    searchFields = [],
    orderBy,
    defaultValues = {},
    renderActions,
    renderRowActions,
    deletePermission,
    entityName,
    createFields,
    prepareCreatePayload,
    prepareEditValues,
    prepareEditPayload,
    saveErrorMessage,
    selectable = false,
    renderSelectionActions,
    imageStorage,
    deleteRow,
    deleteErrorMessage,
    filterRows,
    hideDeleteAction = false,
  } = props;
  const qc = useQueryClient();
  const [q, setQ] = useState("");
  const [editing, setEditing] = useState<T | null>(null);
  const [creating, setCreating] = useState(false);
  const [selectedIds, setSelectedIds] = useState<Set<string>>(() => new Set());
  const { data: userData } = useQuery({
    queryKey: ["user"],
    queryFn: () => supabase.auth.getUser(),
  });
  const permissionsQuery = usePermissions();
  const { roleId } = permissionsQuery.data || { roleId: null };
  const userId = userData?.data?.user?.id;
  const canDelete = deletePermission ? useActionPermission(deletePermission) : true;
  const canCreate = entityName ? useActionPermission(`${entityName}.create`) : true;
  const canEdit = entityName ? useActionPermission(`${entityName}.edit`) : true;

  const { data = [], isLoading } = useQuery({
    queryKey: [table],
    queryFn: async () => {
      const query = db.from(table).select("*");
      const { data, error } = await (orderBy
        ? query.order(orderBy.column, { ascending: orderBy.ascending ?? false })
        : query);
      if (error) throw error;
      return (data ?? []) as T[];
    },
  });

  const filtered = useMemo(() => {
    const s = q.trim().toLowerCase();
    const visible = filterRows ? data.filter(filterRows) : data;
    if (!s) return visible;
    return visible.filter((row) =>
      searchFields.some((f) =>
        String(row[f] ?? "")
          .toLowerCase()
          .includes(s),
      ),
    );
  }, [data, q, searchFields, filterRows]);
  const selected = useMemo(
    () => data.filter((row) => selectedIds.has(row.id)),
    [data, selectedIds],
  );
  const allFilteredSelected =
    filtered.length > 0 && filtered.every((row) => selectedIds.has(row.id));
  const toggle = (id: string) =>
    setSelectedIds((current) => {
      const next = new Set(current);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });

  const delMut = useMutation({
    mutationFn: async (row: T) => {
      if (deleteRow) {
        await deleteRow(row);
        return row;
      }
      const { error } = await db.from(table).delete().eq("id", row.id);
      if (error) throw error;
      return row;
    },
    onSuccess: async (row) => {
      if (userId && entityName) {
        await logAction(userId, roleId ?? null, "delete", entityName, { id: row.id });
      }
      toast.success(`${singular} supprimé`);
      qc.invalidateQueries({ queryKey: [table] });
    },
    onError: (e: Error) =>
      toast.error(deleteErrorMessage ?? e.message ?? `Impossible de supprimer ce ${singular.toLowerCase()}.`),
  });

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between flex-wrap gap-3">
        <div className="relative flex-1 min-w-[200px] max-w-sm">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <input
            value={q}
            onChange={(e) => setQ(e.target.value)}
            placeholder={`Rechercher un ${singular.toLowerCase()}...`}
            className="w-full rounded-xl bg-muted/60 border border-border pl-10 pr-4 py-2 text-sm outline-none focus:border-primary/40"
          />
        </div>
        <div className="flex items-center gap-3">
          {renderSelectionActions?.(selected, () => setSelectedIds(new Set()))}
          {renderActions && renderActions(filtered)}
          {canCreate && (
            <button
              onClick={() => setCreating(true)}
              className="inline-flex items-center gap-2 rounded-xl bg-primary text-primary-foreground px-4 py-2 text-sm font-medium hover:opacity-90"
            >
              <Plus className="h-4 w-4" /> Nouveau {singular.toLowerCase()}
            </button>
          )}
        </div>
      </div>

      <div className="rounded-2xl border border-border bg-card overflow-x-auto w-full">
        <table className="w-full text-sm min-w-max">
          <thead className="bg-muted/40 text-muted-foreground text-xs uppercase tracking-wide">
            <tr>
              {selectable && (
                <th className="w-12 px-4 py-3">
                  <Checkbox
                    aria-label="Tout sélectionner"
                    checked={allFilteredSelected}
                    onCheckedChange={() =>
                      setSelectedIds((current) => {
                        const next = new Set(current);
                        filtered.forEach((row) =>
                          allFilteredSelected ? next.delete(row.id) : next.add(row.id),
                        );
                        return next;
                      })
                    }
                  />
                </th>
              )}
              {columns.map((c, i) => (
                <th key={i} className={`text-left px-4 py-3 font-medium ${c.className ?? ""}`}>
                  {c.header}
                </th>
              ))}
              <th className="w-24 px-4 py-3 text-right font-medium">Actions</th>
            </tr>
          </thead>
          <tbody>
            {isLoading ? (
              <tr>
                <td
                  colSpan={columns.length + 1 + (selectable ? 1 : 0)}
                  className="text-center py-12 text-muted-foreground"
                >
                  <Loader2 className="h-5 w-5 animate-spin mx-auto" />
                </td>
              </tr>
            ) : filtered.length === 0 ? (
              <tr>
                <td
                  colSpan={columns.length + 1 + (selectable ? 1 : 0)}
                  className="text-center py-12 text-muted-foreground"
                >
                  Aucun {plural.toLowerCase()} {q ? "trouvé" : "pour l'instant"}.
                </td>
              </tr>
            ) : (
              filtered.map((row) => (
                <tr
                  key={row.id}
                  className="border-t border-border hover:bg-muted/30 transition-colors"
                >
                  {selectable && (
                    <td className="px-4 py-3">
                      <Checkbox
                        aria-label={`Sélectionner ${String(row.name ?? row.first_name ?? singular)}`}
                        checked={selectedIds.has(row.id)}
                        onCheckedChange={() => toggle(row.id)}
                      />
                    </td>
                  )}
                  {columns.map((c, i) => (
                    <td key={i} className={`px-4 py-3 ${c.className ?? ""}`}>
                      {c.cell(row)}
                    </td>
                  ))}
                  <td className="px-4 py-3">
                    <div className="flex items-center justify-end gap-1">
                      {canEdit && (
                        <button
                          onClick={() => setEditing(row)}
                          className="p-2 rounded-lg hover:bg-muted text-muted-foreground hover:text-foreground"
                          aria-label="Modifier"
                        >
                          <Pencil className="h-4 w-4" />
                        </button>
                      )}
                      {renderRowActions?.(row)}
                      {canDelete && !hideDeleteAction && (
                        <button
                          onClick={() => {
                            if (confirm(`Supprimer ce ${singular.toLowerCase()} ?`))
                              delMut.mutate(row);
                          }}
                          className="p-2 rounded-lg hover:bg-destructive/10 text-muted-foreground hover:text-destructive"
                          aria-label="Supprimer"
                        >
                          <Trash2 className="h-4 w-4" />
                        </button>
                      )}
                    </div>
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>

      <AnimatePresence>
        {(creating || editing) && (
          <ResourceFormDialog
            table={table}
            singular={singular}
            fields={fields}
            createFields={createFields}
            prepareCreatePayload={prepareCreatePayload}
            initial={
              editing ? (prepareEditValues?.(editing) ?? editing) : (defaultValues as Partial<T>)
            }
            editingId={editing?.id}
            prepareEditPayload={prepareEditPayload}
            saveErrorMessage={saveErrorMessage}
            imageStorage={imageStorage}
            onClose={() => {
              setCreating(false);
              setEditing(null);
            }}
          />
        )}
      </AnimatePresence>
    </div>
  );
}

function ResourceFormDialog<T extends { id: string }>({
  table,
  singular,
  fields,
  createFields,
  prepareCreatePayload,
  prepareEditPayload,
  saveErrorMessage,
  editingId,
  initial,
  onClose,
  imageStorage,
}: {
  table: string;
  singular: string;
  fields: FieldDef[];
  createFields?: FieldDef[];
  prepareCreatePayload?: (values: Record<string, unknown>) => Record<string, unknown>;
  prepareEditPayload?: (values: Record<string, unknown>) => Record<string, unknown>;
  saveErrorMessage?: (error: unknown) => string;
  editingId?: string;
  initial: Partial<T> | T;
  onClose: () => void;
  imageStorage?: { bucket: string; folder: string };
}) {
  const qc = useQueryClient();
  const { profile } = useTenant();
  const isEdit = Boolean(editingId);
  const activeFields = isEdit ? fields : (createFields ?? fields);
  const [values, setValues] = useState<Record<string, unknown>>(() => {
    const base: Record<string, unknown> = {};
    for (const f of activeFields) base[f.name] = (initial as Record<string, unknown>)[f.name] ?? "";
    return base;
  });
  const [optionDrafts, setOptionDrafts] = useState<Record<string, string>>({});
  const [creatingOption, setCreatingOption] = useState<string | null>(null);

  const createFieldOption = async (field: FieldDef) => {
    const draft = optionDrafts[field.name]?.trim();
    if (!field.createOption || !draft || creatingOption) return;
    setCreatingOption(field.name);
    try {
      const created = await field.createOption.onCreate(draft);
      setValues((current) => ({ ...current, [field.name]: created.value }));
      setOptionDrafts((current) => ({ ...current, [field.name]: "" }));
      toast.success(`Catégorie « ${created.label} » ajoutée`);
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Impossible de créer la catégorie.");
    } finally {
      setCreatingOption(null);
    }
  };

  const saveMut = useMutation({
    mutationFn: async () => {
      const payload: Record<string, unknown> = {};
      for (const f of activeFields) {
        let v = values[f.name];
        if (f.type === "number") v = v === "" || v === null ? null : Number(v);
        if (v === "") v = null;
        payload[f.name] = v;
      }
      const finalPayload =
        isEdit && prepareEditPayload
          ? prepareEditPayload(payload)
          : !isEdit && prepareCreatePayload
            ? prepareCreatePayload(payload)
            : payload;
      if (isEdit) {
        const { error } = await db.from(table).update(finalPayload).eq("id", editingId);
        if (error) throw error;
      } else {
        if (profile?.tenant_id) {
          finalPayload.tenant_id = profile.tenant_id;
        }
        const { error } = await db.from(table).insert(finalPayload);
        if (error) throw error;
      }
    },
    onSuccess: () => {
      toast.success(isEdit ? `${singular} mis à jour` : `${singular} créé`);
      qc.invalidateQueries({ queryKey: [table] });
      onClose();
    },
    onError: (error: unknown) => toast.error(saveErrorMessage?.(error) ?? (error instanceof Error ? error.message : "Enregistrement impossible.")),
  });

  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      className="fixed inset-0 z-50 bg-black/50 backdrop-blur-sm grid place-items-center p-4"
      onClick={onClose}
    >
      <motion.form
        initial={{ scale: 0.95, y: 12 }}
        animate={{ scale: 1, y: 0 }}
        exit={{ scale: 0.95, y: 12 }}
        onClick={(e) => e.stopPropagation()}
        onSubmit={(e) => {
          e.preventDefault();
          for (const f of activeFields) {
            if (f.createOption && values[f.name] === `__create__${f.name}`) {
              void createFieldOption(f);
              toast.error(`Créez d’abord la nouvelle catégorie « ${f.label} »`);
              return;
            }
            if (!f.hidden?.(values) && (f.required || f.requiredWhen?.(values)) && !values[f.name]) {
              toast.error(`Le champ « ${f.label} » est requis`);
              return;
            }
          }
          saveMut.mutate();
        }}
        className="w-full max-w-lg rounded-2xl bg-card border border-border shadow-xl"
      >
        <div className="flex items-center justify-between px-6 py-4 border-b border-border">
          <h3 className="font-semibold">
            {isEdit ? `Modifier ${singular.toLowerCase()}` : `Nouveau ${singular.toLowerCase()}`}
          </h3>
          <button type="button" onClick={onClose} className="p-1 rounded-lg hover:bg-muted">
            <X className="h-4 w-4" />
          </button>
        </div>
        <div className="p-6 grid grid-cols-2 gap-4 max-h-[70vh] overflow-y-auto">
          {activeFields.map((f) => {
            if (f.hidden?.(values)) return null;
            const span =
              (f.colSpan ?? (f.type === "textarea" ? 2 : 1)) === 2 ? "col-span-2" : "col-span-1";
            const commonProps = {
              value: (values[f.name] ?? "") as string | number,
              onChange: (
                e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement>,
              ) => setValues((s) => ({ ...s, [f.name]: e.target.value })),
              required: f.required,
              placeholder: f.placeholder,
              className:
                "w-full rounded-xl bg-muted/60 border border-border px-3 py-2 text-sm outline-none focus:border-primary/40",
            };
            return (
              <label key={f.name} className={`${span} flex flex-col gap-1.5`}>
                <span className="text-xs font-medium text-muted-foreground">
                  {f.label}
                  {(f.required || f.requiredWhen?.(values)) && <span className="text-destructive"> *</span>}
                </span>
                {f.type === "image" ? (
                  <ImageField
                    value={String(values[f.name] ?? "")}
                    onChange={(value) => setValues((s) => ({ ...s, [f.name]: value }))}
                    storage={imageStorage}
                  />
                ) : f.type === "textarea" ? (
                  <textarea rows={3} {...commonProps} />
                ) : f.type === "select" ? (
                  <>
                    <select {...commonProps}>
                      <option value="">—</option>
                      {(f.options ?? []).map((o) => (
                        <option key={typeof o === "string" ? o : o.value} value={typeof o === "string" ? o : o.value}>
                          {typeof o === "string" ? o : o.label}
                        </option>
                      ))}
                      {f.createOption && <option value={`__create__${f.name}`}>{f.createOption.label}</option>}
                    </select>
                    {f.createOption && values[f.name] === `__create__${f.name}` && (
                      <div className="flex gap-2">
                        <input
                          autoFocus
                          value={optionDrafts[f.name] ?? ""}
                          onChange={(event) => setOptionDrafts((current) => ({ ...current, [f.name]: event.target.value }))}
                          onBlur={() => void createFieldOption(f)}
                          onKeyDown={(event) => {
                            if (event.key === "Enter") { event.preventDefault(); void createFieldOption(f); }
                          }}
                          placeholder={f.createOption.inputLabel}
                          className="w-full rounded-xl bg-muted/60 border border-border px-3 py-2 text-sm outline-none focus:border-primary/40"
                        />
                        {creatingOption === f.name && <Loader2 className="mt-2.5 h-4 w-4 shrink-0 animate-spin" />}
                      </div>
                    )}
                  </>
                ) : (
                  <input type={f.type ?? "text"} step={f.step} {...commonProps} />
                )}
              </label>
            );
          })}
        </div>
        <div className="flex items-center justify-end gap-2 px-6 py-4 border-t border-border bg-muted/20">
          <button
            type="button"
            onClick={onClose}
            className="px-4 py-2 rounded-xl text-sm font-medium hover:bg-muted"
          >
            Annuler
          </button>
          <button
            type="submit"
            disabled={saveMut.isPending || Boolean(creatingOption)}
            className="inline-flex items-center gap-2 px-4 py-2 rounded-xl bg-primary text-primary-foreground text-sm font-medium hover:opacity-90 disabled:opacity-60"
          >
            {saveMut.isPending && <Loader2 className="h-4 w-4 animate-spin" />}
            {isEdit ? "Enregistrer" : "Créer"}
          </button>
        </div>
      </motion.form>
    </motion.div>
  );
}

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
