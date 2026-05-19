import { HashRouter, Routes, Route } from "react-router-dom";
import Layout from "./components/Layout";
import Home from "./pages/Home";
import DhcpReservations from "./pages/DhcpReservations";
import DhcpOptions from "./pages/DhcpOptions";
import Hosts from "./pages/Hosts";
import WifiPage from "./pages/Wifi";
import NetworkScan from "./pages/NetworkScan";
import NotFound from "./pages/NotFound";

export default function App() {
  return (
    <HashRouter future={{ v7_startTransition: true, v7_relativeSplatPath: true }}>
      <Routes>
        <Route element={<Layout />}>
          <Route index element={<Home />} />
          <Route path="/hosts" element={<Hosts />} />
          <Route path="/wifi" element={<WifiPage />} />
          <Route path="/dhcp/reservations" element={<DhcpReservations />} />
          <Route path="/scan" element={<NetworkScan />} />
          <Route path="/dhcp/options" element={<DhcpOptions />} />
          <Route path="*" element={<NotFound />} />
        </Route>
      </Routes>
    </HashRouter>
  );
}
