/**
 * Browser Chrome
 *
 * Fake macOS-style browser chrome bar with traffic lights, URL bar, and loading indicator.
 */

"use client";

import { motion } from "framer-motion";
import { Globe } from "lucide-react";

interface BrowserChromeProps {
  url: string;
  isLoading: boolean;
}

export function BrowserChrome({ url, isLoading }: BrowserChromeProps) {
  return (
    <div
      className="flex items-center gap-3 px-4 py-2.5 border-b select-none"
      style={{
        background: "linear-gradient(180deg, #2a2a3e 0%, #1f1f32 100%)",
        borderColor: "rgba(255,255,255,0.06)",
      }}
    >
      {/* Traffic lights */}
      <div className="flex items-center gap-1.5">
        <span className="w-3 h-3 rounded-full bg-[#ff5f57] border border-[#e0443e]" />
        <span className="w-3 h-3 rounded-full bg-[#febc2e] border border-[#dea123]" />
        <span className="w-3 h-3 rounded-full bg-[#28c840] border border-[#1aab29]" />
      </div>

      {/* URL bar */}
      <div
        className="flex-1 flex items-center gap-2 px-3 py-1.5 rounded-md"
        style={{
          background: "rgba(255,255,255,0.06)",
          border: "1px solid rgba(255,255,255,0.08)",
        }}
      >
        {isLoading ? (
          <motion.div
            animate={{ rotate: 360 }}
            transition={{ duration: 1, repeat: Infinity, ease: "linear" }}
            className="flex-shrink-0"
          >
            <Globe size={13} style={{ color: "var(--mulberry)" }} />
          </motion.div>
        ) : (
          <Globe size={13} className="flex-shrink-0" style={{ color: "rgba(255,255,255,0.4)" }} />
        )}
        <span
          className="text-xs truncate flex-1"
          style={{
            fontFamily: "var(--font-mono)",
            color: "rgba(255,255,255,0.6)",
          }}
        >
          {url || "about:blank"}
        </span>
      </div>

      {/* Loading indicator */}
      {isLoading && (
        <motion.div
          className="absolute bottom-0 left-0 right-0 h-[2px]"
          style={{ background: "var(--mulberry)" }}
          initial={{ scaleX: 0, originX: 0 }}
          animate={{ scaleX: [0, 0.6, 0.8, 1] }}
          transition={{ duration: 2, ease: "easeInOut", repeat: Infinity }}
        />
      )}
    </div>
  );
}
