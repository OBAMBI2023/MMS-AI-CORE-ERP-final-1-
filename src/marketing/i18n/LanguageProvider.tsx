import { createContext, useContext, useEffect, useState, type ReactNode } from "react";
import { getMarketingTranslations, type MarketingLanguage } from "./translations";

type LanguageContextValue = {
  language: MarketingLanguage;
  setLanguage: (language: MarketingLanguage) => void;
};

const LanguageContext = createContext<LanguageContextValue | null>(null);

const STORAGE_KEY = "saovia-marketing-language";

function getStoredLanguage(): MarketingLanguage {
  if (typeof window === "undefined") return "fr";

  return localStorage.getItem(STORAGE_KEY) === "en" ? "en" : "fr";
}

export function MarketingLanguageProvider({ children }: { children: ReactNode }) {
  const [language, setLanguage] = useState<MarketingLanguage>(getStoredLanguage);

  useEffect(() => {
    localStorage.setItem(STORAGE_KEY, language);
  }, [language]);

  return (
    <LanguageContext.Provider value={{ language, setLanguage }}>
      {children}
    </LanguageContext.Provider>
  );
}

export function useMarketingLanguage() {
  const context = useContext(LanguageContext);

  if (!context) {
    throw new Error("useMarketingLanguage must be used within a MarketingLanguageProvider");
  }

  return context;
}

export function useMarketingTranslation() {
  const { language, setLanguage } = useMarketingLanguage();
  return { t: getMarketingTranslations(language), language, setLanguage };
}
