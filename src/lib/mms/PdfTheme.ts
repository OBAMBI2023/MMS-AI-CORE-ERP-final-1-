import { jsPDF } from "jspdf";
import autoTable, { type CellHookData, type UserOptions } from "jspdf-autotable";

export const PDF_COLORS = {
  primary: [11, 31, 58] as [number, number, number],
  secondary: [212, 175, 55] as [number, number, number],
  background: [255, 255, 255] as [number, number, number],
  text: [31, 41, 55] as [number, number, number],
  muted: [107, 114, 128] as [number, number, number],
  line: [229, 231, 235] as [number, number, number],
  alternate: [248, 250, 252] as [number, number, number],
};

export const PDF_TYPOGRAPHY = {
  title: { size: 20, style: "bold" as const },
  subtitle: { size: 11, style: "bold" as const },
  body: { size: 9, style: "normal" as const },
};

export type PdfTenant = {
  companyName: string;
  address?: string | null;
  phone?: string | null;
  email?: string | null;
  website?: string | null;
  businessSector?: string | null;
  logoUrl?: string | null;
};

type RawSettings = Record<string, unknown> | null | undefined;
type SummaryItem = { label: string; value: string };

const value = (settings: RawSettings, ...keys: string[]) => {
  for (const key of keys) {
    const candidate = settings?.[key];
    if (typeof candidate === "string" && candidate.trim()) return candidate.trim();
  }
  return "";
};

export function tenantFromSettings(settings: RawSettings, logoUrl?: string | null): PdfTenant {
  return {
    companyName:
      value(settings, "company_name", "nomCommercial", "trade_name") || "AUREX ERP",
    address: value(settings, "address", "adresse"),
    phone: value(settings, "phone", "telephone"),
    email: value(settings, "email"),
    website: value(settings, "website", "site_web", "siteWeb"),
    businessSector: value(settings, "business_sector", "secteur_activite", "secteurActivite"),
    logoUrl,
  };
}

export function formatPdfCurrency(amount: number, currency = "FCFA", decimals = 0) {
  const formatted = new Intl.NumberFormat("fr-FR", {
    minimumFractionDigits: decimals,
    maximumFractionDigits: decimals,
  }).format(Number(amount) || 0);
  return `${formatted} ${currency === "XOF" ? "FCFA" : currency}`;
}

export function formatPdfDate(date: string | number | Date = new Date()) {
  return new Intl.DateTimeFormat("fr-FR", {
    day: "2-digit",
    month: "2-digit",
    year: "numeric",
  }).format(new Date(date));
}

async function imageData(url: string) {
  const response = await fetch(url);
  if (!response.ok) throw new Error(`Logo HTTP ${response.status}`);
  const blob = await response.blob();
  return await new Promise<string>((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => resolve(String(reader.result));
    reader.onerror = reject;
    reader.readAsDataURL(blob);
  });
}

function initials(name: string) {
  return name
    .split(/\s+/)
    .filter(Boolean)
    .slice(0, 2)
    .map((word) => word[0])
    .join("")
    .toUpperCase() || "AE";
}

export async function renderPdfHeader(
  doc: jsPDF,
  tenant: PdfTenant,
  documentTitle: string,
  summary: SummaryItem[] = [],
) {
  const width = doc.internal.pageSize.getWidth();
  doc.setFillColor(...PDF_COLORS.primary);
  doc.roundedRect(10, 10, width - 20, 43, 3, 3, "F");
  doc.setFillColor(...PDF_COLORS.secondary);
  doc.roundedRect(16, 17, 25, 25, 3, 3, "F");

  let logoRendered = false;
  if (tenant.logoUrl) {
    try {
      doc.addImage(await imageData(tenant.logoUrl), "PNG", 18, 19, 21, 21);
      logoRendered = true;
    } catch (error) {
      console.warn("Logo PDF indisponible, utilisation des initiales.", error);
    }
  }
  if (!logoRendered) {
    doc.setFont("helvetica", "bold");
    doc.setFontSize(11);
    doc.setTextColor(...PDF_COLORS.primary);
    doc.text(initials(tenant.companyName), 28.5, 32.5, { align: "center" });
  }

  doc.setTextColor(255, 255, 255);
  doc.setFont("helvetica", "bold");
  doc.setFontSize(PDF_TYPOGRAPHY.title.size);
  doc.text(documentTitle.toUpperCase(), 47, 23, { maxWidth: 92 });
  doc.setFontSize(10);
  doc.text(tenant.companyName, 47, 31, { maxWidth: 92 });
  doc.setFont("helvetica", "normal");
  doc.setFontSize(7.5);
  const details = [
    tenant.businessSector,
    tenant.address,
    tenant.phone ? `Tél. ${tenant.phone}` : "",
    tenant.email,
    tenant.website,
  ].filter(Boolean) as string[];
  if (details.length) {
    doc.text(details.slice(0, 3), width - 16, 21, { align: "right", maxWidth: 55 });
  }
  if (details.length > 3) {
    doc.text(details.slice(3), width - 16, 36, { align: "right", maxWidth: 55 });
  }

  if (!summary.length) return 62;
  const cardWidth = (width - 20 - (summary.length - 1) * 3) / summary.length;
  summary.forEach((item, index) => {
    const x = 10 + index * (cardWidth + 3);
    doc.setFillColor(248, 250, 252);
    doc.setDrawColor(...PDF_COLORS.line);
    doc.roundedRect(x, 58, cardWidth, 19, 2.5, 2.5, "FD");
    doc.setTextColor(...PDF_COLORS.muted);
    doc.setFont("helvetica", "normal");
    doc.setFontSize(7);
    doc.text(item.label.toUpperCase(), x + 4, 64.5, { maxWidth: cardWidth - 8 });
    doc.setTextColor(...PDF_COLORS.primary);
    doc.setFont("helvetica", "bold");
    doc.setFontSize(10);
    doc.text(item.value, x + 4, 72, { maxWidth: cardWidth - 8 });
  });
  return 85;
}

export function renderPdfTable(
  doc: jsPDF,
  head: string[],
  body: Array<Array<string | number>>,
  startY: number,
  options: Partial<UserOptions> = {},
) {
  const previousDidDrawPage = options.didDrawPage;
  autoTable(doc, {
    startY,
    head: [head],
    body,
    theme: "plain",
    margin: { left: 10, right: 10, bottom: 18 },
    styles: {
      font: "helvetica",
      fontSize: 8,
      textColor: PDF_COLORS.text,
      cellPadding: 3,
      overflow: "linebreak",
      lineColor: PDF_COLORS.line,
      lineWidth: 0.1,
      valign: "middle",
    },
    headStyles: {
      fillColor: PDF_COLORS.primary,
      textColor: [255, 255, 255],
      fontStyle: "bold",
      minCellHeight: 10,
    },
    alternateRowStyles: { fillColor: PDF_COLORS.alternate },
    didParseCell: (data: CellHookData) => {
      if (data.section === "head") {
        if (data.column.index === 0) data.cell.styles.cellPadding = { top: 3, right: 3, bottom: 3, left: 5 };
      }
    },
    ...options,
    didDrawPage: (data) => {
      previousDidDrawPage?.(data);
    },
  });
  return (doc as jsPDF & { lastAutoTable: { finalY: number } }).lastAutoTable.finalY;
}

export function renderPdfTotalCard(
  doc: jsPDF,
  label: string,
  valueText: string,
  requestedY?: number,
) {
  const width = doc.internal.pageSize.getWidth();
  const pageHeight = doc.internal.pageSize.getHeight();
  let y = requestedY ?? 20;
  if (y > pageHeight - 38) {
    doc.addPage();
    y = 20;
  }
  doc.setFillColor(...PDF_COLORS.primary);
  doc.roundedRect(width - 86, y, 76, 22, 3, 3, "F");
  doc.setTextColor(255, 255, 255);
  doc.setFont("helvetica", "normal");
  doc.setFontSize(8);
  doc.text(label.toUpperCase(), width - 81, y + 7);
  doc.setTextColor(...PDF_COLORS.secondary);
  doc.setFont("helvetica", "bold");
  doc.setFontSize(13);
  doc.text(valueText, width - 15, y + 16, { align: "right", maxWidth: 66 });
  return y + 22;
}

export function renderPdfFooter(doc: jsPDF, tenant: PdfTenant, generatedAt = new Date()) {
  const pages = doc.getNumberOfPages();
  const width = doc.internal.pageSize.getWidth();
  const height = doc.internal.pageSize.getHeight();
  for (let page = 1; page <= pages; page += 1) {
    doc.setPage(page);
    doc.setDrawColor(...PDF_COLORS.secondary);
    doc.setLineWidth(0.35);
    doc.line(10, height - 14, width - 10, height - 14);
    doc.setFont("helvetica", "normal");
    doc.setFontSize(7);
    doc.setTextColor(...PDF_COLORS.muted);
    doc.text(tenant.companyName, 10, height - 8);
    doc.text(`Généré le ${formatPdfDate(generatedAt)}`, width / 2, height - 8, { align: "center" });
    doc.text(`Page ${page} / ${pages}`, width - 10, height - 8, { align: "right" });
  }
}

export const PdfTheme = {
  Colors: PDF_COLORS,
  Typography: PDF_TYPOGRAPHY,
  Header: renderPdfHeader,
  Footer: renderPdfFooter,
  SummaryCard: renderPdfHeader,
  Table: renderPdfTable,
  TotalCard: renderPdfTotalCard,
  CurrencyFormatter: formatPdfCurrency,
  DateFormatter: formatPdfDate,
  Helpers: { tenantFromSettings },
};
