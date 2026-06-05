"use client";

interface TopoArtProps {
  variant: "br" | "tl";
}

const STROKE_PRIMARY = "rgba(131,0,81,0.28)";
const STROKE_SECONDARY = "rgba(206,0,88,0.22)";
const STROKE_TL = "rgba(131,0,81,0.22)";

export function TopoArt({ variant }: TopoArtProps) {
  if (variant === "br") {
    return (
      <div
        aria-hidden
        className="pointer-events-none absolute z-0"
        style={{
          right: "-120px",
          bottom: "-120px",
          width: "540px",
          height: "540px",
          opacity: 0.55,
        }}
      >
        <svg viewBox="0 0 540 540" width="100%" height="100%" style={{ display: "block" }}>
          <g fill="none" strokeWidth={0.6}>
            <path d="M-20,420 Q120,380 240,400 T540,360" stroke={STROKE_PRIMARY} />
            <path d="M-20,440 Q140,400 260,420 T540,380" stroke={STROKE_SECONDARY} />
            <path d="M-20,460 Q160,420 280,440 T540,400" stroke={STROKE_PRIMARY} />
            <path d="M-20,480 Q180,440 300,460 T540,420" stroke={STROKE_SECONDARY} />
            <path d="M-20,500 Q200,460 320,480 T540,440" stroke={STROKE_PRIMARY} />
            <path d="M-20,520 Q220,480 340,500 T540,460" stroke={STROKE_SECONDARY} />
            <path d="M40,540 Q200,500 320,520 T540,480" stroke={STROKE_PRIMARY} />
            <path d="M-20,380 Q100,360 200,370 T540,330" stroke={STROKE_SECONDARY} />
            <path d="M-20,360 Q80,340 180,348 T540,310" stroke={STROKE_PRIMARY} />
            <path d="M-20,340 Q60,322 160,328 T540,290" stroke={STROKE_SECONDARY} />
            <path d="M120,540 Q260,500 380,520 T540,500" stroke={STROKE_PRIMARY} />
            <path d="M200,540 Q320,510 420,520 T540,520" stroke={STROKE_SECONDARY} />
          </g>
        </svg>
      </div>
    );
  }

  return (
    <div
      aria-hidden
      className="pointer-events-none absolute z-0"
      style={{
        left: "-60px",
        top: "-60px",
        width: "280px",
        height: "280px",
        opacity: 0.4,
        transform: "rotate(180deg)",
      }}
    >
      <svg viewBox="0 0 280 280" width="100%" height="100%" style={{ display: "block" }}>
        <g fill="none" strokeWidth={0.6} stroke={STROKE_TL}>
          <path d="M0,200 Q60,180 120,190 T280,170" />
          <path d="M0,220 Q70,200 130,210 T280,190" stroke={STROKE_SECONDARY} />
          <path d="M0,240 Q80,220 140,230 T280,210" />
        </g>
      </svg>
    </div>
  );
}
