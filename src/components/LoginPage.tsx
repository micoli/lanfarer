import { Network } from "lucide-react";
import { type FormEvent, useState } from "react";
import { useTranslation } from "react-i18next";

interface Props {
  onLogin: (username: string, password: string) => Promise<string | null>;
}

export default function LoginPage({ onLogin }: Props) {
  const { t } = useTranslation();
  const [username, setUsername] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  async function handleSubmit(e: FormEvent) {
    e.preventDefault();
    setError(null);
    setLoading(true);
    try {
      const err = await onLogin(username, password);
      if (err) setError(t("auth.invalidCredentials"));
    } catch {
      setError(t("auth.invalidCredentials"));
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="min-h-dvh bg-slate-900 flex items-center justify-center p-4">
      <div className="w-full max-w-sm">
        <div className="flex items-center gap-3 mb-8 justify-center">
          <div className="w-9 h-9 rounded-xl bg-blue-600 flex items-center justify-center">
            <Network size={18} className="text-white" />
          </div>
          <span className="text-xl font-semibold text-slate-100">LanFarer</span>
        </div>

        <form
          onSubmit={(e) => {
            void handleSubmit(e);
          }}
          className="bg-slate-800 rounded-xl p-6 border border-slate-700 flex flex-col gap-4"
        >
          <h1 className="text-slate-100 font-medium text-center">{t("auth.title")}</h1>

          <div className="flex flex-col gap-1">
            <label htmlFor="login-username" className="text-xs text-slate-400">{t("auth.username")}</label>
            <input
              id="login-username"
              type="text"
              autoComplete="username"
              value={username}
              onChange={(e) => setUsername(e.target.value)}
              required
              disabled={loading}
              className="bg-slate-700 border border-slate-600 rounded-lg px-3 py-2 text-sm text-slate-100 placeholder-slate-500 focus:outline-none focus:ring-2 focus:ring-blue-500 disabled:opacity-50"
            />
          </div>

          <div className="flex flex-col gap-1">
            <label htmlFor="login-password" className="text-xs text-slate-400">{t("auth.password")}</label>
            <input
              id="login-password"
              type="password"
              autoComplete="current-password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              required
              disabled={loading}
              className="bg-slate-700 border border-slate-600 rounded-lg px-3 py-2 text-sm text-slate-100 placeholder-slate-500 focus:outline-none focus:ring-2 focus:ring-blue-500 disabled:opacity-50"
            />
          </div>

          {error && <p className="text-red-400 text-xs text-center">{error}</p>}

          <button
            type="submit"
            disabled={loading || !username || !password}
            className="bg-blue-600 hover:bg-blue-500 disabled:opacity-50 disabled:cursor-not-allowed text-white text-sm font-medium py-2 rounded-lg transition-colors"
          >
            {loading ? t("auth.loggingIn") : t("auth.login")}
          </button>
        </form>
      </div>
    </div>
  );
}
