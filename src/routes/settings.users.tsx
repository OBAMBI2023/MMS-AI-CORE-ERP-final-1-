import { createFileRoute, Link } from "@tanstack/react-router";
import { ArrowLeft } from "lucide-react";
import { AppShell } from "@/components/mms/AppShell";
import { UserManagement } from "@/components/mms/UserManagementTable";
import { Button } from "@/components/ui/button";

export const Route = createFileRoute("/settings/users")({
  component: SettingsUsersPage,
  head: () => ({
    meta: [{ title: "Utilisateurs — Paramètres" }],
  }),
});

function SettingsUsersPage() {
  return (
    <AppShell
      title="Utilisateurs"
      subtitle="Paramètres · Gérez les accès, les rôles et les permissions"
      actions={
        <Button asChild variant="outline">
          <Link to="/parametres">
            <ArrowLeft className="mr-2 h-4 w-4" />
            Paramètres
          </Link>
        </Button>
      }
    >
      <UserManagement />
    </AppShell>
  );
}
