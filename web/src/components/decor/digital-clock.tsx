"use client";

import { useEffect, useState } from "react";

const DAYS = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"];
const MONTHS = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"];

function formatNow(date: Date) {
  const hh = date.getHours().toString().padStart(2, "0");
  const mm = date.getMinutes().toString().padStart(2, "0");
  return `${hh}:${mm}`;
}

function formatDate(date: Date) {
  return `${DAYS[date.getDay()]} · ${date.getDate().toString().padStart(2, "0")} ${MONTHS[date.getMonth()]} ${date.getFullYear()}`;
}

export function DigitalClock({ city = "Cambridge, UK" }: { city?: string }) {
  const [now, setNow] = useState<Date | null>(null);

  useEffect(() => {
    const tick = () => setNow(new Date());
    tick();
    const interval = setInterval(tick, 60_000);
    return () => clearInterval(interval);
  }, []);

  if (!now) {
    return (
      <div className="text-right" style={{ fontFamily: "var(--font-mono)" }}>
        <div
          className="font-semibold leading-none"
          style={{ fontFamily: "var(--font-serif)", fontSize: 28, letterSpacing: "-0.02em", color: "var(--ink)" }}
        >
          --:--
        </div>
        <div
          className="mt-1"
          style={{ fontSize: 10, textTransform: "uppercase", letterSpacing: "0.14em", color: "var(--gray-text)" }}
        >
          &nbsp;
        </div>
        <div className="mt-2 opacity-70" style={{ fontSize: 11, color: "var(--gray-text)" }}>
          {city}
        </div>
      </div>
    );
  }

  return (
    <div className="text-right" style={{ fontFamily: "var(--font-mono)", color: "var(--gray-text)", fontSize: 11, lineHeight: 1.6 }}>
      <div
        className="font-semibold leading-none"
        style={{
          fontFamily: "var(--font-serif)",
          fontSize: 28,
          letterSpacing: "-0.02em",
          color: "var(--ink)",
          fontFeatureSettings: '"tnum"',
        }}
      >
        {formatNow(now)}
      </div>
      <div
        className="mt-1"
        style={{ fontSize: 10, textTransform: "uppercase", letterSpacing: "0.14em" }}
      >
        {formatDate(now)}
      </div>
      <div className="mt-2 opacity-70" style={{ fontSize: 11 }}>
        {city}
      </div>
    </div>
  );
}
