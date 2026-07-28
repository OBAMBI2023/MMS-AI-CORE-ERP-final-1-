import { createFileRoute, redirect } from "@tanstack/react-router";
import { PartnerManagementView } from "@/components/super-admin/PartnerManagement";
import { getPartnerManagement } from "@/lib/partners.server";

export const Route = createFileRoute("/super-admin/partners")({
  beforeLoad: async () => {
    try {
      return { partners: await getPartnerManagement() };
    } catch (error) {
      const message = error instanceof Error ? error.message : String(error);
      if (message.includes("Platform Admin requis")) throw redirect({ to: "/403" });
      if (message.includes("Unauthorized")) throw redirect({ to: "/login" });
      throw error;
    }
  },
  loader: ({ context }) => context.partners,
  component: function PartnerManagementPage() {
    return <PartnerManagementView data={Route.useLoaderData()} />;
  },
});
