"use client";

import { useEffect, useState, createContext, useContext } from "react";
import { User, CalculatorState } from "@/types";

type TelegramContextType = {
    user: User | null;
    calculatorState: CalculatorState;
    setCalculatorState: React.Dispatch<React.SetStateAction<CalculatorState>>;
};

const defaultCalcState: CalculatorState = {
  sugar: "",
  previewUrl: null,
  result: null,
  aiData: null
};

const TelegramContext = createContext<TelegramContextType>({ 
    user: null,
    calculatorState: defaultCalcState,
    setCalculatorState: () => {}
});

export const useUser = () => useContext(TelegramContext);

export function TelegramProvider({ children }: { children: React.ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [calculatorState, setCalculatorState] = useState<CalculatorState>(defaultCalcState);

  useEffect(() => {
    // Check if we are running inside Telegram Web App
    const initTelegram = async () => {
      // @ts-ignore
      const WebApp = window.Telegram?.WebApp;
      
      if (WebApp) {
        WebApp.ready();
        WebApp.expand();
        
        const tgUser = WebApp.initDataUnsafe?.user;
        
        if (tgUser) {
          // In a real app we'd fetch the user role from Supabase here
          setUser({
            telegram_id: tgUser.id,
            username: tgUser.username,
            first_name: tgUser.first_name,
            role: 'user', // Default mock
            created_at: new Date().toISOString()
          });
        }
      } else {
        // Mock user for local development outside Telegram
        console.log("Not in Telegram, using mock user");
        setUser({
          telegram_id: 11111111,
          username: 'mock_user',
          first_name: 'Mock',
          role: 'admin',
          created_at: new Date().toISOString()
        });
      }
    };

    initTelegram();
  }, []);

  return (
      <TelegramContext.Provider value={{ user, calculatorState, setCalculatorState }}>
          {children}
      </TelegramContext.Provider>
  );
}
