import { NavLink } from "react-router-dom";

const links = [
  { label: "Dashboard", to: "/admin/dashboard" },
  { label: "Bills", to: "/admin/bills" },
  { label: "Providers", to: "/admin/providers" }
];

function AdminSidebar() {
  return (
    <aside className="rounded-2xl bg-slate-900 p-5 text-slate-100">
      <p className="text-xs uppercase tracking-[0.2em] text-cyan-300">Navigation</p>
      <ul className="mt-4 space-y-2 text-sm">
        {links.map((link) => (
          <li key={link.to}>
            <NavLink
              to={link.to}
              className={({ isActive }) =>
                `block rounded-lg px-3 py-2 ${isActive ? "bg-white/10 font-medium text-white" : "text-slate-300 hover:bg-white/5"}`
              }
            >
              {link.label}
            </NavLink>
          </li>
        ))}
      </ul>
    </aside>
  );
}

export default AdminSidebar;
