import { useOutletContext } from "react-router-dom";
import SubscriptionManager from "../../components/SubscriptionManager";

function SubscriptionsPage() {
  const { selectedPropertyId, selectedPropertyName } = useOutletContext();

  return (
    <>
      <div className="rounded-2xl bg-white p-6 shadow-sm">
        <p className="text-sm text-slate-500">Recurring Services</p>
        <h1 className="mt-1 font-['Manrope',sans-serif] text-3xl font-bold">Subscriptions</h1>
        <p className="mt-2 text-sm text-slate-600">
          Track recurring services like Netflix, YouTube, WebStorm, and other monthly or yearly subscriptions.
        </p>
        <p className="mt-2 text-xs font-semibold uppercase tracking-wide text-cyan-700">
          Active property: {selectedPropertyName || "-"}
        </p>
      </div>

      <SubscriptionManager selectedPropertyId={selectedPropertyId} />
    </>
  );
}

export default SubscriptionsPage;
