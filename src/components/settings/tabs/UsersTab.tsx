import { PermissionsTab } from "@/components/mms/PermissionsTab";
import { RolesManagement } from "@/components/mms/RolesManagement";
import { UserManagement } from "@/components/mms/UserManagementTable";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";

export function UsersTab() {
  return (
    <Tabs defaultValue="users" className="space-y-6">
      <TabsList className="grid w-full grid-cols-3 sm:max-w-xl">
        <TabsTrigger value="users">Utilisateurs</TabsTrigger>
        <TabsTrigger value="roles">Rôles</TabsTrigger>
        <TabsTrigger value="permissions">Permissions</TabsTrigger>
      </TabsList>
      <TabsContent value="users"><UserManagement /></TabsContent>
      <TabsContent value="roles"><RolesManagement /></TabsContent>
      <TabsContent value="permissions"><PermissionsTab /></TabsContent>
    </Tabs>
  );
}
