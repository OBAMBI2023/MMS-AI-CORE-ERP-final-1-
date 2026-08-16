import { useMarketingTranslation } from "../i18n/LanguageProvider";

export function LanguageSwitcher() {
  const { t, language, setLanguage } = useMarketingTranslation();

  return (
    <div className="flex items-center gap-2 text-sm font-medium" role="group" aria-label="Choix de la langue">
      <button
        type="button"
        onClick={() => setLanguage("fr")}
        aria-label="Passer en français"
        aria-pressed={language === "fr"}
        className={`rounded-md px-1.5 py-1 transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-saovia-accent ${
          language === "fr" ? "text-white" : "text-white/60 hover:text-saovia-accent"
        }`}
      >
        <span aria-hidden="true">🇫🇷</span>{" "}
        <span className="hidden sm:inline">{t.language.french}</span>
        <span className="sm:hidden">FR</span>
      </button>
      <span className="text-white/30" aria-hidden="true">
        |
      </span>
      <button
        type="button"
        onClick={() => setLanguage("en")}
        aria-label="Switch to English"
        aria-pressed={language === "en"}
        className={`rounded-md px-1.5 py-1 transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-saovia-accent ${
          language === "en" ? "text-white" : "text-white/60 hover:text-saovia-accent"
        }`}
      >
        <span aria-hidden="true">🇬🇧</span>{" "}
        <span className="hidden sm:inline">{t.language.english}</span>
        <span className="sm:hidden">EN</span>
      </button>
    </div>
  );
}
