import { useCallback, useEffect, useState } from "react";
import { Navigate, Route, Routes } from "react-router-dom";
import AdminPage from "./pages/AdminPage";
import BillsPage from "./pages/admin/BillsPage";
import DashboardPage from "./pages/admin/DashboardPage";
import LoginPage from "./pages/LoginPage";
import ProvidersPage from "./pages/admin/ProvidersPage";
import { clearAuthToken, setAuthToken } from "./lib/api";
import { supabase } from "./lib/supabase";

function App() {
  const [userName, setUserName] = useState("");
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const [isAuthReady, setIsAuthReady] = useState(false);

  const applySession = useCallback((session) => {
    const token = String(session?.access_token || "");
    if (!token) {
      clearAuthToken();
      setUserName("");
      setIsAuthenticated(false);
      localStorage.removeItem("ut_user_name");
      return;
    }

    setAuthToken(token);
    const email = String(session?.user?.email || "").trim();
    const nextName = email ? email.split("@")[0] : "Admin";
    localStorage.setItem("ut_user_name", nextName);
    setUserName(nextName);
    setIsAuthenticated(true);
  }, []);

  useEffect(() => {
    let isActive = true;

    const initializeSession = async () => {
      const { data } = await supabase.auth.getSession();
      if (isActive) {
        applySession(data?.session || null);
        setIsAuthReady(true);
      }
    };

    initializeSession();

    const { data: authListener } = supabase.auth.onAuthStateChange((_event, session) => {
      applySession(session);
    });

    const handleUnauthorized = () => {
      supabase.auth.signOut();
    };

    window.addEventListener("ut:unauthorized", handleUnauthorized);

    return () => {
      isActive = false;
      authListener.subscription.unsubscribe();
      window.removeEventListener("ut:unauthorized", handleUnauthorized);
    };
  }, [applySession]);

  const login = async ({ email, password }) => {
    const { data, error } = await supabase.auth.signInWithPassword({ email, password });
    if (error) {
      throw new Error(error.message || "Sign in failed.");
    }

    applySession(data?.session || null);
  };

  const logout = useCallback(async () => {
    await supabase.auth.signOut();
    applySession(null);
  }, [applySession]);

  if (!isAuthReady) {
    return <div className="flex min-h-screen items-center justify-center text-sm text-slate-600">Loading...</div>;
  }

  return (
    <Routes>
      <Route path="/" element={<Navigate to={isAuthenticated ? "/admin" : "/login"} replace />} />
      <Route
        path="/login"
        element={isAuthenticated ? <Navigate to="/admin" replace /> : <LoginPage onLogin={login} />}
      />
      <Route
        path="/admin/*"
        element={
          isAuthenticated ? <AdminPage userName={userName} onLogout={logout} /> : <Navigate to="/login" replace />
        }
      >
        <Route index element={<Navigate to="dashboard" replace />} />
        <Route path="dashboard" element={<DashboardPage />} />
        <Route path="bills" element={<BillsPage />} />
        <Route path="providers" element={<ProvidersPage />} />
        <Route path="*" element={<Navigate to="dashboard" replace />} />
      </Route>
      <Route path="*" element={<Navigate to={isAuthenticated ? "/admin" : "/login"} replace />} />
    </Routes>
  );
}

export default App;
