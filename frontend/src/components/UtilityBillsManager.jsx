import { useEffect, useMemo, useState } from "react";
import { api } from "../lib/api";

const STATUS_OPTIONS = ["Pending", "Paid", "Overdue"];

function UtilityBillsManager({ providers = [] }) {
  const [bills, setBills] = useState([]);
  const [selectedMonth, setSelectedMonth] = useState("");
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [form, setForm] = useState(() => ({
    provider: "",
    amount: "",
    billDate: "",
    billingMonth: new Date().toISOString().slice(0, 7),
    status: "Pending"
  }));

  useEffect(() => {
    let isActive = true;

    const loadBills = async () => {
      try {
        const data = await api.getBills();
        if (isActive && Array.isArray(data?.bills)) {
          setBills(data.bills);
        }
      } catch (_error) {
        if (isActive) {
          setError("Failed to load bills from backend.");
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
  }, []);

  const filteredBills = useMemo(() => {
    const list = selectedMonth ? bills.filter((bill) => bill.billingMonth === selectedMonth) : bills;
    return [...list].sort((a, b) => b.billDate.localeCompare(a.billDate));
  }, [bills, selectedMonth]);

  const totalAmount = useMemo(
    () => filteredBills.reduce((sum, bill) => sum + Number(bill.amount || 0), 0),
    [filteredBills]
  );

  const paidCount = filteredBills.filter((bill) => bill.status === "Paid").length;
  const pendingCount = filteredBills.filter((bill) => bill.status === "Pending").length;
  const overdueCount = filteredBills.filter((bill) => bill.status === "Overdue").length;

  const onChange = (field, value) => {
    setForm((current) => ({ ...current, [field]: value }));
  };

  const addBill = async (event) => {
    event.preventDefault();
    setError("");
    const amount = Number(form.amount);
    if (!form.provider.trim() || !form.billDate || !form.billingMonth || !Number.isFinite(amount) || amount <= 0) {
      return;
    }

    try {
      const data = await api.addBill({
        provider: form.provider.trim(),
        amount,
        billDate: form.billDate,
        billingMonth: form.billingMonth,
        status: form.status
      });
      if (Array.isArray(data?.bills)) {
        setBills(data.bills);
      } else if (data?.bill) {
        setBills((current) => [data.bill, ...current]);
      }
      setForm((current) => ({ ...current, provider: "", amount: "", billDate: "", status: "Pending" }));
    } catch (_error) {
      setError("Failed to add bill.");
    }
  };

  const updateStatus = async (id, status) => {
    setError("");
    try {
      const data = await api.updateBillStatus(id, status);
      if (Array.isArray(data?.bills)) {
        setBills(data.bills);
      } else if (data?.bill) {
        setBills((current) => current.map((bill) => (bill.id === id ? data.bill : bill)));
      }
    } catch (_error) {
      setError("Failed to update bill status.");
    }
  };

  const removeBill = async (id) => {
    setError("");
    try {
      const data = await api.deleteBill(id);
      if (Array.isArray(data?.bills)) {
        setBills(data.bills);
      } else {
        setBills((current) => current.filter((bill) => bill.id !== id));
      }
    } catch (_error) {
      setError("Failed to delete bill.");
    }
  };

  return (
    <section className="rounded-2xl bg-white p-6 shadow-sm">
      <div className="flex flex-wrap items-end justify-between gap-4">
        <div>
          <h2 className="font-['Manrope',sans-serif] text-2xl font-bold">Monthly Utility Bills</h2>
          <p className="mt-1 text-sm text-slate-600">Track invoices from email by provider, amount, date, and status.</p>
        </div>
        <label className="block">
          <span className="mb-1 block text-xs font-semibold uppercase tracking-wide text-slate-500">Filter month</span>
          <input
            type="month"
            value={selectedMonth}
            onChange={(event) => setSelectedMonth(event.target.value)}
            className="rounded-lg border border-slate-300 px-3 py-2 text-sm outline-none ring-cyan-300 focus:border-cyan-400 focus:ring-4"
          />
        </label>
      </div>

      <div className="mt-5 grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
        <Stat label="Bills" value={String(filteredBills.length)} />
        <Stat label="Paid" value={String(paidCount)} />
        <Stat label="Pending" value={String(pendingCount)} />
        <Stat label="Overdue" value={String(overdueCount)} />
      </div>
      <p className="mt-3 text-sm text-slate-700">
        Total amount: <strong>${totalAmount.toFixed(2)}</strong>
      </p>
      {loading ? <p className="mt-2 text-sm text-slate-500">Loading bills...</p> : null}
      {error ? <p className="mt-2 text-sm text-rose-700">{error}</p> : null}

      <form className="mt-6 grid gap-3 rounded-xl border border-slate-200 bg-slate-50 p-4 md:grid-cols-2 xl:grid-cols-5" onSubmit={addBill}>
        <label className="block">
          <span className="mb-1 block text-xs font-semibold uppercase tracking-wide text-slate-500">Provider</span>
          <input
            list="provider-suggestions"
            value={form.provider}
            onChange={(event) => onChange("provider", event.target.value)}
            placeholder="Electricity"
            className="w-full rounded-lg border border-slate-300 px-3 py-2 text-sm outline-none ring-cyan-300 focus:border-cyan-400 focus:ring-4"
          />
          <datalist id="provider-suggestions">
            {providers.map((provider) => (
              <option key={provider} value={provider} />
            ))}
          </datalist>
        </label>

        <label className="block">
          <span className="mb-1 block text-xs font-semibold uppercase tracking-wide text-slate-500">Amount</span>
          <input
            type="number"
            min="0"
            step="0.01"
            value={form.amount}
            onChange={(event) => onChange("amount", event.target.value)}
            placeholder="0.00"
            className="w-full rounded-lg border border-slate-300 px-3 py-2 text-sm outline-none ring-cyan-300 focus:border-cyan-400 focus:ring-4"
          />
        </label>

        <label className="block">
          <span className="mb-1 block text-xs font-semibold uppercase tracking-wide text-slate-500">Bill date</span>
          <input
            type="date"
            value={form.billDate}
            onChange={(event) => onChange("billDate", event.target.value)}
            className="w-full rounded-lg border border-slate-300 px-3 py-2 text-sm outline-none ring-cyan-300 focus:border-cyan-400 focus:ring-4"
          />
        </label>

        <label className="block">
          <span className="mb-1 block text-xs font-semibold uppercase tracking-wide text-slate-500">Month</span>
          <input
            type="month"
            value={form.billingMonth}
            onChange={(event) => onChange("billingMonth", event.target.value)}
            className="w-full rounded-lg border border-slate-300 px-3 py-2 text-sm outline-none ring-cyan-300 focus:border-cyan-400 focus:ring-4"
          />
        </label>

        <label className="block">
          <span className="mb-1 block text-xs font-semibold uppercase tracking-wide text-slate-500">Status</span>
          <select
            value={form.status}
            onChange={(event) => onChange("status", event.target.value)}
            className="w-full rounded-lg border border-slate-300 px-3 py-2 text-sm outline-none ring-cyan-300 focus:border-cyan-400 focus:ring-4"
          >
            {STATUS_OPTIONS.map((status) => (
              <option key={status} value={status}>
                {status}
              </option>
            ))}
          </select>
        </label>

        <button
          type="submit"
          className="md:col-span-2 xl:col-span-5 rounded-lg bg-slate-900 px-4 py-2.5 text-sm font-semibold text-white transition hover:bg-slate-800"
        >
          Add Bill
        </button>
      </form>

      <div className="mt-6 overflow-hidden rounded-xl border border-slate-200">
        <table className="w-full border-collapse text-left text-sm">
          <thead className="bg-slate-100 text-slate-600">
            <tr>
              <th className="px-3 py-2 font-semibold">Provider</th>
              <th className="px-3 py-2 font-semibold">Amount</th>
              <th className="px-3 py-2 font-semibold">Date</th>
              <th className="px-3 py-2 font-semibold">Month</th>
              <th className="px-3 py-2 font-semibold">Status</th>
              <th className="px-3 py-2 font-semibold">Action</th>
            </tr>
          </thead>
          <tbody>
            {filteredBills.length === 0 ? (
              <tr>
                <td className="px-3 py-4 text-slate-500" colSpan={6}>
                  No bills yet. Add your first monthly bill.
                </td>
              </tr>
            ) : (
              filteredBills.map((bill) => (
                <tr key={bill.id} className="border-t border-slate-200">
                  <td className="px-3 py-2">{bill.provider}</td>
                  <td className="px-3 py-2">${Number(bill.amount).toFixed(2)}</td>
                  <td className="px-3 py-2">{bill.billDate}</td>
                  <td className="px-3 py-2">{bill.billingMonth}</td>
                  <td className="px-3 py-2">
                    <select
                      value={bill.status}
                      onChange={(event) => updateStatus(bill.id, event.target.value)}
                      className="rounded-md border border-slate-300 px-2 py-1 text-xs outline-none"
                    >
                      {STATUS_OPTIONS.map((status) => (
                        <option key={status} value={status}>
                          {status}
                        </option>
                      ))}
                    </select>
                  </td>
                  <td className="px-3 py-2">
                    <button
                      onClick={() => removeBill(bill.id)}
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

function Stat({ label, value }) {
  return (
    <div className="rounded-xl border border-slate-200 bg-slate-50 p-3">
      <p className="text-xs uppercase tracking-wide text-slate-500">{label}</p>
      <p className="mt-1 text-2xl font-bold text-slate-900">{value}</p>
    </div>
  );
}

export default UtilityBillsManager;
