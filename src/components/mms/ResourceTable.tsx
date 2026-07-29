import { useMemo, useState, type ReactNode } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Plus, Search, Pencil, Trash2, X, Loader2 } from "lucide-react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";
import { usePermissions } from "@/hooks/use-permissions";
import { useActionPermission } from "@/hooks/use-action-permission";
import { logAction } from "@/lib/audit.server";
import { useTenant } from "@/providers/TenantProvider";

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

export type FieldType = "text" | "textarea" | "number" | "email" | "tel" | "date" | "select";

export interface FieldDef {
  name: string;
  label: string;
  type?: FieldType;
  required?: boolean;
  options?: readonly string[];
  placeholder?: string;
  colSpan?: 1 | 2;
  step?: string;
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
  deletePermission?: string;
  entityName?: string;
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
    deletePermission,
    entityName,
  } = props;
  const qc = useQueryClient();
  const [q, setQ] = useState("");
  const [editing, setEditing] = useState<T | null>(null);
  const [creating, setCreating] = useState(false);
  const { data: userData } = useQuery({ queryKey: ["user"], queryFn: () => supabase.auth.getUser() });
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
    if (!s) return data;
    return data.filter((row) =>
      searchFields.some((f) =>
        String(row[f] ?? "")
          .toLowerCase()
          .includes(s),
      ),
    );
  }, [data, q, searchFields]);

  const delMut = useMutation({
    mutationFn: async (row: T) => {
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
    onError: (e: Error) => toast.error(e.message),
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
              {columns.map((c, i) => (
                <th key={i} className={`text-left px-4 py-3 font-medium ${c.className ?? ""}`}>
                  {c.header}
                </th>
              ))}
              <th className="w-24" />
            </tr>
          </thead>
          <tbody>
            {isLoading ? (
              <tr>
                <td
                  colSpan={columns.length + 1}
                  className="text-center py-12 text-muted-foreground"
                >
                  <Loader2 className="h-5 w-5 animate-spin mx-auto" />
                </td>
              </tr>
            ) : filtered.length === 0 ? (
              <tr>
                <td
                  colSpan={columns.length + 1}
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
                      {canDelete && (
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
            initial={editing ?? (defaultValues as Partial<T>)}
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
  initial,
  onClose,
}: {
  table: string;
  singular: string;
  fields: FieldDef[];
  initial: Partial<T> | T;
  onClose: () => void;
}) {
  const qc = useQueryClient();
  const { profile } = useTenant();
  const isEdit = Boolean((initial as T).id);
  const [values, setValues] = useState<Record<string, unknown>>(() => {
    const base: Record<string, unknown> = {};
    for (const f of fields) base[f.name] = (initial as Record<string, unknown>)[f.name] ?? "";
    return base;
  });

  const saveMut = useMutation({
    mutationFn: async () => {
      const payload: Record<string, unknown> = {};
      for (const f of fields) {
        let v = values[f.name];
        if (f.type === "number") v = v === "" || v === null ? null : Number(v);
        if (v === "") v = null;
        payload[f.name] = v;
      }
      if (isEdit) {
        const { error } = await db
          .from(table)
          .update(payload)
          .eq("id", (initial as T).id);
        if (error) throw error;
      } else {
        if (profile?.tenant_id) {
            payload.tenant_id = profile.tenant_id;
        }
        const { error } = await db.from(table).insert(payload);
        if (error) throw error;
      }
    },
    onSuccess: () => {
      toast.success(isEdit ? `${singular} mis à jour` : `${singular} créé`);
      qc.invalidateQueries({ queryKey: [table] });
      onClose();
    },
    onError: (e: Error) => toast.error(e.message),
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
          for (const f of fields) {
            if (f.required && !values[f.name]) {
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
          {fields.map((f) => {
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
                  {f.required && <span className="text-destructive"> *</span>}
                </span>
                {f.type === "textarea" ? (
                  <textarea rows={3} {...commonProps} />
                ) : f.type === "select" ? (
                  <select {...commonProps}>
                    <option value="">—</option>
                    {(f.options ?? []).map((o) => (
                      <option key={o} value={o}>
                        {o}
                      </option>
                    ))}
                  </select>
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
            disabled={saveMut.isPending}
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
