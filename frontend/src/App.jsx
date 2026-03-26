import { useCallback, useEffect, useState } from "react";
import { Navigate, Route, Routes } from "react-router-dom";
import AdminPage from "./pages/AdminPage";
import BillsPage from "./pages/admin/BillsPage";
import DashboardPage from "./pages/admin/DashboardPage";
import LoginPage from "./pages/LoginPage";
import ProvidersPage from "./pages/admin/ProvidersPage";
import SubscriptionsPage from "./pages/admin/SubscriptionsPage";
import { clearAuthToken, setAuthToken } from "./lib/api";
import { supabase } from "./lib/supabase";
import PropertyContextPage from "./pages/PropertyContextPage";

function getPropertyStorageKey(userId) {
  return `ut_property_id:${String(userId || "").trim()}`;
}

function getStoredPropertyId(userId) {
  const key = getPropertyStorageKey(userId);
  return localStorage.getItem(key) || "";
}

function setStoredPropertyId(userId, propertyId) {
  const key = getPropertyStorageKey(userId);
  if (!propertyId) {
    localStorage.removeItem(key);
    return;
  }
  localStorage.setItem(key, propertyId);
}

function App() {
  const [userId, setUserId] = useState("");
  const [userName, setUserName] = useState("");
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const [isAuthReady, setIsAuthReady] = useState(false);
  const [selectedPropertyId, setSelectedPropertyId] = useState("");

  const selectProperty = useCallback(
    (propertyId) => {
      const value = String(propertyId || "").trim();
      setSelectedPropertyId(value);
      if (!userId) {
        return;
      }
      setStoredPropertyId(userId, value);
    },
    [userId]
  );

  const applySession = useCallback(
    (session) => {
      const token = String(session?.access_token || "");
      if (!token) {
        clearAuthToken();
        setUserId("");
        setUserName("");
        setIsAuthenticated(false);
        setIsAuthReady(true);
        localStorage.removeItem("ut_user_name");
        setSelectedPropertyId("");
        return;
      }

      setAuthToken(token);
      const nextUserId = String(session?.user?.id || "").trim();
      const email = String(session?.user?.email || "").trim();
      const nextName = email ? email.split("@")[0] : "Admin";
      localStorage.setItem("ut_user_name", nextName);
      setUserId(nextUserId);
      setUserName(nextName);
      setSelectedPropertyId(getStoredPropertyId(nextUserId));
      setIsAuthenticated(true);
      setIsAuthReady(true);
    },
    []
  );

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
      <Route path="/" element={<Navigate to={isAuthenticated ? (selectedPropertyId ? "/admin" : "/context") : "/login"} replace />} />
      <Route
        path="/login"
        element={isAuthenticated ? <Navigate to={selectedPropertyId ? "/admin" : "/context"} replace /> : <LoginPage onLogin={login} />}
      />
      <Route
        path="/context"
        element={
          <PropertyContextPage
            isAuthenticated={isAuthenticated}
            selectedPropertyId={selectedPropertyId}
            onSelectProperty={selectProperty}
            onLogout={logout}
          />
        }
      />
      <Route
        path="/admin/*"
        element={
          isAuthenticated ? (
            selectedPropertyId ? (
              <AdminPage
                userName={userName}
                onLogout={logout}
                selectedPropertyId={selectedPropertyId}
                onSelectProperty={selectProperty}
              />
            ) : (
              <Navigate to="/context" replace />
            )
          ) : (
            <Navigate to="/login" replace />
          )
        }
      >
        <Route index element={<Navigate to="dashboard" replace />} />
        <Route path="dashboard" element={<DashboardPage />} />
        <Route path="bills" element={<BillsPage />} />
        <Route path="subscriptions" element={<SubscriptionsPage />} />
        <Route path="providers" element={<ProvidersPage />} />
        <Route path="*" element={<Navigate to="dashboard" replace />} />
      </Route>
      <Route path="*" element={<Navigate to={isAuthenticated ? (selectedPropertyId ? "/admin" : "/context") : "/login"} replace />} />
    </Routes>
  );
}

export default App;
