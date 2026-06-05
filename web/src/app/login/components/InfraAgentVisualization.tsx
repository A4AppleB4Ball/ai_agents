"use client";

import { motion } from "framer-motion";

export function InfraAgentVisualization() {
  return (
    <div className="absolute bottom-[4%] right-[3%] w-[440px] h-[320px] opacity-70">
      <motion.div
        className="relative w-full h-full rounded-xl border border-white/[0.08] bg-white/[0.02] backdrop-blur-sm overflow-hidden"
        initial={{ opacity: 0, x: 40 }}
        animate={{ opacity: 1, x: 0 }}
        transition={{ duration: 1.2, delay: 1.2 }}
      >
        {/* Terminal header */}
        <div className="flex items-center gap-2 px-4 py-2.5 border-b border-white/[0.06] bg-white/[0.02]">
          <div className="w-2.5 h-2.5 rounded-full bg-red-400/50" />
          <div className="w-2.5 h-2.5 rounded-full bg-yellow-400/50" />
          <div className="w-2.5 h-2.5 rounded-full bg-green-400/50" />
          <span className="ml-3 text-[10px] font-mono text-white/40">infra-agent — deploying</span>
          <div className="ml-auto px-2 py-0.5 rounded-full bg-white/[0.05] border border-white/[0.08]">
            <span className="text-[9px] font-mono text-[#CE0058]/70 uppercase tracking-widest">Infra Agent</span>
          </div>
        </div>

        {/* Main content area - architecture diagram */}
        <div className="relative p-4 h-[calc(100%-40px)]">
          {/* Cloud provider nodes */}
          <svg className="absolute inset-0 w-full h-full" xmlns="http://www.w3.org/2000/svg">
            {/* Connection lines from center hub to cloud nodes */}
            {connectionLines.map((line, i) => (
              <motion.line
                key={i}
                x1="50%" y1="45%"
                x2={line.x2} y2={line.y2}
                stroke="url(#infraGradient)"
                strokeWidth="1"
                strokeDasharray="6 4"
                animate={{ strokeDashoffset: [10, 0] }}
                transition={{ duration: 1.5, repeat: Infinity, ease: "linear", delay: i * 0.2 }}
              />
            ))}
            {/* Data packets traveling along lines */}
            {connectionLines.map((line, i) => (
              <motion.circle
                key={`packet-${i}`}
                r="3"
                fill="#CE0058"
                opacity="0.7"
                animate={{
                  cx: ["50%", line.x2],
                  cy: ["45%", line.y2],
                  opacity: [0.8, 0],
                  r: [3, 1],
                }}
                transition={{
                  duration: 2,
                  delay: i * 0.8,
                  repeat: Infinity,
                  ease: "easeOut",
                }}
              />
            ))}
            <defs>
              <linearGradient id="infraGradient" x1="0%" y1="0%" x2="100%" y2="100%">
                <stop offset="0%" stopColor="rgba(206, 0, 88, 0.5)" />
                <stop offset="100%" stopColor="rgba(100, 200, 255, 0.3)" />
              </linearGradient>
            </defs>
          </svg>

          {/* Central deployment hub */}
          <motion.div
            className="absolute top-[35%] left-[43%] w-16 h-16 rounded-xl border border-[#CE0058]/40 bg-[#CE0058]/10 flex items-center justify-center backdrop-blur-sm"
            animate={{ boxShadow: ["0 0 20px rgba(206,0,88,0.1)", "0 0 40px rgba(206,0,88,0.3)", "0 0 20px rgba(206,0,88,0.1)"] }}
            transition={{ duration: 3, repeat: Infinity }}
          >
            <motion.div
              className="w-8 h-8 rounded-lg border border-white/20 bg-white/5 flex items-center justify-center"
              animate={{ rotate: [0, 90, 180, 270, 360] }}
              transition={{ duration: 12, repeat: Infinity, ease: "linear" }}
            >
              <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="rgba(255,255,255,0.6)" strokeWidth="1.5">
                <path d="M12 2L2 7l10 5 10-5-10-5zM2 17l10 5 10-5M2 12l10 5 10-5" />
              </svg>
            </motion.div>
          </motion.div>

          {/* Cloud provider cards */}
          {cloudProviders.map((provider, index) => (
            <motion.div
              key={provider.name}
              className="absolute flex flex-col items-center"
              style={{ top: provider.y, left: provider.x }}
              initial={{ opacity: 0, scale: 0 }}
              animate={{ opacity: 1, scale: 1 }}
              transition={{ delay: 1.5 + index * 0.3, type: "spring", stiffness: 200, damping: 15 }}
            >
              <motion.div
                className="w-14 h-14 rounded-xl border border-white/[0.1] bg-white/[0.03] backdrop-blur-sm flex flex-col items-center justify-center gap-0.5"
                animate={{ y: [0, -4, 0] }}
                transition={{ duration: 3 + index, repeat: Infinity, ease: "easeInOut" }}
              >
                <span className="text-lg">{provider.icon}</span>
                <span className="text-[8px] font-mono text-white/50">{provider.name}</span>
              </motion.div>
              {/* Status indicator */}
              <motion.div
                className="mt-1 w-1.5 h-1.5 rounded-full"
                style={{ backgroundColor: provider.color }}
                animate={{ scale: [1, 1.5, 1], opacity: [0.7, 1, 0.7] }}
                transition={{ duration: 2, delay: index * 0.5, repeat: Infinity }}
              />
            </motion.div>
          ))}

          {/* Deployment log */}
          <motion.div
            className="absolute bottom-2 left-3 right-3 p-2.5 rounded-lg border border-white/[0.06] bg-black/50 backdrop-blur-md"
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 2.5 }}
          >
            <div className="space-y-1">
              {deployLogs.map((log, i) => (
                <motion.div
                  key={i}
                  className="flex items-center gap-2"
                  initial={{ opacity: 0, x: -10 }}
                  animate={{ opacity: 1, x: 0 }}
                  transition={{ delay: 3 + i * 0.8, duration: 0.4 }}
                >
                  <motion.span
                    className="text-[10px]"
                    animate={i === deployLogs.length - 1 ? { opacity: [0.5, 1, 0.5] } : undefined}
                    transition={{ duration: 1, repeat: Infinity }}
                  >
                    {log.icon}
                  </motion.span>
                  <span className="text-[10px] font-mono text-white/50">{log.text}</span>
                  <span className="ml-auto text-[9px] font-mono text-white/25">{log.time}</span>
                </motion.div>
              ))}
            </div>
            {/* Progress bar */}
            <div className="mt-2 h-1.5 rounded-full bg-white/[0.05] overflow-hidden">
              <motion.div
                className="h-full rounded-full bg-gradient-to-r from-[#830051] via-[#CE0058] to-green-400/60"
                animate={{ width: ["0%", "78%"] }}
                transition={{ duration: 6, repeat: Infinity, ease: "easeInOut" }}
              />
            </div>
          </motion.div>
        </div>
      </motion.div>
    </div>
  );
}

const cloudProviders = [
  { name: "AWS", icon: "☁", x: "8%", y: "10%", color: "rgba(255, 153, 0, 0.7)" },
  { name: "Azure", icon: "⚡", x: "72%", y: "8%", color: "rgba(0, 120, 212, 0.7)" },
  { name: "GCP", icon: "▲", x: "78%", y: "50%", color: "rgba(66, 133, 244, 0.7)" },
  { name: "K8s", icon: "⚙", x: "5%", y: "55%", color: "rgba(50, 108, 229, 0.7)" },
];

const connectionLines = [
  { x2: "15%", y2: "18%" },
  { x2: "78%", y2: "16%" },
  { x2: "84%", y2: "58%" },
  { x2: "12%", y2: "63%" },
];

const deployLogs = [
  { icon: "✅", text: "terraform plan — 3 resources", time: "0:02" },
  { icon: "✅", text: "aws_ecs_service.app created", time: "0:14" },
  { icon: "✅", text: "aws_alb_target.web created", time: "0:21" },
  { icon: "⏳", text: "deploying to eu-west-1...", time: "0:28" },
];
