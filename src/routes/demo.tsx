import { createFileRoute } from "@tanstack/react-router";
import { DemoPage } from "@/marketing/pages/DemoPage";
import { MarketingLayout } from "@/marketing/layouts/MarketingLayout";

export const Route = createFileRoute("/demo")({
  component: () => (
    <MarketingLayout>
      <DemoPage />
    </MarketingLayout>
  ),
});
