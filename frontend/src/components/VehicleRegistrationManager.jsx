import { useEffect, useMemo, useState } from "react";
import { api } from "../lib/api";

const VEHICLE_STATUS_OPTIONS = ["Active", "Due Soon", "Overdue", "Paid"];
const CURRENCY_OPTIONS = ["KM", "EUR", "USD"];

function defaultForm() {
  return {
    vehicleName: "",
    licencePlate: "",
    registrationNumber: "",
    amount: "",
    currency: "KM",
    dueDate: "",
    paidDate: "",
    status: "Due Soon",
    notes: ""
  };
}

function VehicleRegistrationManager({ selectedPropertyId }) {
  const [registrations, setRegistrations] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const [dialogMode, setDialogMode] = useState("add");
  const [editingId, setEditingId] = useState("");
  const [statusFilter, setStatusFilter] = useState("");
  const [form, setForm] = useState(defaultForm);

  useEffect(() => {
    let isActive = true;

    const loadRegistrations = async () => {
      if (!selectedPropertyId) {
        if (isActive) {
          setRegistrations([]);
          setLoading(false);
        }
        return;
      }

      setLoading(true);
      setError("");
      try {
        const data = await api.getVehicleRegistrations(selectedPropertyId);
        if (isActive) {
          setRegistrations(Array.isArray(data?.registrations) ? data.registrations : []);
        }
      } catch (_error) {
        if (isActive) {
          setError("Failed to load vehicle registrations.");
        }
      } finally {
        if (isActive) {
          setLoading(false);
        }
      }
    };

    loadRegistrations();
    return () => {
      isActive = false;
    };
  }, [selectedPropertyId]);

  const filteredRegistrations = useMemo(() => {
    const nextRegistrations = statusFilter
      ? registrations.filter((item) => item.status === statusFilter)
      : registrations;

    return [...nextRegistrations].sort((a, b) => {
      const left = String(a?.dueDate || "");
      const right = String(b?.dueDate || "");
      if (left !== right) {
        return left.localeCompare(right);
      }
      return String(a?.vehicleName || "").localeCompare(String(b?.vehicleName || ""));
    });
  }, [registrations, statusFilter]);

  const summary = useMemo(() => {
    return registrations.reduce(
      (accumulator, item) => {
        accumulator.total += 1;
        if (item.status === "Paid") {
          accumulator.paid += 1;
        }
        if (item.status === "Due Soon") {
          accumulator.dueSoon += 1;
        }
        if (item.status === "Overdue") {
          accumulator.overdue += 1;
        }
        accumulator.totalAmount += Number(item.amount || 0);
        return accumulator;
      },
      { total: 0, paid: 0, dueSoon: 0, overdue: 0, totalAmount: 0 }
    );
  }, [registrations]);

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

  const openEditDialog = (registration) => {
    setDialogMode("edit");
    setEditingId(registration.id);
    setForm({
      vehicleName: registration.vehicleName || "",
      licencePlate: registration.licencePlate || "",
      registrationNumber: registration.registrationNumber || "",
      amount: String(registration.amount ?? ""),
      currency: registration.currency || "KM",
      dueDate: registration.dueDate || "",
      paidDate: registration.paidDate || "",
      status: registration.status || "Due Soon",
      notes: registration.notes || ""
    });
    setError("");
    setIsDialogOpen(true);
  };

  const saveRegistration = async (event) => {
    event.preventDefault();
    if (!selectedPropertyId) {
      return;
    }

    setError("");
    setIsSaving(true);
    try {
      const payload = {
        propertyId: selectedPropertyId,
        vehicleName: form.vehicleName.trim(),
        licencePlate: form.licencePlate.trim().toUpperCase(),
        registrationNumber: form.registrationNumber.trim(),
        amount: Number(form.amount),
        currency: form.currency,
        dueDate: form.dueDate,
        paidDate: form.paidDate,
        status: form.status,
        notes: form.notes.trim()
      };

      const data =
        dialogMode === "edit"
          ? await api.updateVehicleRegistration(editingId, payload)
          : await api.addVehicleRegistration(payload);

      if (Array.isArray(data?.registrations)) {
        setRegistrations(data.registrations);
      }
      setForm(defaultForm());
      setEditingId("");
      setIsDialogOpen(false);
    } catch (_error) {
      setError(dialogMode === "edit" ? "Failed to update vehicle registration." : "Failed to create vehicle registration.");
    } finally {
      setIsSaving(false);
    }
  };

  const removeRegistration = async (id) => {
    if (!selectedPropertyId) {
      return;
    }

    setError("");
    try {
      const data = await api.deleteVehicleRegistration(id, selectedPropertyId);
      if (Array.isArray(data?.registrations)) {
        setRegistrations(data.registrations);
      }
    } catch (_error) {
      setError("Failed to delete vehicle registration.");
    }
  };

  return (
    <section className="rounded-2xl bg-white p-6 shadow-sm">
      <div className="flex flex-wrap items-end justify-between gap-4">
        <div>
          <h2 className="font-['Manrope',sans-serif] text-2xl font-bold">Vehicle Registration Tracker</h2>
          <p className="mt-1 text-sm text-slate-600">
            Keep renewal details for every vehicle in one place, including plate numbers, due dates, and payment status.
          </p>
        </div>
        <div className="flex flex-wrap items-end gap-3">
          <label className="block">
            <span className="mb-1 block text-xs font-semibold uppercase tracking-wide text-slate-500">Filter status</span>
            <select
              value={statusFilter}
              onChange={(event) => setStatusFilter(event.target.value)}
              className="rounded-lg border border-slate-300 bg-white px-3 py-2 text-sm outline-none ring-cyan-300 focus:border-cyan-400 focus:ring-4"
            >
              <option value="">All statuses</option>
              {VEHICLE_STATUS_OPTIONS.map((status) => (
                <option key={status} value={status}>
                  {status}
                </option>
              ))}
            </select>
          </label>
          <button
            type="button"
            onClick={openAddDialog}
            className="rounded-lg bg-slate-900 px-4 py-2.5 text-sm font-semibold text-white transition hover:bg-slate-800"
          >
            Add Vehicle
          </button>
        </div>
      </div>

      <div className="mt-5 grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
        <StatCard label="Vehicles" value={String(summary.total)} tone="from-sky-50 to-cyan-100" />
        <StatCard label="Due Soon" value={String(summary.dueSoon)} tone="from-amber-50 to-yellow-100" />
        <StatCard label="Overdue" value={String(summary.overdue)} tone="from-rose-50 to-orange-100" />
        <StatCard label="Tracked Value" value={`${summary.totalAmount.toFixed(2)} KM`} tone="from-emerald-50 to-lime-100" />
      </div>

      {loading ? <p className="mt-4 text-sm text-slate-500">Loading vehicle registrations...</p> : null}
      {error ? <p className="mt-4 text-sm text-rose-700">{error}</p> : null}

      <div className="mt-6 overflow-hidden rounded-xl border border-slate-200">
        <table className="w-full border-collapse text-left text-sm">
          <thead className="bg-slate-100 text-slate-600">
            <tr>
              <th className="px-3 py-2 font-semibold">Vehicle</th>
              <th className="px-3 py-2 font-semibold">Plate</th>
              <th className="px-3 py-2 font-semibold">Registration no.</th>
              <th className="px-3 py-2 font-semibold">Due date</th>
              <th className="px-3 py-2 font-semibold">Amount</th>
              <th className="px-3 py-2 font-semibold">Status</th>
              <th className="px-3 py-2 font-semibold">Action</th>
            </tr>
          </thead>
          <tbody>
            {filteredRegistrations.length === 0 ? (
              <tr>
                <td className="px-3 py-4 text-slate-500" colSpan={7}>
                  No vehicle registrations yet.
                </td>
              </tr>
            ) : (
              filteredRegistrations.map((registration) => (
                <tr key={registration.id} className="border-t border-slate-200">
                  <td className="px-3 py-2">
                    <p className="font-medium text-slate-900">{registration.vehicleName}</p>
                    {registration.notes ? <p className="mt-1 text-xs text-slate-500">{registration.notes}</p> : null}
                  </td>
                  <td className="px-3 py-2 font-medium text-slate-900">{registration.licencePlate}</td>
                  <td className="px-3 py-2">{registration.registrationNumber || "-"}</td>
                  <td className="px-3 py-2">
                    <p>{registration.dueDate || "-"}</p>
                    <p className="mt-1 text-xs text-slate-500">Paid: {registration.paidDate || "-"}</p>
                  </td>
                  <td className="px-3 py-2">
                    {Number(registration.amount || 0).toFixed(2)} {registration.currency || "KM"}
                  </td>
                  <td className="px-3 py-2">
                    <span
                      className={`rounded-full px-2.5 py-1 text-xs font-semibold ${
                        registration.status === "Paid"
                          ? "bg-emerald-100 text-emerald-800"
                          : registration.status === "Overdue"
                            ? "bg-rose-100 text-rose-800"
                            : registration.status === "Due Soon"
                              ? "bg-amber-100 text-amber-800"
                              : "bg-sky-100 text-sky-800"
                      }`}
                    >
                      {registration.status}
                    </span>
                  </td>
                  <td className="px-3 py-2">
                    <button
                      type="button"
                      onClick={() => openEditDialog(registration)}
                      className="mr-2 rounded-md border border-slate-300 px-2 py-1 text-xs font-medium text-slate-700 hover:bg-slate-50"
                    >
                      Edit
                    </button>
                    <button
                      type="button"
                      onClick={() => removeRegistration(registration.id)}
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
          <div className="w-full max-w-4xl rounded-2xl bg-white p-6 shadow-xl">
            <div className="flex items-center justify-between">
              <h3 className="font-['Manrope',sans-serif] text-xl font-bold">
                {dialogMode === "edit" ? "Edit Vehicle Registration" : "Add Vehicle Registration"}
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

            <form className="mt-4 grid gap-3 md:grid-cols-2 xl:grid-cols-3" onSubmit={saveRegistration}>
              <label className="block">
                <span className="mb-1 block text-xs font-semibold uppercase tracking-wide text-slate-500">Vehicle name</span>
                <input
                  type="text"
                  value={form.vehicleName}
                  onChange={(event) => onChange("vehicleName", event.target.value)}
                  placeholder="VW Golf"
                  className="w-full rounded-lg border border-slate-300 px-3 py-2 text-sm outline-none ring-cyan-300 focus:border-cyan-400 focus:ring-4"
                />
              </label>

              <label className="block">
                <span className="mb-1 block text-xs font-semibold uppercase tracking-wide text-slate-500">Licence plate</span>
                <input
                  type="text"
                  value={form.licencePlate}
                  onChange={(event) => onChange("licencePlate", event.target.value.toUpperCase())}
                  placeholder="A12-K-345"
                  className="w-full rounded-lg border border-slate-300 px-3 py-2 text-sm uppercase outline-none ring-cyan-300 focus:border-cyan-400 focus:ring-4"
                />
              </label>

              <label className="block">
                <span className="mb-1 block text-xs font-semibold uppercase tracking-wide text-slate-500">Registration number</span>
                <input
                  type="text"
                  value={form.registrationNumber}
                  onChange={(event) => onChange("registrationNumber", event.target.value)}
                  placeholder="Optional"
                  className="w-full rounded-lg border border-slate-300 px-3 py-2 text-sm outline-none ring-cyan-300 focus:border-cyan-400 focus:ring-4"
                />
              </label>

              <label className="block">
                <span className="mb-1 block text-xs font-semibold uppercase tracking-wide text-slate-500">Due date</span>
                <input
                  type="date"
                  value={form.dueDate}
                  onChange={(event) => onChange("dueDate", event.target.value)}
                  className="w-full rounded-lg border border-slate-300 px-3 py-2 text-sm outline-none ring-cyan-300 focus:border-cyan-400 focus:ring-4"
                />
              </label>

              <label className="block">
                <span className="mb-1 block text-xs font-semibold uppercase tracking-wide text-slate-500">Paid date</span>
                <input
                  type="date"
                  value={form.paidDate}
                  onChange={(event) => onChange("paidDate", event.target.value)}
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
                <span className="mb-1 block text-xs font-semibold uppercase tracking-wide text-slate-500">Status</span>
                <select
                  value={form.status}
                  onChange={(event) => onChange("status", event.target.value)}
                  className="w-full rounded-lg border border-slate-300 px-3 py-2 text-sm outline-none ring-cyan-300 focus:border-cyan-400 focus:ring-4"
                >
                  {VEHICLE_STATUS_OPTIONS.map((status) => (
                    <option key={status} value={status}>
                      {status}
                    </option>
                  ))}
                </select>
              </label>

              <label className="block md:col-span-2 xl:col-span-3">
                <span className="mb-1 block text-xs font-semibold uppercase tracking-wide text-slate-500">Notes</span>
                <textarea
                  value={form.notes}
                  onChange={(event) => onChange("notes", event.target.value)}
                  rows={3}
                  placeholder="Insurance bundle, renewal office, reminder details..."
                  className="w-full rounded-lg border border-slate-300 px-3 py-2 text-sm outline-none ring-cyan-300 focus:border-cyan-400 focus:ring-4"
                />
              </label>

              <div className="md:col-span-2 xl:col-span-3">
                <button
                  type="submit"
                  disabled={isSaving}
                  className="rounded-lg bg-cyan-600 px-4 py-2.5 text-sm font-semibold text-white transition hover:bg-cyan-500 disabled:cursor-not-allowed disabled:bg-cyan-300"
                >
                  {isSaving ? "Saving..." : dialogMode === "edit" ? "Save Changes" : "Save Vehicle"}
                </button>
              </div>
            </form>
          </div>
        </div>
      ) : null}
    </section>
  );
}

function StatCard({ label, value, tone }) {
  return (
    <div className={`rounded-2xl bg-gradient-to-br ${tone} p-4 shadow-sm`}>
      <p className="text-xs font-semibold uppercase tracking-wide text-slate-500">{label}</p>
      <p className="mt-2 text-2xl font-bold text-slate-900">{value}</p>
    </div>
  );
}

export default VehicleRegistrationManager;
