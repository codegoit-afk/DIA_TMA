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
    language: 'ru',
    setLanguage: () => {},
    t: translations.ru,
    showSplash: true,
    setShowSplash: () => {}
});

export const useUser = () => useContext(TelegramContext);

export function TelegramProvider({ children }: { children: React.ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [calculatorState, setCalculatorState] = useState<CalculatorState>(defaultCalcState);
  const [language, setLanguage] = useState<Language>('ru');
  const [showSplash, setShowSplash] = useState(true);

  const t = translations[language];

  useEffect(() => {
    // Check if we are running inside Telegram Web App
    const initTelegram = async () => {
      // @ts-ignore
      const WebApp = window.Telegram?.WebApp;
      
      if (WebApp && WebApp.initDataUnsafe && Object.keys(WebApp.initDataUnsafe).length > 0) {
        WebApp.ready();
        WebApp.expand();
        
        const tgUser = WebApp.initDataUnsafe?.user;
        
        if (tgUser) {
          try {
            // Register or fetch user from DB to satisfy foreign keys
            const res = await axios.post('/api/user', {
               id: tgUser.id,
               username: tgUser.username,
               first_name: tgUser.first_name
            });
            setUser(res.data.data);
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
        console.log("Not in Telegram or missing data, using mock user");
        const mockProps = {
          id: 11111111,
          username: 'mock_user',
          first_name: 'Mock Desktop User'
        };
        try {
           const res = await axios.post('/api/user', mockProps);
           setUser(res.data.data);
        } catch(e) {
           console.error("Failed to sync mock user", e);
           setUser({
             telegram_id: mockProps.id,
             username: mockProps.username,
             first_name: mockProps.first_name,
             role: 'admin',
             created_at: new Date().toISOString()
           });
        }
      }
    };

    initTelegram();
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
        window.history.back();
    };

    WebApp.BackButton.onClick(handleBack);
    
    return () => {
        WebApp.BackButton.offClick(handleBack);
    };
  }, []);

  return (
      <TelegramContext.Provider value={{ user, calculatorState, setCalculatorState, language, setLanguage, t, showSplash, setShowSplash }}>
          {children}
      </TelegramContext.Provider>
  );
}
