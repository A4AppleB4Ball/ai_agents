/**
 * Live Viewport
 *
 * Renders CDP screencast frames with smooth transitions.
 * Includes browser chrome, frame display, and action overlay.
 */

"use client";

import { motion, AnimatePresence } from "framer-motion";
import { Monitor } from "lucide-react";
import { useBrowserStore } from "@/features/ui-agent/store/browser-store";
import { useScreencast } from "@/features/ui-agent/hooks/use-screencast";
import { BrowserChrome } from "@/features/ui-agent/components/browser-chrome";
import { ActionOverlay } from "@/features/ui-agent/components/action-overlay";

export function LiveViewport() {
  const activeSessionId = useBrowserStore((s) => s.activeSessionId);
  const sessions = useBrowserStore((s) => s.sessions);
  const currentFrame = useBrowserStore((s) =>
    activeSessionId ? s.currentFrame[activeSessionId] : undefined
  );
  const currentAction = useBrowserStore((s) =>
    activeSessionId ? s.currentAction[activeSessionId] : null
  );

  const activeSession = sessions.find((s) => s.session_id === activeSessionId);
  const frameSrc = useScreencast(currentFrame);

  const isLoading = activeSession
    ? currentAction?.action === "page_load" || currentAction?.action === "navigate"
    : false;

  return (
    <div className="flex-1 flex flex-col relative overflow-hidden" style={{ background: "#1a1a2e" }}>
      {/* Browser chrome */}
      <BrowserChrome url={activeSession?.url || ""} isLoading={isLoading} />

      {/* Frame display area */}
      <div className="flex-1 relative overflow-hidden">
        <AnimatePresence mode="wait">
          {frameSrc ? (
            <motion.img
              key="screencast-frame"
              src={frameSrc}
              alt="Browser screencast"
              className="w-full h-full object-contain"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              transition={{ duration: 0.15, ease: "easeOut" }}
            />
          ) : (
            <motion.div
              key="empty-state"
              className="flex-1 h-full flex flex-col items-center justify-center gap-4"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              transition={{ duration: 0.3 }}
            >
              {/* Pulsing browser outline */}
              <motion.div
                animate={{
                  scale: [1, 1.05, 1],
                  opacity: [0.4, 0.7, 0.4],
                }}
                transition={{
                  duration: 2.5,
                  repeat: Infinity,
                  ease: "easeInOut",
                }}
              >
                <Monitor size={56} style={{ color: "rgba(131,0,81,0.4)" }} strokeWidth={1.2} />
              </motion.div>

              <p
                className="text-xs uppercase tracking-widest"
                style={{
                  color: "rgba(255,255,255,0.35)",
                  fontFamily: "var(--font-mono)",
                }}
              >
                Waiting for browser session...
              </p>

              {/* Subtle scan line animation */}
              <motion.div
                className="absolute left-0 right-0 h-[1px]"
                style={{
                  background:
                    "linear-gradient(90deg, transparent 0%, rgba(131,0,81,0.3) 50%, transparent 100%)",
                }}
                animate={{ top: ["0%", "100%"] }}
                transition={{ duration: 3, repeat: Infinity, ease: "linear" }}
              />
            </motion.div>
          )}
        </AnimatePresence>

        {/* Action overlay */}
        <ActionOverlay action={currentAction ?? null} />
      </div>
    </div>
  );
}
