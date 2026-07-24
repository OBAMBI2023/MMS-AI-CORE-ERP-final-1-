import { useState, useMemo, useEffect } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { formatCurrency } from "@/lib/mms/format";
import {
  History,
  Search,
  FileText,
  Printer,
  Pencil,
  Trash2,
  X,
  AlertTriangle,
} from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { usePermissions } from "@/hooks/use-permissions";
import { useCompanySettings } from "@/hooks/use-company-settings";
import { logAction } from "@/lib/audit.server";
import { toast } from "sonner";
import { jsPDF } from "jspdf";
import "jspdf-autotable";

interface SalesHistoryModalProps {
  isOpen: boolean;
  onClose: () => void;
  onEdit: (id: string) => void;
}

export function SalesHistoryModal({ isOpen, onClose, onEdit }: SalesHistoryModalProps) {
  const [search, setSearch] = useState("");
  const [userId, setUserId] = useState<string | null>(null);
  const [saleToDelete, setSaleToDelete] = useState<any>(null);
  const [currentPage, setCurrentPage] = useState(1);
  const [itemsPerPage, setItemsPerPage] = useState(10);
  const permissionsQuery = usePermissions();
  const queryClient = useQueryClient();

  useEffect(() => {
    supabase.auth.getUser().then(({ data }) => setUserId(data.user?.id || null));
  }, []);

  const { data: sales, isLoading } = useQuery({
    queryKey: ["ventes", "history"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("ventes")
        .select("*, vente_items(*)")
        .order("created_at", { ascending: false });
      if (error) throw error;
      return data || [];
    },
  });

  const { role, roleId } = permissionsQuery.data || { permissions: [], role: null, roleId: null };
  const { settings, logoUrl, companyName, address, phone, email } = useCompanySettings();
  // La gestion d'une vente est volontairement plus stricte qu'une permission
  // configurable : seul le rôle Administrateur peut la modifier ou la supprimer.
  const canManageSales = role === "Administrateur";

  const filteredSales = useMemo(() => {
    if (!sales) return [];
    return sales.filter(
      (s) =>
        s.number.toLowerCase().includes(search.toLowerCase()) ||
        s.client_name?.toLowerCase().includes(search.toLowerCase()),
    );
  }, [sales, search]);

  const paginatedSales = useMemo(() => {
    const start = (currentPage - 1) * itemsPerPage;
    return filteredSales.slice(start, start + itemsPerPage);
  }, [filteredSales, currentPage, itemsPerPage]);

  const totalPages = Math.ceil(filteredSales.length / itemsPerPage);

  const handleExportPDF = () => {
    const doc = new jsPDF();
    const pageWidth = doc.internal.pageSize.getWidth();
    let y = 10;

    // Header
    doc.setFontSize(18);
    doc.text("Historique des ventes", pageWidth / 2, y, { align: "center" });
    y += 10;
    
    doc.setFontSize(10);
    doc.text(`${companyName}`, 10, y);
    doc.text(`Email: ${email}`, 10, y + 5);
    doc.text(`Tél: ${phone}`, 10, y + 10);
    doc.text(`Adresse: ${address}`, 10, y + 15);
    y += 25;

    // Sales Table
    const tableData = filteredSales.map((s) => [
      s.number,
      new Date(s.created_at).toLocaleDateString(),
      s.client_name || "-",
      formatCurrency(s.total),
      s.payment_method,
      "Validée",
    ]);

    (doc as any).autoTable({
      head: [["Référence", "Date", "Client", "Montant", "Paiement", "Statut"]],
      body: tableData,
      startY: y,
      didDrawPage: (data: any) => {
        // Footer with page number
        doc.text(
          `Page ${data.pageNumber} / ${data.pageCount}`,
          pageWidth / 2,
          doc.internal.pageSize.getHeight() - 10,
          { align: "center" }
        );
      },
    });

    doc.save("historique-ventes.pdf");
    toast.success("PDF généré");
  };

  const canPrint = (_sale: any) => true;

  const handlePrint = (sale: any) => {
    const doc = new jsPDF({ format: "a7", unit: "mm" });
    doc.setFontSize(8);
    doc.text("Ticket de caisse", 10, 5);
    doc.text(`Ref: ${sale.number}`, 10, 10);
    doc.text(`Date: ${new Date(sale.created_at).toLocaleDateString()}`, 10, 15);
    doc.text("-----------------------", 10, 20);

    sale.vente_items?.forEach((item: any, index: number) => {
      doc.text(`${item.qty} x ${item.name} : ${formatCurrency(item.price)}`, 10, 25 + index * 5);
    });

    doc.text("-----------------------", 10, 25 + (sale.vente_items?.length || 0) * 5);
    doc.text(`Total: ${formatCurrency(sale.total)}`, 10, 30 + (sale.vente_items?.length || 0) * 5);

    doc.save(`ticket-${sale.number}.pdf`);
    toast.success("Impression lancée");
  };

  const handleDelete = async () => {
    if (!canManageSales) {
      toast.error("Accès refusé");
      setSaleToDelete(null);
      return;
    }

    if (!saleToDelete || !userId) return;
    const { error } = await supabase.from("ventes").delete().eq("id", saleToDelete.id);
    if (error) {
      toast.error("Erreur lors de la suppression");
    } else {
      await logAction(userId, roleId, "delete", "ventes", { sale_number: saleToDelete.number });
      toast.success("Vente supprimée");
      queryClient.invalidateQueries({ queryKey: ["ventes", "history"] });
      setSaleToDelete(null);
    }
  };

  return (
    <>
      <Dialog open={isOpen} onOpenChange={onClose}>
        <DialogContent className="max-w-[95vw] w-full h-[90vh] flex flex-col p-6 rounded-3xl">
          <DialogHeader>
            <div className="flex items-center gap-3">
              <div className="p-2 bg-primary/10 rounded-xl text-primary">
                <History className="h-6 w-6" />
              </div>
              <div>
                <DialogTitle>Historique des ventes</DialogTitle>
                <DialogDescription>
                  Consultez, recherchez et gérez les ventes enregistrées.
                </DialogDescription>
              </div>
            </div>
          </DialogHeader>

          <div className="flex gap-4 py-4">
            <div className="relative flex-1">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
              <Input
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                placeholder="Référence, client..."
                className="pl-10"
              />
            </div>
            <div className="flex gap-2">
              <Button
                variant="outline"
                className="gap-2"
                onClick={handleExportPDF}
              >
                <FileText className="h-4 w-4" /> Exporter PDF
              </Button>
              <Button
                variant="outline"
                className="gap-2"
                onClick={() => window.print()}
              >
                <Printer className="h-4 w-4" /> Imprimer
              </Button>
            </div>
          </div>

          <div className="flex-1 overflow-auto border rounded-xl">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Référence</TableHead>
                  <TableHead>Date</TableHead>
                  <TableHead>Client</TableHead>
                  <TableHead>Montant</TableHead>
                  <TableHead>Paiement</TableHead>
                  <TableHead>Statut</TableHead>
                  <TableHead className="text-right">Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {isLoading ? (
                  <TableRow>
                    <TableCell colSpan={7} className="text-center">
                      Chargement...
                    </TableCell>
                  </TableRow>
                ) : paginatedSales.length === 0 ? (
                  <TableRow>
                    <TableCell colSpan={7} className="text-center">
                      Aucune vente trouvée
                    </TableCell>
                  </TableRow>
                ) : (
                  paginatedSales.map((s) => (
                    <TableRow key={s.id}>
                      <TableCell className="font-medium">{s.number}</TableCell>
                      <TableCell>{new Date(s.created_at).toLocaleDateString()}</TableCell>
                      <TableCell>{s.client_name}</TableCell>
                      <TableCell>{formatCurrency(s.total)}</TableCell>
                      <TableCell>
                        <Badge variant="outline">{s.payment_method}</Badge>
                      </TableCell>
                      <TableCell>
                        <Badge className="bg-green-100 text-green-700 hover:bg-green-100">
                          Validée
                        </Badge>
                      </TableCell>
                      <TableCell className="text-right flex items-center justify-end gap-2">
                        {canPrint(s) && (
                          <Button variant="ghost" size="icon" onClick={() => handlePrint(s)}>
                            <Printer className="h-4 w-4" />
                          </Button>
                        )}
                        {canManageSales && (
                          <>
                            <Button
                              variant="ghost"
                              size="icon"
                              aria-label="Modifier la vente"
                              onClick={() => {
                                if (!canManageSales) {
                                  toast.error("Accès refusé");
                                  return;
                                }
                                onClose();
                                onEdit(s.id);
                              }}
                            >
                              <Pencil className="h-4 w-4" />
                            </Button>
                            <Button
                              variant="ghost"
                              size="icon"
                              className="text-destructive"
                              aria-label="Supprimer la vente"
                              onClick={() => {
                                if (!canManageSales) {
                                  toast.error("Accès refusé");
                                  return;
                                }
                                setSaleToDelete(s);
                              }}
                            >
                              <Trash2 className="h-4 w-4" />
                            </Button>
                          </>
                        )}
                      </TableCell>
                    </TableRow>
                  ))
                )}
              </TableBody>
            </Table>
          </div>

          <div className="flex items-center justify-between p-4 border-t">
            <div className="text-sm text-muted-foreground">
              Affichage {(currentPage - 1) * itemsPerPage + 1}–{Math.min(currentPage * itemsPerPage, filteredSales.length)} sur {filteredSales.length} ventes
            </div>
            <div className="flex items-center gap-2">
              <Button variant="outline" size="sm" onClick={() => setCurrentPage(1)} disabled={currentPage === 1}>{"<<"}</Button>
              <Button variant="outline" size="sm" onClick={() => setCurrentPage(p => Math.max(1, p - 1))} disabled={currentPage === 1}>{"<"}</Button>
              <span className="text-sm">{currentPage} / {totalPages}</span>
              <Button variant="outline" size="sm" onClick={() => setCurrentPage(p => Math.min(totalPages, p + 1))} disabled={currentPage === totalPages}>{">"}</Button>
              <Button variant="outline" size="sm" onClick={() => setCurrentPage(totalPages)} disabled={currentPage === totalPages}>{">>"}</Button>
              
              <select 
                className="ml-4 border rounded p-1 text-sm"
                value={itemsPerPage}
                onChange={(e) => {
                  setItemsPerPage(Number(e.target.value));
                  setCurrentPage(1);
                }}
              >
                {[10, 25, 50, 100].map(size => <option key={size} value={size}>{size}</option>)}
              </select>
            </div>
          </div>
        </DialogContent>
      </Dialog>

      <Dialog open={!!saleToDelete} onOpenChange={() => setSaleToDelete(null)}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2 text-destructive">
              <AlertTriangle /> Confirmer la suppression
            </DialogTitle>
            <DialogDescription>Voulez-vous vraiment supprimer cette vente ?</DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <Button variant="outline" onClick={() => setSaleToDelete(null)}>
              Annuler
            </Button>
            <Button variant="destructive" onClick={handleDelete}>
              Supprimer
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  );
}
