"use client";

import { motion } from "framer-motion";

const flowPaths = [
  {
    d: "M -50,200 Q 200,150 400,180 T 800,160 T 1200,200 T 1600,180",
    delay: 0,
    duration: 12,
  },
  {
    d: "M -50,400 Q 150,380 350,420 T 750,380 T 1100,430 T 1600,400",
    delay: 2,
    duration: 14,
  },
  {
    d: "M -50,600 Q 250,580 450,620 T 850,590 T 1200,640 T 1600,600",
    delay: 4,
    duration: 16,
  },
  {
    d: "M -50,300 Q 300,280 500,320 T 900,290 T 1300,330 T 1600,300",
    delay: 1,
    duration: 13,
  },
  {
    d: "M -50,500 Q 100,520 300,490 T 700,520 T 1050,480 T 1600,510",
    delay: 3,
    duration: 15,
  },
];

export function DataFlowLines() {
  return (
    <svg
      className="absolute inset-0 w-full h-full"
      xmlns="http://www.w3.org/2000/svg"
      preserveAspectRatio="none"
      viewBox="0 0 1600 900"
    >
      <defs>
        <linearGradient id="flowGradient1" x1="0%" y1="0%" x2="100%" y2="0%">
          <stop offset="0%" stopColor="rgba(131, 0, 81, 0)" />
          <stop offset="30%" stopColor="rgba(131, 0, 81, 0.15)" />
          <stop offset="50%" stopColor="rgba(206, 0, 88, 0.2)" />
          <stop offset="70%" stopColor="rgba(131, 0, 81, 0.15)" />
          <stop offset="100%" stopColor="rgba(131, 0, 81, 0)" />
        </linearGradient>
        <linearGradient id="flowGradient2" x1="0%" y1="0%" x2="100%" y2="0%">
          <stop offset="0%" stopColor="rgba(80, 160, 220, 0)" />
          <stop offset="30%" stopColor="rgba(80, 160, 220, 0.08)" />
          <stop offset="50%" stopColor="rgba(100, 200, 255, 0.12)" />
          <stop offset="70%" stopColor="rgba(80, 160, 220, 0.08)" />
          <stop offset="100%" stopColor="rgba(80, 160, 220, 0)" />
        </linearGradient>
      </defs>

      {flowPaths.map((path, index) => (
        <g key={index}>
          {/* Base path */}
          <motion.path
            d={path.d}
            fill="none"
            stroke={index % 2 === 0 ? "url(#flowGradient1)" : "url(#flowGradient2)"}
            strokeWidth="1"
            initial={{ pathLength: 0, opacity: 0 }}
            animate={{ pathLength: 1, opacity: 1 }}
            transition={{
              pathLength: { duration: path.duration, repeat: Infinity, ease: "linear" },
              opacity: { duration: 2, delay: path.delay },
            }}
          />
          {/* Animated glow path */}
          <motion.path
            d={path.d}
            fill="none"
            stroke={index % 2 === 0 ? "rgba(206, 0, 88, 0.4)" : "rgba(100, 200, 255, 0.3)"}
            strokeWidth="2"
            strokeLinecap="round"
            strokeDasharray="20 200"
            animate={{ strokeDashoffset: [-220, -1800] }}
            transition={{
              duration: path.duration,
              delay: path.delay,
              repeat: Infinity,
              ease: "linear",
            }}
          />
        </g>
      ))}
    </svg>
  );
}
