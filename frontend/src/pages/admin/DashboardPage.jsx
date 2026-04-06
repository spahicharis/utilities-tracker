import { useEffect, useMemo, useState } from "react";
import { TRACKING_START_YEAR } from "../../lib/billingConfig";
import { api } from "../../lib/api";
import dashboard3dImage from "../../assets/dashboard-3d.svg";
import { useOutletContext } from "react-router-dom";

const STATUS_OPTIONS = [
  { key: "paid", label: "Paid", color: "bg-emerald-500", hex: "#10b981" },
  { key: "pending", label: "Pending", color: "bg-amber-500", hex: "#f59e0b" },
  { key: "overdue", label: "Overdue", color: "bg-rose-500", hex: "#f43f5e" }
];

function DashboardPage() {
  const currentYear = new Date().getFullYear();
  const { selectedPropertyId, selectedPropertyName } = useOutletContext();
  const [selectedYear, setSelectedYear] = useState(String(currentYear));
  const [data, setData] = useState({
    trackingStartYear: TRACKING_START_YEAR,
    years: [],
    cards: { total: 0, count: 0, paid: 0, pending: 0, overdue: 0, paidRate: 0 },
    yearlyTotals: [],
    statusSplit: { paid: 0, pending: 0, overdue: 0 },
    topProviders: [],
    unpaidBills: [],
    vehicleRegistrations: {
      summary: { total: 0, paid: 0, dueSoon: 0, overdue: 0 },
      upcoming: []
    }
  });
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  useEffect(() => {
    let isActive = true;

    const loadDashboard = async () => {
      setLoading(true);
      setError("");
      try {
        const payload = await api.getDashboard(selectedYear, selectedPropertyId);
        if (!isActive) {
          return;
        }
        setData({
          trackingStartYear: payload?.trackingStartYear ?? TRACKING_START_YEAR,
          years: Array.isArray(payload?.years) ? payload.years : [],
          cards: payload?.cards ?? { total: 0, count: 0, paid: 0, pending: 0, overdue: 0, paidRate: 0 },
          yearlyTotals: Array.isArray(payload?.yearlyTotals) ? payload.yearlyTotals : [],
          statusSplit: payload?.statusSplit ?? { paid: 0, pending: 0, overdue: 0 },
          topProviders: Array.isArray(payload?.topProviders) ? payload.topProviders : [],
          unpaidBills: Array.isArray(payload?.unpaidBills) ? payload.unpaidBills : [],
          vehicleRegistrations: {
            summary: payload?.vehicleRegistrations?.summary ?? { total: 0, paid: 0, dueSoon: 0, overdue: 0 },
            upcoming: Array.isArray(payload?.vehicleRegistrations?.upcoming) ? payload.vehicleRegistrations.upcoming : []
          }
        });
      } catch (_error) {
        if (isActive) {
          setError("Failed to load dashboard analytics.");
        }
      } finally {
        if (isActive) {
          setLoading(false);
        }
      }
    };

    loadDashboard();
    return () => {
      isActive = false;
    };
  }, [selectedPropertyId, selectedYear]);

  const years = data.years.length ? data.years : [String(currentYear)];
  const yearlySeries = data.yearlyTotals;
  const maxYearAmount = Math.max(...yearlySeries.map((item) => Number(item.total || 0)), 1);
  const chartWidth = 760;
  const chartHeight = 260;
  const chartPadding = { top: 20, right: 18, bottom: 34, left: 44 };
  const chartInnerWidth = chartWidth - chartPadding.left - chartPadding.right;
  const chartInnerHeight = chartHeight - chartPadding.top - chartPadding.bottom;
  const yearTrendPoints = yearlySeries.map((item, index) => {
    const x =
      yearlySeries.length > 1 ? chartPadding.left + (index / (yearlySeries.length - 1)) * chartInnerWidth : chartPadding.left + chartInnerWidth / 2;
    const value = Number(item.total || 0);
    const y = chartPadding.top + chartInnerHeight - (value / maxYearAmount) * chartInnerHeight;
    return { x, y, label: item.year, value };
  });
  const yearTrendPath = yearTrendPoints.map((point, index) => `${index === 0 ? "M" : "L"} ${point.x} ${point.y}`).join(" ");
  const providerBreakdown = data.topProviders;
  const statusSegments = STATUS_OPTIONS.map((status) => {
    const count = Number(data.statusSplit[status.key] || 0);
    const percent = data.cards.count > 0 ? (count / data.cards.count) * 100 : 0;
    return { ...status, count, percent };
  });
  const statusPieGradient = (() => {
    if (data.cards.count <= 0) {
      return "conic-gradient(#e2e8f0 0deg 360deg)";
    }
    let current = 0;
    const parts = statusSegments.map((segment) => {
      const start = current;
      const end = current + segment.percent * 3.6;
      current = end;
      return `${segment.hex} ${start}deg ${end}deg`;
    });
    return `conic-gradient(${parts.join(", ")})`;
  })();
  const providerPalette = ["#4f46e5", "#0ea5e9", "#22c55e", "#f59e0b", "#f97316", "#ef4444"];
  const providerSegments = providerBreakdown.map((item, index) => {
    const amount = Number(item.amount || 0);
    const percent = data.cards.total > 0 ? (amount / Number(data.cards.total || 0)) * 100 : 0;
    return {
      provider: item.provider,
      amount,
      percent,
      color: providerPalette[index % providerPalette.length]
    };
  });
  const providerPieGradient = (() => {
    if (providerSegments.length === 0 || data.cards.total <= 0) {
      return "conic-gradient(#e2e8f0 0deg 360deg)";
    }
    let current = 0;
    const parts = providerSegments.map((segment) => {
      const start = current;
      const end = current + segment.percent * 3.6;
      current = end;
      return `${segment.color} ${start}deg ${end}deg`;
    });
    return `conic-gradient(${parts.join(", ")})`;
  })();

  const unpaidBillsByMonth = useMemo(() => {
    const grouped = data.unpaidBills.reduce((accumulator, bill) => {
      const monthKey = String(bill?.billingMonth || "Unknown month");
      if (!accumulator[monthKey]) {
        accumulator[monthKey] = [];
      }
      accumulator[monthKey].push(bill);
      return accumulator;
    }, {});

    return Object.entries(grouped).sort(([leftMonth], [rightMonth]) => rightMonth.localeCompare(leftMonth));
  }, [data.unpaidBills]);

  const formatBillingMonthLabel = (value) => {
    if (!/^\d{4}-\d{2}$/.test(value)) {
      return value;
    }
    const [year, month] = value.split("-");
    const date = new Date(Number(year), Number(month) - 1, 1);
    return date.toLocaleDateString("en-US", { month: "long", year: "numeric" });
  };

  return (
    <>
      <div className="rounded-2xl bg-white p-6 shadow-sm">
        <div className="flex flex-wrap items-end justify-between gap-4">
          <div>
            <p className="text-sm text-slate-500">Analytics</p>
            <h1 className="mt-1 font-['Manrope',sans-serif] text-3xl font-bold">Dashboard</h1>
            <p className="mt-2 text-sm text-slate-600">
              Year-based view of your utility spending history from {data.trackingStartYear} to {currentYear}.
            </p>
            <p className="mt-2 text-xs font-semibold uppercase tracking-wide text-cyan-700">
              Active property: {selectedPropertyName || "-"}
            </p>
          </div>

          <label>
            <span className="mb-1 block text-xs font-semibold uppercase tracking-wide text-slate-500">Year</span>
            <select
              value={selectedYear}
              onChange={(event) => setSelectedYear(event.target.value)}
              className="rounded-lg border border-slate-300 px-3 py-2 text-sm outline-none ring-cyan-300 focus:border-cyan-400 focus:ring-4"
            >
              {years.map((year) => (
                <option key={year} value={year}>
                  {year}
                </option>
              ))}
            </select>
          </label>
        </div>
      </div>

      <section className="rounded-2xl bg-white p-6 shadow-sm">
        <div className="flex items-center justify-between gap-2">
          <h2 className="font-['Manrope',sans-serif] text-xl font-bold">Unpaid Bills ({selectedYear})</h2>
          <span className="rounded-full bg-slate-100 px-3 py-1 text-xs font-semibold text-slate-700">
            {data.unpaidBills.length} open
          </span>
        </div>
        <p className="mt-1 text-sm text-slate-600">Pending and overdue bills that still need action.</p>

        {data.unpaidBills.length === 0 ? (
            <p className="mt-4 text-sm text-slate-500">No unpaid bills for this year.</p>
        ) : (
            <div className="mt-4 space-y-5">
              {unpaidBillsByMonth.map(([monthKey, monthBills]) => (
                <div key={monthKey}>
                  <div className="mb-3 flex items-center justify-between">
                    <h3 className="text-sm font-semibold text-slate-700">{formatBillingMonthLabel(monthKey)}</h3>
                    <span className="text-xs text-slate-500">{monthBills.length} bills</span>
                  </div>
                  <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-3">
                    {monthBills.map((bill) => {
                      const isOverdue = bill.status === "Overdue";
                      const cardStyle = isOverdue
                          ? "border-rose-200 bg-gradient-to-br from-rose-50 via-rose-100 to-white"
                          : "border-amber-200 bg-gradient-to-br from-amber-50 via-yellow-50 to-white";
                      const badgeStyle = isOverdue
                          ? "bg-rose-600 text-white"
                          : "bg-amber-500 text-amber-950";
                      return (
                          <article key={bill.id} className={`rounded-xl border p-4 shadow-sm ${cardStyle}`}>
                            <div className="flex items-start justify-between gap-2">
                              <h3 className="font-semibold text-slate-900">{bill.provider || "Unknown provider"}</h3>
                              <span className={`rounded-full px-2.5 py-1 text-xs font-semibold ${badgeStyle}`}>
                            {bill.status}
                          </span>
                            </div>
                            <p className="mt-2 text-2xl font-bold text-slate-900">
                              {Number(bill.amount || 0).toFixed(2)} {bill.currency || "KM"}
                            </p>
                            <p className="mt-1 text-xs text-slate-700">Billing month: {bill.billingMonth || "-"}</p>
                            <p className="mt-1 text-xs text-slate-700">Bill date: {bill.billDate || "-"}</p>
                          </article>
                      );
                    })}
                  </div>
                </div>
              ))}
            </div>
        )}
      </section>


      <section className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
        <MetricCard
          label={`${selectedYear} Total`}
          value={`${Number(data.cards.total || 0).toFixed(2)} KM`}
          hint={`${data.cards.count || 0} bills`}
        />
        <MetricCard
          label="Paid Rate"
          value={`${data.cards.paidRate || 0}%`}
          hint={`${data.cards.paid || 0} paid / ${data.cards.count || 0} total`}
        />
        <MetricCard label="Pending Bills" value={String(data.cards.pending || 0)} hint="Needs payment follow-up" />
        <MetricCard label="Overdue Bills" value={String(data.cards.overdue || 0)} hint="High-priority items" />
      </section>
      {loading ? <p className="text-sm text-slate-500">Loading dashboard...</p> : null}
      {error ? <p className="text-sm text-rose-700">{error}</p> : null}

      <section className="rounded-2xl bg-white p-6 shadow-sm">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div>
            <h2 className="font-['Manrope',sans-serif] text-xl font-bold">Vehicle Registrations</h2>
            <p className="mt-1 text-sm text-slate-600">Upcoming renewals and overdue registrations across your tracked vehicles.</p>
          </div>
          <span className="rounded-full bg-slate-100 px-3 py-1 text-xs font-semibold text-slate-700">
            {data.vehicleRegistrations.summary.total} vehicles
          </span>
        </div>

        <div className="mt-5 grid gap-3 sm:grid-cols-3">
          <MetricCard
            label="Due Soon"
            value={String(data.vehicleRegistrations.summary.dueSoon || 0)}
            hint="Renewals that need attention"
          />
          <MetricCard
            label="Overdue"
            value={String(data.vehicleRegistrations.summary.overdue || 0)}
            hint="Past due registrations"
          />
          <MetricCard
            label="Paid"
            value={String(data.vehicleRegistrations.summary.paid || 0)}
            hint="Renewals completed"
          />
        </div>

        {data.vehicleRegistrations.upcoming.length === 0 ? (
          <p className="mt-4 text-sm text-slate-500">No due-soon or overdue vehicle registrations right now.</p>
        ) : (
          <div className="mt-4 grid gap-3 sm:grid-cols-2 xl:grid-cols-3">
            {data.vehicleRegistrations.upcoming.map((registration) => {
              const isOverdue = registration.status === "Overdue";
              return (
                <article
                  key={registration.id}
                  className={`rounded-xl border p-4 shadow-sm ${
                    isOverdue
                      ? "border-rose-200 bg-gradient-to-br from-rose-50 via-rose-100 to-white"
                      : "border-amber-200 bg-gradient-to-br from-amber-50 via-yellow-50 to-white"
                  }`}
                >
                  <div className="flex items-start justify-between gap-2">
                    <div>
                      <h3 className="font-semibold text-slate-900">{registration.vehicleName}</h3>
                      <p className="mt-1 text-xs font-medium uppercase tracking-wide text-slate-500">{registration.licencePlate}</p>
                    </div>
                    <span
                      className={`rounded-full px-2.5 py-1 text-xs font-semibold ${
                        isOverdue ? "bg-rose-600 text-white" : "bg-amber-500 text-amber-950"
                      }`}
                    >
                      {registration.status}
                    </span>
                  </div>
                  <p className="mt-3 text-2xl font-bold text-slate-900">
                    {Number(registration.amount || 0).toFixed(2)} {registration.currency || "KM"}
                  </p>
                  <p className="mt-1 text-xs text-slate-700">Due date: {registration.dueDate || "-"}</p>
                </article>
              );
            })}
          </div>
        )}
      </section>

      <section className="rounded-2xl bg-white p-6 shadow-sm">
        <h2 className="font-['Manrope',sans-serif] text-xl font-bold">Yearly Spend Trend</h2>
        <p className="mt-1 text-sm text-slate-600">Total bill amounts by year.</p>
        {yearlySeries.length === 0 ? (
          <p className="mt-4 text-sm text-slate-500">No yearly data available yet.</p>
        ) : (
          <div className="mt-5">
            <svg viewBox={`0 0 ${chartWidth} ${chartHeight}`} className="h-72 w-full">
              <line
                x1={chartPadding.left}
                y1={chartPadding.top + chartInnerHeight}
                x2={chartPadding.left + chartInnerWidth}
                y2={chartPadding.top + chartInnerHeight}
                stroke="#cbd5e1"
                strokeWidth="1.5"
              />
              <line
                x1={chartPadding.left}
                y1={chartPadding.top}
                x2={chartPadding.left}
                y2={chartPadding.top + chartInnerHeight}
                stroke="#cbd5e1"
                strokeWidth="1.5"
              />
              <path d={yearTrendPath} fill="none" stroke="#06b6d4" strokeWidth="3" strokeLinecap="round" />
              {yearTrendPoints.map((point) => (
                <g key={point.label}>
                  <circle cx={point.x} cy={point.y} r="4.5" fill="#0891b2" />
                  <text x={point.x} y={chartPadding.top + chartInnerHeight + 20} textAnchor="middle" fontSize="11" fill="#475569">
                    {point.label}
                  </text>
                  <text x={point.x} y={point.y - 10} textAnchor="middle" fontSize="10" fill="#0f172a">
                    {point.value.toFixed(0)} KM
                  </text>
                </g>
              ))}
            </svg>
          </div>
        )}
      </section>

      <section className="grid gap-4 xl:grid-cols-2">
        <div className="rounded-2xl bg-white p-6 shadow-sm">
          <h2 className="font-['Manrope',sans-serif] text-xl font-bold">Status Split ({selectedYear})</h2>
          <div className="mt-4 flex justify-center">
            <div className="relative h-40 w-40 rounded-full" style={{ background: statusPieGradient }}>
              <div className="absolute inset-[22%] rounded-full bg-white" />
            </div>
          </div>
          <div className="mt-4 space-y-3">
            {statusSegments.map((status) => {
              const percent = Math.round(status.percent);
              return (
                <div key={status.key}>
                  <div className="mb-1 flex items-center justify-between text-xs text-slate-600">
                    <span>{status.label}</span>
                    <span>
                      {status.count} ({percent}%)
                    </span>
                  </div>
                  <div className="h-2 rounded-full bg-slate-200">
                    <div className={`h-full rounded-full ${status.color}`} style={{ width: `${percent}%` }} />
                  </div>
                </div>
              );
            })}
          </div>
        </div>

        <div className="rounded-2xl bg-white p-6 shadow-sm">
          <h2 className="font-['Manrope',sans-serif] text-xl font-bold">Top Providers ({selectedYear})</h2>
          <p className="mt-1 text-sm text-slate-600">Highest spending providers for the selected year.</p>
          <div className="mt-4 flex justify-center">
            <div className="relative h-40 w-40 rounded-full" style={{ background: providerPieGradient }}>
              <div className="absolute inset-[22%] rounded-full bg-white" />
            </div>
          </div>
          <div className="mt-4 space-y-3">
            {providerBreakdown.length === 0 ? (
              <p className="text-sm text-slate-500">No provider data for this year yet.</p>
            ) : (
              providerSegments.map((item) => (
                <div key={item.provider}>
                  <div className="mb-1 flex items-center justify-between text-xs text-slate-600">
                    <span className="inline-flex items-center gap-2">
                      <span className="inline-block h-2.5 w-2.5 rounded-full" style={{ backgroundColor: item.color }} />
                      {item.provider}
                    </span>
                    <span>{Number(item.amount || 0).toFixed(2) } KM</span>
                  </div>
                </div>
              ))
            )}
          </div>
        </div>
      </section>

    </>
  );
}

function MetricCard({ label, value, hint }) {
  return (
    <div className="rounded-2xl bg-white p-5 shadow-sm">
      <p className="text-sm text-slate-500">{label}</p>
      <p className="mt-2 text-3xl font-bold">{value}</p>
      <p className="mt-2 text-xs text-slate-600">{hint}</p>
    </div>
  );
}

export default DashboardPage;
