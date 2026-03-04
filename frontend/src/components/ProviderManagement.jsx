import { useMemo, useState } from "react";

function ProviderManagement({ providers, onAddProvider, onDeleteProvider }) {
  const [providerName, setProviderName] = useState("");
  const [isSaving, setIsSaving] = useState(false);
  const [error, setError] = useState("");

  const sortedProviders = useMemo(() => [...providers].sort((a, b) => a.localeCompare(b)), [providers]);

  const addProvider = (event) => {
    event.preventDefault();
    const name = providerName.trim();
    if (!name) {
      return;
    }
    setError("");
    setIsSaving(true);
    Promise.resolve(onAddProvider(name))
      .then((created) => {
        if (created) {
          setProviderName("");
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
      <h2 className="font-['Manrope',sans-serif] text-2xl font-bold">Provider Management</h2>
      <p className="mt-1 text-sm text-slate-600">Manage utility providers used while entering monthly bills.</p>

      <form className="mt-4 flex flex-col gap-3 sm:flex-row" onSubmit={addProvider}>
        <input
          type="text"
          value={providerName}
          onChange={(event) => setProviderName(event.target.value)}
          placeholder="Add provider (e.g. Electricity)"
          className="w-full rounded-lg border border-slate-300 px-3 py-2 text-sm outline-none ring-cyan-300 focus:border-cyan-400 focus:ring-4"
        />
        <button
          type="submit"
          disabled={isSaving}
          className="rounded-lg bg-slate-900 px-4 py-2.5 text-sm font-semibold text-white transition hover:bg-slate-800"
        >
          {isSaving ? "Saving..." : "Add Provider"}
        </button>
      </form>
      {error ? <p className="mt-2 text-sm text-rose-700">{error}</p> : null}

      <div className="mt-4 overflow-hidden rounded-xl border border-slate-200">
        <table className="w-full border-collapse text-left text-sm">
          <thead className="bg-slate-100 text-slate-600">
            <tr>
              <th className="px-3 py-2 font-semibold">Provider</th>
              <th className="px-3 py-2 font-semibold">Action</th>
            </tr>
          </thead>
          <tbody>
            {sortedProviders.length === 0 ? (
              <tr>
                <td className="px-3 py-4 text-slate-500" colSpan={2}>
                  No providers configured.
                </td>
              </tr>
            ) : (
              sortedProviders.map((provider) => (
                <tr key={provider} className="border-t border-slate-200">
                  <td className="px-3 py-2">{provider}</td>
                  <td className="px-3 py-2">
                    <button
                      onClick={() => onDeleteProvider(provider)}
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
    </section>
  );
}

export default ProviderManagement;
