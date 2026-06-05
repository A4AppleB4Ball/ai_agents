"use client";

import { useEffect, useState } from "react";
import { motion } from "framer-motion";
import { NetworkNodes } from "@/app/login/components/NetworkNodes";
import { UIAgentVisualization } from "@/app/login/components/UIAgentVisualization";
import { InfraAgentVisualization } from "@/app/login/components/InfraAgentVisualization";
import { DataFlowLines } from "@/app/login/components/DataFlowLines";

export function AnimatedBackground() {
  return (
    <div className="absolute inset-0 overflow-hidden pointer-events-none">
      <NetworkNodes />
      <UIAgentVisualization />
      <InfraAgentVisualization />
      <DataFlowLines />
      <FloatingParticles />
    </div>
  );
}

function seededRandom(seed: number): number {
  const x = Math.sin(seed * 9301 + 49297) * 49297;
  return x - Math.floor(x);
}

function FloatingParticles() {
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    setMounted(true);
  }, []);

  if (!mounted) return null;

  const particles = Array.from({ length: 30 }, (_, i) => ({
    id: i,
    x: seededRandom(i * 7 + 1) * 100,
    y: seededRandom(i * 13 + 3) * 100,
    size: seededRandom(i * 19 + 5) * 3 + 1,
    duration: seededRandom(i * 23 + 7) * 20 + 15,
    delay: seededRandom(i * 29 + 11) * 10,
  }));

  return (
    <div className="absolute inset-0">
      {particles.map((particle) => (
        <motion.div
          key={particle.id}
          className="absolute rounded-full"
          style={{
            left: `${particle.x}%`,
            top: `${particle.y}%`,
            width: particle.size,
            height: particle.size,
            backgroundColor: particle.id % 3 === 0
              ? "rgba(206, 0, 88, 0.4)"
              : particle.id % 3 === 1
                ? "rgba(131, 0, 81, 0.3)"
                : "rgba(100, 200, 255, 0.2)",
          }}
          animate={{
            y: [0, -30, 0, 20, 0],
            x: [0, 15, -10, 5, 0],
            opacity: [0.2, 0.6, 0.3, 0.5, 0.2],
          }}
          transition={{
            duration: particle.duration,
            delay: particle.delay,
            repeat: Infinity,
            ease: "linear",
          }}
        />
      ))}
    </div>
  );
}
