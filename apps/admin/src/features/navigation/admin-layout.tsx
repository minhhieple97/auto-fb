import { Outlet } from "react-router-dom";
import { AdminHeader } from "./admin-header.js";

export function AdminLayout() {
  return (
    <main className="min-h-screen bg-canvas">
      <AdminHeader />
      <Outlet />
    </main>
  );
}
