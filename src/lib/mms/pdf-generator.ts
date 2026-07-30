import { jsPDF } from "jspdf";
import { QuotationData, CompanySettings } from "./pdf-types";
import {
  renderPremiumDocumentHeader,
  renderFooter,
  renderTable,
  renderTotals,
  renderDocumentNotes,
  renderSignatureAndStamp,
} from "./pdf-template-engine";
import { PdfLayoutEngine } from "./PdfLayoutEngine";
import { toast } from "sonner";
import { downloadPdf } from "./download-pdf";

export async function generateDevisPDF(
  quote: QuotationData,
  settings: CompanySettings,
  images: { logo?: string | null; signature?: string | null; cachet?: string | null } = {},
) {
  try {
    if (!quote || !quote.numero || !quote.items || quote.items.length === 0) {
      toast.error("Données du devis incomplètes pour la génération du PDF.");
      return;
    }

    const doc = new jsPDF();

    const afterHeaderY = await renderPremiumDocumentHeader(doc, settings, "Devis", images.logo, [
      { label: "Numéro", value: quote.numero },
      { label: "Date", value: quote.date },
      { label: "Expiration", value: quote.dateExpiration || "-" },
      { label: "Statut", value: quote.statut || "-" },
    ]);

    const afterClientY = PdfLayoutEngine.contact(doc, {
      heading: "Client",
      name: quote.client.nom,
      company: quote.client.entreprise,
      phone: quote.client.telephone,
      email: quote.client.email,
      address: quote.client.adresse,
    }, afterHeaderY);

    renderTable(doc, quote.items, afterClientY + 7, settings.currency, settings.decimals);

    // Totals
    const finalY = (doc as any).lastAutoTable.finalY + 10;
    const afterTotalsY = renderTotals(doc, quote.totals, finalY, settings.currency, settings.decimals);
    const afterNotesY = renderDocumentNotes(doc, [
      { title: "Conditions de paiement", text: quote.conditionsPaiement },
      { title: "Notes", text: quote.observations },
    ], afterTotalsY + 7);

    // Footer, Signature and Stamp
    if (images.signature) {
      await renderSignatureAndStamp(doc, images.signature, images.cachet || null, afterNotesY + 3);
    }

    renderFooter(doc, settings);

    // Filename: DEV-YYYYMMDD-ID.pdf
    const dateStr = new Date().toISOString().split("T")[0].replace(/-/g, "");
    const filename = `DEV-${dateStr}-${quote.numero}.pdf`;

    await downloadPdf(doc, filename);
    toast.success("PDF généré avec succès.");
  } catch (error) {
    console.error("PDF generation failed:", error);
    toast.error("Erreur lors de la génération du PDF.");
  }
}
