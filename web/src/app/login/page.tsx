"use client";

import { useCallback, useState } from "react";
import { motion } from "framer-motion";
import { loginWithEntra } from "@/lib/auth/actions";
import { AnimatedBackground } from "@/app/login/components/AnimatedBackground";
import { FloatingAgentBadges } from "@/app/login/components/FloatingAgentBadges";

export default function LoginPage() {
  const [isLoading, setIsLoading] = useState(false);

  const handleLogin = useCallback(async () => {
    setIsLoading(true);
    const url = await loginWithEntra();
    window.location.href = url;
  }, []);

  return (
    <main className="relative flex h-screen w-full overflow-hidden bg-[#0a0a0f] text-white items-center justify-center">
      {/* Animated Background */}
      <AnimatedBackground />

      {/* Floating Agent Badges */}
      <FloatingAgentBadges />

      {/* Aurora gradient overlay */}
      <div className="absolute inset-0 pointer-events-none">
        <div className="absolute top-0 left-0 w-[600px] h-[600px] rounded-full bg-[#830051]/10 blur-[120px] animate-pulse" />
        <div className="absolute bottom-0 right-0 w-[500px] h-[500px] rounded-full bg-[#4D0030]/15 blur-[100px] animate-pulse" style={{ animationDelay: "1s" }} />
        <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[800px] h-[800px] rounded-full bg-[#CE0058]/5 blur-[150px]" />
      </div>

      {/* Subtle grid pattern */}
      <div
        className="absolute inset-0 pointer-events-none opacity-[0.03]"
        style={{
          backgroundImage: `linear-gradient(rgba(255,255,255,0.1) 1px, transparent 1px), linear-gradient(90deg, rgba(255,255,255,0.1) 1px, transparent 1px)`,
          backgroundSize: "60px 60px",
        }}
      />

      {/* Login Card */}
      <motion.div
        initial={{ opacity: 0, y: 20, scale: 0.95 }}
        animate={{ opacity: 1, y: 0, scale: 1 }}
        transition={{ duration: 0.8, ease: [0.16, 1, 0.3, 1] }}
        className="relative z-10 flex flex-col items-center gap-10 px-12 py-14 rounded-3xl bg-white/[0.04] backdrop-blur-2xl border border-white/[0.08] shadow-[0_0_80px_-20px_rgba(131,0,81,0.3)] max-w-[420px] w-full mx-4"
      >
        {/* Glow ring behind card */}
        <div className="absolute -inset-[1px] rounded-3xl bg-gradient-to-b from-white/[0.08] to-transparent pointer-events-none" />

        {/* Logo and Title */}
        <div className="flex flex-col items-center gap-4">
          <motion.div
            initial={{ scale: 0 }}
            animate={{ scale: 1 }}
            transition={{ delay: 0.3, type: "spring", stiffness: 200, damping: 15 }}
            className="relative"
          >
            <div className="absolute inset-0 bg-[#F0AB00]/15 blur-2xl scale-[2.5] rounded-full" />
            <img
              src="/favicon.svg"
              alt="AI Agents"
              className="relative h-16 w-auto drop-shadow-[0_0_20px_rgba(240,171,0,0.4)]"
            />
          </motion.div>

          <motion.div
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.5, duration: 0.6 }}
            className="flex flex-col items-center gap-2"
          >
            <h1 className="text-3xl font-bold tracking-tight bg-gradient-to-r from-white via-white to-white/60 bg-clip-text text-transparent">
              Digital AI Agents
            </h1>
            <p className="text-sm text-white/40 text-center max-w-[280px] leading-relaxed">
              Purpose-built AI agents for infrastructure, testing, and intelligent automation
            </p>
          </motion.div>
        </div>

        {/* Divider */}
        <div className="w-full h-px bg-gradient-to-r from-transparent via-white/10 to-transparent" />

        {/* Login Button */}
        <motion.div
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.7, duration: 0.5 }}
          className="w-full"
        >
          <button
            onClick={handleLogin}
            disabled={isLoading}
            className="group relative w-full px-8 py-4 rounded-xl font-medium text-white transition-all duration-300 disabled:opacity-50 disabled:cursor-not-allowed overflow-hidden"
          >
            {/* Button background gradient */}
            <div className="absolute inset-0 bg-gradient-to-r from-[#830051] via-[#CE0058] to-[#830051] rounded-xl transition-opacity group-hover:opacity-90" />
            <div className="absolute inset-0 bg-gradient-to-r from-[#830051] via-[#CE0058] to-[#830051] rounded-xl opacity-0 group-hover:opacity-100 blur-xl transition-opacity" />

            {/* Shimmer effect */}
            <div className="absolute inset-0 rounded-xl overflow-hidden">
              <div className="absolute inset-0 -translate-x-full group-hover:translate-x-full transition-transform duration-1000 bg-gradient-to-r from-transparent via-white/10 to-transparent" />
            </div>

            <span className="relative z-10 flex items-center justify-center gap-2">
              {isLoading ? (
                <>
                  <LoadingSpinner />
                  Redirecting...
                </>
              ) : (
                <>
                  <SSOIcon />
                  Login with SSO
                </>
              )}
            </span>
          </button>
        </motion.div>

        {/* Footer note */}
        <motion.p
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ delay: 1, duration: 0.5 }}
          className="text-xs text-white/20 text-center"
        >
          Secured with Microsoft Entra ID
        </motion.p>
      </motion.div>
    </main>
  );
}

function SSOIcon() {
  return (
    <svg width="18" height="18" viewBox="0 0 18 18" fill="none" xmlns="http://www.w3.org/2000/svg">
      <path d="M8.5 1H1.5V8.5H8.5V1Z" fill="currentColor" fillOpacity="0.9" />
      <path d="M16.5 1H9.5V8.5H16.5V1Z" fill="currentColor" fillOpacity="0.9" />
      <path d="M8.5 9.5H1.5V17H8.5V9.5Z" fill="currentColor" fillOpacity="0.9" />
      <path d="M16.5 9.5H9.5V17H16.5V9.5Z" fill="currentColor" fillOpacity="0.9" />
    </svg>
  );
}

function LoadingSpinner() {
  return (
    <svg className="animate-spin h-4 w-4" viewBox="0 0 24 24" fill="none">
      <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="3" />
      <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
    </svg>
  );
}
