import { Outlet } from "react-router-dom";
import { AdminHeader } from "./admin-header.js";

export function AdminLayout() {
  return (
    <main className="flex h-screen flex-col overflow-hidden bg-slate-50">
      <AdminHeader />
      <div className="flex-1 overflow-hidden relative">
        <Outlet />
      </div>
    </main>
  );
}
