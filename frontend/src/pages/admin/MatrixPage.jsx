import {useEffect, useState} from "react";
import {useOutletContext} from "react-router-dom";
import UtilityBillsMatrix from "../../components/UtilityBillsMatrix";
import {api} from "../../lib/api";

function MatrixPage() {
    const {selectedPropertyId, selectedPropertyName} = useOutletContext();
    const [bills, setBills] = useState([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState("");

    useEffect(() => {
        let isActive = true;

        const loadBills = async () => {
            setLoading(true);
            setError("");
            try {
                const data = await api.getBills(selectedPropertyId, "personal");
                if (isActive) {
                    setBills(Array.isArray(data?.bills) ? data.bills : []);
                }
            } catch (_error) {
                if (isActive) {
                    setError("Failed to load bills for the matrix.");
                }
            } finally {
                if (isActive) {
                    setLoading(false);
                }
            }
        };

        loadBills();
        return () => {
            isActive = false;
        };
    }, [selectedPropertyId]);

    return (
        <>
            <div className="rounded-2xl bg-white p-6 shadow-sm">
                <p className="text-sm text-slate-500">Payment overview</p>
                <h1 className="mt-1 font-['Manrope',sans-serif] text-3xl font-bold">Matrix</h1>
                <p className="mt-2 text-sm text-slate-600">Review monthly payment status by utility provider.</p>
                <p className="mt-2 text-xs font-semibold uppercase tracking-wide text-cyan-700">Active property: {selectedPropertyName || "-"}</p>
            </div>
            {loading ? <p className="text-sm text-slate-500">Loading matrix...</p> : null}
            {error ? <p className="text-sm text-rose-700">{error}</p> : null}
            <UtilityBillsMatrix bills={bills} />
        </>
    );
}

export default MatrixPage;
