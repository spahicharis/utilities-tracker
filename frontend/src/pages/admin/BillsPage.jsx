import { useOutletContext } from "react-router-dom";
import UtilityBillsManager from "../../components/UtilityBillsManager";
import utility3dImage from "../../assets/utility-3d.svg";

function BillsPage() {
  const { userName, providers } = useOutletContext();

  return (
    <>
      <div className="rounded-2xl bg-white p-6 shadow-sm">
        <div className="flex flex-wrap items-end justify-between gap-4">
          <div>
            <p className="text-sm text-slate-500">Welcome back, {userName}</p>
            <h1 className="mt-1 font-['Manrope',sans-serif] text-3xl font-bold">Bills</h1>
            <p className="mt-2 text-sm text-slate-600">
              Add monthly bills from your email and keep track of provider, amount, date, and payment status.
            </p>
          </div>
        </div>
      </div>

      <UtilityBillsManager providers={providers} />
    </>
  );
}

export default BillsPage;
