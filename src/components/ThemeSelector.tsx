import { Monitor, Moon, Sun } from "lucide-react";
import { useTheme, type ThemePreference } from "../hooks/useTheme.ts";

const OPTIONS: { value: ThemePreference; icon: typeof Sun; label: string }[] = [
  { value: "light", icon: Sun, label: "Light" },
  { value: "dark", icon: Moon, label: "Dark" },
  { value: "system", icon: Monitor, label: "System" },
];

export function ThemeSelector() {
  const { preference, setTheme } = useTheme();

  return (
    <div className="flex items-center gap-0.5 bg-slate-700/40 rounded-lg p-0.5">
      {OPTIONS.map(({ value, icon: Icon, label }) => (
        <button
          key={value}
          type="button"
          title={label}
          onClick={() => setTheme(value)}
          className={`p-1.5 rounded-md transition-colors ${
            preference === value
              ? "bg-slate-800 text-blue-400 shadow-sm"
              : "text-slate-500 hover:text-slate-300"
          }`}
        >
          <Icon size={13} />
        </button>
      ))}
    </div>
  );
}
