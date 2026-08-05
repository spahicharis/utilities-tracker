import {useMemo} from "react";

function UtilityBillsMatrix({bills = []}) {
    const currentYear = new Date().getFullYear();
    const matrix = useMemo(() => {
        const yearPrefix = `${currentYear}-`;
        const yearBills = bills.filter((bill) => String(bill?.billingMonth || "").startsWith(yearPrefix));
        const providers = Array.from(
            new Set(yearBills.map((bill) => String(bill?.provider || "").trim()).filter(Boolean))
        ).sort((left, right) => left.localeCompare(right));
        const months = Array.from({length: 12}, (_, index) => {
            const month = String(index + 1).padStart(2, "0");
            return {
                key: `${currentYear}-${month}`,
                label: new Date(currentYear, index, 1).toLocaleDateString("en-US", {month: "short"})
            };
        });
        const billsByMonthAndProvider = yearBills.reduce((result, bill) => {
            const key = `${bill.billingMonth}|${String(bill.provider || "").trim()}`;
            result[key] = result[key] || [];
            result[key].push(bill);
            return result;
        }, {});

        return {providers, months, billsByMonthAndProvider};
    }, [bills, currentYear]);

    return (
        <div className="overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-sm">
            <div className="flex flex-wrap items-center justify-between gap-3 border-b border-slate-200 bg-slate-50 px-4 py-3">
                <div>
                    <h2 className="font-['Manrope',sans-serif] text-xl font-bold">{currentYear} payment matrix</h2>
                    <p className="mt-1 text-xs text-slate-500">Monthly bill amounts by utility provider.</p>
                </div>
                <div className="flex flex-wrap items-center gap-3 text-xs text-slate-600" aria-label="Payment status legend">
                    <span className="flex items-center gap-1.5"><span className="h-3 w-3 rounded-sm bg-emerald-500"/>Paid</span>
                    <span className="flex items-center gap-1.5"><span className="h-3 w-3 rounded-sm bg-yellow-300"/>Pending</span>
                    <span className="flex items-center gap-1.5"><span className="h-3 w-3 rounded-sm bg-slate-200"/>Overdue / missing</span>
                </div>
            </div>
            <div className="overflow-x-auto">
                <table className="min-w-full border-collapse text-center text-sm">
                    <thead className="bg-white text-slate-600">
                    <tr>
                        <th className="sticky left-0 z-10 min-w-24 border-b border-r border-slate-200 bg-white px-4 py-3 text-left font-semibold">Month</th>
                        {matrix.providers.map((provider) => (
                            <th key={provider} className="min-w-32 border-b border-slate-200 px-4 py-3 font-semibold">{provider}</th>
                        ))}
                    </tr>
                    </thead>
                    <tbody>
                    {matrix.months.map((month) => (
                        <tr key={month.key} className="border-b border-slate-100 last:border-b-0">
                            <th className="sticky left-0 z-10 border-r border-slate-200 bg-white px-4 py-3 text-left font-medium text-slate-700">{month.label}</th>
                            {matrix.providers.map((provider) => {
                                const matchingBills = matrix.billsByMonthAndProvider[`${month.key}|${provider}`] || [];
                                const isPaid = matchingBills.some((bill) => bill.status === "Paid");
                                const isPending = !isPaid && matchingBills.some((bill) => bill.status === "Pending");
                                const statusLabel = isPaid ? "paid" : isPending ? "pending" : matchingBills.length ? "overdue" : "no bill";
                                const amountLabel = matchingBills.length
                                    ? matchingBills.map((bill) => `${Number(bill.amount || 0).toFixed(2)} ${bill.currency || "KM"}`).join(" / ")
                                    : "No bill";
                                const cellLabel = `${provider}, ${month.label}: ${amountLabel}, ${statusLabel}`;
                                return (
                                    <td key={provider} className="border-l border-slate-100 px-2 py-2">
                                        <div
                                            title={cellLabel}
                                            aria-label={cellLabel}
                                            className={`mx-auto flex h-8 w-full max-w-24 items-center justify-center rounded-md border border-slate-200 px-1 text-xs font-medium text-slate-700 ${isPaid ? "bg-emerald-500" : isPending ? "bg-yellow-300" : "bg-slate-200"}`}
                                        >
                                            {matchingBills.length ? amountLabel : "-"}
                                        </div>
                                    </td>
                                );
                            })}
                        </tr>
                    ))}
                    </tbody>
                </table>
            </div>
            {matrix.providers.length === 0 ? (
                <p className="border-t border-slate-200 px-4 py-4 text-sm text-slate-500">No bills recorded for {currentYear}.</p>
            ) : null}
        </div>
    );
}

export default UtilityBillsMatrix;
