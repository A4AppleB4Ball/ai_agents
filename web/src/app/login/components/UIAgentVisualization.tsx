"use client";

import { motion } from "framer-motion";

export function UIAgentVisualization() {
  return (
    <div className="absolute top-[5%] left-[3%] w-[420px] h-[320px] opacity-70">
      <motion.div
        className="relative w-full h-full rounded-xl border border-white/[0.08] bg-white/[0.02] backdrop-blur-sm overflow-hidden"
        initial={{ opacity: 0, x: -40 }}
        animate={{ opacity: 1, x: 0 }}
        transition={{ duration: 1.2, delay: 0.8 }}
      >
        {/* Browser chrome */}
        <div className="flex items-center gap-2 px-4 py-3 border-b border-white/[0.06] bg-white/[0.02]">
          <div className="w-2.5 h-2.5 rounded-full bg-red-400/50" />
          <div className="w-2.5 h-2.5 rounded-full bg-yellow-400/50" />
          <div className="w-2.5 h-2.5 rounded-full bg-green-400/50" />
          <div className="ml-4 flex-1 h-4 rounded-md bg-white/[0.04] max-w-[200px] flex items-center px-2">
            <span className="text-[9px] font-mono text-white/30">app.example.com/dashboard</span>
          </div>
          <div className="flex gap-1">
            <div className="w-4 h-4 rounded bg-white/[0.04]" />
            <div className="w-4 h-4 rounded bg-white/[0.04]" />
          </div>
        </div>

        {/* Page content with interactive elements */}
        <div className="p-4 space-y-3">
          {/* Navigation bar skeleton */}
          <div className="flex items-center gap-3 pb-3 border-b border-white/[0.04]">
            <div className="h-3 w-16 rounded bg-white/[0.06]" />
            <div className="h-3 w-12 rounded bg-white/[0.04]" />
            <div className="h-3 w-14 rounded bg-white/[0.04]" />
            <div className="ml-auto h-3 w-20 rounded bg-cyan-400/10" />
          </div>

          {/* Content area */}
          <div className="flex gap-3">
            {/* Left panel */}
            <div className="flex-1 space-y-2">
              <div className="h-3 w-3/4 rounded bg-white/[0.05]" />
              <div className="h-3 w-1/2 rounded bg-white/[0.04]" />
              <div className="h-20 w-full rounded-lg bg-white/[0.03] mt-3 p-2">
                <div className="h-2 w-full rounded bg-white/[0.04] mb-1.5" />
                <div className="h-2 w-4/5 rounded bg-white/[0.03] mb-1.5" />
                <div className="h-2 w-3/5 rounded bg-white/[0.03]" />
              </div>
            </div>
            {/* Right panel - form */}
            <div className="w-32 space-y-2">
              <div className="h-6 w-full rounded bg-white/[0.04] border border-white/[0.06]" />
              <div className="h-6 w-full rounded bg-white/[0.04] border border-white/[0.06]" />
              <motion.div
                className="h-6 w-full rounded bg-[#CE0058]/20 border border-[#CE0058]/30"
                animate={{ opacity: [0.5, 1, 0.5] }}
                transition={{ duration: 2, repeat: Infinity }}
              />
            </div>
          </div>

          {/* Table rows */}
          <div className="space-y-1.5 mt-2">
            {[0, 1, 2, 3].map((i) => (
              <motion.div
                key={i}
                className="flex items-center gap-2 h-5 px-2 rounded bg-white/[0.02]"
                animate={{ backgroundColor: i === 1 ? ["rgba(206,0,88,0.05)", "rgba(206,0,88,0.12)", "rgba(206,0,88,0.05)"] : undefined }}
                transition={{ duration: 3, delay: i * 0.5, repeat: Infinity }}
              >
                <div className="w-3 h-3 rounded-sm bg-white/[0.05]" />
                <div className="h-2 flex-1 rounded bg-white/[0.04]" />
                <div className="h-2 w-8 rounded bg-white/[0.03]" />
              </motion.div>
            ))}
          </div>
        </div>

        {/* Animated cursor with trail */}
        <motion.div
          className="absolute z-10"
          animate={{
            x: [80, 200, 310, 200, 120, 80],
            y: [80, 120, 90, 180, 220, 80],
          }}
          transition={{
            duration: 8,
            repeat: Infinity,
            ease: "easeInOut",
          }}
        >
          <svg width="18" height="20" viewBox="0 0 14 16" fill="none">
            <path d="M1 1L1 13L4 9.5L7 15L9 14L6 8L11 8L1 1Z" fill="rgba(206, 0, 88, 0.9)" stroke="rgba(255,255,255,0.7)" strokeWidth="0.8" />
          </svg>
          <motion.div
            className="absolute -top-3 -left-3 w-8 h-8 rounded-full border-2 border-cyan-400/60"
            animate={{
              scale: [0.3, 1.2, 0.3],
              opacity: [0.9, 0, 0.9],
            }}
            transition={{
              duration: 1.5,
              repeat: Infinity,
              ease: "easeOut",
            }}
          />
        </motion.div>

        {/* Highlight box overlay (simulating element selection) */}
        <motion.div
          className="absolute border-2 border-cyan-400/40 rounded bg-cyan-400/5"
          animate={{
            left: ["60px", "200px", "280px", "60px"],
            top: ["120px", "80px", "160px", "120px"],
            width: ["100px", "80px", "120px", "100px"],
            height: ["30px", "25px", "40px", "30px"],
            opacity: [0, 0.8, 0.8, 0],
          }}
          transition={{
            duration: 8,
            repeat: Infinity,
            ease: "easeInOut",
          }}
        />

        {/* Test results panel - larger */}
        <motion.div
          className="absolute bottom-3 right-3 w-36 p-2 rounded-lg border border-white/[0.06] bg-black/40 backdrop-blur-md"
          animate={{ opacity: [0.6, 1, 0.6] }}
          transition={{ duration: 4, repeat: Infinity, ease: "easeInOut" }}
        >
          <div className="text-[9px] font-mono text-white/50 mb-1.5 uppercase tracking-wider">Test Results</div>
          <div className="space-y-1">
            <div className="flex items-center gap-1.5">
              <div className="w-2 h-2 rounded-full bg-green-400/80" />
              <span className="text-[10px] text-green-400/70 font-mono">Login flow</span>
              <span className="ml-auto text-[8px] text-white/30">1.2s</span>
            </div>
            <div className="flex items-center gap-1.5">
              <div className="w-2 h-2 rounded-full bg-green-400/80" />
              <span className="text-[10px] text-green-400/70 font-mono">Form submit</span>
              <span className="ml-auto text-[8px] text-white/30">0.8s</span>
            </div>
            <div className="flex items-center gap-1.5">
              <div className="w-2 h-2 rounded-full bg-green-400/80" />
              <span className="text-[10px] text-green-400/70 font-mono">Navigation</span>
              <span className="ml-auto text-[8px] text-white/30">0.3s</span>
            </div>
            <div className="flex items-center gap-1.5">
              <motion.div
                className="w-2 h-2 rounded-full bg-yellow-400/80"
                animate={{ opacity: [1, 0.3, 1] }}
                transition={{ duration: 0.8, repeat: Infinity }}
              />
              <span className="text-[10px] text-yellow-400/70 font-mono">API call</span>
              <span className="ml-auto text-[8px] text-white/30 animate-pulse">...</span>
            </div>
          </div>
          <div className="mt-2 pt-1.5 border-t border-white/[0.06] flex justify-between">
            <span className="text-[9px] text-white/40 font-mono">3/4 passed</span>
            <span className="text-[9px] text-green-400/60 font-mono">75%</span>
          </div>
        </motion.div>

        {/* Label */}
        <div className="absolute top-3 right-3 px-2 py-0.5 rounded-full bg-white/[0.05] border border-white/[0.08]">
          <span className="text-[9px] font-mono text-cyan-300/60 uppercase tracking-widest">UI Agent</span>
        </div>

        {/* Scan line */}
        <motion.div
          className="absolute left-0 right-0 h-[2px] bg-gradient-to-r from-transparent via-cyan-400/40 to-transparent"
          animate={{ top: ["15%", "95%", "15%"] }}
          transition={{ duration: 5, repeat: Infinity, ease: "easeInOut" }}
        />
      </motion.div>
    </div>
  );
}
