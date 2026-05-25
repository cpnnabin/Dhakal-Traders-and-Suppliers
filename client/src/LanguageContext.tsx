import { createContext, useContext, useState } from 'react';
import type { ReactNode } from 'react';

export type Lang = 'ne' | 'en';

interface LanguageContextProps {
  lang: Lang;
  setLang: (lang: Lang) => void;
}

const LanguageContext = createContext<LanguageContextProps | undefined>(undefined);

export const useLanguage = () => {
  const ctx = useContext(LanguageContext);
  if (!ctx) throw new Error('useLanguage must be used within LanguageProvider');
  return ctx;
};

export const LanguageProvider = ({ children }: { children: ReactNode }) => {
  const [lang, setLang] = useState<Lang>(() => {
    const stored = localStorage.getItem('dhakal-lang');
    return stored === 'en' ? 'en' : 'ne';
  });

  const setLangAndStore = (l: Lang) => {
    setLang(l);
    localStorage.setItem('dhakal-lang', l);
  };

  return (
    <LanguageContext.Provider value={{ lang, setLang: setLangAndStore }}>
      {children}
    </LanguageContext.Provider>
  );
};
