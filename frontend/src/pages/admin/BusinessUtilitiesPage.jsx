import { useOutletContext } from "react-router-dom";
import BusinessUtilitiesManager from "../../components/BusinessUtilitiesManager";

function BusinessUtilitiesPage() {
  const { userName, providers, selectedPropertyId, selectedPropertyName } = useOutletContext();

  return (
    <>
      <div className="rounded-2xl bg-white p-6 shadow-sm">
        <div className="flex flex-wrap items-end justify-between gap-4">
          <div>
            <p className="text-sm text-slate-500">Welcome back, {userName}</p>
            <h1 className="mt-1 font-['Manrope',sans-serif] text-3xl font-bold">Business Utilities</h1>
            <p className="mt-2 text-sm text-slate-600">
              Track monthly costs for business operations, supplies, and services from your vendors and suppliers.
            </p>
            <p className="mt-2 text-xs font-semibold uppercase tracking-wide text-cyan-700">
              Active property: {selectedPropertyName || "-"}
            </p>
          </div>
        </div>
      </div>

      <BusinessUtilitiesManager providers={providers} selectedPropertyId={selectedPropertyId} />
    </>
  );
}

export default BusinessUtilitiesPage;


