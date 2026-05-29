import { Activity, WifiOff } from "lucide-react";
import { createContext, useCallback, useContext, useMemo, useState } from "react";

export interface BandwidthNavItem {
  id: string;
  name: string;
  type: string;
  online: boolean;
}

interface BandwidthNavCtx {
  register: (item: BandwidthNavItem) => void;
  unregister: (id: string) => void;
}

const BandwidthNavContext = createContext<BandwidthNavCtx | null>(null);

export function useBandwidthNav() {
  return useContext(BandwidthNavContext);
}

function scrollToCard(id: string) {
  document.getElementById(id)?.scrollIntoView({ behavior: "smooth", block: "start" });
}

function sortItems(items: BandwidthNavItem[]): BandwidthNavItem[] {
  return [...items].sort((a, b) => a.name.localeCompare(b.name));
}

function NavBar({ items }: { items: BandwidthNavItem[] }) {
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
            <Activity size={13} className="text-cyan-400 shrink-0" />
          ) : (
            <WifiOff size={13} className="text-slate-500 shrink-0" />
          )}
          <div className="flex flex-col min-w-0">
            <span className="text-xs font-medium text-slate-200 truncate max-w-36">{item.name}</span>
            <span className="text-xs text-slate-500">{item.type}</span>
          </div>
        </button>
      ))}
    </div>
  );
}

export function BandwidthNavProvider({ children }: { children: React.ReactNode }) {
  const [items, setItems] = useState<BandwidthNavItem[]>([]);

  const register = useCallback((item: BandwidthNavItem) => {
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
    <BandwidthNavContext.Provider value={ctx}>
      <NavBar items={items} />
      {children}
    </BandwidthNavContext.Provider>
  );
}
