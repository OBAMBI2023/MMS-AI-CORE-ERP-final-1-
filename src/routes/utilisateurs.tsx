import { createFileRoute } from "@tanstack/react-router";
import { UserManagement } from "@/components/mms/UserManagementTable";

export const Route = createFileRoute("/utilisateurs")({
  component: UserManagementPage,
});

function UserManagementPage() {
  return (
    <div className="p-6">
      <UserManagement />
    </div>
  );
}
