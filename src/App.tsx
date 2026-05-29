import { HashRouter, Route, Routes } from "react-router-dom";
import { frontendPlugins } from "../plugins/frontendPlugins.ts";
import Layout from "./components/Layout";
import LoginPage from "./components/LoginPage";
import { useAuth } from "./hooks/useAuth";
import { useRouters } from "./hooks/useUiConfig.ts";
import Bandwidth from "./pages/Bandwidth";
import Home from "./pages/Home";
import Hosts from "./pages/Hosts";
import CudyClients from "./pages/Hotspots.tsx";
import MapPage from "./pages/Map";
import NetworkScan from "./pages/NetworkScan";
import NotFound from "./pages/NotFound";
import Ping from "./pages/Ping";

type AuthProps = ReturnType<typeof useAuth>;

function AppRoutes({ auth }: { auth: AuthProps }) {
  const routers = useRouters();
  if (routers === undefined) return null;

  const activeTypes = new Set(routers.map((r) => r.type));
  const activePlugins = frontendPlugins.filter((p) => activeTypes.has(p.type));
  const pluginRoutes = activePlugins.flatMap((p) => p.routes ?? []);

  return (
    <HashRouter future={{ v7_startTransition: true, v7_relativeSplatPath: true }}>
      <Routes>
        <Route element={<Layout auth={auth} activePlugins={activePlugins} />}>
          <Route index element={<Home />} />
          <Route path="/bandwidth" element={<Bandwidth />} />
          <Route path="/hosts" element={<Hosts />} />
          <Route path="/scan" element={<NetworkScan />} />
          <Route path="/hotspots" element={<CudyClients />} />
          <Route path="/map" element={<MapPage />} />
          <Route path="/ping" element={<Ping />} />
          {pluginRoutes.map((r) => (
            <Route key={r.path} path={r.path} element={<r.component />} />
          ))}
          <Route path="*" element={<NotFound />} />
        </Route>
      </Routes>
    </HashRouter>
  );
}

export default function App() {
  const auth = useAuth();
  if (auth.loading) return null;
  if (auth.authEnabled && !auth.username) return <LoginPage onLogin={auth.login} />;
  return <AppRoutes auth={auth} />;
}
