import { Settings } from "lucide-react";
import { Card } from "@/components/ui/card";

export function SuperAdminSettingsSection() {
  return (
    <section id="parametres" className="scroll-mt-24 space-y-4">
      <div>
        <h2 className="text-lg font-semibold">Paramètres</h2>
        <p className="text-sm text-muted-foreground">Réglages globaux de la plateforme SAOVIA.</p>
      </div>
      <Card className="flex min-h-40 flex-col items-center justify-center rounded-xl border-dashed p-8 text-center">
        <div className="mb-3 flex size-11 items-center justify-center rounded-full bg-muted">
          <Settings className="size-5 text-muted-foreground" />
        </div>
        <p className="text-sm font-medium">Bientôt disponible</p>
        <p className="mt-1 max-w-sm text-xs text-muted-foreground">
          Les réglages globaux de la plateforme (marque, sécurité, intégrations) seront
          configurables ici dans une prochaine itération.
        </p>
      </Card>
    </section>
  );
}
