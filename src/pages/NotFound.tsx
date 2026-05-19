import { useTranslation } from "react-i18next";
import { useNavigate } from "react-router-dom";

export default function NotFound() {
  const navigate = useNavigate();
  const { t } = useTranslation();

  return (
    <div className="flex flex-col items-center justify-center flex-1 gap-6 p-8 select-none">
      <div className="text-center">
        <p className="text-8xl font-black text-slate-700 tracking-tight leading-none">404</p>
        <p className="mt-3 text-slate-400 text-sm">{t("notFound.message")}</p>
      </div>
      <button
        type="button"
        onClick={() => navigate("/", { replace: true })}
        className="text-xs text-blue-400 hover:text-blue-300 transition-colors"
      >
        {t("notFound.backHome")}
      </button>
    </div>
  );
}
