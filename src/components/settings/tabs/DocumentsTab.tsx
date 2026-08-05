import { FileSignature } from "lucide-react";
import { FileDropUploader } from "@/components/settings/FileDropUploader";
import { Panel } from "@/components/settings/tabs/GeneralTab";
import type { ParametresForm } from "@/hooks/use-parametres-editor";

type DocumentsTabProps = {
  form: ParametresForm;
  tenantId: string;
  update: <K extends keyof ParametresForm>(key: K, value: ParametresForm[K]) => void;
};

export function DocumentsTab({ form, tenantId, update }: DocumentsTabProps) {
  return (
    <div className="space-y-6">
      <Panel title="Signature" description="Image de la signature du responsable." icon={<FileSignature className="h-5 w-5" />}>
        <FileDropUploader
          currentPath={form.signature_url}
          tenantId={tenantId}
          folder="signature"
          label="Signature"
          variant="dropzone"
          onChange={(path) => update("signature_url", path)}
        />
      </Panel>
      <Panel title="Cachet / Tampon" description="Image du cachet officiel." icon={<FileSignature className="h-5 w-5" />}>
        <FileDropUploader
          currentPath={form.stamp_url}
          tenantId={tenantId}
          folder="cachet"
          label="Cachet"
          variant="dropzone"
          onChange={(path) => update("stamp_url", path)}
        />
      </Panel>
    </div>
  );
}
