"use client";

import { CSSProperties } from "react";
import { cn } from "@/lib/utils";

interface BrandOrbProps {
  size?: number;
  pulse?: boolean;
  className?: string;
  style?: CSSProperties;
}

export function BrandOrb({ size = 38, pulse = false, className, style }: BrandOrbProps) {
  return (
    <span
      aria-hidden
      className={cn("az-orb inline-block flex-shrink-0", pulse && "az-orb-pulse", className)}
      style={{ width: size, height: size, ...style }}
    />
  );
}
