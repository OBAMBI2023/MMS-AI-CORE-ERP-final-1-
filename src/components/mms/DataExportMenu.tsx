import { useState } from "react";
import { Download, FileSpreadsheet, FileText, Loader2 } from "lucide-react";
import { jsPDF } from "jspdf";
import { toast } from "sonner";
import { Button, type ButtonProps } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { downloadPdf } from "@/lib/mms/download-pdf";
import { tenantFromSettings } from "@/lib/mms/PdfTheme";
import { PdfLayoutEngine } from "@/lib/mms/PdfLayoutEngine";
import { createXlsx } from "@/lib/mms/xlsx-export";

export type ExportColumn<T> = {
  header: string;
  value: (row: T) => string | number | null | undefined;
};

export interface ExportContext {
  filename: string;
  pdfTitle: string;
  companySettings?: Record<string, unknown> | null;
  logoUrl?: string | null;
  /** Overrides the default success toast (e.g. "Impression lancée" for a print action). */
  successMessage?: string;
}

type DataExportMenuProps<T> = ExportContext & {
  data: T[];
  columns: ExportColumn<T>[];
  triggerVariant?: ButtonProps["variant"];
  triggerClassName?: string;
};

const safeFilename = (filename: string) =>
  filename
    .normalize("NFD")
    .replace(/[̀-ͯ]/g, "")
    .replace(/[^a-zA-Z0-9_-]+/g, "_");

const downloadBlob = (blob: Blob, filename: string) => {
  const url = URL.createObjectURL(blob);
  const link = document.createElement("a");
  link.href = url;
  link.download = filename;
  link.click();
  window.setTimeout(() => URL.revokeObjectURL(url), 60_000);
};

const csvCell = (value: string | number) => `"${String(value).replace(/"/g, '""')}"`;

const rowsToCells = <T,>(rows: T[], columns: ExportColumn<T>[]) =>
  rows.map((row) =>
    columns.map((column) => {
      const value = column.value(row);
      return value == null ? "" : value;
    }),
  );

const ensureData = <T,>(rows: T[]) => {
  if (rows.length) return true;
  toast.error("Aucune donnée à exporter.");
  return false;
};

/** Reusable export primitives — used both by the bulk `DataExportMenu` (filtered list) and
 * by each card's ⋮ menu (single-row export), so the PDF/Excel/CSV generation logic lives
 * in exactly one place. */
export async function exportRowsToPdf<T>(
  rows: T[],
  columns: ExportColumn<T>[],
  ctx: ExportContext,
): Promise<void> {
  if (!ensureData(rows)) return;
  try {
    const doc = new jsPDF({ orientation: "portrait", format: "a4", unit: "mm" });
    const tenant = tenantFromSettings(ctx.companySettings, ctx.logoUrl);
    const startY = await PdfLayoutEngine.header(doc, tenant, ctx.pdfTitle, [
      { label: "Nombre de lignes", value: String(rows.length) },
      { label: "Date", value: new Intl.DateTimeFormat("fr-FR").format(new Date()) },
      { label: "Format", value: "A4 portrait" },
      { label: "Statut", value: "Export validé" },
    ]);
    PdfLayoutEngine.table(
      doc,
      columns.map((column) => column.header),
      rowsToCells(rows, columns),
      startY,
      { styles: { fontSize: 7, cellPadding: 2 } },
    );
    PdfLayoutEngine.footer(doc, tenant);
    await downloadPdf(doc, `${safeFilename(ctx.filename)}.pdf`);
    toast.success(ctx.successMessage ?? "Export PDF terminé.");
  } catch (error) {
    toast.error(error instanceof Error ? error.message : "Impossible de générer le PDF.");
  }
}

export function exportRowsToXlsx<T>(rows: T[], columns: ExportColumn<T>[], ctx: ExportContext): void {
  if (!ensureData(rows)) return;
  try {
    const file = createXlsx(
      columns.map((column) => column.header),
      rowsToCells(rows, columns),
    );
    downloadBlob(
      new Blob([file], { type: "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet" }),
      `${safeFilename(ctx.filename)}.xlsx`,
    );
    toast.success("Export Excel terminé.");
  } catch (error) {
    toast.error(error instanceof Error ? error.message : "Impossible de générer le fichier Excel.");
  }
}

export function exportRowsToCsv<T>(rows: T[], columns: ExportColumn<T>[], ctx: ExportContext): void {
  if (!ensureData(rows)) return;
  const csv = [
    columns.map((column) => csvCell(column.header)).join(";"),
    ...rowsToCells(rows, columns).map((row) => row.map(csvCell).join(";")),
  ].join("\r\n");
  downloadBlob(new Blob([`﻿${csv}`], { type: "text/csv;charset=utf-8" }), `${safeFilename(ctx.filename)}.csv`);
  toast.success("Export CSV terminé.");
}

export function DataExportMenu<T>({
  data,
  columns,
  filename,
  pdfTitle,
  companySettings,
  logoUrl,
  triggerVariant,
  triggerClassName,
}: DataExportMenuProps<T>) {
  const [pending, setPending] = useState<"pdf" | "xlsx" | "csv" | null>(null);
  const ctx: ExportContext = { filename, pdfTitle, companySettings, logoUrl };

  const run = async (kind: "pdf" | "xlsx" | "csv", action: () => void | Promise<void>) => {
    setPending(kind);
    try {
      await action();
    } finally {
      setPending(null);
    }
  };

  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Button
          variant={triggerVariant}
          className={triggerClassName ?? "gap-2 rounded-xl"}
          disabled={pending !== null}
        >
          {pending ? <Loader2 className="h-4 w-4 animate-spin" /> : <Download className="h-4 w-4" />}
          Exporter
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end">
        <DropdownMenuItem onClick={() => void run("pdf", () => exportRowsToPdf(data, columns, ctx))}>
          <FileText className="h-4 w-4" /> PDF
        </DropdownMenuItem>
        <DropdownMenuItem onClick={() => void run("xlsx", () => exportRowsToXlsx(data, columns, ctx))}>
          <FileSpreadsheet className="h-4 w-4" /> Excel (.xlsx)
        </DropdownMenuItem>
        <DropdownMenuItem onClick={() => void run("csv", () => exportRowsToCsv(data, columns, ctx))}>
          <Download className="h-4 w-4" /> CSV
        </DropdownMenuItem>
      </DropdownMenuContent>
    </DropdownMenu>
  );
}
