import { useEffect, useMemo, useState } from "react";

function AppFooter() {
  const [status, setStatus] = useState("checking");

  const healthUrl = useMemo(() => {
    const apiBase = (import.meta.env.VITE_API_BASE_URL || "").replace(/\/$/, "");
    return apiBase ? `${apiBase}/api/health` : "/api/health";
  }, []);

  useEffect(() => {
    let isActive = true;

    const checkHealth = async () => {
      try {
        const response = await fetch(healthUrl);
        if (!response.ok) {
          throw new Error("Health endpoint unavailable.");
        }
        if (isActive) {
          setStatus("online");
        }
      } catch (_error) {
        if (isActive) {
          setStatus("offline");
        }
      }
    };

    checkHealth();

    return () => {
      isActive = false;
    };
  }, [healthUrl]);

  const statusLabel = status === "online" ? "API Online" : status === "offline" ? "API Offline" : "Checking API";
  const statusClasses =
    status === "online"
      ? "bg-emerald-100 text-emerald-800"
      : status === "offline"
        ? "bg-rose-100 text-rose-800"
        : "bg-amber-100 text-amber-800";

  return (
    <footer className="border-t border-slate-200 bg-white/90">
      <div className="mx-auto flex w-full max-w-7xl items-center justify-between gap-3 px-4 py-3 text-xs text-slate-600 sm:px-6 sm:text-sm">
        <p>Utilities Tracker Admin</p>
        <span className={`rounded-full px-2.5 py-1 font-medium ${statusClasses}`}>{statusLabel}</span>
      </div>
    </footer>
  );
}

export default AppFooter;
