"use client";

import { useState } from "react";
import { fmtEUR, fmtEUR0 } from "@/lib/finance/format";

// Warm-styled SVG charts (no external chart lib). Faithful to the original's
// three visualisations: MJP projection line, spend-by-category doughnut,
// monthly cashflow bars.

const INK = "#3A2E25";
const MUTED = "#9A8B7C";
const GRID = "#E7DCCE";

/* ── Projection line (plan vs actual vs incl. invested + critical grens) ── */
export function ProjectionChart({
  jaren,
  plan,
  actual,
  total,
  kritiekeGrens,
  showTotal,
}: {
  jaren: number[];
  plan: number[];
  actual: number[];
  total: number[];
  kritiekeGrens: number;
  showTotal: boolean;
}) {
  const W = 640;
  const H = 260;
  const padL = 46;
  const padR = 14;
  const padT = 14;
  const padB = 26;
  const series = [plan, actual, ...(showTotal ? [total] : [])];
  const allVals = series.flat().concat([kritiekeGrens, 0]);
  const maxV = Math.max(...allVals);
  const minV = Math.min(...allVals);
  const range = maxV - minV || 1;
  const n = jaren.length;

  const x = (i: number) => padL + (i / Math.max(1, n - 1)) * (W - padL - padR);
  const y = (v: number) => padT + (1 - (v - minV) / range) * (H - padT - padB);
  const path = (arr: number[]) => arr.map((v, i) => `${i === 0 ? "M" : "L"}${x(i)},${y(v)}`).join(" ");

  const [hover, setHover] = useState<number | null>(null);
  const gridYs = 4;
  const ticks = Array.from({ length: gridYs + 1 }, (_, i) => minV + (range * i) / gridYs);

  return (
    <div className="w-full overflow-x-auto">
      <svg viewBox={`0 0 ${W} ${H}`} className="w-full min-w-[520px]" style={{ height: "auto" }}>
        {ticks.map((t, i) => (
          <g key={i}>
            <line x1={padL} x2={W - padR} y1={y(t)} y2={y(t)} stroke={GRID} strokeWidth={1} />
            <text x={4} y={y(t) + 3} fontSize={9} fill={MUTED}>
              €{Math.round(t / 1000)}k
            </text>
          </g>
        ))}
        {/* critical threshold */}
        <line
          x1={padL}
          x2={W - padR}
          y1={y(kritiekeGrens)}
          y2={y(kritiekeGrens)}
          stroke="#BC4A26"
          strokeWidth={1}
          strokeDasharray="4 3"
        />
        <text x={W - padR} y={y(kritiekeGrens) - 3} fontSize={8.5} fill="#BC4A26" textAnchor="end">
          kritieke grens
        </text>
        {/* plan */}
        <path d={path(plan)} fill="none" stroke={MUTED} strokeWidth={1.5} strokeDasharray="5 3" />
        {/* incl invested */}
        {showTotal && <path d={path(total)} fill="none" stroke="#6C5B8C" strokeWidth={1.5} />}
        {/* actual */}
        <path d={path(actual)} fill="none" stroke="#C4633B" strokeWidth={2.5} />
        {actual.map((v, i) => (
          <circle key={i} cx={x(i)} cy={y(v)} r={hover === i ? 4 : 2.5} fill="#C4633B" />
        ))}
        {/* x labels (every other year to avoid crowding) */}
        {jaren.map((yr, i) =>
          i % 2 === 0 || n <= 8 ? (
            <text key={yr} x={x(i)} y={H - 8} fontSize={9} fill={MUTED} textAnchor="middle">
              {yr}
            </text>
          ) : null,
        )}
        {/* hover hit areas */}
        {jaren.map((yr, i) => (
          <rect
            key={yr}
            x={x(i) - (W - padL - padR) / n / 2}
            y={0}
            width={(W - padL - padR) / n}
            height={H}
            fill="transparent"
            onMouseEnter={() => setHover(i)}
            onMouseLeave={() => setHover(null)}
          />
        ))}
        {hover !== null && (
          <g>
            <line x1={x(hover)} x2={x(hover)} y1={padT} y2={H - padB} stroke={INK} strokeWidth={0.5} opacity={0.4} />
          </g>
        )}
      </svg>
      <div className="flex flex-wrap items-center gap-x-4 gap-y-1 text-[11.5px] mt-1">
        <Legend color="#C4633B" label="Werkelijk (buffer)" />
        <Legend color={MUTED} label="Plan (MJP)" dashed />
        {showTotal && <Legend color="#6C5B8C" label="Incl. belegd vermogen" />}
        {hover !== null && (
          <span className="ml-auto text-muted">
            <b className="text-ink">{jaren[hover]}</b> · werkelijk {fmtEUR0(actual[hover])} · plan{" "}
            {fmtEUR0(plan[hover])}
          </span>
        )}
      </div>
    </div>
  );
}

function Legend({ color, label, dashed }: { color: string; label: string; dashed?: boolean }) {
  return (
    <span className="flex items-center gap-1.5 text-muted">
      <svg width={16} height={6}>
        <line x1={0} y1={3} x2={16} y2={3} stroke={color} strokeWidth={2.5} strokeDasharray={dashed ? "4 2" : undefined} />
      </svg>
      {label}
    </span>
  );
}

/* ── Spend-by-category doughnut ── */
const DONUT_COLORS = [
  "#C4633B", "#5C7F55", "#6C5B8C", "#A9761C", "#2F6E8F",
  "#9A6B4E", "#7E8B57", "#B0512C", "#4E7A8C", "#8C7A5C",
];

export function CategoryDonut({ data }: { data: { label: string; value: number }[] }) {
  const total = data.reduce((s, d) => s + d.value, 0);
  const R = 60;
  const r = 34;
  const cx = 70;
  const cy = 70;
  // cumulative start fraction per slice (no post-render mutation)
  const starts: number[] = [];
  data.reduce((acc, d) => {
    starts.push(acc);
    return acc + (total > 0 ? d.value / total : 0);
  }, 0);
  const arcs = data.map((d, i) => {
    const frac = total > 0 ? d.value / total : 0;
    const a0 = starts[i] * 2 * Math.PI - Math.PI / 2;
    const a1 = (starts[i] + frac) * 2 * Math.PI - Math.PI / 2;
    const large = frac > 0.5 ? 1 : 0;
    const p = (ang: number, rad: number) => [cx + rad * Math.cos(ang), cy + rad * Math.sin(ang)];
    const [x0, y0] = p(a0, R);
    const [x1, y1] = p(a1, R);
    const [x2, y2] = p(a1, r);
    const [x3, y3] = p(a0, r);
    const dPath = `M${x0},${y0} A${R},${R} 0 ${large} 1 ${x1},${y1} L${x2},${y2} A${r},${r} 0 ${large} 0 ${x3},${y3} Z`;
    return { dPath, color: DONUT_COLORS[i % DONUT_COLORS.length], label: d.label, value: d.value };
  });

  if (total <= 0) {
    return <div className="text-[13px] text-muted py-4">Geen terugkerende uitgaven in deze periode.</div>;
  }

  return (
    <div className="flex flex-wrap items-center gap-4">
      <svg viewBox="0 0 140 140" width={140} height={140} className="shrink-0">
        {arcs.map((a, i) => (
          <path key={i} d={a.dPath} fill={a.color} stroke="var(--color-card)" strokeWidth={1} />
        ))}
        <text x={70} y={67} textAnchor="middle" fontSize={9} fill={MUTED}>
          totaal
        </text>
        <text x={70} y={80} textAnchor="middle" fontSize={12} fontWeight="700" fill={INK}>
          {fmtEUR0(total)}
        </text>
      </svg>
      <div className="flex flex-col gap-1 min-w-0 flex-1">
        {arcs.map((a, i) => (
          <div key={i} className="flex items-center gap-2 text-[12.5px]">
            <span className="w-2.5 h-2.5 rounded-full shrink-0" style={{ background: a.color }} />
            <span className="text-ink-soft truncate flex-1">{a.label}</span>
            <span className="font-semibold shrink-0">{fmtEUR(a.value)}</span>
          </div>
        ))}
      </div>
    </div>
  );
}

/* ── Monthly cashflow bars (income / spend / net) ── */
export function CashflowBars({
  months,
  income,
  spend,
}: {
  months: string[];
  income: number[];
  spend: number[];
}) {
  const net = months.map((_, i) => income[i] - spend[i]);
  const maxV = Math.max(1, ...income, ...spend, ...net.map(Math.abs));
  const H = 150;
  const barH = (v: number) => (Math.abs(v) / maxV) * (H - 30);

  if (!months.length) {
    return <div className="text-[13px] text-muted py-4">Geen data in deze periode.</div>;
  }

  return (
    <div className="w-full overflow-x-auto">
      <div className="flex items-end gap-4 min-w-fit" style={{ height: H }}>
        {months.map((m, i) => (
          <div key={m} className="flex flex-col items-center gap-1 justify-end" style={{ height: H }}>
            <div className="flex items-end gap-0.5 h-full">
              <Bar h={barH(income[i])} color="#5C7F55" title={`Inkomen ${fmtEUR(income[i])}`} />
              <Bar h={barH(spend[i])} color="#C4633B" title={`Uitgaven ${fmtEUR(spend[i])}`} />
              <Bar h={barH(net[i])} color="#6C5B8C" title={`Netto ${fmtEUR(net[i])}`} />
            </div>
            <div className="text-[10.5px] text-muted whitespace-nowrap">{m.slice(5)}/{m.slice(2, 4)}</div>
          </div>
        ))}
      </div>
      <div className="flex gap-4 text-[11.5px] mt-2">
        <Legend color="#5C7F55" label="Inkomen" />
        <Legend color="#C4633B" label="Uitgaven" />
        <Legend color="#6C5B8C" label="Netto" />
      </div>
    </div>
  );
}

function Bar({ h, color, title }: { h: number; color: string; title: string }) {
  return (
    <div
      className="w-3.5 rounded-t-[3px]"
      style={{ height: Math.max(2, h), background: color }}
      title={title}
    />
  );
}
