"use client";

import { motion } from "framer-motion";

interface Node {
  id: number;
  x: number;
  y: number;
  size: number;
  pulseDelay: number;
}

interface Connection {
  id: string;
  from: Node;
  to: Node;
}

const nodes: Node[] = [
  { id: 0, x: 10, y: 15, size: 4, pulseDelay: 0 },
  { id: 1, x: 25, y: 30, size: 6, pulseDelay: 0.5 },
  { id: 2, x: 15, y: 55, size: 5, pulseDelay: 1 },
  { id: 3, x: 40, y: 20, size: 4, pulseDelay: 1.5 },
  { id: 4, x: 55, y: 10, size: 5, pulseDelay: 0.3 },
  { id: 5, x: 70, y: 25, size: 6, pulseDelay: 0.8 },
  { id: 6, x: 85, y: 15, size: 4, pulseDelay: 1.2 },
  { id: 7, x: 90, y: 45, size: 5, pulseDelay: 0.6 },
  { id: 8, x: 75, y: 60, size: 4, pulseDelay: 1.8 },
  { id: 9, x: 60, y: 75, size: 6, pulseDelay: 0.2 },
  { id: 10, x: 30, y: 80, size: 5, pulseDelay: 1.4 },
  { id: 11, x: 45, y: 65, size: 4, pulseDelay: 0.9 },
  { id: 12, x: 20, y: 70, size: 5, pulseDelay: 1.6 },
  { id: 13, x: 80, y: 80, size: 4, pulseDelay: 0.4 },
  { id: 14, x: 95, y: 70, size: 5, pulseDelay: 1.1 },
  { id: 15, x: 50, y: 45, size: 6, pulseDelay: 0.7 },
  { id: 16, x: 35, y: 50, size: 4, pulseDelay: 1.3 },
  { id: 17, x: 65, y: 40, size: 5, pulseDelay: 0.1 },
];

const connections: Connection[] = [
  { id: "0-1", from: nodes[0], to: nodes[1] },
  { id: "1-2", from: nodes[1], to: nodes[2] },
  { id: "1-3", from: nodes[1], to: nodes[3] },
  { id: "3-4", from: nodes[3], to: nodes[4] },
  { id: "4-5", from: nodes[4], to: nodes[5] },
  { id: "5-6", from: nodes[5], to: nodes[6] },
  { id: "5-7", from: nodes[5], to: nodes[7] },
  { id: "7-8", from: nodes[7], to: nodes[8] },
  { id: "8-9", from: nodes[8], to: nodes[9] },
  { id: "9-10", from: nodes[9], to: nodes[10] },
  { id: "9-11", from: nodes[9], to: nodes[11] },
  { id: "10-12", from: nodes[10], to: nodes[12] },
  { id: "8-13", from: nodes[8], to: nodes[13] },
  { id: "13-14", from: nodes[13], to: nodes[14] },
  { id: "3-15", from: nodes[3], to: nodes[15] },
  { id: "15-16", from: nodes[15], to: nodes[16] },
  { id: "15-17", from: nodes[15], to: nodes[17] },
  { id: "17-7", from: nodes[17], to: nodes[7] },
  { id: "11-16", from: nodes[11], to: nodes[16] },
  { id: "2-12", from: nodes[2], to: nodes[12] },
];

export function NetworkNodes() {
  return (
    <svg className="absolute inset-0 w-full h-full" xmlns="http://www.w3.org/2000/svg">
      <defs>
        <linearGradient id="connectionGradient" x1="0%" y1="0%" x2="100%" y2="0%">
          <stop offset="0%" stopColor="rgba(131, 0, 81, 0.3)" />
          <stop offset="50%" stopColor="rgba(206, 0, 88, 0.2)" />
          <stop offset="100%" stopColor="rgba(131, 0, 81, 0.1)" />
        </linearGradient>
        <filter id="glow">
          <feGaussianBlur stdDeviation="2" result="coloredBlur" />
          <feMerge>
            <feMergeNode in="coloredBlur" />
            <feMergeNode in="SourceGraphic" />
          </feMerge>
        </filter>
      </defs>

      {/* Connection lines */}
      {connections.map((connection) => (
        <motion.line
          key={connection.id}
          x1={`${connection.from.x}%`}
          y1={`${connection.from.y}%`}
          x2={`${connection.to.x}%`}
          y2={`${connection.to.y}%`}
          stroke="url(#connectionGradient)"
          strokeWidth="0.5"
          initial={{ pathLength: 0, opacity: 0 }}
          animate={{ pathLength: 1, opacity: [0, 0.6, 0.3] }}
          transition={{
            duration: 3,
            delay: Math.random() * 2,
            repeat: Infinity,
            repeatType: "reverse",
            ease: "easeInOut",
          }}
        />
      ))}

      {/* Data flow pulses along connections */}
      {connections.slice(0, 8).map((connection, index) => (
        <motion.circle
          key={`pulse-${connection.id}`}
          r="2"
          fill="rgba(206, 0, 88, 0.8)"
          filter="url(#glow)"
          animate={{
            cx: [`${connection.from.x}%`, `${connection.to.x}%`],
            cy: [`${connection.from.y}%`, `${connection.to.y}%`],
            opacity: [0, 1, 0],
          }}
          transition={{
            duration: 2.5,
            delay: index * 1.2,
            repeat: Infinity,
            ease: "easeInOut",
          }}
        />
      ))}

      {/* Nodes */}
      {nodes.map((node) => (
        <g key={node.id}>
          {/* Outer pulse ring */}
          <motion.circle
            cx={`${node.x}%`}
            cy={`${node.y}%`}
            r={node.size + 4}
            fill="none"
            stroke="rgba(206, 0, 88, 0.2)"
            strokeWidth="0.5"
            animate={{
              r: [node.size + 2, node.size + 8, node.size + 2],
              opacity: [0.3, 0, 0.3],
            }}
            transition={{
              duration: 3,
              delay: node.pulseDelay,
              repeat: Infinity,
              ease: "easeInOut",
            }}
          />
          {/* Inner node */}
          <motion.circle
            cx={`${node.x}%`}
            cy={`${node.y}%`}
            r={node.size / 2}
            fill="rgba(206, 0, 88, 0.6)"
            filter="url(#glow)"
            animate={{
              opacity: [0.4, 0.8, 0.4],
              r: [node.size / 2, node.size / 2 + 1, node.size / 2],
            }}
            transition={{
              duration: 2,
              delay: node.pulseDelay,
              repeat: Infinity,
              ease: "easeInOut",
            }}
          />
        </g>
      ))}
    </svg>
  );
}
