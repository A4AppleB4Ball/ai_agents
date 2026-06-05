"use client";

import { motion } from "framer-motion";

interface AgentBadge {
  label: string;
  x: string;
  y: string;
  delay: number;
  driftX: number;
  driftY: number;
  duration: number;
}

const badges: AgentBadge[] = [
  { label: "UI Testing", x: "8%", y: "25%", delay: 1.5, driftX: 10, driftY: -8, duration: 18 },
  { label: "Infrastructure", x: "82%", y: "72%", delay: 2.2, driftX: -8, driftY: 6, duration: 20 },
  { label: "Analytics", x: "75%", y: "18%", delay: 3, driftX: -5, driftY: -10, duration: 22 },
  { label: "Automation", x: "12%", y: "78%", delay: 2.8, driftX: 8, driftY: -5, duration: 19 },
  { label: "Data Pipeline", x: "60%", y: "85%", delay: 3.5, driftX: -6, driftY: -8, duration: 21 },
  { label: "Monitoring", x: "88%", y: "42%", delay: 2, driftX: -10, driftY: 5, duration: 17 },
];

export function FloatingAgentBadges() {
  return (
    <div className="absolute inset-0 pointer-events-none">
      {badges.map((badge) => (
        <motion.div
          key={badge.label}
          className="absolute"
          style={{ left: badge.x, top: badge.y }}
          initial={{ opacity: 0, scale: 0.8 }}
          animate={{
            opacity: [0, 0.7, 0.5, 0.7, 0],
            scale: [0.8, 1, 0.95, 1, 0.8],
            x: [0, badge.driftX, badge.driftX / 2, -badge.driftX / 3, 0],
            y: [0, badge.driftY, badge.driftY / 2, -badge.driftY / 3, 0],
          }}
          transition={{
            duration: badge.duration,
            delay: badge.delay,
            repeat: Infinity,
            ease: "easeInOut",
          }}
        >
          <div className="px-3 py-1.5 rounded-full border border-white/[0.08] bg-white/[0.03] backdrop-blur-md">
            <span className="text-[10px] font-mono text-white/40 tracking-wider uppercase">
              {badge.label}
            </span>
          </div>
        </motion.div>
      ))}
    </div>
  );
}
