"use client";

import { useState } from "react";
import { eur } from "@/lib/financien";
import type { NetWorth, MjpResultaat, IncidenteelProject, JaarlijksItem, CategorieBudget } from "@/lib/financien";
import { netWorthLine } from "@/lib/financien";
import { SendIcon } from "@/components/icons";

type Msg = { who: "bot" | "user"; tekst: string };

const QUICK_REPLIES = ["Wat is ons vermogen?", "Uitgaven deze maand?", "Wanneer wordt het spannend?"];

export function ChatWidget({
  netWorth,
  mjp,
  projecten,
  jaarlijks,
  categorieen,
}: {
  netWorth: NetWorth;
  mjp: MjpResultaat[];
  projecten: IncidenteelProject[];
  jaarlijks: JaarlijksItem[];
  categorieen: CategorieBudget[];
}) {
  const [open, setOpen] = useState(false);
  const [input, setInput] = useState("");
  const [msgs, setMsgs] = useState<Msg[]>([
    {
      who: "bot",
      tekst: "Hoi! Vraag me iets over jullie geldzaken — bijvoorbeeld het vermogen, de uitgaven deze maand of wanneer het spannend wordt.",
    },
  ]);

  const nwT = netWorth.buffer + netWorth.spaargeld + netWorth.beleggingen;

  function antwoord(vraag: string): string {
    const q = vraag.toLowerCase();
    if (/vermogen|net worth|waard|bezit/.test(q)) {
      return `Jullie totale vermogen is ${eur(nwT)}: ${eur(netWorth.buffer)} buffer, ${eur(netWorth.spaargeld)} spaargeld en ${eur(netWorth.beleggingen)} beleggingen.`;
    }
    if (/spaar|sparen/.test(q)) {
      return `Spaargeld staat op ${eur(netWorth.spaargeld)}, beleggingen op ${eur(netWorth.beleggingen)}.`;
    }
    if (/uitgav|uitgegeven|deze maand|besteed/.test(q)) {
      const grootste = categorieen.filter((c) => c.inSpendOverzicht).sort((a, b) => b.actualMaandelijks - a.actualMaandelijks)[0];
      return `Dit jaar geven jullie gemiddeld ${eur(netWorth.spendActualMaand)} per maand uit (budget ${eur(netWorth.spendBudgetMaand)}). Grootste post: ${grootste?.label ?? "—"} met ${eur(grootste?.actualMaandelijks ?? 0)}.`;
    }
    if (/inkomen|verdien|salaris/.test(q)) {
      return `Gemiddeld inkomen is ${eur(netWorth.incomeMaand)} per maand, dat is ${eur(netWorth.incomeMaand * 12)} per jaar.`;
    }
    if (/over|sparen we|marge|ruimte/.test(q)) {
      return `Deze maand houden jullie gemiddeld ${eur(netWorth.incomeMaand - netWorth.spendActualMaand)} over.`;
    }
    if (/budget/.test(q)) {
      const pct = Math.round((netWorth.spendActualMaand / netWorth.spendBudgetMaand) * 100);
      return `Jullie zitten op ${pct}% van het maandbudget. Boodschappen en Huishouden lopen iets uit; Eten & drinken en Vervoer zitten eronder.`;
    }
    if (/warmtepomp|badkamer|project|verbouw|incident/.test(q)) {
      const totaal2026 = projecten.filter((p) => p.jaar === 2026).reduce((s, p) => s + p.budget, 0);
      const wp = projecten.find((p) => p.naam === "Warmtepomp");
      return `Projecten 2026 samen: ${eur(totaal2026)}. Warmtepomp staat op ${eur(wp?.besteed ?? 0)} van ${eur(wp?.budget ?? 0)}.`;
    }
    if (/vakantie/.test(q)) {
      const vak = jaarlijks.find((j) => j.naam === "Vakanties");
      const totaal = jaarlijks.reduce((s, j) => s + j.budgetJaarlijks, 0);
      return `Vakantiebudget is ${eur(vak?.budgetJaarlijks ?? 0)} per jaar, van een totaal jaarlijks budget van ${eur(totaal)}.`;
    }
    if (/kritiek|grens|spannend|risico|laagst/.test(q)) {
      const { jaren, vals } = netWorthLine(netWorth, mjp, projecten);
      let minI = 0;
      for (let i = 1; i < vals.length; i++) if (vals[i] < vals[minI]) minI = i;
      const onder = vals[minI] < netWorth.kritiekeGrens;
      return `Het laagste punt in de projectie is ${eur(vals[minI])} in ${jaren[minI]}. Dat ${onder ? "komt onder" : "komt niet onder"} de kritieke grens van ${eur(netWorth.kritiekeGrens)}.`;
    }
    return "Ik kan iets vertellen over: jullie vermogen, spaargeld/beleggingen, uitgaven deze maand, inkomen, wat je overhoudt, budgetgebruik, projecten, vakantiebudget of wanneer het financieel spannend wordt.";
  }

  function stuur(tekst: string) {
    if (!tekst.trim()) return;
    const bot = antwoord(tekst);
    setMsgs((m) => [...m, { who: "user", tekst }, { who: "bot", tekst: bot }]);
    setInput("");
  }

  return (
    <>
      <button
        type="button"
        onClick={() => setOpen(true)}
        className="fixed right-5 bottom-24 md:bottom-6 px-4 py-2.5 rounded-full bg-accent-tint text-accent font-semibold text-[13.5px] flex items-center gap-1.5 shadow-[0_4px_14px_rgba(196,99,59,0.22)] z-10"
      >
        💬 Vraag
      </button>

      {open && (
        <div className="fixed inset-0 z-30 flex items-end justify-center">
          <div className="absolute inset-0 bg-black/20" onClick={() => setOpen(false)} />
          <div className="relative w-full max-w-[480px] bg-card rounded-t-[26px] p-4 flex flex-col gap-3 shadow-[0_-10px_34px_rgba(94,72,50,0.22)] max-h-[80vh]">
            <div className="flex items-center justify-between">
              <div>
                <div className="font-bold text-[15px]">Vraag je cijfers</div>
                <div className="text-[12px] text-muted">Leest alleen, wijzigt niets</div>
              </div>
              <button type="button" onClick={() => setOpen(false)} className="text-muted text-xl leading-none px-2">
                ×
              </button>
            </div>
            <div className="flex-1 overflow-y-auto flex flex-col gap-2.5 min-h-[120px]">
              {msgs.map((m, i) => (
                <div
                  key={i}
                  className="max-w-[85%] rounded-2xl px-3.5 py-2.5 text-[13.5px] leading-snug"
                  style={{
                    alignSelf: m.who === "user" ? "flex-end" : "flex-start",
                    background: m.who === "user" ? "var(--color-accent)" : "var(--color-cream)",
                    color: m.who === "user" ? "var(--color-accent-ink)" : "var(--color-ink)",
                  }}
                >
                  {m.tekst}
                </div>
              ))}
            </div>
            <div className="flex gap-1.5 flex-wrap">
              {QUICK_REPLIES.map((q) => (
                <button
                  key={q}
                  onClick={() => stuur(q)}
                  className="px-3 py-1.5 rounded-full bg-track text-ink-soft text-[12.5px] font-semibold"
                >
                  {q}
                </button>
              ))}
            </div>
            <form
              className="flex items-center gap-2"
              onSubmit={(e) => {
                e.preventDefault();
                stuur(input);
              }}
            >
              <input
                value={input}
                onChange={(e) => setInput(e.target.value)}
                placeholder="Typ je vraag…"
                className="flex-1 px-3.5 py-2.5 rounded-full border border-input-border bg-cream text-[13.5px] outline-none"
              />
              <button type="submit" className="w-9 h-9 rounded-full bg-accent text-accent-ink flex items-center justify-center shrink-0">
                <SendIcon size={15} />
              </button>
            </form>
          </div>
        </div>
      )}
    </>
  );
}
