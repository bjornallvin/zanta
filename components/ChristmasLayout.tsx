"use client";

import Snowfall from "./Snowfall";

interface ChristmasLayoutProps {
  children: React.ReactNode;
}

export default function ChristmasLayout({ children }: ChristmasLayoutProps) {
  return (
    <div className="relative min-h-screen overflow-hidden">
      {/* Animated gradient background */}
      <div className="fixed inset-0 bg-gradient-to-br from-red-100 via-green-100 to-blue-100 dark:from-red-950 dark:via-green-950 dark:to-blue-950 animate-gradient" />

      {/* Christmas decorations overlay */}
      <div className="fixed inset-0 opacity-10 dark:opacity-5 pointer-events-none">
        <div className="absolute top-0 left-0 text-6xl">❄️</div>
        <div className="absolute top-0 right-0 text-6xl">🎄</div>
        <div className="absolute top-20 left-1/4 text-4xl">⭐</div>
        <div className="absolute top-40 right-1/3 text-5xl">🎁</div>
        <div className="absolute bottom-20 left-1/3 text-5xl">🔔</div>
        <div className="absolute bottom-10 right-1/4 text-6xl">🎅</div>
        <div className="absolute top-1/3 left-10 text-4xl">🎀</div>
        <div className="absolute top-2/3 right-10 text-4xl">🕯️</div>
      </div>

      {/* Snowfall effect */}
      <Snowfall />

      {/* Content */}
      <div className="relative z-10">
        {children}
      </div>
    </div>
  );
}
