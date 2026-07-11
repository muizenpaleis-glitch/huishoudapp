"use client";

import { useState } from "react";
import { Card } from "@/components/ui";
import { ChevronLeftIcon } from "@/components/icons";

export function TrackerCard({
  title,
  toggleLabel,
  defaultOpen,
  headline,
  filters,
  children,
}: {
  title: string;
  toggleLabel: string;
  defaultOpen: boolean;
  headline: {
    label: string;
    spentTxt: string;
    budgetTxt: string;
    remTxt: string;
    barPct: number;
    barColor: string;
    spentC?: string;
    remC?: string;
  };
  filters?: React.ReactNode;
  children: React.ReactNode;
}) {
  const [open, setOpen] = useState(defaultOpen);
  return (
    <Card className="p-4.5 flex flex-col gap-3.5">
      <button type="button" onClick={() => setOpen((o) => !o)} className="flex items-center justify-between gap-2">
        <div className="text-[13px] font-bold tracking-wider uppercase text-label">{title}</div>
        <div className="flex items-center gap-1.5 text-[12.5px] font-semibold text-accent">
          {open ? "Verberg" : toggleLabel}
          <ChevronLeftIcon
            size={13}
            className="transition-transform"
            style={{ transform: open ? "rotate(90deg)" : "rotate(-90deg)" }}
          />
        </div>
      </button>

      <div>
        <div className="flex items-baseline justify-between gap-2">
          <div className="text-[13.5px] text-muted">{headline.label}</div>
          <div className="text-[13px] text-muted">
            <span className="font-bold" style={{ color: headline.spentC ?? "var(--color-ink)" }}>
              {headline.spentTxt}
            </span>{" "}
            {headline.budgetTxt}
          </div>
        </div>
        <div className="h-[7px] rounded-full bg-track overflow-hidden mt-2">
          <div
            className="h-full rounded-full"
            style={{ width: `${Math.min(100, headline.barPct)}%`, background: headline.barColor }}
          />
        </div>
        {headline.remTxt && (
          <div className="text-[12.5px] mt-1.5" style={{ color: headline.remC ?? "var(--color-muted)" }}>
            {headline.remTxt}
          </div>
        )}
      </div>

      {open && (
        <div className="flex flex-col gap-3">
          {filters}
          {children}
        </div>
      )}
    </Card>
  );
}
