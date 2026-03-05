import {Fragment, useEffect, useMemo, useState} from "react";
import {api} from "../lib/api";

const STATUS_OPTIONS = ["Pending", "Paid", "Overdue"];
const CURRENCY_OPTIONS = ["KM", "EUR", "USD"];

function UtilityBillsManager({providers = []}) {
    const [bills, setBills] = useState([]);
    const [selectedMonth, setSelectedMonth] = useState("");
    const [selectedYear, setSelectedYear] = useState(new Date().getFullYear().toString());
    const [selectedProvider, setSelectedProvider] = useState("");
    const [selectedStatuses, setSelectedStatuses] = useState(["Pending", "Overdue"]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState("");
    const [isDialogOpen, setIsDialogOpen] = useState(false);
    const [isImportDialogOpen, setIsImportDialogOpen] = useState(false);
    const [isImporting, setIsImporting] = useState(false);
    const [importMessage, setImportMessage] = useState("");
    const [form, setForm] = useState(() => ({
        provider: "",
        amount: "",
        currency: "KM",
        billDate: "",
        billingMonth: new Date().toISOString().slice(0, 7),
        status: "Pending"
    }));
    const [importForm, setImportForm] = useState(() => ({
        provider: "",
        year: String(new Date().getFullYear()),
        currency: "KM",
        status: "Pending",
        csv: ""
    }));
    const providerNames = useMemo(
        () =>
            providers.map((provider) =>
                typeof provider === "string" ? provider : String(provider?.name || "").trim()
            ).filter(Boolean),
        [providers]
    );
    const yearOptions = useMemo(() => {
        const years = Array.from(
            new Set(
                bills
                    .map((bill) =>
                        typeof bill?.billingMonth === "string" && bill.billingMonth.length >= 4
                            ? bill.billingMonth.slice(0, 4)
                            : ""
                    )
                    .filter(Boolean)
            )
        );
        return years.sort((a, b) => b.localeCompare(a));
    }, [bills]);
    const providerFilterOptions = useMemo(() => {
        const names = Array.from(
            new Set(
                bills
                    .map((bill) => String(bill?.provider || "").trim())
                    .filter(Boolean)
            )
        );
        return names.sort((a, b) => a.localeCompare(b));
    }, [bills]);

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
        let list = bills;
        if (selectedYear) {
            list = list.filter((bill) => String(bill?.billingMonth || "").startsWith(`${selectedYear}-`));
        }
        if (selectedProvider) {
            list = list.filter((bill) => String(bill?.provider || "") === selectedProvider);
        }
        if (selectedMonth) {
            list = list.filter((bill) => bill.billingMonth === selectedMonth);
        }
        if (selectedStatuses.length > 0) {
            list = list.filter((bill) => selectedStatuses.includes(String(bill?.status || "")));
        }
        return [...list].sort((a, b) => b.billDate.localeCompare(a.billDate));
    }, [bills, selectedMonth, selectedProvider, selectedStatuses, selectedYear]);

    const groupedBillsByMonth = useMemo(() => {
        const grouped = filteredBills.reduce((accumulator, bill) => {
            const monthKey = String(bill?.billingMonth || "Unknown month");
            if (!accumulator[monthKey]) {
                accumulator[monthKey] = [];
            }
            accumulator[monthKey].push(bill);
            return accumulator;
        }, {});

        return Object.entries(grouped).sort(([leftMonth], [rightMonth]) => rightMonth.localeCompare(leftMonth));
    }, [filteredBills]);

    const totalAmount = useMemo(
        () => filteredBills.reduce((sum, bill) => sum + Number(bill.amount || 0), 0),
        [filteredBills]
    );
    const totalCurrencyLabel = useMemo(() => {
        const currencies = Array.from(new Set(filteredBills.map((bill) => bill.currency || "KM")));
        return currencies.length === 1 ? currencies[0] : "mixed";
    }, [filteredBills]);

    const paidCount = filteredBills.filter((bill) => bill.status === "Paid").length;
    const pendingCount = filteredBills.filter((bill) => bill.status === "Pending").length;
    const overdueCount = filteredBills.filter((bill) => bill.status === "Overdue").length;

    const onChange = (field, value) => {
        setForm((current) => ({...current, [field]: value}));
    };

    const toggleStatusFilter = (status) => {
        setSelectedStatuses((current) =>
            current.includes(status)
                ? current.filter((item) => item !== status)
                : [...current, status]
        );
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
                currency: form.currency,
                billDate: form.billDate,
                billingMonth: form.billingMonth,
                status: form.status
            });
            if (Array.isArray(data?.bills)) {
                setBills(data.bills);
            } else if (data?.bill) {
                setBills((current) => [data.bill, ...current]);
            }
            setForm((current) => ({
                ...current,
                provider: "",
                amount: "",
                currency: current.currency || "KM",
                billDate: "",
                status: "Pending"
            }));
            setIsDialogOpen(false);
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

    const importBills = async (event) => {
        event.preventDefault();
        setError("");
        setImportMessage("");
        const provider = importForm.provider.trim();
        const year = importForm.year.trim();
        const csv = importForm.csv.trim();
        if (!provider || !year || !csv) {
            setError("Provider, year, and CSV values are required for import.");
            return;
        }

        setIsImporting(true);
        try {
            const data = await api.importBillsCsv({
                provider,
                year,
                currency: importForm.currency,
                status: importForm.status,
                csv
            });
            if (Array.isArray(data?.bills)) {
                setBills(data.bills);
            }
            setImportMessage(`Imported ${Number(data?.insertedCount || 0)} bills.`);
            setImportForm((current) => ({...current, csv: ""}));
            setIsImportDialogOpen(false);
        } catch (_error) {
            setError("Failed to import bills from CSV.");
        } finally {
            setIsImporting(false);
        }
    };

    function mapToStatusClass(status) {
        switch (status) {
            case "Paid":
                return " bg-emerald-50";
            case "Pending":
                return " bg-yellow-50";
            case "Overdue":
                return " bg-rose-50";
            default:
                return "";
        }
    }

    function formatBillingMonthLabel(value) {
        if (!/^\d{4}-\d{2}$/.test(value)) {
            return value;
        }
        const [year, month] = value.split("-");
        const date = new Date(Number(year), Number(month) - 1, 1);
        return date.toLocaleDateString("en-US", {month: "long", year: "numeric"});
    }

    return (
        <section className="rounded-2xl bg-white p-6 shadow-sm">
            <div className="flex flex-wrap items-end justify-between gap-4">
                <div>
                    <h2 className="font-['Manrope',sans-serif] text-2xl font-bold">Monthly Utility Bills</h2>
                    <p className="mt-1 text-sm text-slate-600">Track invoices from email by provider, amount, date, and
                        status.</p>
                </div>
                <div className="flex flex-wrap items-end gap-3">
                    <label className="block">
                        <span className="mb-1 block text-xs font-semibold uppercase tracking-wide text-slate-500">Filter provider</span>
                        <select
                            value={selectedProvider}
                            onChange={(event) => setSelectedProvider(event.target.value)}
                            className="rounded-lg border border-slate-300 bg-white px-3 py-2 text-sm outline-none ring-cyan-300 focus:border-cyan-400 focus:ring-4"
                        >
                            <option value="">All providers</option>
                            {providerFilterOptions.map((provider) => (
                                <option key={provider} value={provider}>
                                    {provider}
                                </option>
                            ))}
                        </select>
                    </label>
                    <label className="block">
                        <span className="mb-1 block text-xs font-semibold uppercase tracking-wide text-slate-500">Filter year</span>
                        <select
                            value={selectedYear}
                            onChange={(event) => {
                                setSelectedYear(event.target.value);
                                setSelectedMonth("");
                            }}
                            className="rounded-lg border border-slate-300 bg-white px-3 py-2 text-sm outline-none ring-cyan-300 focus:border-cyan-400 focus:ring-4"
                        >
                            <option value="">All years</option>
                            {yearOptions.map((year) => (
                                <option key={year} value={year}>
                                    {year}
                                </option>
                            ))}
                        </select>
                    </label>
                    <label className="block">
                        <span className="mb-1 block text-xs font-semibold uppercase tracking-wide text-slate-500">Filter month</span>
                        <input
                            type="month"
                            value={selectedMonth}
                            onChange={(event) => {
                                const month = event.target.value;
                                setSelectedMonth(month);
                                if (month) {
                                    setSelectedYear(month.slice(0, 4));
                                }
                            }}
                            className="rounded-lg border border-slate-300 px-3 py-2 text-sm outline-none ring-cyan-300 focus:border-cyan-400 focus:ring-4"
                        />
                    </label>
                    <label className="block">
                        <span className="mb-1 block text-xs font-semibold uppercase tracking-wide text-slate-500">Filter status</span>
                        <div
                            className="flex min-w-[220px] flex-wrap gap-2 rounded-lg border border-slate-300 bg-white px-3 py-2">
                            {STATUS_OPTIONS.map((status) => {
                                const isChecked = selectedStatuses.includes(status);
                                return (
                                    <label key={status} className="flex items-center gap-1 text-xs text-slate-700">
                                        <input
                                            type="checkbox"
                                            checked={isChecked}
                                            onChange={() => toggleStatusFilter(status)}
                                            className="h-3.5 w-3.5 rounded border-slate-300"
                                        />
                                        <span>{status}</span>
                                    </label>
                                );
                            })}
                        </div>
                    </label>
                    <button
                        type="button"
                        onClick={() => setSelectedStatuses([...STATUS_OPTIONS])}
                        className="rounded-lg border border-slate-300 bg-white px-3 py-2 text-xs font-semibold text-slate-700 hover:bg-slate-50"
                    >
                        All statuses
                    </button>
                    <button
                        type="button"
                        onClick={() => {
                            setError("");
                            setIsDialogOpen(true);
                        }}
                        className="rounded-lg bg-slate-900 px-4 py-2.5 text-sm font-semibold text-white transition hover:bg-slate-800"
                    >
                        Add Bill
                    </button>
                    <button
                        type="button"
                        onClick={() => {
                            setError("");
                            setImportMessage("");
                            setIsImportDialogOpen(true);
                        }}
                        className="rounded-lg border border-slate-300 bg-white px-4 py-2.5 text-sm font-semibold text-slate-800 transition hover:bg-slate-50"
                    >
                        Import CSV Bills
                    </button>
                </div>
            </div>

            <div className="mt-5 grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
                <Stat label="Bills" value={String(filteredBills.length)}/>
                <Stat label="Paid" value={String(paidCount)}/>
                <Stat label="Pending" value={String(pendingCount)}/>
                <Stat label="Overdue" value={String(overdueCount)}/>
            </div>
            <p className="mt-3 text-sm text-slate-700">
                Total amount: <strong>{totalAmount.toFixed(2)} {totalCurrencyLabel}</strong>
            </p>
            {loading ? <p className="mt-2 text-sm text-slate-500">Loading bills...</p> : null}
            {error ? <p className="mt-2 text-sm text-rose-700">{error}</p> : null}
            {importMessage ? <p className="mt-2 text-sm text-emerald-700">{importMessage}</p> : null}

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
                                No bills found for selected filters.
                            </td>
                        </tr>
                    ) : (
                        groupedBillsByMonth.map(([monthKey, monthBills]) => (
                            <Fragment key={monthKey}>
                                <tr className="border-t border-slate-300 bg-slate-50">
                                    <td className="px-3 py-2 font-semibold text-slate-800" colSpan={6}>
                                        <div className="flex items-center justify-between gap-2">
                                            <span>{formatBillingMonthLabel(monthKey)}</span>
                                            <span
                                                className="text-xs font-medium text-slate-500">{monthBills.length} bills</span>
                                        </div>
                                    </td>
                                </tr>
                                {monthBills.map((bill) => (
                                    <tr key={bill.id}
                                        className={"border-t border-slate-200" + mapToStatusClass(bill.status)}>
                                        <td className="px-3 py-2">

                                            {bill.logo ? <img
                                                src={bill.logo}
                                                alt={bill.provider + " logo"}
                                                className="h-8 w-8 rounded object-contain"/> : null}

                                            {bill.provider}</td>
                                        <td className="px-3 py-2">
                                            {Number(bill.amount).toFixed(2)} {bill.currency || "KM"}
                                        </td>
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
                                ))}
                            </Fragment>
                        ))
                    )}
                    </tbody>
                </table>
            </div>

            {isDialogOpen ? (
                <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/50 p-4">
                    <div className="w-full max-w-3xl rounded-2xl bg-white p-6 shadow-xl">
                        <div className="flex items-center justify-between">
                            <h3 className="font-['Manrope',sans-serif] text-xl font-bold">Add Bill</h3>
                            <button
                                type="button"
                                onClick={() => {
                                    setIsDialogOpen(false);
                                    setError("");
                                }}
                                className="rounded-md border border-slate-300 px-2 py-1 text-xs font-semibold text-slate-700 hover:bg-slate-50"
                            >
                                Close
                            </button>
                        </div>

                        <form className="mt-4 grid gap-3 md:grid-cols-2 xl:grid-cols-6" onSubmit={addBill}>
                            <label className="block">
                                <span
                                    className="mb-1 block text-xs font-semibold uppercase tracking-wide text-slate-500">Provider</span>
                                <input
                                    list="provider-suggestions"
                                    value={form.provider}
                                    onChange={(event) => onChange("provider", event.target.value)}
                                    placeholder="Electricity"
                                    className="w-full rounded-lg border border-slate-300 px-3 py-2 text-sm outline-none ring-cyan-300 focus:border-cyan-400 focus:ring-4"
                                />
                                <datalist id="provider-suggestions">
                                    {providerNames.map((provider) => (
                                        <option key={provider} value={provider}/>
                                    ))}
                                </datalist>
                            </label>

                            <label className="block">
                                <span
                                    className="mb-1 block text-xs font-semibold uppercase tracking-wide text-slate-500">Amount</span>
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
                            <label className="block hidden">
                                <span
                                    className="mb-1 block text-xs font-semibold uppercase tracking-wide text-slate-500">Currency</span>
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
                                <span
                                    className="mb-1 block text-xs font-semibold uppercase tracking-wide text-slate-500">Bill date</span>
                                <input
                                    type="date"
                                    value={form.billDate}
                                    onChange={(event) => onChange("billDate", event.target.value)}
                                    className="w-full rounded-lg border border-slate-300 px-3 py-2 text-sm outline-none ring-cyan-300 focus:border-cyan-400 focus:ring-4"
                                />
                            </label>

                            <label className="block">
                                <span
                                    className="mb-1 block text-xs font-semibold uppercase tracking-wide text-slate-500">Month</span>
                                <input
                                    type="month"
                                    value={form.billingMonth}
                                    onChange={(event) => onChange("billingMonth", event.target.value)}
                                    className="w-full rounded-lg border border-slate-300 px-3 py-2 text-sm outline-none ring-cyan-300 focus:border-cyan-400 focus:ring-4"
                                />
                            </label>

                            <label className="block">
                                <span
                                    className="mb-1 block text-xs font-semibold uppercase tracking-wide text-slate-500">Status</span>
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
                                className="md:col-span-2 xl:col-span-6 rounded-lg bg-slate-900 px-4 py-2.5 text-sm font-semibold text-white transition hover:bg-slate-800"
                            >
                                Save Bill
                            </button>
                        </form>
                    </div>
                </div>
            ) : null}

            {isImportDialogOpen ? (
                <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/50 p-4">
                    <div className="w-full max-w-3xl rounded-2xl bg-white p-6 shadow-xl">
                        <div className="flex items-center justify-between">
                            <h3 className="font-['Manrope',sans-serif] text-xl font-bold">Import Bills from CSV</h3>
                            <button
                                type="button"
                                onClick={() => {
                                    setIsImportDialogOpen(false);
                                    setError("");
                                }}
                                className="rounded-md border border-slate-300 px-2 py-1 text-xs font-semibold text-slate-700 hover:bg-slate-50"
                            >
                                Close
                            </button>
                        </div>
                        <p className="mt-2 text-sm text-slate-600">
                            Pick one provider and year. Enter one amount per line. Values are assigned from January
                            onward.
                            Example:
                            <span className="whitespace-pre-line font-semibold">{"\n100 KM\n24 KM\n35 KM"}</span>
                        </p>

                        <form className="mt-4 grid gap-3 md:grid-cols-2" onSubmit={importBills}>
                            <label className="block">
                                <span
                                    className="mb-1 block text-xs font-semibold uppercase tracking-wide text-slate-500">Provider</span>
                                <input
                                    list="provider-import-suggestions"
                                    value={importForm.provider}
                                    onChange={(event) => onImportChange("provider", event.target.value)}
                                    placeholder="Electricity"
                                    className="w-full rounded-lg border border-slate-300 px-3 py-2 text-sm outline-none ring-cyan-300 focus:border-cyan-400 focus:ring-4"
                                />
                                <datalist id="provider-import-suggestions">
                                    {providerNames.map((provider) => (
                                        <option key={provider} value={provider}/>
                                    ))}
                                </datalist>
                            </label>

                            <label className="block">
                                <span
                                    className="mb-1 block text-xs font-semibold uppercase tracking-wide text-slate-500">Year</span>
                                <input
                                    type="number"
                                    min="2000"
                                    max="2100"
                                    value={importForm.year}
                                    onChange={(event) => onImportChange("year", event.target.value)}
                                    className="w-full rounded-lg border border-slate-300 px-3 py-2 text-sm outline-none ring-cyan-300 focus:border-cyan-400 focus:ring-4"
                                />
                            </label>

                            <label className="hidden md:col-span-2">
                                <span
                                    className="mb-1 block text-xs font-semibold uppercase tracking-wide text-slate-500">Currency</span>
                                <select
                                    value={importForm.currency}
                                    onChange={(event) => onImportChange("currency", event.target.value)}
                                    className="w-full rounded-lg border border-slate-300 px-3 py-2 text-sm outline-none ring-cyan-300 focus:border-cyan-400 focus:ring-4"
                                >
                                    {CURRENCY_OPTIONS.map((currency) => (
                                        <option key={currency} value={currency}>
                                            {currency}
                                        </option>
                                    ))}
                                </select>
                            </label>

                            <label className="block md:col-span-2">
                                <span
                                    className="mb-1 block text-xs font-semibold uppercase tracking-wide text-slate-500">Status</span>
                                <select
                                    value={importForm.status}
                                    onChange={(event) => onImportChange("status", event.target.value)}
                                    className="w-full rounded-lg border border-slate-300 px-3 py-2 text-sm outline-none ring-cyan-300 focus:border-cyan-400 focus:ring-4"
                                >
                                    {STATUS_OPTIONS.map((status) => (
                                        <option key={status} value={status}>
                                            {status}
                                        </option>
                                    ))}
                                </select>
                            </label>

                            <label className="block md:col-span-2">
                                <span
                                    className="mb-1 block text-xs font-semibold uppercase tracking-wide text-slate-500">Amounts (One Per Line)</span>
                                <textarea
                                    value={importForm.csv}
                                    onChange={(event) => onImportChange("csv", event.target.value)}
                                    rows={4}
                                    placeholder={"100 KM\n24 KM\n35 KM"}
                                    className="w-full rounded-lg border border-slate-300 px-3 py-2 text-sm outline-none ring-cyan-300 focus:border-cyan-400 focus:ring-4"
                                />
                            </label>

                            <button
                                type="submit"
                                disabled={isImporting}
                                className="md:col-span-2 rounded-lg bg-slate-900 px-4 py-2.5 text-sm font-semibold text-white transition hover:bg-slate-800 disabled:cursor-not-allowed disabled:opacity-70"
                            >
                                {isImporting ? "Importing..." : "Import Bills"}
                            </button>
                        </form>
                    </div>
                </div>
            ) : null}
        </section>
    );
}

function Stat({label, value}) {
    return (
        <div className="rounded-xl border border-slate-200 bg-slate-50 p-3">
            <p className="text-xs uppercase tracking-wide text-slate-500">{label}</p>
            <p className="mt-1 text-2xl font-bold text-slate-900">{value}</p>
        </div>
    );
}

export default UtilityBillsManager;
