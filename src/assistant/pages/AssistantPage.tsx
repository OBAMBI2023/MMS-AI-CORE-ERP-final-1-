import { ChatWorkspace } from "../components/ChatWorkspace";
import { AppShell } from "@/components/mms/AppShell";

export function AssistantPage() {
  return (
    <AppShell title="Assistant IA">
      <ChatWorkspace />
    </AppShell>
  );
}
