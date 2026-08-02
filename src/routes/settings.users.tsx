import { createFileRoute, Link } from "@tanstack/react-router";
import { ArrowLeft } from "lucide-react";
import { AppShell } from "@/components/mms/AppShell";
import { UserManagement } from "@/components/mms/UserManagementTable";
import { RolesManagement } from "@/components/mms/RolesManagement";
import { PermissionsTab } from "@/components/mms/PermissionsTab";
import { Button } from "@/components/ui/button";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";

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
      <Tabs defaultValue="users" className="space-y-6">
        <TabsList className="grid w-full max-w-xl grid-cols-3">
          <TabsTrigger value="users">Utilisateurs</TabsTrigger>
          <TabsTrigger value="roles">Rôles</TabsTrigger>
          <TabsTrigger value="permissions">Permissions</TabsTrigger>
        </TabsList>
        <TabsContent value="users"><UserManagement /></TabsContent>
        <TabsContent value="roles"><RolesManagement /></TabsContent>
        <TabsContent value="permissions"><PermissionsTab /></TabsContent>
      </Tabs>
    </AppShell>
  );
}
