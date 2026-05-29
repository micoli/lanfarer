import { Users, Wifi, WifiOff } from "lucide-react";
import { createContext, useCallback, useContext, useMemo, useState } from "react";

export interface HotspotNavItem {
  id: string;
  name: string;
  ssid: string;
  band: string;
  ip?: string;
  clientCount: number;
  online: boolean;
}

interface HotspotNavCtx {
  register: (item: HotspotNavItem) => void;
  unregister: (id: string) => void;
}

const HotspotNavContext = createContext<HotspotNavCtx | null>(null);

export function useHotspotNav() {
  return useContext(HotspotNavContext);
}

function scrollToCard(id: string) {
  document.getElementById(id)?.scrollIntoView({ behavior: "smooth", block: "start" });
}

function sortItems(items: HotspotNavItem[]): HotspotNavItem[] {
  return [...items].sort((a, b) => {
    const s = a.name.localeCompare(b.name);
    if (s !== 0) return s;
    return a.band.localeCompare(b.band);
  });
}

function NavBar({ items }: { items: HotspotNavItem[] }) {
  if (items.length === 0) return null;
  return (
    <div className="flex flex-wrap gap-2">
      {sortItems(items).map((item) => (
        <button
          key={item.id}
          type="button"
          onClick={() => scrollToCard(item.id)}
          className="flex items-center gap-2 shrink-0 px-3 py-2 rounded-lg border border-slate-700 bg-slate-800/60 hover:bg-slate-700/60 hover:border-slate-600 transition-colors text-left"
        >
          {item.online ? (
            <Wifi size={13} className="text-green-400 shrink-0" />
          ) : (
            <WifiOff size={13} className="text-slate-500 shrink-0" />
          )}
          <div className="flex flex-col min-w-0">
            <span className="text-xs font-medium text-slate-200 truncate max-w-36">{item.name}</span>
            {item.ip && <span className="text-xs text-slate-500 font-mono">{item.ip}</span>}
          </div>
          <span className="flex items-center gap-1 text-xs text-slate-400 bg-slate-700 px-1.5 py-0.5 rounded-full shrink-0">
            <Users size={10} />
            {item.clientCount}
          </span>
        </button>
      ))}
    </div>
  );
}

export function HotspotNavProvider({ children }: { children: React.ReactNode }) {
  const [items, setItems] = useState<HotspotNavItem[]>([]);

  const register = useCallback((item: HotspotNavItem) => {
    setItems((prev) => {
      const idx = prev.findIndex((i) => i.id === item.id);
      if (idx >= 0) {
        const next = [...prev];
        next[idx] = item;
        return next;
      }
      return [...prev, item];
    });
  }, []);

  const unregister = useCallback((id: string) => {
    setItems((prev) => prev.filter((i) => i.id !== id));
  }, []);

  const ctx = useMemo(() => ({ register, unregister }), [register, unregister]);

  return (
    <HotspotNavContext.Provider value={ctx}>
      <NavBar items={items} />
      {children}
    </HotspotNavContext.Provider>
  );
}
