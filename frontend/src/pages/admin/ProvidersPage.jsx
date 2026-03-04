import { useOutletContext } from "react-router-dom";
import ProviderManagement from "../../components/ProviderManagement";

function ProvidersPage() {
  const { providers, addProvider, deleteProvider } = useOutletContext();

  return (
    <>
      <div className="rounded-2xl bg-white p-6 shadow-sm">
        <p className="text-sm text-slate-500">Configuration</p>
        <h1 className="mt-1 font-['Manrope',sans-serif] text-3xl font-bold">Providers</h1>
        <p className="mt-2 text-sm text-slate-600">
          Manage utility provider names once and use them while entering monthly bills.
        </p>
      </div>

      <ProviderManagement providers={providers} onAddProvider={addProvider} onDeleteProvider={deleteProvider} />
    </>
  );
}

export default ProvidersPage;
