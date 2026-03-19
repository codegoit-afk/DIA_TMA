"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { Calculator, UtensilsCrossed, History, TrendingUp } from "lucide-react";
import { useUser } from "@/components/providers/TelegramProvider";
import { cn } from "@/lib/utils/utils";

export function Navigation() {
  const pathname = usePathname();
  const { t } = useUser();

  const items = [
    { href: '/', icon: Calculator, label: t.calculator },
    { href: '/my-foods', icon: UtensilsCrossed, label: t.food_nav || "їжа" },
    { href: '/logs', icon: History, label: t.history },
    { href: '/analytics', icon: TrendingUp, label: t.analytics_nav || "Тренди" }
  ];

  return (
    <div className="fixed bottom-0 left-0 right-0 p-6 pointer-events-none z-50">
      <div className="max-w-[375px] mx-auto nm-outset rounded-[2.5rem] p-2 flex items-center gap-2 pointer-events-auto bg-[#F8F4F0]/80 backdrop-blur-md">
        {items.map((item, idx) => {
          const isActive = pathname === item.href;
          const Icon = item.icon;
          return (
            <Link 
              key={idx}
              href={item.href}
              onClick={() => window.Telegram?.WebApp?.HapticFeedback?.impactOccurred('light')}
              className={cn(
                "flex-1 flex flex-col items-center justify-center p-3 rounded-3xl transition-all duration-300 active:scale-95 gap-1",
                isActive ? "nm-inset-sm text-emerald-500" : "text-gray-400"
              )}
            >
              <Icon className="w-5 h-5" />
              <span className="text-[10px] font-black uppercase tracking-tighter">{item.label}</span>
            </Link>
          );
        })}
      </div>
    </div>
  );
}
