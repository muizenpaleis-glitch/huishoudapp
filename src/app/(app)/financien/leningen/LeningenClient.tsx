"use client";

import { useMemo, useState, useTransition } from "react";
import { BackButton, Card } from "@/components/ui";
import { fmtEUR0 } from "@/lib/finance/format";
import {
  stand,
  totalen,
  perJaar,
  groepeer,
  nettoRente,
  type Lening,
  type Instellingen,
} from "@/lib/leningen/engine";
import {
  updateLening,
  addLening,
  deleteLening,
  updateInstellingen,
  vulStartgegevens,
  type LeningPatch,
} from "./actions";

const VORMEN = [
  { key: "annuiteit", label: "Annuïteit" },
  { key: "lineair", label: "Lineair" },
  { key: "aflossingsvrij", label: "Aflossingsvrij" },
] as const;

export function LeningenClient({
  leningen,
  instellingen,
}: {
  leningen: Lening[];
  instellingen: Instellingen;
}) {
  const [, start] = useTransition();
  const [melding, setMelding] = useState<string | null>(null);
  const [toonNetto, setToonNetto] = useState(false);
  const [open, setOpen] = useState<string | null>(null);

  const standen = useMemo(() => leningen.map(stand), [leningen]);
  const tot = useMemo(() => totalen(standen, instellingen), [standen, instellingen]);
  const jaren = useMemo(() => perJaar(standen), [standen]);
  const groepen = useMemo(() => groepeer(standen), [standen]);
  const scheef = standen.filter((s) => !s.modelKlopt);

  const rB = toonNetto ? tot.renteBetaaldNetto : tot.renteBetaald;
  const rT = toonNetto ? tot.renteTotaalNetto : tot.renteTotaal;
  const maand = toonNetto ? tot.maandlastNetto : tot.maandlastBruto;

  if (leningen.length === 0) {
    return (
      <div className="pt-16 md:pt-6 px-5 pb-8">
        <div className="max-w-[900px] mx-auto flex flex-col gap-4">
          <Kop aantal={0} />
          <Card className="p-5 flex flex-col gap-3">
            <div className="text-[15px] font-semibold">Nog geen leningen</div>
            <p className="text-[13.5px] text-muted leading-relaxed">
              Vul de vijf leningdelen uit je overzichten in één keer in, of voeg ze los toe. De
              startdatum van de hypotheekdelen staat niet op die overzichten — die leid ik af uit de
              einddatum minus de looptijd, dus controleer hem daarna.
            </p>
            <div className="flex gap-2 flex-wrap">
              <button
                onClick={async () => setMelding((await vulStartgegevens()).melding)}
                className="px-3.5 py-2 rounded-full bg-ink text-accent-ink text-[12.5px] font-semibold"
              >
                Mijn leningen invullen
              </button>
              <button
                onClick={() => start(() => addLening())}
                className="px-3.5 py-2 rounded-full border border-dashed border-input-border text-[12.5px] font-semibold text-ink-soft"
              >
                + Lege lening toevoegen
              </button>
            </div>
            {melding && <div className="text-[12.5px] text-ink-soft">{melding}</div>}
          </Card>
        </div>
      </div>
    );
  }

  return (
    <div className="pt-16 md:pt-6 px-5 pb-8 overflow-y-auto">
      <div className="max-w-[1080px] mx-auto flex flex-col gap-4">
        <Kop aantal={leningen.length} />

        {/* Bruto/netto */}
        <div className="flex items-center gap-2 flex-wrap">
          <div className="flex bg-track rounded-full p-[3px]">
            {[
              { v: false, label: "Bruto" },
              { v: true, label: "Netto na renteaftrek" },
            ].map((o) => (
              <button
                key={String(o.v)}
                onClick={() => setToonNetto(o.v)}
                aria-pressed={toonNetto === o.v}
                className="px-3 py-1.5 rounded-full text-[12px] font-semibold"
                style={{
                  background: toonNetto === o.v ? "var(--color-card)" : "transparent",
                  color: toonNetto === o.v ? "var(--color-ink)" : "var(--color-muted)",
                }}
              >
                {o.label}
              </button>
            ))}
          </div>
          <span className="text-[11.5px] text-muted">
            Netto = bruto minus {instellingen.aftrekPercentage}% aftrek op de aftrekbare delen.
          </span>
        </div>

        {/* KPI's */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
          <Kpi label="Oorspronkelijk geleend" waarde={fmtEUR0(tot.hoofdsom)} sub={`${leningen.length} leningdelen`} />
          <Kpi
            label="Nog open"
            waarde={fmtEUR0(tot.restant)}
            sub={`${(tot.aandeelAfgelost * 100).toFixed(1)}% afgelost`}
          />
          <Kpi
            label={toonNetto ? "Rente betaald (netto)" : "Rente betaald"}
            waarde={fmtEUR0(rB)}
            sub="tot de peildatum"
          />
          <Kpi
            label={toonNetto ? "Rente hele looptijd (netto)" : "Rente hele looptijd"}
            waarde={fmtEUR0(rT)}
            sub={`maandlast nu ${fmtEUR0(maand)}`}
          />
        </div>

        {/* Voortgang */}
        <Card className="p-4.5 flex flex-col gap-2">
          <div className="flex items-baseline justify-between text-[12.5px]">
            <span className="text-muted">Afgelost {fmtEUR0(tot.afgelost)}</span>
            <span className="text-muted">Nog open {fmtEUR0(tot.restant)}</span>
          </div>
          <div className="h-3 rounded-full overflow-hidden flex bg-track">
            <div style={{ width: `${tot.aandeelAfgelost * 100}%`, background: "#5C7F55" }} />
          </div>
        </Card>

        {scheef.length > 0 && (
          <Card className="p-4 text-[12.5px]" style={{ color: "#A9761C" }}>
            Bij {scheef.length} leningdeel/-delen wijkt het berekende restant af van wat de bank meldt
            (grootste verschil {fmtEUR0(Math.max(...scheef.map((s) => Math.abs(s.afwijking))))}). Dan
            klopt de <b>rente betaald</b> voor die delen ook niet: het schema kent de historie niet
            volledig, meestal door een rentewijziging of een extra aflossing. Vul bij zo&apos;n deel de
            werkelijk betaalde rente uit je jaaropgaven in — daarmee wint het echte cijfer.
          </Card>
        )}

        {/* Grafiek */}
        <Card className="p-4.5 flex flex-col gap-3">
          <div className="text-[13px] font-bold tracking-wider uppercase text-label">
            Aflossing over tijd
          </div>
          <AflossingChart punten={jaren} />
          <div className="text-[11.5px] text-muted leading-relaxed">
            De vlak is de openstaande schuld van alle leningen samen; de lijn is de rente die je
            cumulatief betaalt. Beide volgen uit het aflosschema, dus ze schuiven mee zodra je een
            lening aanpast.
          </div>
        </Card>

        {/* Per groep */}
        {groepen.map((g) => {
          const gT = totalen(g.standen, instellingen);
          return (
            <Card key={g.groep} className="p-4.5 flex flex-col gap-3">
              <div className="flex items-baseline justify-between gap-3 flex-wrap">
                <div className="text-[13px] font-bold tracking-wider uppercase text-label">{g.groep}</div>
                <div className="text-[12.5px] text-muted">
                  <b className="text-ink">{fmtEUR0(gT.restant)}</b> open van {fmtEUR0(gT.hoofdsom)} ·{" "}
                  {fmtEUR0(toonNetto ? gT.maandlastNetto : gT.maandlastBruto)}/mnd
                </div>
              </div>
              <div className="overflow-x-auto">
                <table className="w-full text-[12.5px] border-collapse min-w-[760px]">
                  <thead>
                    <tr className="text-left text-label border-b border-divider">
                      <th className="py-2 pr-3 font-semibold">Leningdeel</th>
                      <th className="py-2 pr-3 font-semibold text-right">Rente</th>
                      <th className="py-2 pr-3 font-semibold text-right">Oorspronkelijk</th>
                      <th className="py-2 pr-3 font-semibold text-right">Afgelost</th>
                      <th className="py-2 pr-3 font-semibold text-right">Nog open</th>
                      <th className="py-2 pr-3 font-semibold text-right">Rente betaald</th>
                      <th className="py-2 pr-3 font-semibold text-right">Rente totaal</th>
                      <th className="py-2 font-semibold"></th>
                    </tr>
                  </thead>
                  <tbody>
                    {g.standen.map((s) => {
                      const nb = toonNetto
                        ? nettoRente(s.renteBetaald, s.lening.aftrekbaar, instellingen)
                        : s.renteBetaald;
                      const nt = toonNetto
                        ? nettoRente(s.renteTotaal, s.lening.aftrekbaar, instellingen)
                        : s.renteTotaal;
                      return (
                        <tr key={s.lening.id} className="border-b border-divider/60">
                          <td className="py-1.5 pr-3">
                            {s.lening.naam}
                            <span className="text-muted">
                              {s.lening.leningnummer ? ` · ${s.lening.leningnummer}` : ""} · t/m{" "}
                              {s.einddatum.slice(0, 7)}
                            </span>
                            {!s.lening.aftrekbaar && (
                              <span className="text-muted"> · niet aftrekbaar</span>
                            )}
                          </td>
                          <td className="py-1.5 pr-3 text-right">{s.lening.rente}%</td>
                          <td className="py-1.5 pr-3 text-right text-muted">
                            {fmtEUR0(s.lening.hoofdsom)}
                          </td>
                          <td className="py-1.5 pr-3 text-right">{fmtEUR0(s.afgelost)}</td>
                          <td className="py-1.5 pr-3 text-right font-semibold">{fmtEUR0(s.restant)}</td>
                          <td
                            className="py-1.5 pr-3 text-right"
                            title={
                              s.renteBetaaldIsOpgegeven
                                ? "Handmatig ingevuld uit je jaaropgaven"
                                : "Afgeleid uit het aflosschema"
                            }
                            style={{ color: s.modelKlopt || s.renteBetaaldIsOpgegeven ? undefined : "#A9761C" }}
                          >
                            {fmtEUR0(nb)}
                            {s.renteBetaaldIsOpgegeven && (
                              <span className="text-[10px] text-muted align-super ml-0.5">o</span>
                            )}
                          </td>
                          <td className="py-1.5 pr-3 text-right">{fmtEUR0(nt)}</td>
                          <td className="py-1.5 text-right hidden md:table-cell">
                            <button
                              onClick={() => setOpen(open === s.lening.id ? null : s.lening.id)}
                              className="px-2.5 py-1 rounded-full border border-input-border text-[11.5px] font-semibold text-ink-soft"
                            >
                              {open === s.lening.id ? "Sluiten" : "Bewerken"}
                            </button>
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
              {g.standen.map((s) =>
                open === s.lening.id ? (
                  <LeningForm key={s.lening.id} l={s.lening} afwijking={s.afwijking} onStart={start} />
                ) : null,
              )}
            </Card>
          );
        })}

        {/* Instellingen + toevoegen — bewerkschermen, dus desktop */}
        <div className="hidden md:flex flex-col gap-4">
          <Card className="p-4.5 flex flex-col gap-3">
            <div className="text-[13px] font-bold tracking-wider uppercase text-label">
              Renteaftrek
            </div>
            <div className="flex gap-3 flex-wrap items-end">
              <label className="flex flex-col gap-1">
                <span className="text-[11.5px] text-muted">Aftrektarief (%)</span>
                <input
                  type="number"
                  step={0.01}
                  defaultValue={instellingen.aftrekPercentage}
                  onBlur={(e) => {
                    const v = parseFloat(e.target.value);
                    if (isFinite(v) && v !== instellingen.aftrekPercentage) {
                      start(() => updateInstellingen({ aftrekPercentage: v }));
                    }
                  }}
                  className="w-28 px-2.5 py-2 rounded-xl border border-input-border bg-card text-[13.5px]"
                />
              </label>
              <label className="flex flex-col gap-1">
                <span className="text-[11.5px] text-muted">Eigenwoningforfait (€/jaar)</span>
                <input
                  type="number"
                  step={50}
                  defaultValue={instellingen.eigenwoningforfait}
                  onBlur={(e) => {
                    const v = parseFloat(e.target.value);
                    if (isFinite(v) && v !== instellingen.eigenwoningforfait) {
                      start(() => updateInstellingen({ eigenwoningforfait: v }));
                    }
                  }}
                  className="w-36 px-2.5 py-2 rounded-xl border border-input-border bg-card text-[13.5px]"
                />
              </label>
              {instellingen.eigenwoningforfait > 0 && (
                <div className="text-[12.5px] text-ink-soft">
                  Kost je{" "}
                  <b>
                    {fmtEUR0((instellingen.eigenwoningforfait * instellingen.aftrekPercentage) / 100)}
                  </b>{" "}
                  per jaar aan belasting — dat gaat van het aftrekvoordeel af.
                </div>
              )}
            </div>
            <p className="text-[11.5px] text-muted leading-relaxed">
              Het aftrektarief is sinds 2023 gelijk aan het tarief van de eerste schijf en verandert
              jaarlijks een beetje; controleer het bij je aangifte. Het eigenwoningforfait is een
              bijtelling bij je inkomen die aan de wóning hangt, niet aan een lening — het staat hier
              apart en telt niet mee in de netto-rente per lening, want dan zou het over meerdere
              leningen dubbel geteld worden.
            </p>
          </Card>

          <button
            onClick={() => start(() => addLening())}
            className="self-start px-3.5 py-2 rounded-full border border-dashed border-input-border text-[12.5px] font-semibold text-ink-soft"
          >
            + Leningdeel toevoegen
          </button>
        </div>
      </div>
    </div>
  );
}

function Kop({ aantal }: { aantal: number }) {
  return (
    <div className="flex items-center gap-3">
      <BackButton href="/financien" />
      <div className="min-w-0">
        <div className="text-[21px] font-bold tracking-tight">Leningen</div>
        <div className="text-[13px] text-muted">
          {aantal === 0 ? "nog niets ingevuld" : `${aantal} leningdelen · hypotheek en duurzaamheid`}
        </div>
      </div>
    </div>
  );
}

/** Vlakgrafiek van de openstaande schuld met de cumulatieve rente als lijn. */
function AflossingChart({ punten }: { punten: { jaar: number; restant: number; cumulatieveRente: number }[] }) {
  const [hover, setHover] = useState<number | null>(null);
  if (punten.length < 2) return <div className="text-[12.5px] text-muted py-6">Te weinig gegevens.</div>;

  const W = 680;
  const H = 240;
  const padL = 50;
  const padR = 44;
  const padT = 12;
  const padB = 24;
  const maxSchuld = Math.max(...punten.map((p) => p.restant));
  const maxRente = Math.max(...punten.map((p) => p.cumulatieveRente), 1);
  const n = punten.length;
  const x = (i: number) => padL + (i / (n - 1)) * (W - padL - padR);
  const yS = (v: number) => padT + (1 - v / maxSchuld) * (H - padT - padB);
  const yR = (v: number) => padT + (1 - v / maxRente) * (H - padT - padB);

  const vlak =
    punten.map((p, i) => `${i === 0 ? "M" : "L"}${x(i)},${yS(p.restant)}`).join(" ") +
    ` L${x(n - 1)},${H - padB} L${padL},${H - padB} Z`;
  const lijn = punten.map((p, i) => `${i === 0 ? "M" : "L"}${x(i)},${yR(p.cumulatieveRente)}`).join(" ");
  const h = hover != null ? punten[hover] : null;

  return (
    <div className="w-full overflow-x-auto">
      <svg viewBox={`0 0 ${W} ${H}`} className="w-full min-w-[560px]" style={{ height: "auto" }}>
        {[0, 0.25, 0.5, 0.75, 1].map((f) => (
          <g key={f}>
            <line x1={padL} x2={W - padR} y1={yS(maxSchuld * f)} y2={yS(maxSchuld * f)} stroke="#E7DCCE" />
            <text x={4} y={yS(maxSchuld * f) + 3} fontSize={9} fill="#9A8B7C">
              €{Math.round((maxSchuld * f) / 1000)}k
            </text>
            <text x={W - padR + 4} y={yR(maxRente * f) + 3} fontSize={9} fill="#C4633B">
              €{Math.round((maxRente * f) / 1000)}k
            </text>
          </g>
        ))}
        <path d={vlak} fill="#5C7F55" opacity={0.22} />
        <path d={punten.map((p, i) => `${i === 0 ? "M" : "L"}${x(i)},${yS(p.restant)}`).join(" ")} fill="none" stroke="#5C7F55" strokeWidth={2} />
        <path d={lijn} fill="none" stroke="#C4633B" strokeWidth={2} strokeDasharray="5 3" />
        {punten.map((p, i) =>
          i % Math.ceil(n / 8) === 0 || i === n - 1 ? (
            <text key={p.jaar} x={x(i)} y={H - 6} fontSize={9} fill="#9A8B7C" textAnchor="middle">
              {p.jaar}
            </text>
          ) : null,
        )}
        {punten.map((p, i) => (
          <rect
            key={p.jaar}
            x={x(i) - (W - padL - padR) / n / 2}
            y={0}
            width={(W - padL - padR) / n}
            height={H}
            fill="transparent"
            onMouseEnter={() => setHover(i)}
            onMouseLeave={() => setHover(null)}
          />
        ))}
        {h && (
          <>
            <line x1={x(hover!)} x2={x(hover!)} y1={padT} y2={H - padB} stroke="#3A2E25" opacity={0.35} />
            <circle cx={x(hover!)} cy={yS(h.restant)} r={3.5} fill="#5C7F55" />
            <circle cx={x(hover!)} cy={yR(h.cumulatieveRente)} r={3.5} fill="#C4633B" />
          </>
        )}
      </svg>
      <div className="flex gap-4 text-[11.5px] mt-1 flex-wrap">
        <span style={{ color: "#5C7F55" }}>■ openstaande schuld</span>
        <span style={{ color: "#C4633B" }}>▬ rente cumulatief</span>
        {h && (
          <span className="text-ink-soft">
            {h.jaar}: schuld {fmtEUR0(h.restant)} · rente tot dan {fmtEUR0(h.cumulatieveRente)}
          </span>
        )}
      </div>
    </div>
  );
}

function LeningForm({
  l,
  afwijking,
  onStart,
}: {
  l: Lening;
  afwijking: number;
  onStart: (fn: () => void) => void;
}) {
  const zet = (patch: LeningPatch) => onStart(() => updateLening(l.id, patch));
  const num = (label: string, veld: keyof LeningPatch, waarde: number | null, step = 1) => (
    <label className="flex flex-col gap-1">
      <span className="text-[11.5px] text-muted">{label}</span>
      <input
        type="number"
        step={step}
        defaultValue={waarde ?? ""}
        onBlur={(e) => {
          const raw = e.target.value.trim();
          const v = raw === "" ? null : parseFloat(raw);
          if (v === waarde) return;
          zet({ [veld]: v } as LeningPatch);
        }}
        className="w-32 px-2.5 py-2 rounded-xl border border-input-border bg-card text-[13px]"
      />
    </label>
  );

  return (
    <div className="border-t border-divider pt-3 flex flex-col gap-3">
      <div className="flex gap-3 flex-wrap">
        <label className="flex flex-col gap-1">
          <span className="text-[11.5px] text-muted">Naam</span>
          <input
            defaultValue={l.naam}
            onBlur={(e) => e.target.value !== l.naam && zet({ naam: e.target.value })}
            className="w-64 px-2.5 py-2 rounded-xl border border-input-border bg-card text-[13px]"
          />
        </label>
        <label className="flex flex-col gap-1">
          <span className="text-[11.5px] text-muted">Groep</span>
          <input
            defaultValue={l.groep}
            onBlur={(e) => e.target.value !== l.groep && zet({ groep: e.target.value })}
            className="w-40 px-2.5 py-2 rounded-xl border border-input-border bg-card text-[13px]"
          />
        </label>
        <label className="flex flex-col gap-1">
          <span className="text-[11.5px] text-muted">Aflossingsvorm</span>
          <select
            defaultValue={l.vorm}
            onChange={(e) => zet({ vorm: e.target.value })}
            className="px-2.5 py-2 rounded-xl border border-input-border bg-card text-[13px]"
          >
            {VORMEN.map((v) => (
              <option key={v.key} value={v.key}>
                {v.label}
              </option>
            ))}
          </select>
        </label>
      </div>

      <div className="flex gap-3 flex-wrap">
        {num("Hoofdsom (€)", "hoofdsom", l.hoofdsom, 100)}
        {num("Rente (%/jr)", "rente", l.rente, 0.01)}
        {num("Looptijd (mnd)", "looptijdMnd", l.looptijdMnd, 12)}
        <label className="flex flex-col gap-1">
          <span className="text-[11.5px] text-muted">Startdatum</span>
          <input
            type="date"
            defaultValue={l.startdatum}
            onBlur={(e) => e.target.value !== l.startdatum && zet({ startdatum: e.target.value })}
            className="px-2.5 py-2 rounded-xl border border-input-border bg-card text-[13px]"
          />
        </label>
      </div>

      <div className="flex gap-3 flex-wrap items-end">
        <label className="flex flex-col gap-1">
          <span className="text-[11.5px] text-muted">Peildatum</span>
          <input
            type="date"
            defaultValue={l.peildatum}
            onBlur={(e) => e.target.value !== l.peildatum && zet({ peildatum: e.target.value })}
            className="px-2.5 py-2 rounded-xl border border-input-border bg-card text-[13px]"
          />
        </label>
        {num("Restant op peildatum (€)", "restant", l.restant, 100)}
        {num("Maandlast (€)", "maandTotaal", l.maandTotaal, 1)}
        {num("Waarvan rente (€)", "maandRente", l.maandRente, 1)}
      </div>

      <div className="flex gap-3 flex-wrap items-end">
        {num("Rente betaald t/m peildatum (€)", "renteBetaald", l.renteBetaald, 100)}
        <label className="flex items-center gap-2 text-[12.5px] pb-2">
          <input
            type="checkbox"
            defaultChecked={l.aftrekbaar}
            onChange={(e) => zet({ aftrekbaar: e.target.checked })}
          />
          Rente aftrekbaar in box 1
        </label>
        <button
          onClick={() => onStart(() => deleteLening(l.id))}
          className="ml-auto px-3 py-2 rounded-full border border-input-border text-[12px] font-semibold text-danger"
        >
          Verwijderen
        </button>
      </div>

      <div className="text-[11.5px] text-muted leading-relaxed">
        {Math.abs(afwijking) > 50 ? (
          <span style={{ color: "#A9761C" }}>
            Het schema komt op de peildatum {fmtEUR0(Math.abs(afwijking))}{" "}
            {afwijking > 0 ? "hoger" : "lager"} uit dan het restant dat je hier invulde. Controleer
            eerst de startdatum en de looptijd; blijft het verschil, vul dan de werkelijk betaalde
            rente in — die overschrijft de berekening.
          </span>
        ) : (
          <>
            Het schema komt op de peildatum uit op hetzelfde restant als de bank meldt, dus de
            rentesommen zijn betrouwbaar. Laat &ldquo;rente betaald&rdquo; leeg om die afgeleid te
            houden.
          </>
        )}
      </div>
    </div>
  );
}

function Kpi({ label, waarde, sub }: { label: string; waarde: string; sub: string }) {
  return (
    <Card className="p-3.5 flex flex-col gap-0.5">
      <div className="text-[11px] uppercase tracking-wide text-label font-semibold">{label}</div>
      <div className="text-[19px] font-bold">{waarde}</div>
      <div className="text-[11.5px] text-muted">{sub}</div>
    </Card>
  );
}
