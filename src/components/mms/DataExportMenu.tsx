import { useState } from "react";
import { Download, FileSpreadsheet, FileText, Loader2 } from "lucide-react";
import { jsPDF } from "jspdf";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
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

type DataExportMenuProps<T> = {
  data: T[];
  columns: ExportColumn<T>[];
  filename: string;
  pdfTitle: string;
  companySettings?: Record<string, unknown> | null;
  logoUrl?: string | null;
};

const safeFilename = (filename: string) =>
  filename
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
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

export function DataExportMenu<T>({
  data,
  columns,
  filename,
  pdfTitle,
  companySettings,
  logoUrl,
}: DataExportMenuProps<T>) {
  const [pending, setPending] = useState<"pdf" | "xlsx" | "csv" | null>(null);
  const baseFilename = safeFilename(filename);
  const rows = () =>
    data.map((row) =>
      columns.map((column) => {
        const value = column.value(row);
        return value == null ? "" : value;
      }),
    );

  const ensureData = () => {
    if (data.length) return true;
    toast.error("Aucune donnée à exporter.");
    return false;
  };

  const exportPdf = async () => {
    if (!ensureData()) return;
    setPending("pdf");
    try {
      const doc = new jsPDF({ orientation: "portrait", format: "a4", unit: "mm" });
      const tenant = tenantFromSettings(companySettings, logoUrl);
      const startY = await PdfLayoutEngine.header(doc, tenant, pdfTitle, [
        { label: "Nombre de lignes", value: String(data.length) },
        { label: "Date", value: new Intl.DateTimeFormat("fr-FR").format(new Date()) },
        { label: "Format", value: "A4 portrait" },
        { label: "Statut", value: "Export validé" },
      ]);
      PdfLayoutEngine.table(doc, columns.map((column) => column.header), rows(), startY, {
        styles: { fontSize: 7, cellPadding: 2 },
      });
      PdfLayoutEngine.footer(doc, tenant);
      await downloadPdf(doc, `${baseFilename}.pdf`);
      toast.success("Export PDF terminé.");
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Impossible de générer le PDF.");
    } finally {
      setPending(null);
    }
  };

  const exportXlsx = () => {
    if (!ensureData()) return;
    setPending("xlsx");
    try {
      const file = createXlsx(columns.map((column) => column.header), rows());
      downloadBlob(
        new Blob([file], {
          type: "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
        }),
        `${baseFilename}.xlsx`,
      );
      toast.success("Export Excel terminé.");
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Impossible de générer le fichier Excel.");
    } finally {
      setPending(null);
    }
  };

  const exportCsv = () => {
    if (!ensureData()) return;
    setPending("csv");
    try {
      const csv = [
        columns.map((column) => csvCell(column.header)).join(";"),
        ...rows().map((row) => row.map(csvCell).join(";")),
      ].join("\r\n");
      downloadBlob(
        new Blob([`\ufeff${csv}`], { type: "text/csv;charset=utf-8" }),
        `${baseFilename}.csv`,
      );
      toast.success("Export CSV terminé.");
    } finally {
      setPending(null);
    }
  };

  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Button className="gap-2 rounded-xl" disabled={pending !== null}>
          {pending ? (
            <Loader2 className="h-4 w-4 animate-spin" />
          ) : (
            <Download className="h-4 w-4" />
          )}
          Exporter
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end">
        <DropdownMenuItem onClick={() => void exportPdf()}>
          <FileText className="h-4 w-4" /> PDF
        </DropdownMenuItem>
        <DropdownMenuItem onClick={exportXlsx}>
          <FileSpreadsheet className="h-4 w-4" /> Excel (.xlsx)
        </DropdownMenuItem>
        <DropdownMenuItem onClick={exportCsv}>
          <Download className="h-4 w-4" /> CSV
        </DropdownMenuItem>
      </DropdownMenuContent>
    </DropdownMenu>
  );
}
