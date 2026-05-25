import { HashRouter, Route, Routes } from "react-router-dom";
import Layout from "./components/Layout";
import LoginPage from "./components/LoginPage";
import CudyClients from "./pages/Hotspots.tsx";
import DhcpOptions from "./pages/DhcpOptions";
import DhcpReservations from "./pages/DhcpReservations";
import Home from "./pages/Home";
import Hosts from "./pages/Hosts";
import MapPage from "./pages/Map";
import NetworkScan from "./pages/NetworkScan";
import NotFound from "./pages/NotFound";
import WifiPage from "./pages/Wifi";
import { useAuth } from "./hooks/useAuth";

export default function App() {
  const auth = useAuth();

  if (auth.loading) return null;

  if (auth.authEnabled && !auth.username) {
    return <LoginPage onLogin={auth.login} />;
  }

  return (
    <HashRouter future={{ v7_startTransition: true, v7_relativeSplatPath: true }}>
      <Routes>
        <Route element={<Layout auth={auth} />}>
          <Route index element={<Home />} />
          <Route path="/hosts" element={<Hosts />} />
          <Route path="/wifi" element={<WifiPage />} />
          <Route path="/dhcp/:routerId/reservations" element={<DhcpReservations />} />
          <Route path="/scan" element={<NetworkScan />} />
          <Route path="/hotspots" element={<CudyClients />} />
          <Route path="/map" element={<MapPage />} />
          <Route path="/dhcp/:routerId/options" element={<DhcpOptions />} />
          <Route path="*" element={<NotFound />} />
        </Route>
      </Routes>
    </HashRouter>
  );
}
