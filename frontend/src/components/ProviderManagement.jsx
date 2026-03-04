import { useMemo, useState } from "react";

function ProviderManagement({ providers, onAddProvider, onDeleteProvider }) {
  const [form, setForm] = useState({
    name: "",
    address: "",
    logo: "",
    phone: ""
  });
  const [isSaving, setIsSaving] = useState(false);
  const [error, setError] = useState("");
  const [isDialogOpen, setIsDialogOpen] = useState(false);

  const sortedProviders = useMemo(() => {
    return [...providers].sort((a, b) => {
      const left = (typeof a === "string" ? a : a.name || "").toLowerCase();
      const right = (typeof b === "string" ? b : b.name || "").toLowerCase();
      return left.localeCompare(right);
    });
  }, [providers]);

  const onChange = (field, value) => {
    setForm((current) => ({ ...current, [field]: value }));
  };

  const addProvider = (event) => {
    event.preventDefault();
    const name = form.name.trim();
    if (!name) {
      return;
    }
    setError("");
    setIsSaving(true);
    Promise.resolve(
      onAddProvider({
        name,
        address: form.address.trim(),
        logo: form.logo.trim(),
        phone: form.phone.trim()
      })
    )
      .then((created) => {
        if (created) {
          setForm({ name: "", address: "", logo: "", phone: "" });
          setIsDialogOpen(false);
          return;
        }
        setError("Unable to add provider. It may already exist.");
      })
      .catch(() => {
        setError("Unable to add provider.");
      })
      .finally(() => {
        setIsSaving(false);
      });
  };

  return (
    <section className="rounded-2xl bg-white p-6 shadow-sm">
      <div className="flex flex-wrap items-end justify-between gap-4">
        <div>
          <h2 className="font-['Manrope',sans-serif] text-2xl font-bold">Provider Management</h2>
          <p className="mt-1 text-sm text-slate-600">Manage utility providers used while entering monthly bills.</p>
        </div>
        <button
          type="button"
          onClick={() => {
            setError("");
            setIsDialogOpen(true);
          }}
          className="rounded-lg bg-slate-900 px-4 py-2.5 text-sm font-semibold text-white transition hover:bg-slate-800"
        >
          Add Provider
        </button>
      </div>
      {error ? <p className="mt-2 text-sm text-rose-700">{error}</p> : null}

      <div className="mt-4 overflow-hidden rounded-xl border border-slate-200">
        <table className="w-full border-collapse text-left text-sm">
          <thead className="bg-slate-100 text-slate-600">
            <tr>
              <th className="px-3 py-2 font-semibold">Provider</th>
              <th className="px-3 py-2 font-semibold">Address</th>
              <th className="px-3 py-2 font-semibold">Phone</th>
              <th className="px-3 py-2 font-semibold">Logo</th>
              <th className="px-3 py-2 font-semibold">Action</th>
            </tr>
          </thead>
          <tbody>
            {sortedProviders.length === 0 ? (
              <tr>
                <td className="px-3 py-4 text-slate-500" colSpan={5}>
                  No providers configured.
                </td>
              </tr>
            ) : (
              sortedProviders.map((provider) => (
                <tr key={typeof provider === "string" ? provider : provider.name} className="border-t border-slate-200">
                  <td className="px-3 py-2">{typeof provider === "string" ? provider : provider.name}</td>
                  <td className="px-3 py-2">{typeof provider === "string" ? "-" : provider.address || "-"}</td>
                  <td className="px-3 py-2">{typeof provider === "string" ? "-" : provider.phone || "-"}</td>
                  <td className="px-3 py-2">
                    {typeof provider === "string" || !provider.logo ? (
                      "-"
                    ) : (
                      <img src={provider.logo} alt={`${provider.name} logo`} className="h-8 w-8 rounded object-cover" />
                    )}
                  </td>
                  <td className="px-3 py-2">
                    <button
                      onClick={() =>
                        onDeleteProvider(typeof provider === "string" ? provider : provider.name)
                      }
                      className="rounded-md border border-rose-300 px-2 py-1 text-xs font-medium text-rose-700 hover:bg-rose-50"
                    >
                      Delete
                    </button>
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>

      {isDialogOpen ? (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/50 p-4">
          <div className="w-full max-w-2xl rounded-2xl bg-white p-6 shadow-xl">
            <div className="flex items-center justify-between">
              <h3 className="font-['Manrope',sans-serif] text-xl font-bold">Add Provider</h3>
              <button
                type="button"
                onClick={() => {
                  setIsDialogOpen(false);
                  setError("");
                }}
                className="rounded-md border border-slate-300 px-2 py-1 text-xs font-semibold text-slate-700 hover:bg-slate-50"
              >
                Close
              </button>
            </div>
            <form className="mt-4 grid gap-3 sm:grid-cols-2" onSubmit={addProvider}>
              <input
                type="text"
                value={form.name}
                onChange={(event) => onChange("name", event.target.value)}
                placeholder="Provider name (e.g. Electricity)"
                className="w-full rounded-lg border border-slate-300 px-3 py-2 text-sm outline-none ring-cyan-300 focus:border-cyan-400 focus:ring-4"
              />
              <input
                type="text"
                value={form.address}
                onChange={(event) => onChange("address", event.target.value)}
                placeholder="Address"
                className="w-full rounded-lg border border-slate-300 px-3 py-2 text-sm outline-none ring-cyan-300 focus:border-cyan-400 focus:ring-4"
              />
              <input
                type="text"
                value={form.phone}
                onChange={(event) => onChange("phone", event.target.value)}
                placeholder="Phone number"
                className="w-full rounded-lg border border-slate-300 px-3 py-2 text-sm outline-none ring-cyan-300 focus:border-cyan-400 focus:ring-4"
              />
              <input
                type="url"
                value={form.logo}
                onChange={(event) => onChange("logo", event.target.value)}
                placeholder="Logo URL"
                className="w-full rounded-lg border border-slate-300 px-3 py-2 text-sm outline-none ring-cyan-300 focus:border-cyan-400 focus:ring-4"
              />
              <button
                type="submit"
                disabled={isSaving}
                className="sm:col-span-2 rounded-lg bg-slate-900 px-4 py-2.5 text-sm font-semibold text-white transition hover:bg-slate-800"
              >
                {isSaving ? "Saving..." : "Save Provider"}
              </button>
            </form>
          </div>
        </div>
      ) : null}
    </section>
  );
}

export default ProviderManagement;
