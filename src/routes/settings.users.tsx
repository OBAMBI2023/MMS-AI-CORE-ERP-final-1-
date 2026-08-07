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
        <Button asChild variant="outline" size="icon" className="sm:h-9 sm:w-auto sm:px-4">
          <Link to="/parametres">
            <ArrowLeft className="h-4 w-4 sm:mr-2" />
            <span className="hidden sm:inline">Paramètres</span>
          </Link>
        </Button>
      }
    >
      <UserManagement />
    </AppShell>
  );
}
