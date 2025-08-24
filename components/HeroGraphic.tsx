// components/HeroGraphic.tsx
// Neon SVG “analytics” graphic (no JS needed)
export default function HeroGraphic() {
  return (
    <div className="surface p-0 overflow-hidden">
      <svg
        viewBox="0 0 640 360"
        role="img"
        aria-label="Neon analytics graphic"
        className="block h-[280px] w-full md:h-[320px]"
      >
        <defs>
          <linearGradient id="gNeon" x1="0" x2="1">
            <stop offset="0%" stopColor="#10b981" />
            <stop offset="50%" stopColor="#6366f1" />
            <stop offset="100%" stopColor="#f472b6" />
          </linearGradient>
          <linearGradient id="gFade" x1="0" y1="0" x2="0" y2="1">
            <stop offset="0%" stopColor="rgba(255,255,255,0.12)" />
            <stop offset="100%" stopColor="rgba(255,255,255,0.02)" />
          </linearGradient>
        </defs>

        {/* background glow */}
        <g>
          <circle cx="90" cy="60" r="120" fill="url(#gNeon)" opacity="0.15" />
          <circle cx="560" cy="290" r="140" fill="url(#gNeon)" opacity="0.12" />
        </g>

        {/* grid */}
        <g opacity="0.35">
          {Array.from({ length: 10 }).map((_, i) => (
            <line
              key={`v${i}`}
              x1={40 + i * 60}
              y1={30}
              x2={40 + i * 60}
              y2={330}
              stroke="url(#gFade)"
              strokeWidth="1"
            />
          ))}
          {Array.from({ length: 6 }).map((_, i) => (
            <line
              key={`h${i}`}
              x1={40}
              y1={50 + i * 46}
              x2={600}
              y2={50 + i * 46}
              stroke="url(#gFade)"
              strokeWidth="1"
            />
          ))}
          <rect x="40" y="30" width="560" height="300" fill="none" stroke="#27272a" />
        </g>

        {/* bar series */}
        <g>
          {[
            100, 160, 130, 200, 180, 230, 210, 260, 240, 290,
          ].map((h, i) => (
            <rect
              key={i}
              x={60 + i * 52}
              y={330 - h}
              width="24"
              height={h}
              fill="url(#gNeon)"
              opacity="0.65"
              rx="4"
            />
          ))}
        </g>

        {/* line series */}
        <polyline
          fill="none"
          stroke="url(#gNeon)"
          strokeWidth="3"
          points={[
            [60, 250],
            [112, 220],
            [164, 240],
            [216, 200],
            [268, 210],
            [320, 170],
            [372, 190],
            [424, 150],
            [476, 165],
            [528, 130],
          ]
            .map(([x, y]) => `${x} ${y}`)
            .join(" ")}
          style={{ filter: "drop-shadow(0 0 8px rgba(99,102,241,0.35))" }}
        />
        {[60, 112, 164, 216, 268, 320, 372, 424, 476, 528].map((x, i) => (
          <circle
            key={i}
            cx={x}
            cy={[250, 220, 240, 200, 210, 170, 190, 150, 165, 130][i]}
            r="4.5"
            fill="#fff"
            stroke="url(#gNeon)"
            strokeWidth="2"
          />
        ))}
      </svg>
    </div>
  );
}
