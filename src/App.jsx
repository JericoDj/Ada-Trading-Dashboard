import { Navigate, Route, Routes } from "react-router-dom";
import { useAuth } from "./context/AuthContext.jsx";
import Layout from "./components/Layout.jsx";
import { Spinner } from "./components/ui.jsx";
import Login from "./pages/Login.jsx";
import Sessions from "./pages/Sessions.jsx";
import SessionDetail from "./pages/SessionDetail.jsx";
import Shadows from "./pages/Shadows.jsx";
import Health from "./pages/Health.jsx";
import Live from "./pages/Live.jsx";
import Keys from "./pages/Keys.jsx";

export default function App() {
  const { token, checking } = useAuth();
  if (checking) return <div className="center"><Spinner /></div>;
  if (!token) return <Login />;
  
  return (
    <Routes>
      <Route element={<Layout />}>
        <Route index element={<Sessions />} />
        <Route path="sessions/:id" element={<SessionDetail />} />
        <Route path="shadows" element={<Shadows />} />
        <Route path="health" element={<Health />} />
        <Route path="demo" element={<Live env="testnet" />} />
        <Route path="live" element={<Live env="mainnet" />} />
        <Route path="keys" element={<Keys />} />
        <Route path="*" element={<Navigate to="/" replace />} />
      </Route>
    </Routes>
  );
}
