import { HashRouter, Route, Routes } from "react-router-dom";
import DhcpOptions from "../plugins/bbox/frontend/pages/DhcpOptions";
import DhcpReservations from "../plugins/bbox/frontend/pages/DhcpReservations";
import WifiPage from "../plugins/bbox/frontend/pages/Wifi";
import Layout from "./components/Layout";
import LoginPage from "./components/LoginPage";
import { useAuth } from "./hooks/useAuth";
import Bandwidth from "./pages/Bandwidth";
import Home from "./pages/Home";
import Hosts from "./pages/Hosts";
import CudyClients from "./pages/Hotspots.tsx";
import MapPage from "./pages/Map";
import NetworkScan from "./pages/NetworkScan";
import NotFound from "./pages/NotFound";

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
          <Route path="/bandwidth" element={<Bandwidth />} />
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
