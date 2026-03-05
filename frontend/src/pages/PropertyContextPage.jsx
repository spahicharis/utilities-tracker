import { useEffect, useState } from "react";
import { Navigate } from "react-router-dom";
import { api } from "../lib/api";

function PropertyContextPage({ isAuthenticated, selectedPropertyId, onSelectProperty, onLogout }) {
  const [properties, setProperties] = useState([]);
  const [name, setName] = useState("");
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [isSaving, setIsSaving] = useState(false);

  useEffect(() => {
    let isActive = true;

    const loadProperties = async () => {
      setLoading(true);
      setError("");
      try {
        const data = await api.getProperties();
        if (isActive) {
          setProperties(Array.isArray(data?.properties) ? data.properties : []);
        }
      } catch (_error) {
        if (isActive) {
          setError("Failed to load properties.");
        }
      } finally {
        if (isActive) {
          setLoading(false);
        }
      }
    };

    loadProperties();
    return () => {
      isActive = false;
    };
  }, []);

  const addProperty = async (event) => {
    event.preventDefault();
    const nextName = name.trim();
    if (!nextName) {
      return;
    }

    setIsSaving(true);
    setError("");
    try {
      const data = await api.addProperty(nextName);
      const nextProperties = Array.isArray(data?.properties) ? data.properties : [];
      setProperties(nextProperties);
      setName("");
      const createdId = String(data?.property?.id || "");
      if (createdId) {
        onSelectProperty(createdId);
      }
    } catch (requestError) {
      setError(requestError?.message || "Failed to add property.");
    } finally {
      setIsSaving(false);
    }
  };

  if (!isAuthenticated) {
    return <Navigate to="/login" replace />;
  }

  if (selectedPropertyId) {
    return <Navigate to="/admin" replace />;
  }

  return (
    <div className="flex min-h-screen items-center justify-center bg-slate-100 px-4 py-8">
      <div className="w-full max-w-2xl rounded-2xl bg-white p-6 shadow-sm">
        <div className="flex items-start justify-between gap-4">
          <div>
            <h1 className="font-['Manrope',sans-serif] text-2xl font-bold text-slate-900">Select Property Context</h1>
            <p className="mt-1 text-sm text-slate-600">Choose which property you want to manage before entering admin panel.</p>
          </div>
          <button
            onClick={onLogout}
            className="rounded-lg border border-slate-300 bg-white px-3 py-1.5 text-sm font-medium text-slate-700 hover:bg-slate-50"
          >
            Logout
          </button>
        </div>

        <form className="mt-5 flex gap-2" onSubmit={addProperty}>
          <input
            value={name}
            onChange={(event) => setName(event.target.value)}
            placeholder="Add new property (e.g. Weekend Home)"
            className="flex-1 rounded-lg border border-slate-300 px-3 py-2 text-sm outline-none ring-cyan-300 focus:border-cyan-400 focus:ring-4"
          />
          <button
            type="submit"
            disabled={isSaving || !name.trim()}
            className="rounded-lg bg-slate-900 px-4 py-2 text-sm font-semibold text-white hover:bg-slate-800 disabled:cursor-not-allowed disabled:bg-slate-300"
          >
            {isSaving ? "Adding..." : "Add"}
          </button>
        </form>

        {loading ? <p className="mt-4 text-sm text-slate-500">Loading properties...</p> : null}
        {error ? <p className="mt-4 text-sm text-rose-700">{error}</p> : null}

        <div className="mt-4 grid gap-3 sm:grid-cols-2">
          {properties.map((property) => (
            <button
              key={property.id}
              type="button"
              onClick={() => onSelectProperty(property.id)}
              className="rounded-xl border border-slate-200 bg-slate-50 px-4 py-3 text-left transition hover:border-cyan-300 hover:bg-cyan-50"
            >
              <p className="font-semibold text-slate-900">{property.name}</p>
              <p className="mt-1 text-xs text-slate-500">Open this property</p>
            </button>
          ))}
        </div>
      </div>
    </div>
  );
}

export default PropertyContextPage;

