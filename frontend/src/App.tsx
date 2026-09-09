import { Routes, Route, Navigate } from "react-router-dom";
import { useAuth } from "./auth/AuthContext";
import { isConfigured } from "./config";
import Login from "./components/Login";
import Layout from "./components/Layout";
import { Spinner } from "./components/ui";
import Overview from "./pages/Overview";
import Weekly from "./pages/Weekly";
import Surveys from "./pages/Surveys";
import Ans from "./pages/Ans";
import Executive from "./pages/Executive";
import Admin from "./pages/Admin";
import Audit from "./pages/Audit";
import Help from "./pages/Help";
import Schedule from "./pages/Schedule";

export default function App() {
  const { user, loading } = useAuth();

  if (loading && isConfigured) {
    return <Spinner label="Iniciando..." />;
  }
  if (!user) {
    return <Login />;
  }

  return (
    <Layout>
      <Routes>
        <Route path="/" element={<Overview />} />
        <Route path="/semanal" element={<Weekly />} />
        <Route path="/encuestas" element={<Surveys />} />
        <Route path="/ans" element={<Ans />} />
        <Route path="/ejecutivo" element={<Executive />} />
        <Route path="/admin" element={<Admin />} />
        <Route path="/auditoria" element={<Audit />} />
        <Route path="/cronograma/:projectId" element={<Schedule />} />
        <Route path="/ayuda" element={<Help />} />
        <Route path="*" element={<Navigate to="/" replace />} />
      </Routes>
    </Layout>
  );
}
