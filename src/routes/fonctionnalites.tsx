import { createFileRoute } from "@tanstack/react-router";
import { MarketingLayout } from "@/marketing/layouts/MarketingLayout";
import { FeaturesPage } from "@/marketing/pages/FeaturesPage";

export const Route = createFileRoute("/fonctionnalites")({
  component: () => (
    <MarketingLayout>
      <FeaturesPage />
    </MarketingLayout>
  ),
});
