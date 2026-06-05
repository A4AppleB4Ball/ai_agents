interface HealthDotProps {
  health: "green" | "yellow" | "red" | "gray";
  size?: "sm" | "md";
}

const COLOR_MAP: Record<HealthDotProps["health"], string> = {
  green: "#10b981",
  yellow: "#f59e0b",
  red: "#ef4444",
  gray: "#d1d5db",
};

export default function HealthDot({ health, size = "md" }: HealthDotProps) {
  const px = size === "sm" ? 8 : 12;

  return (
    <span
      className={health === "red" ? "animate-pulse" : ""}
      style={{
        display: "inline-block",
        width: px,
        height: px,
        borderRadius: "50%",
        backgroundColor: COLOR_MAP[health],
        flexShrink: 0,
      }}
    />
  );
}
