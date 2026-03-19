"use client";

import { useEffect, useState, createContext, useContext } from "react";
import { User, CalculatorState } from "@/types";
import { Language, translations } from "@/lib/i18n/translations";
import axios from "axios";

type TelegramContextType = {
    user: User | null;
    calculatorState: CalculatorState;
    setCalculatorState: React.Dispatch<React.SetStateAction<CalculatorState>>;
    language: Language;
    setLanguage: React.Dispatch<React.SetStateAction<Language>>;
    t: typeof translations.ru;
    showSplash: boolean;
    setShowSplash: (val: boolean) => void;
};

const defaultCalcState: CalculatorState = {
  sugar: "",
  previewUrls: [],
  base64Images: [],
  result: null,
  aiData: null
};

const TelegramContext = createContext<TelegramContextType>({ 
    user: null,
    calculatorState: defaultCalcState,
    setCalculatorState: () => {},
    language: 'ua',
    setLanguage: () => {},
    t: translations.ru,
    showSplash: true,
    setShowSplash: () => {}
});

export const useUser = () => useContext(TelegramContext);

export function TelegramProvider({ children, defaultLanguage = 'ua' }: { children: React.ReactNode, defaultLanguage?: Language }) {
  const [user, setUser] = useState<User | null>(null);
  const [calculatorState, setCalculatorState] = useState<CalculatorState>(defaultCalcState);
  const [language, setLanguage] = useState<Language>('ua');
  const [showSplash, setShowSplash] = useState(true);
  const [mounted, setMounted] = useState(false);

  const t = translations[language];

  useEffect(() => {
    setMounted(true);
    const initTelegram = async () => {
      // @ts-ignore
      const WebApp = window.Telegram?.WebApp;
      if (!WebApp) {
        console.log("Not in Telegram environment, using mock user");
        setupMockUser();
        return;
      }

      WebApp.ready();
      WebApp.expand();

      if (WebApp.initDataUnsafe && Object.keys(WebApp.initDataUnsafe).length > 0) {
        const tgUser = WebApp.initDataUnsafe?.user;
        if (tgUser) {
          try {
            const res = await axios.post('/api/user', {
               id: tgUser.id,
               username: tgUser.username,
               first_name: tgUser.first_name
            });
            if (res.data.success && res.data.data) {
              setUser(res.data.data);
            } else {
              // Fallback if API fails but we have TG data
              setUser({
                telegram_id: tgUser.id,
                username: tgUser.username,
                first_name: tgUser.first_name,
                role: 'user', 
                created_at: new Date().toISOString()
              });
            }
          } catch(e) {
            console.error("Failed to sync telegram user", e);
            setUser({
              telegram_id: tgUser.id,
              username: tgUser.username,
              first_name: tgUser.first_name,
              role: 'user', 
              created_at: new Date().toISOString()
            });
          }
        }
      } else {
        setupMockUser();
      }
    };

    const setupMockUser = async () => {
      const mockProps = {
        id: 804617505,
        username: 'admin',
        first_name: 'Owner'
      };
      try {
         const res = await axios.post('/api/user', mockProps);
         if (res.data.success && res.data.data) {
           setUser(res.data.data);
         }
      } catch(e) {
         setUser({
           telegram_id: mockProps.id,
           username: mockProps.username,
           first_name: mockProps.first_name,
           role: 'admin',
           created_at: new Date().toISOString()
         });
      }
    };

    const timer = setTimeout(initTelegram, 100);
    return () => clearTimeout(timer);
  }, []);

  useEffect(() => {
    // Show splash only once
    if (showSplash) {
        const timer = setTimeout(() => setShowSplash(false), 2500);
        return () => clearTimeout(timer);
    }
  }, [showSplash]);

  useEffect(() => {
    // Handle Telegram BackButton
    // @ts-ignore
    const WebApp = window.Telegram?.WebApp;
    if (!WebApp) return;

    const handleBack = () => {
        try {
          window.history.back();
        } catch (e) {
          console.error("History back failed", e);
        }
    };

    if (WebApp.BackButton) {
        WebApp.BackButton.onClick(handleBack);
    }
    
    return () => {
        if (WebApp.BackButton) {
            WebApp.BackButton.offClick(handleBack);
        }
    };
  }, []);

  if (!mounted) {
    return <div className="min-h-screen bg-[#F8F4F0]" />;
  }

  return (
      <TelegramContext.Provider value={{ user, calculatorState, setCalculatorState, language, setLanguage, t, showSplash, setShowSplash }}>
          {children}
      </TelegramContext.Provider>
  );
}
