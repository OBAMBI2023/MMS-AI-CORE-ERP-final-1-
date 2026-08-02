import { createServerFn } from "@tanstack/react-start";
import { AuthHttpError, requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";
import { sanitizeCsvCell } from "@/lib/hotel-reports-csv";

type ExportReservation = {
  id: string; checkIn: string; checkOut: string;
  grandTotal: number; paidTotal: number; balanceDue: number;
};
type ExportExpense = {
  id: string; paidAt: string; category: string;
  description: string | null; amount: number;
};
type HotelExportData = {
  tenantId: string;
  reservations: ExportReservation[];
  expenses: ExportExpense[];
};

export function buildHotelReportCsv(data: HotelExportData) {
  const reservations = [
    ["Réservation", "Arrivée", "Départ", "Total", "Payé", "Solde"],
    ...data.reservations.map((row) => [row.id, row.checkIn, row.checkOut, row.grandTotal, row.paidTotal, row.balanceDue]),
  ];
  const expenses = [
    ["Dépense", "Date", "Catégorie", "Description", "Montant"],
    ...data.expenses.map((row) => [row.id, row.paidAt, row.category, row.description, row.amount]),
  ];
  return [...reservations, [], ...expenses].map((row) => row.map(sanitizeCsvCell).join(",")).join("\n");
}

export const exportHotelReportCsv = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }) => {
    const { data, error } = await (context.supabase as any).rpc("get_hotel_report_export_data");
    if (error) {
      if (error.code === "42501") {
        throw new AuthHttpError(403, "Permission d’export des rapports Hôtel requise.");
      }
      throw new Error("Impossible de générer l’export Hôtel.");
    }
    const exportData = data as HotelExportData | null;
    if (!exportData?.tenantId || !Array.isArray(exportData.reservations) || !Array.isArray(exportData.expenses)) {
      throw new Error("Les données d’export Hôtel sont invalides.");
    }
    return {
      csv: buildHotelReportCsv(exportData),
      filename: `rapport-hotel-${new Date().toISOString().slice(0, 10)}.csv`,
    };
  });
