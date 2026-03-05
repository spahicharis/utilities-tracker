function AdminNavbar({ userName, onLogout, properties = [], selectedPropertyId, onSelectProperty }) {
  return (
    <header className="sticky top-0 z-20 border-b border-slate-200 bg-white/90 backdrop-blur">
      <div className="mx-auto flex h-16 w-full max-w-7xl items-center justify-between gap-4 px-4 sm:px-6">
        <div className="flex items-center gap-3">
          <span className="grid h-9 w-9 place-items-center rounded-lg bg-cyan-600 font-['Manrope',sans-serif] text-sm font-bold text-white">
            UT
          </span>
          <div>
            <p className="font-['Manrope',sans-serif] text-sm font-bold leading-tight">Utilities Tracker</p>
            <p className="text-xs text-slate-500">Admin Panel</p>
          </div>
        </div>
        <nav className="hidden items-center gap-5 text-sm font-medium text-slate-600 md:flex">
          <a className="text-slate-900" href="#">
            Dashboard
          </a>
          <a href="#">Users</a>
          <a href="#">Services</a>
          <a href="#">Reports</a>
        </nav>
        <div className="flex items-center gap-3">
          <label className="hidden items-center gap-2 text-xs text-slate-600 sm:flex">
            <span className="font-semibold uppercase tracking-wide">Property</span>
            <select
              value={selectedPropertyId}
              onChange={(event) => onSelectProperty(event.target.value)}
              className="rounded-md border border-slate-300 bg-white px-2 py-1 text-xs outline-none"
            >
              {properties.map((property) => (
                <option key={property.id} value={property.id}>
                  {property.name}
                </option>
              ))}
            </select>
          </label>
          <span className="hidden text-sm text-slate-600 sm:inline">Hi, {userName}</span>
          <button
            onClick={onLogout}
            className="rounded-lg border border-slate-300 bg-white px-3 py-1.5 text-sm font-medium text-slate-700 transition hover:bg-slate-50"
          >
            Logout
          </button>
        </div>
      </div>
    </header>
  );
}

export default AdminNavbar;
