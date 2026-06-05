"use client";

interface LoadingOrbProps {
  /** Legacy frames prop kept for call-site compatibility; no longer used. */
  frames?: string[];
  size?: number;
}

export function LoadingOrb({ size = 12 }: LoadingOrbProps) {
  return (
    <span
      aria-hidden
      className="az-orb az-orb-pulse inline-block"
      style={{ width: size, height: size }}
    />
  );
}
