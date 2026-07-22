import { createFileRoute } from "@tanstack/react-router";
import { ActivityLogPage } from "@/components/mms/ActivityLogPage";

export const Route = createFileRoute("/journal")({
  component: JournalPage,
});

function JournalPage() {
  return <ActivityLogPage />;
}
