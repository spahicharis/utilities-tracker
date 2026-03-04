function StatsCard({ label, value, hint, hintColor = "text-slate-600" }) {
  return (
    <div className="rounded-2xl bg-white p-5 shadow-sm">
      <p className="text-sm text-slate-500">{label}</p>
      <p className="mt-2 text-3xl font-bold">{value}</p>
      <p className={`mt-2 text-xs ${hintColor}`}>{hint}</p>
    </div>
  );
}

export default StatsCard;
