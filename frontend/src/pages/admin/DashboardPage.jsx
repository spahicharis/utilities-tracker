import { useEffect, useState } from "react";
import { TRACKING_START_YEAR } from "../../lib/billingConfig";
import { api } from "../../lib/api";

const STATUS_OPTIONS = [
  { key: "paid", label: "Paid", color: "bg-emerald-500" },
  { key: "pending", label: "Pending", color: "bg-amber-500" },
  { key: "overdue", label: "Overdue", color: "bg-rose-500" }
];

function DashboardPage() {
  const currentYear = new Date().getFullYear();
  const [selectedYear, setSelectedYear] = useState(String(currentYear));
  const [data, setData] = useState({
    trackingStartYear: TRACKING_START_YEAR,
    years: [],
    cards: { total: 0, count: 0, paid: 0, pending: 0, overdue: 0, paidRate: 0 },
    yearlyTotals: [],
    statusSplit: { paid: 0, pending: 0, overdue: 0 },
    topProviders: []
  });
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  useEffect(() => {
    let isActive = true;

    const loadDashboard = async () => {
      setLoading(true);
      setError("");
      try {
        const payload = await api.getDashboard(selectedYear);
        if (!isActive) {
          return;
        }
        setData({
          trackingStartYear: payload?.trackingStartYear ?? TRACKING_START_YEAR,
          years: Array.isArray(payload?.years) ? payload.years : [],
          cards: payload?.cards ?? { total: 0, count: 0, paid: 0, pending: 0, overdue: 0, paidRate: 0 },
          yearlyTotals: Array.isArray(payload?.yearlyTotals) ? payload.yearlyTotals : [],
          statusSplit: payload?.statusSplit ?? { paid: 0, pending: 0, overdue: 0 },
          topProviders: Array.isArray(payload?.topProviders) ? payload.topProviders : []
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
  }, [selectedYear]);

  const years = data.years.length ? data.years : [String(currentYear)];
  const yearlySeries = data.yearlyTotals;
  const maxYearAmount = Math.max(...yearlySeries.map((item) => Number(item.total || 0)), 1);
  const providerBreakdown = data.topProviders;
  const maxProviderAmount = Math.max(...providerBreakdown.map((item) => Number(item.amount || 0)), 1);

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

      <section className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
        <MetricCard
          label={`${selectedYear} Total`}
          value={`$${Number(data.cards.total || 0).toFixed(2)}`}
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
        <h2 className="font-['Manrope',sans-serif] text-xl font-bold">Yearly Spend Trend</h2>
        <p className="mt-1 text-sm text-slate-600">Total bill amounts by year.</p>
        <div className="mt-5 grid gap-3">
          {yearlySeries.map((item) => (
            <div key={item.year}>
              <div className="mb-1 flex items-center justify-between text-xs text-slate-600">
                <span>{item.year}</span>
                <span>${Number(item.total || 0).toFixed(2)}</span>
              </div>
              <div className="h-2 rounded-full bg-slate-200">
                <div
                  className="h-full rounded-full bg-cyan-500"
                  style={{
                    width: `${Math.max(
                      (Number(item.total || 0) / maxYearAmount) * 100,
                      Number(item.total || 0) > 0 ? 3 : 0
                    )}%`
                  }}
                />
              </div>
            </div>
          ))}
        </div>
      </section>

      <section className="grid gap-4 xl:grid-cols-2">
        <div className="rounded-2xl bg-white p-6 shadow-sm">
          <h2 className="font-['Manrope',sans-serif] text-xl font-bold">Status Split ({selectedYear})</h2>
          <div className="mt-4 space-y-3">
            {STATUS_OPTIONS.map((status) => {
              const count = Number(data.statusSplit[status.key] || 0);
              const percent = data.cards.count > 0 ? Math.round((count / data.cards.count) * 100) : 0;
              return (
                <div key={status.key}>
                  <div className="mb-1 flex items-center justify-between text-xs text-slate-600">
                    <span>{status.label}</span>
                    <span>
                      {count} ({percent}%)
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
          <div className="mt-4 space-y-3">
            {providerBreakdown.length === 0 ? (
              <p className="text-sm text-slate-500">No provider data for this year yet.</p>
            ) : (
              providerBreakdown.map((item) => (
                <div key={item.provider}>
                  <div className="mb-1 flex items-center justify-between text-xs text-slate-600">
                    <span>{item.provider}</span>
                    <span>${Number(item.amount || 0).toFixed(2)}</span>
                  </div>
                  <div className="h-2 rounded-full bg-slate-200">
                    <div
                      className="h-full rounded-full bg-indigo-500"
                      style={{ width: `${Math.max((Number(item.amount || 0) / maxProviderAmount) * 100, 3)}%` }}
                    />
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
