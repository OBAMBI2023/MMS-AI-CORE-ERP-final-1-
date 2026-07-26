import { createFileRoute } from "@tanstack/react-router";
import { MarketingLayout } from "@/marketing/layouts/MarketingLayout";
import { PricingPage } from "@/marketing/pages/PricingPage";

export const Route = createFileRoute("/tarifs")({
  component: () => (
    <MarketingLayout>
      <PricingPage />
    </MarketingLayout>
  ),
});
