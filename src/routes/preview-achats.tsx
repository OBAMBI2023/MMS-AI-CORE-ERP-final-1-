import { createFileRoute } from "@tanstack/react-router";
import { LineItemsDialog } from "@/components/mms/LineItemsDialog";

export const Route = createFileRoute("/preview-achats")({
  component: () => (
    <div className="min-h-screen bg-muted/20">
      <LineItemsDialog
        headerTable="achats"
        itemsTable="achat_items"
        fkColumn="achat_id"
        partnerTable="fournisseurs"
        partnerLabel="Fournisseur"
        numberPrefix="ACH"
        singular="Achat"
        onClose={() => {}}
      />
    </div>
  ),
});
