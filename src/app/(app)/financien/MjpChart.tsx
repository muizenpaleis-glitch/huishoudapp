"use client";

import { eur } from "@/lib/financien";

const W = 640;
const Y_MAX = 52000;
const Y_MIN = 0;
const PAD_L = 52;
const PAD_R = 20;
const TOP = 18;
const BOT = 210;

export function MjpChart({
  jaren,
  vals,
  actualJaar,
  actualVals,
  kritiekeGrens,
}: {
  jaren: number[];
  vals: number[];
  actualJaar: Record<number, number>;
  actualVals: number[];
  kritiekeGrens: number;
}) {
  const n = jaren.length;
  const spanX = W - PAD_L - PAD_R;
  const xAt = (i: number) => PAD_L + spanX * (n > 1 ? i / (n - 1) : 0);
  const yAt = (v: number) => TOP + (BOT - TOP) * (1 - (v - Y_MIN) / (Y_MAX - Y_MIN));

  const planPoints = jaren.map((y, i) => [xAt(i), yAt(vals[i])] as const);
  const planPath = planPoints.map(([x, y], i) => `${i === 0 ? "M" : "L"}${x},${y}`).join(" ");
  const areaPath =
    `M${planPoints[0][0]},${yAt(Y_MIN)} ` +
    planPoints.map(([x, y]) => `L${x},${y}`).join(" ") +
    ` L${planPoints[planPoints.length - 1][0]},${yAt(Y_MIN)} Z`;

  const actualIdx = jaren.map((y, i) => (actualJaar[y] !== undefined ? i : -1)).filter((i) => i >= 0);
  const actualPath = actualIdx.map((i, k) => `${k === 0 ? "M" : "L"}${xAt(i)},${yAt(actualVals[i])}`).join(" ");

  return (
    <svg viewBox={`0 0 ${W} 250`} className="w-full h-auto">
      <line
        x1={PAD_L}
        x2={W - PAD_R}
        y1={yAt(kritiekeGrens)}
        y2={yAt(kritiekeGrens)}
        stroke="#D9A38A"
        strokeDasharray="4 5"
        strokeWidth={1.5}
      />
      <text x={W - PAD_R} y={yAt(kritiekeGrens) - 6} textAnchor="end" fontSize="10.5" fill="#BC4A26">
        Kritieke grens {eur(kritiekeGrens)}
      </text>

      <path d={areaPath} fill="#C4633B" fillOpacity={0.08} />
      <path d={planPath} fill="none" stroke="#C4633B" strokeWidth={3} strokeLinejoin="round" strokeLinecap="round" />
      {actualIdx.length > 1 && (
        <path
          d={actualPath}
          fill="none"
          stroke="#5C7F55"
          strokeWidth={3}
          strokeDasharray="2 6"
          strokeLinecap="round"
        />
      )}

      {planPoints.map(([x, y], i) => (
        <g key={jaren[i]}>
          <circle cx={x} cy={y} r={4} fill="#C4633B" />
          <text x={x} y={BOT + 20} textAnchor="middle" fontSize="11" fill="#9A8776">
            {jaren[i]}
          </text>
        </g>
      ))}
    </svg>
  );
}
