"use client";

import { useEffect, useState } from "react";
import { eventStartMs, formatEventMoment } from "@/lib/dates";

// `wrap` keeps each unit within its range; days are unbounded
const UNITS = [
  { label: "dagar", ms: 86_400_000, wrap: Infinity },
  { label: "timmar", ms: 3_600_000, wrap: 24 },
  { label: "minuter", ms: 60_000, wrap: 60 },
  { label: "sekunder", ms: 1_000, wrap: 60 },
];

interface CountdownProps {
  eventDate: string;
  eventTime: string | null; // without a time, counts to midnight
}

// Counts down to the event moment, Stockholm time
export default function Countdown({ eventDate, eventTime }: CountdownProps) {
  const target = eventStartMs(eventDate, eventTime);
  const dayEnd = eventStartMs(eventDate) + 86_400_000;
  const [now, setNow] = useState(() => Date.now());

  useEffect(() => {
    const timer = setInterval(() => setNow(Date.now()), 1000);
    return () => clearInterval(timer);
  }, []);

  const left = target - now;
  const moment = formatEventMoment(eventDate, eventTime);

  if (left <= 0) {
    return (
      <p className="countdown-done">
        {now < dayEnd ? "Nu är det dags! Julklapparna delas ut idag." : `Julklapparna delades ut ${moment}.`}
      </p>
    );
  }

  const parts = UNITS.map((unit) => ({ ...unit, value: Math.floor(left / unit.ms) % unit.wrap }));

  return (
    <div className="countdown" role="timer" aria-label={`Nedräkning till ${moment}`}>
      <p className="countdown-title">Kvar till {moment}</p>
      <div className="countdown-units">
        {parts.map((p) => (
          <div key={p.label} className="countdown-unit">
            <span className="countdown-value">{String(p.value).padStart(2, "0")}</span>
            <span className="countdown-label">{p.label}</span>
          </div>
        ))}
      </div>
    </div>
  );
}
