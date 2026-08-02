import { jsPDF } from "jspdf";
import { supabase } from "@/integrations/supabase/client";
import { downloadPdf } from "./download-pdf";
import { PdfLayoutEngine } from "./PdfLayoutEngine";
import { PDF_COLORS, tenantFromSettings } from "./PdfTheme";

export type IdentityDocumentRow = {
  id: string;
  first_name?: unknown;
  last_name?: unknown;
  phone?: unknown;
  identity_document_path?: unknown;
};

async function signedImage(path: string) {
  const { data, error } = await supabase.storage
    .from("hotel-identity-documents")
    .createSignedUrl(path, 300);
  if (error || !data?.signedUrl) throw error ?? new Error("Pièce inaccessible.");
  const response = await fetch(data.signedUrl);
  if (!response.ok) throw new Error("Pièce inaccessible.");
  const blob = await response.blob();
  return await new Promise<string>((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => resolve(String(reader.result));
    reader.onerror = reject;
    reader.readAsDataURL(blob);
  });
}

export async function printIdentityDocuments(
  rows: IdentityDocumentRow[],
  settings: Record<string, unknown> | null | undefined,
  logoUrl?: string | null,
) {
  const printable = rows.filter(
    (row) =>
      typeof row.identity_document_path === "string" &&
      row.identity_document_path.length > 0 &&
      !row.identity_document_path.startsWith("data:"),
  );
  if (!printable.length)
    throw new Error(
      "Aucun client sélectionné ne possède une pièce enregistrée dans le stockage privé.",
    );
  const loaded = (
    await Promise.all(
      printable.map(async (row) => {
        try {
          return { row, image: await signedImage(String(row.identity_document_path)) };
        } catch {
          return null;
        }
      }),
    )
  ).filter((item): item is { row: IdentityDocumentRow; image: string } => item !== null);
  if (!loaded.length) throw new Error("Les pièces sélectionnées ne sont pas accessibles.");

  const doc = new jsPDF({ format: "a4", unit: "mm" });
  const tenant = tenantFromSettings(settings, logoUrl);
  for (let index = 0; index < loaded.length; index += 2) {
    if (index > 0) doc.addPage();
    await PdfLayoutEngine.header(doc, tenant, "Pièces d’identité", [
      { label: "Impression", value: new Intl.DateTimeFormat("fr-FR").format(new Date()) },
    ]);
    loaded.slice(index, index + 2).forEach(({ row, image }, slot) => {
      const x = 18,
        y = 82 + slot * 91,
        width = 174,
        imageHeight = 65;
      doc.setFillColor(...PDF_COLORS.surface);
      doc.setDrawColor(...PDF_COLORS.line);
      doc.roundedRect(x, y, width, 82, 3, 3, "FD");
      const props = doc.getImageProperties(image);
      const ratio = props.width / props.height;
      const drawWidth = Math.min(width - 10, imageHeight * ratio);
      const drawHeight = drawWidth / ratio;
      doc.addImage(
        image,
        props.fileType || "JPEG",
        x + (width - drawWidth) / 2,
        y + 4 + (imageHeight - drawHeight) / 2,
        drawWidth,
        drawHeight,
      );
      doc.setTextColor(...PDF_COLORS.primary);
      doc.setFont("helvetica", "bold");
      doc.setFontSize(10);
      doc.text(
        `${String(row.first_name ?? "")} ${String(row.last_name ?? "")}`.trim(),
        x + 6,
        y + 73,
      );
      doc.setTextColor(...PDF_COLORS.muted);
      doc.setFont("helvetica", "normal");
      doc.setFontSize(8);
      doc.text(`Téléphone : ${String(row.phone ?? "—")}`, x + 6, y + 78);
    });
  }
  PdfLayoutEngine.footer(doc, tenant);
  await downloadPdf(doc, `pieces-identite-${new Date().toISOString().slice(0, 10)}.pdf`);
  return { printed: loaded.length, skipped: rows.length - loaded.length };
}
