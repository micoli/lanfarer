import { HashRouter, Route, Routes } from "react-router-dom";
import Layout from "./components/Layout";
import DhcpOptions from "./pages/DhcpOptions";
import DhcpReservations from "./pages/DhcpReservations";
import Home from "./pages/Home";
import Hosts from "./pages/Hosts";
import NetworkScan from "./pages/NetworkScan";
import NotFound from "./pages/NotFound";
import WifiPage from "./pages/Wifi";

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
