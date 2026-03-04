import { useEffect, useState } from "react";
import { Outlet } from "react-router-dom";
import AdminNavbar from "../components/AdminNavbar";
import AdminSidebar from "../components/AdminSidebar";
import AppFooter from "../components/AppFooter";
import { DEFAULT_PROVIDERS } from "../lib/billingConfig";
import { api } from "../lib/api";

function AdminPage({ userName, onLogout }) {
  const [providers, setProviders] = useState(DEFAULT_PROVIDERS);

  useEffect(() => {
    let isActive = true;

    const loadProviders = async () => {
      try {
        const data = await api.getProviders();
        if (isActive && Array.isArray(data?.providers)) {
          setProviders(data.providers);
        }
      } catch (_error) {
        if (isActive) {
          setProviders(DEFAULT_PROVIDERS);
        }
      }
    };

    loadProviders();
    return () => {
      isActive = false;
    };
  }, []);

  const addProvider = async (providerInput) => {
    try {
      const data = await api.addProvider(providerInput);
      if (Array.isArray(data?.providers)) {
        setProviders(data.providers);
        return true;
      }
      return false;
    } catch (_error) {
      return false;
    }
  };

  const deleteProvider = async (providerName) => {
    try {
      const data = await api.deleteProvider(providerName);
      if (Array.isArray(data?.providers)) {
        setProviders(data.providers);
      }
    } catch (_error) {
      // no-op
    }
  };

  return (
    <div className="flex min-h-screen flex-col bg-slate-100 text-slate-900">
      <AdminNavbar userName={userName} onLogout={onLogout} />

      <main className="flex-1">
        <section className="mx-auto grid w-full max-w-7xl gap-6 px-4 py-8 sm:px-6 lg:grid-cols-[240px,1fr]">
          <AdminSidebar />

          <article className="space-y-6">
            <Outlet
              context={{
                userName,
                providers,
                addProvider,
                deleteProvider
              }}
            />
          </article>
        </section>
      </main>

      <AppFooter />
    </div>
  );
}

export default AdminPage;
