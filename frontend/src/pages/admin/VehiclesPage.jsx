import { useOutletContext } from "react-router-dom";
import VehicleRegistrationManager from "../../components/VehicleRegistrationManager";

function VehiclesPage() {
  const { selectedPropertyId, selectedPropertyName } = useOutletContext();

  return (
    <>
      <div className="rounded-2xl bg-white p-6 shadow-sm">
        <p className="text-sm text-slate-500">Vehicle Registration</p>
        <h1 className="mt-1 font-['Manrope',sans-serif] text-3xl font-bold">Vehicles</h1>
        <p className="mt-2 text-sm text-slate-600">
          Track multiple vehicles, their licence plates, registration due dates, payment amounts, and renewal status.
        </p>
        <p className="mt-2 text-xs font-semibold uppercase tracking-wide text-cyan-700">
          Active property: {selectedPropertyName || "-"}
        </p>
      </div>

      <VehicleRegistrationManager selectedPropertyId={selectedPropertyId} />
    </>
  );
}

export default VehiclesPage;
