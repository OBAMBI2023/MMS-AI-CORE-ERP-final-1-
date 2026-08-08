import { HotelSidebarContent } from "./HotelSidebarContent";
import { HotelSidebarHeader } from "./HotelSidebarHeader";

export function HotelSidebar() {
  return (
    <aside className="hidden md:flex h-full w-64 shrink-0 flex-col bg-sidebar text-sidebar-foreground border-r border-sidebar-border overflow-hidden">
      <HotelSidebarHeader />
      <div className="flex-1 px-4">
        <HotelSidebarContent />
      </div>
    </aside>
  );
}
