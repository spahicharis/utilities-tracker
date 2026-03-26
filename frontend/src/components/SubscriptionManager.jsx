import { useEffect, useMemo, useState } from "react";
import { api } from "../lib/api";

const SUBSCRIPTION_STATUS_OPTIONS = ["Active", "Paused", "Canceled"];
const BILLING_CYCLE_OPTIONS = ["Monthly", "Quarterly", "Yearly"];
const CURRENCY_OPTIONS = ["KM", "EUR", "USD"];

function defaultForm() {
  return {
    name: "",
    amount: "",
    currency: "KM",
    billingCycle: "Monthly",
    nextBillingDate: "",
    status: "Active"
  };
}

function SubscriptionManager({ selectedPropertyId }) {
  const [subscriptions, setSubscriptions] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const [dialogMode, setDialogMode] = useState("add");
  const [editingId, setEditingId] = useState("");
  const [form, setForm] = useState(defaultForm);

  useEffect(() => {
    let isActive = true;

    const loadSubscriptions = async () => {
      if (!selectedPropertyId) {
        if (isActive) {
          setSubscriptions([]);
          setLoading(false);
        }
        return;
      }

      setLoading(true);
      setError("");
      try {
        const data = await api.getSubscriptions(selectedPropertyId);
        if (isActive) {
          setSubscriptions(Array.isArray(data?.subscriptions) ? data.subscriptions : []);
        }
      } catch (_error) {
        if (isActive) {
          setError("Failed to load subscriptions.");
        }
      } finally {
        if (isActive) {
          setLoading(false);
        }
      }
    };

    loadSubscriptions();
    return () => {
      isActive = false;
    };
  }, [selectedPropertyId]);

  const totals = useMemo(() => {
    const active = subscriptions.filter((item) => item.status === "Active");
    const monthlyEstimate = active.reduce((sum, item) => {
      const amount = Number(item.amount || 0);
      if (item.billingCycle === "Yearly") {
        return sum + amount / 12;
      }
      if (item.billingCycle === "Quarterly") {
        return sum + amount / 3;
      }
      return sum + amount;
    }, 0);

    return {
      total: subscriptions.length,
      active: active.length,
      paused: subscriptions.filter((item) => item.status === "Paused").length,
      monthlyEstimate: monthlyEstimate.toFixed(2)
    };
  }, [subscriptions]);

  const sortedSubscriptions = useMemo(() => {
    return [...subscriptions].sort((a, b) => {
      const left = String(a?.nextBillingDate || "");
      const right = String(b?.nextBillingDate || "");
      if (left !== right) {
        return left.localeCompare(right);
      }
      return String(a?.name || "").localeCompare(String(b?.name || ""));
    });
  }, [subscriptions]);

  const onChange = (field, value) => {
    setForm((current) => ({ ...current, [field]: value }));
  };

  const openAddDialog = () => {
    setDialogMode("add");
    setEditingId("");
    setForm(defaultForm());
    setError("");
    setIsDialogOpen(true);
  };

  const openEditDialog = (subscription) => {
    setDialogMode("edit");
    setEditingId(subscription.id);
    setForm({
      name: subscription.name || "",
      amount: String(subscription.amount ?? ""),
      currency: subscription.currency || "KM",
      billingCycle: subscription.billingCycle || "Monthly",
      nextBillingDate: subscription.nextBillingDate || "",
      status: subscription.status || "Active"
    });
    setError("");
    setIsDialogOpen(true);
  };

  const saveSubscription = async (event) => {
    event.preventDefault();
    if (!selectedPropertyId) {
      return;
    }

    setError("");
    setIsSaving(true);
    try {
      const payload = {
        propertyId: selectedPropertyId,
        name: form.name.trim(),
        amount: Number(form.amount),
        currency: form.currency,
        billingCycle: form.billingCycle,
        nextBillingDate: form.nextBillingDate,
        status: form.status
      };

      const data =
        dialogMode === "edit"
          ? await api.updateSubscription(editingId, payload)
          : await api.addSubscription(payload);

      if (Array.isArray(data?.subscriptions)) {
        setSubscriptions(data.subscriptions);
      }
      setForm(defaultForm());
      setEditingId("");
      setIsDialogOpen(false);
    } catch (_error) {
      setError(dialogMode === "edit" ? "Failed to update subscription." : "Failed to create subscription.");
    } finally {
      setIsSaving(false);
    }
  };

  const removeSubscription = async (id) => {
    if (!selectedPropertyId) {
      return;
    }

    setError("");
    try {
      const data = await api.deleteSubscription(id, selectedPropertyId);
      if (Array.isArray(data?.subscriptions)) {
        setSubscriptions(data.subscriptions);
      }
    } catch (_error) {
      setError("Failed to delete subscription.");
    }
  };

  return (
    <section className="rounded-2xl bg-white p-6 shadow-sm">
      <div className="flex flex-wrap items-end justify-between gap-4">
        <div>
          <h2 className="font-['Manrope',sans-serif] text-2xl font-bold">Subscription Management</h2>
          <p className="mt-1 text-sm text-slate-600">Manage recurring software, streaming, and service subscriptions.</p>
        </div>
        <button
          type="button"
          onClick={openAddDialog}
          className="rounded-lg bg-slate-900 px-4 py-2.5 text-sm font-semibold text-white transition hover:bg-slate-800"
        >
          Add Subscription
        </button>
      </div>

      <div className="mt-5 grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
        <StatCard label="Total" value={String(totals.total)} tone="from-sky-50 to-cyan-100" />
        <StatCard label="Active" value={String(totals.active)} tone="from-emerald-50 to-lime-100" />
        <StatCard label="Paused" value={String(totals.paused)} tone="from-amber-50 to-yellow-100" />
        <StatCard label="Monthly Estimate" value={`${totals.monthlyEstimate} KM`} tone="from-fuchsia-50 to-rose-100" />
      </div>

      {loading ? <p className="mt-4 text-sm text-slate-500">Loading subscriptions...</p> : null}
      {error ? <p className="mt-4 text-sm text-rose-700">{error}</p> : null}

      <div className="mt-6 overflow-hidden rounded-xl border border-slate-200">
        <table className="w-full border-collapse text-left text-sm">
          <thead className="bg-slate-100 text-slate-600">
            <tr>
              <th className="px-3 py-2 font-semibold">Name</th>
              <th className="px-3 py-2 font-semibold">Amount</th>
              <th className="px-3 py-2 font-semibold">Cycle</th>
              <th className="px-3 py-2 font-semibold">Next billing</th>
              <th className="px-3 py-2 font-semibold">Status</th>
              <th className="px-3 py-2 font-semibold">Action</th>
            </tr>
          </thead>
          <tbody>
            {sortedSubscriptions.length === 0 ? (
              <tr>
                <td className="px-3 py-4 text-slate-500" colSpan={6}>
                  No subscriptions yet.
                </td>
              </tr>
            ) : (
              sortedSubscriptions.map((subscription) => (
                <tr key={subscription.id} className="border-t border-slate-200">
                  <td className="px-3 py-2 font-medium text-slate-900">{subscription.name}</td>
                  <td className="px-3 py-2">
                    {Number(subscription.amount || 0).toFixed(2)} {subscription.currency || "KM"}
                  </td>
                  <td className="px-3 py-2">{subscription.billingCycle}</td>
                  <td className="px-3 py-2">{subscription.nextBillingDate}</td>
                  <td className="px-3 py-2">
                    <span
                      className={`rounded-full px-2.5 py-1 text-xs font-semibold ${
                        subscription.status === "Active"
                          ? "bg-emerald-100 text-emerald-800"
                          : subscription.status === "Paused"
                            ? "bg-amber-100 text-amber-800"
                            : "bg-slate-200 text-slate-700"
                      }`}
                    >
                      {subscription.status}
                    </span>
                  </td>
                  <td className="px-3 py-2">
                    <button
                      type="button"
                      onClick={() => openEditDialog(subscription)}
                      className="mr-2 rounded-md border border-slate-300 px-2 py-1 text-xs font-medium text-slate-700 hover:bg-slate-50"
                    >
                      Edit
                    </button>
                    <button
                      type="button"
                      onClick={() => removeSubscription(subscription.id)}
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
          <div className="w-full max-w-3xl rounded-2xl bg-white p-6 shadow-xl">
            <div className="flex items-center justify-between">
              <h3 className="font-['Manrope',sans-serif] text-xl font-bold">
                {dialogMode === "edit" ? "Edit Subscription" : "Add Subscription"}
              </h3>
              <button
                type="button"
                onClick={() => {
                  setIsDialogOpen(false);
                  setEditingId("");
                  setError("");
                }}
                className="rounded-md border border-slate-300 px-2 py-1 text-xs font-semibold text-slate-700 hover:bg-slate-50"
              >
                Close
              </button>
            </div>

            <form className="mt-4 grid gap-3 md:grid-cols-2 xl:grid-cols-3" onSubmit={saveSubscription}>
              <label className="block">
                <span className="mb-1 block text-xs font-semibold uppercase tracking-wide text-slate-500">Name</span>
                <input
                  type="text"
                  value={form.name}
                  onChange={(event) => onChange("name", event.target.value)}
                  placeholder="Netflix"
                  className="w-full rounded-lg border border-slate-300 px-3 py-2 text-sm outline-none ring-cyan-300 focus:border-cyan-400 focus:ring-4"
                />
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
                <span className="mb-1 block text-xs font-semibold uppercase tracking-wide text-slate-500">Currency</span>
                <select
                  value={form.currency}
                  onChange={(event) => onChange("currency", event.target.value)}
                  className="w-full rounded-lg border border-slate-300 px-3 py-2 text-sm outline-none ring-cyan-300 focus:border-cyan-400 focus:ring-4"
                >
                  {CURRENCY_OPTIONS.map((currency) => (
                    <option key={currency} value={currency}>
                      {currency}
                    </option>
                  ))}
                </select>
              </label>

              <label className="block">
                <span className="mb-1 block text-xs font-semibold uppercase tracking-wide text-slate-500">Billing cycle</span>
                <select
                  value={form.billingCycle}
                  onChange={(event) => onChange("billingCycle", event.target.value)}
                  className="w-full rounded-lg border border-slate-300 px-3 py-2 text-sm outline-none ring-cyan-300 focus:border-cyan-400 focus:ring-4"
                >
                  {BILLING_CYCLE_OPTIONS.map((cycle) => (
                    <option key={cycle} value={cycle}>
                      {cycle}
                    </option>
                  ))}
                </select>
              </label>

              <label className="block">
                <span className="mb-1 block text-xs font-semibold uppercase tracking-wide text-slate-500">Next billing date</span>
                <input
                  type="date"
                  value={form.nextBillingDate}
                  onChange={(event) => onChange("nextBillingDate", event.target.value)}
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
                  {SUBSCRIPTION_STATUS_OPTIONS.map((status) => (
                    <option key={status} value={status}>
                      {status}
                    </option>
                  ))}
                </select>
              </label>

              <button
                type="submit"
                disabled={isSaving}
                className="md:col-span-2 xl:col-span-3 rounded-lg bg-slate-900 px-4 py-2.5 text-sm font-semibold text-white transition hover:bg-slate-800"
              >
                {isSaving ? "Saving..." : dialogMode === "edit" ? "Update Subscription" : "Save Subscription"}
              </button>
            </form>
          </div>
        </div>
      ) : null}
    </section>
  );
}

function StatCard({ label, value, tone }) {
  return (
    <div className={`rounded-xl border border-white/60 bg-gradient-to-br ${tone} p-4 shadow-sm`}>
      <p className="text-xs uppercase tracking-wide text-slate-600">{label}</p>
      <p className="mt-2 text-2xl font-bold text-slate-900">{value}</p>
    </div>
  );
}

export default SubscriptionManager;
