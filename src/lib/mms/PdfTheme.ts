import { jsPDF } from "jspdf";
import autoTable, { type CellHookData, type UserOptions } from "jspdf-autotable";
import { PLATFORM_BRANDING } from "@/config/branding";

export const PDF_COLORS = {
  primary: [11, 31, 77] as [number, number, number],
  primaryDark: [7, 22, 56] as [number, number, number],
  secondary: [201, 162, 39] as [number, number, number],
  background: [255, 255, 255] as [number, number, number],
  surface: [245, 246, 248] as [number, number, number],
  text: [19, 33, 60] as [number, number, number],
  muted: [107, 114, 128] as [number, number, number],
  line: [226, 231, 241] as [number, number, number],
  alternate: [246, 248, 252] as [number, number, number],
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
  currency?: string | null;
  decimals?: number | null;
};

type RawSettings = Record<string, unknown> | null | undefined;
export type PdfSummaryItem = { label: string; value: string };
export type PdfContactBlock = {
  heading?: string;
  name: string;
  company?: string | null;
  phone?: string | null;
  email?: string | null;
  address?: string | null;
};

const value = (settings: RawSettings, ...keys: string[]) => {
  for (const key of keys) {
    const candidate = settings?.[key];
    if (typeof candidate === "string" && candidate.trim()) return candidate.trim();
  }
  return "";
};

export function tenantFromSettings(settings: RawSettings, logoUrl?: string | null): PdfTenant {
  const address = [
    value(settings, "address", "adresse"),
    value(settings, "city", "ville"),
    value(settings, "country", "pays"),
  ].filter(Boolean).join(", ");
  return {
    companyName:
      value(settings, "company_name", "nomCommercial", "trade_name") ||
      PLATFORM_BRANDING.productName,
    address,
    phone: value(settings, "phone", "telephone"),
    email: value(settings, "email"),
    website: value(settings, "website", "site_web", "siteWeb"),
    businessSector: value(settings, "business_sector", "secteur_activite", "secteurActivite"),
    logoUrl,
    currency: value(settings, "currency", "devise"),
    decimals: typeof settings?.decimals === "number" ? settings.decimals : null,
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
  summary: PdfSummaryItem[] = [],
) {
  const width = doc.internal.pageSize.getWidth();
  const margin = 12;
  const titleWidth = 67;
  const titleX = width - margin - titleWidth;

  let logoRendered = false;
  if (tenant.logoUrl) {
    try {
      const data = await imageData(tenant.logoUrl);
      const properties = doc.getImageProperties(data);
      const ratio = properties.width / properties.height;
      const maxLogoWidth = 25;
      const maxLogoHeight = 18;
      const width = Math.min(maxLogoWidth, maxLogoHeight * ratio);
      const height = width / ratio;
      doc.addImage(
        data,
        properties.fileType || "PNG",
        margin + (25 - width) / 2,
        12 + (18 - height) / 2,
        width,
        height,
      );
      logoRendered = true;
    } catch (error) {
      console.warn("Logo PDF indisponible, utilisation des initiales.", error);
    }
  }
  if (!logoRendered) {
    doc.setFont("helvetica", "bold");
    doc.setFontSize(14);
    doc.setTextColor(...PDF_COLORS.primary);
    doc.text(initials(tenant.companyName), margin + 12.5, 23, { align: "center" });
  }

  doc.setTextColor(...PDF_COLORS.primary);
  doc.setFont("helvetica", "bold");
  doc.setFontSize(12);
  doc.text(tenant.companyName, 41, 17, { maxWidth: titleX - 45 });
  doc.setFont("helvetica", "normal");
  doc.setFontSize(7.2);
  doc.setTextColor(...PDF_COLORS.muted);
  const details = [
    tenant.businessSector,
    tenant.address,
    tenant.phone ? `Tél. ${tenant.phone}` : "",
    tenant.email,
    tenant.website,
  ].filter(Boolean) as string[];
  doc.text(details.slice(0, 4), 41, 22, { maxWidth: titleX - 45, lineHeightFactor: 1.25 });

  doc.setFillColor(...PDF_COLORS.primary);
  doc.roundedRect(titleX, 10, titleWidth, 31, 3, 3, "F");
  doc.setFillColor(...PDF_COLORS.secondary);
  doc.roundedRect(titleX, 10, 3, 31, 1.5, 1.5, "F");
  doc.setTextColor(255, 255, 255);
  doc.setFont("helvetica", "bold");
  doc.setFontSize(17);
  doc.text(doc.splitTextToSize(documentTitle.toUpperCase(), titleWidth - 12).slice(0, 2), titleX + 8, 22);
  doc.setDrawColor(...PDF_COLORS.secondary);
  doc.setLineWidth(0.45);
  doc.line(margin, 46, width - margin, 46);

  if (!summary.length) return 53;
  const cards = summary.filter((item) => item.label.trim() && item.value.trim()).slice(0, 4);
  if (!cards.length) return 53;
  const gap = 3;
  const cardWidth = (width - margin * 2 - gap * (cards.length - 1)) / cards.length;
  cards.forEach((item, index) => {
    const x = margin + index * (cardWidth + gap);
    doc.setFillColor(...PDF_COLORS.surface);
    doc.setDrawColor(...PDF_COLORS.line);
    doc.roundedRect(x, 52, cardWidth, 21, 3, 3, "FD");
    doc.setFillColor(...(index === 3 ? PDF_COLORS.secondary : PDF_COLORS.primary));
    doc.circle(x + 6, 58.5, 2.2, "F");
    doc.setTextColor(...PDF_COLORS.muted);
    doc.setFont("helvetica", "normal");
    doc.setFontSize(6.5);
    doc.text(item.label.toUpperCase(), x + 10, 60, { maxWidth: cardWidth - 13 });
    doc.setTextColor(...(index === 3 ? PDF_COLORS.secondary : PDF_COLORS.primary));
    doc.setFont("helvetica", "bold");
    doc.setFontSize(8.5);
    doc.text(item.value || "-", x + 4, 68.5, { maxWidth: cardWidth - 8 });
  });
  return 80;
}

export function renderPdfContactBlock(
  doc: jsPDF,
  contact: PdfContactBlock,
  requestedY: number,
) {
  const width = doc.internal.pageSize.getWidth();
  const pageHeight = doc.internal.pageSize.getHeight();
  const lines = [
    contact.company && contact.company !== contact.name ? contact.company : "",
    contact.phone ? `Tél. ${contact.phone}` : "",
    contact.email || "",
    contact.address || "",
  ].filter(Boolean) as string[];
  const wrapped = lines.flatMap((line) => doc.splitTextToSize(line, width - 38));
  const height = Math.max(28, 20 + wrapped.length * 4.2);
  let y = requestedY;
  if (y + height > pageHeight - 20) {
    doc.addPage();
    y = 20;
  }
  doc.setFillColor(...PDF_COLORS.surface);
  doc.setDrawColor(...PDF_COLORS.line);
  doc.roundedRect(10, y, width - 20, height, 3, 3, "FD");
  doc.setFillColor(...PDF_COLORS.secondary);
  doc.roundedRect(10, y, 3, height, 1.5, 1.5, "F");
  doc.setTextColor(...PDF_COLORS.muted);
  doc.setFont("helvetica", "bold");
  doc.setFontSize(7);
  doc.text((contact.heading || "DESTINATAIRE").toUpperCase(), 18, y + 7);
  doc.setTextColor(...PDF_COLORS.primary);
  doc.setFontSize(11);
  doc.text(contact.name, 18, y + 14, { maxWidth: width - 36 });
  doc.setTextColor(...PDF_COLORS.text);
  doc.setFont("helvetica", "normal");
  doc.setFontSize(8);
  if (wrapped.length) doc.text(wrapped, 18, y + 20);
  return y + height;
}

export function renderPdfSectionTitle(doc: jsPDF, title: string, requestedY: number) {
  const pageHeight = doc.internal.pageSize.getHeight();
  let y = requestedY;
  if (y > pageHeight - 28) {
    doc.addPage();
    y = 20;
  }
  doc.setFillColor(...PDF_COLORS.secondary);
  doc.rect(10, y - 3.5, 2.5, 6, "F");
  doc.setTextColor(...PDF_COLORS.primary);
  doc.setFont("helvetica", "bold");
  doc.setFontSize(10);
  doc.text(title.toUpperCase(), 16, y + 1);
  return y + 6;
}

export function renderPdfTable(
  doc: jsPDF,
  head: string[],
  body: Array<Array<string | number>>,
  startY: number,
  options: Partial<UserOptions> = {},
) {
  const pageHeight = doc.internal.pageSize.getHeight();
  if (startY > pageHeight - 28) {
    doc.addPage();
    startY = 20;
  }
  const previousDidDrawPage = options.didDrawPage;
  autoTable(doc, {
    startY,
    head: [head],
    body,
    theme: "plain",
    margin: { left: 12, right: 12, bottom: 26 },
    showHead: "everyPage",
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
    rowPageBreak: "avoid",
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

export function renderPdfTotals(
  doc: jsPDF,
  rows: Array<{ label: string; value: string; hidden?: boolean }>,
  requestedY: number,
) {
  const visible = rows.filter((row) => !row.hidden);
  const blockWidth = 82;
  const rowHeight = 8;
  const blockHeight = visible.length * rowHeight;
  let y = requestedY;
  if (y + blockHeight > doc.internal.pageSize.getHeight() - 26) {
    doc.addPage();
    y = 20;
  }
  const x = doc.internal.pageSize.getWidth() - 12 - blockWidth;
  visible.forEach((row, index) => {
    const isTotal = index === visible.length - 1;
    doc.setFillColor(...(isTotal ? PDF_COLORS.primary : PDF_COLORS.surface));
    doc.setDrawColor(...(isTotal ? PDF_COLORS.primary : PDF_COLORS.line));
    doc.roundedRect(x, y + index * rowHeight, blockWidth, rowHeight, isTotal ? 2 : 0.8, isTotal ? 2 : 0.8, "FD");
    doc.setFont("helvetica", isTotal ? "bold" : "normal");
    doc.setFontSize(isTotal ? 9.5 : 8);
    doc.setTextColor(...(isTotal ? ([255, 255, 255] as [number, number, number]) : PDF_COLORS.text));
    doc.text(row.label.toUpperCase(), x + 4, y + index * rowHeight + 5.3);
    doc.text(row.value, x + blockWidth - 4, y + index * rowHeight + 5.3, {
      align: "right",
      maxWidth: 48,
    });
  });
  return y + blockHeight;
}

export function renderPdfNotes(
  doc: jsPDF,
  sections: Array<{ title: string; text?: string | null }>,
  requestedY: number,
) {
  const visible = sections.filter((section) => section.text?.trim());
  if (!visible.length) return requestedY;
  const pageHeight = doc.internal.pageSize.getHeight();
  const pageWidth = doc.internal.pageSize.getWidth();
  const gap = 4;
  const cardWidth = (pageWidth - 24 - gap) / 2;
  let y = requestedY;
  for (let index = 0; index < visible.length; index += 2) {
    const pair = visible.slice(index, index + 2);
    const contents = pair.map((section) => doc.splitTextToSize(section.text!.trim(), cardWidth - 10));
    const height = Math.max(...contents.map((lines) => 14 + lines.length * 4), 28);
    if (y + height > pageHeight - 26) {
      doc.addPage();
      y = 20;
    }
    pair.forEach((section, pairIndex) => {
      const x = 12 + pairIndex * (cardWidth + gap);
      doc.setFillColor(...PDF_COLORS.surface);
      doc.setDrawColor(...PDF_COLORS.line);
      doc.roundedRect(x, y, cardWidth, height, 3, 3, "FD");
      doc.setFillColor(...PDF_COLORS.secondary);
      doc.roundedRect(x, y, 2.5, height, 1.25, 1.25, "F");
      doc.setTextColor(...PDF_COLORS.primary);
      doc.setFont("helvetica", "bold");
      doc.setFontSize(8);
      doc.text(section.title.toUpperCase(), x + 6, y + 7);
      doc.setTextColor(...PDF_COLORS.text);
      doc.setFont("helvetica", "normal");
      doc.setFontSize(8);
      doc.text(contents[pairIndex], x + 6, y + 14);
    });
    y += height + 4;
  }
  return y;
}

export function renderPdfFooter(doc: jsPDF, tenant: PdfTenant, generatedAt = new Date()) {
  const pages = doc.getNumberOfPages();
  const width = doc.internal.pageSize.getWidth();
  const height = doc.internal.pageSize.getHeight();
  for (let page = 1; page <= pages; page += 1) {
    doc.setPage(page);
    doc.setFillColor(...PDF_COLORS.primaryDark);
    doc.rect(0, height - 18, width, 18, "F");
    doc.setDrawColor(...PDF_COLORS.secondary);
    doc.setLineWidth(0.45);
    doc.line(0, height - 18, width, height - 18);
    doc.setFont("helvetica", "normal");
    doc.setFontSize(6.5);
    doc.setTextColor(255, 255, 255);
    doc.setFont("helvetica", "bold");
    doc.text(tenant.companyName, 12, height - 9, { maxWidth: 70 });
    const contacts = [tenant.phone, tenant.email, tenant.website].filter(Boolean).join("  |  ");
    if (contacts) {
      doc.setFont("helvetica", "normal");
      doc.text(contacts, width / 2, height - 9, { align: "center", maxWidth: 65 });
    }
    doc.setFont("helvetica", "normal");
    doc.text(`Généré le ${formatPdfDate(generatedAt)}  |  Page ${page} / ${pages}`, width - 12, height - 9, { align: "right" });
  }
}

export const PdfTheme = {
  Colors: PDF_COLORS,
  Typography: PDF_TYPOGRAPHY,
  Header: renderPdfHeader,
  Footer: renderPdfFooter,
  ContactBlock: renderPdfContactBlock,
  SectionTitle: renderPdfSectionTitle,
  Table: renderPdfTable,
  Totals: renderPdfTotals,
  Notes: renderPdfNotes,
  CurrencyFormatter: formatPdfCurrency,
  DateFormatter: formatPdfDate,
  Helpers: { tenantFromSettings },
};
