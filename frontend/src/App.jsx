import { useState } from "react";
import { Navigate, Route, Routes } from "react-router-dom";
import AdminPage from "./pages/AdminPage";
import BillsPage from "./pages/admin/BillsPage";
import DashboardPage from "./pages/admin/DashboardPage";
import LoginPage from "./pages/LoginPage";
import ProvidersPage from "./pages/admin/ProvidersPage";

function App() {
  const [userName, setUserName] = useState(() => localStorage.getItem("ut_user_name") || "");
  const isAuthenticated = Boolean(userName);

  const login = (email) => {
    const name = email.split("@")[0] || "Admin";
    setUserName(name);
    localStorage.setItem("ut_user_name", name);
  };

  const logout = () => {
    setUserName("");
    localStorage.removeItem("ut_user_name");
  };

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
