import { AlertTriangle, ChevronDown, ChevronUp, Copy, RefreshCw } from "lucide-react";
import { Component, type ReactNode } from "react";
import i18n from "../lib/i18n";

interface Props {
  children: ReactNode;
  fallbackLabel?: string;
}

interface State {
  error: Error | null;
  componentStack: string | null;
  showDetails: boolean;
  copied: boolean;
}

function filterAppStack(stack: string): string {
  return stack
    .split("\n")
    .filter((line) => !line.trim().startsWith("at ") || line.includes("/src/"))
    .join("\n")
    .trim();
}

function classify(error: Error): { title: string; hint: string } {
  const msg = error.message ?? "";
  const t = i18n.t.bind(i18n);

  if (msg.includes("401") || msg.includes("Non autorisé") || msg.includes("Unauthorized"))
    return {
      title: t("errorBoundary.sessionExpired"),
      hint: t("errorBoundary.sessionExpiredHint"),
    };

  if (msg.includes("403") || msg.includes("Forbidden"))
    return { title: t("errorBoundary.forbidden"), hint: t("errorBoundary.forbiddenHint") };

  if (msg.includes("429") || msg.includes("rate"))
    return {
      title: t("errorBoundary.tooManyRequests"),
      hint: t("errorBoundary.tooManyRequestsHint"),
    };

  if (msg.includes("Network") || msg.includes("fetch") || msg.includes("Failed to fetch"))
    return { title: t("errorBoundary.networkError"), hint: t("errorBoundary.networkErrorHint") };

  if (msg.includes("404") || msg.includes("Not Found"))
    return { title: t("errorBoundary.notFound"), hint: t("errorBoundary.notFoundHint") };

  if (msg.includes("500") || msg.includes("502") || msg.includes("503"))
    return { title: t("errorBoundary.serverError"), hint: t("errorBoundary.serverErrorHint") };

  if (
    msg.includes("VITE_SPOTIFY_CLIENT_ID") ||
    (msg.includes("undefined") && msg.includes("client"))
  )
    return { title: t("errorBoundary.missingConfig"), hint: t("errorBoundary.missingConfigHint") };

  return { title: t("errorBoundary.unexpected"), hint: t("errorBoundary.unexpectedHint") };
}

export class ErrorBoundary extends Component<Props, State> {
  state: State = { error: null, componentStack: null, showDetails: false, copied: false };

  static getDerivedStateFromError(error: Error): Partial<State> {
    return { error };
  }

  componentDidCatch(error: Error, info: { componentStack: string }) {
    this.setState({ componentStack: info.componentStack });
    console.error("[ErrorBoundary]", error, info.componentStack);
  }

  reset = () =>
    this.setState({ error: null, componentStack: null, showDetails: false, copied: false });

  copy = () => {
    const { error, componentStack } = this.state;
    const text = [
      `Error: ${error?.name}: ${error?.message}`,
      "",
      "Stack:",
      error?.stack ? filterAppStack(error.stack) : "(none)",
      "",
      "Component stack:",
      componentStack ?? "(none)",
    ].join("\n");
    void navigator.clipboard.writeText(text);
    this.setState({ copied: true });
    setTimeout(() => this.setState({ copied: false }), 2000);
  };

  render() {
    const { error, componentStack, showDetails, copied } = this.state;
    if (!error) return this.props.children;

    const { title, hint } = classify(error);
    const t = i18n.t.bind(i18n);

    return (
      <div className="min-h-dvh bg-slate-900 flex flex-col items-center justify-center p-4">
        <div className="w-full max-w-lg flex flex-col gap-4">
          {/* Header */}
          <div className="flex items-start gap-3">
            <div className="p-2 bg-red-500/10 rounded-lg shrink-0">
              <AlertTriangle size={20} className="text-red-400" />
            </div>
            <div>
              <h1 className="text-sm font-semibold text-slate-100">{title}</h1>
              <p className="text-xs text-slate-400 mt-1 leading-relaxed">{hint}</p>
            </div>
          </div>

          {/* Error message */}
          <div className="bg-slate-800 rounded-lg px-3 py-2.5 border border-slate-700">
            <p className="text-xs font-mono text-red-300 break-all">
              {error.name}: {error.message}
            </p>
          </div>

          {/* Actions */}
          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={this.reset}
              className="flex items-center gap-2 px-4 py-2 bg-green-500 hover:bg-green-400 text-black text-xs font-semibold rounded-lg transition-colors"
            >
              <RefreshCw size={13} />
              {t("errorBoundary.retry")}
            </button>

            <button
              type="button"
              onClick={() => this.setState((s) => ({ showDetails: !s.showDetails }))}
              className="flex items-center gap-1.5 px-3 py-2 text-slate-400 hover:text-slate-200 text-xs transition-colors"
            >
              {showDetails ? <ChevronUp size={13} /> : <ChevronDown size={13} />}
              {t("errorBoundary.details")}
            </button>

            <button
              type="button"
              onClick={this.copy}
              className="flex items-center gap-1.5 px-3 py-2 text-slate-400 hover:text-slate-200 text-xs transition-colors ml-auto"
            >
              <Copy size={13} />
              {copied ? t("errorBoundary.copied") : t("errorBoundary.copy")}
            </button>
          </div>

          {/* Collapsible details */}
          {showDetails && (
            <div className="flex flex-col gap-3">
              {error.stack && (
                <div>
                  <p className="text-[10px] uppercase tracking-wider text-slate-500 mb-1.5">
                    {t("errorBoundary.stackTrace")}
                  </p>
                  <pre className="bg-slate-800 border border-slate-700 rounded-lg p-3 text-[10px] font-mono text-slate-300 overflow-x-auto whitespace-pre-wrap break-all leading-relaxed">
                    {filterAppStack(error.stack)}
                  </pre>
                </div>
              )}

              {componentStack && (
                <div>
                  <p className="text-[10px] uppercase tracking-wider text-slate-500 mb-1.5">
                    {t("errorBoundary.componentStack")}
                  </p>
                  <pre className="bg-slate-800 border border-slate-700 rounded-lg p-3 text-[10px] font-mono text-slate-400 overflow-x-auto whitespace-pre-wrap break-all leading-relaxed">
                    {componentStack.trim()}
                  </pre>
                </div>
              )}
            </div>
          )}
        </div>
      </div>
    );
  }
}
