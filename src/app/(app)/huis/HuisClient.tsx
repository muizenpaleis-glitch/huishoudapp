"use client";

import { useMemo, useRef, useState, useTransition } from "react";
import Image from "next/image";
import {
  ChevronLeftIcon,
  ChevronRightIcon,
  LampIcon,
  BoltIcon,
  PinIcon,
  VideoIcon,
} from "@/components/icons";
import {
  ROOM_ORDER,
  KLEUR_TEMP_OPTS,
  kleurTempSwatch,
  fmtKwh,
  fmtKw,
  fmtDuur,
  fmtTijd,
  fmtLeadenGeleden,
  LAADPAAL_STATUS_LABEL,
} from "@/lib/huis";
import {
  toggleLamp,
  setLampHelderheid,
  setLampKleurTemp,
  toggleFavoriet,
  moveFavoriet,
  setLaadpaalStatus,
  toggleAutomatisering,
  automatiseringHandmatigeActie,
} from "./actions";
import type { KleurTemp, LaadpaalStatus } from "@/generated/prisma/client";

type Lamp = {
  id: string;
  naam: string;
  kamer: string;
  aan: boolean;
  helderheid: number;
  kleurTemp: KleurTemp;
};
type Camera = { id: string; naam: string; laatsteBeweging: string | null };
type EnergieStatus = {
  verbruikNuKw: number;
  opwekNuKw: number;
  terugleveringNuKw: number;
  verbruikVandaagKwh: number;
  opwekVandaagKwh: number;
  teruggeleverdVandaagKwh: number;
  warmtepompVandaagKwh: number;
  warmtepompBijgewerkt: string | null;
};
type Meting = { periode: "dag" | "week" | "maand"; label: string; verbruik: number; opwek: number };
type Sessie = { id: string; datum: string; duurMinuten: number; kwh: number };
type Laadpaal = { status: LaadpaalStatus; huidigVermogenKw: number; sessies: Sessie[] };
type Automatisering = { aan: boolean; laatsteActie: string | null; laatsteActieOp: string | null };

export function HuisClient({
  lampen,
  cameras,
  energieStatus,
  metingen,
  laadpaal,
  automatisering,
  favorieten,
}: {
  lampen: Lamp[];
  cameras: Camera[];
  energieStatus: EnergieStatus;
  metingen: Meting[];
  laadpaal: Laadpaal;
  automatisering: Automatisering;
  favorieten: string[];
}) {
  const [, startTransition] = useTransition();
  const [roomFilter, setRoomFilter] = useState("Alle");
  const [editMode, setEditMode] = useState(false);
  const [selectedLampId, setSelectedLampId] = useState<string | null>(null);
  const [selectedCameraId, setSelectedCameraId] = useState<string | null>(null);
  const [periode, setPeriode] = useState<"dag" | "week" | "maand">("week");
  const pressTimer = useRef<ReturnType<typeof setTimeout> | null>(null);

  function startPress() {
    if (pressTimer.current) clearTimeout(pressTimer.current);
    pressTimer.current = setTimeout(() => setEditMode(true), 550);
  }
  function endPress() {
    if (pressTimer.current) clearTimeout(pressTimer.current);
  }
  const pressHandlers = {
    onMouseDown: startPress,
    onMouseUp: endPress,
    onMouseLeave: endPress,
    onTouchStart: startPress,
    onTouchEnd: endPress,
  };

  const rooms = useMemo(() => {
    const present = new Set(lampen.map((l) => l.kamer));
    return ROOM_ORDER.filter((r) => present.has(r));
  }, [lampen]);

  const zichtbareRooms = roomFilter === "Alle" ? rooms : [roomFilter];
  const lichtGroepen = zichtbareRooms
    .map((kamer) => ({ kamer, lampen: lampen.filter((l) => l.kamer === kamer) }))
    .filter((g) => g.lampen.length > 0);

  const selectedLamp = lampen.find((l) => l.id === selectedLampId) ?? null;
  const selectedCamera = cameras.find((c) => c.id === selectedCameraId) ?? null;

  const metingenVoorPeriode = metingen.filter((m) => m.periode === periode);
  const maxWaarde = Math.max(1, ...metingenVoorPeriode.map((m) => Math.max(m.verbruik, m.opwek)));
  const laadpaalInfo = LAADPAAL_STATUS_LABEL[laadpaal.status];

  function favorietItem(key: string): { label: string; sub: string; onOpen?: () => void } | null {
    if (key.startsWith("lamp:")) {
      const l = lampen.find((x) => x.id === key.slice(5));
      if (!l) return null;
      return { label: l.naam, sub: l.aan ? `Aan · ${l.helderheid}%` : "Uit", onOpen: () => setSelectedLampId(l.id) };
    }
    if (key === "laadpaal") return { label: "Laadpaal", sub: laadpaalInfo.label };
    if (key === "automatisering") return { label: "Zonne-overschot", sub: automatisering.aan ? "Actief" : "Uit" };
    return null;
  }

  return (
    <div className="flex flex-col min-h-full pb-8">
      {editMode && (
        <div className="sticky top-0 z-20 bg-ink text-accent-ink flex items-center justify-between gap-3 px-5 py-3">
          <div className="text-[13px] font-medium flex items-center gap-2">
            <PinIcon size={15} />
            Bewerkmodus — tik het pin-icoon om favorieten te beheren
          </div>
          <button onClick={() => setEditMode(false)} className="px-3.5 py-1.5 rounded-full bg-accent-ink text-ink text-[12.5px] font-bold shrink-0">
            Klaar
          </button>
        </div>
      )}

      <div className="pt-16 md:pt-6 px-5 flex items-center justify-between gap-3">
        <div className="flex items-center gap-3 min-w-0">
          <div className="md:hidden w-[46px] h-[46px] rounded-full bg-card border border-avatar-border flex items-center justify-center shrink-0">
            <Image src="/wapen-klein.png" alt="Familiewapen" width={34} height={37} className="object-contain" />
          </div>
          <div className="min-w-0">
            <div className="text-[26px] font-bold tracking-tight leading-tight">Huis</div>
            <div className="text-[13.5px] text-muted mt-0.5">Home Assistant · gedeeld huishouden</div>
          </div>
        </div>
        <div className="flex items-center gap-1.5 px-3.5 py-2 rounded-full bg-card border border-input-border shrink-0">
          <div className="w-2 h-2 rounded-full bg-warning" />
          <span className="text-[12.5px] font-semibold text-ink-soft">Voorbeelddata</span>
        </div>
      </div>

      <div className="px-5 pt-3.5 flex gap-2 overflow-x-auto">
        {["Alle", ...rooms].map((r) => (
          <button key={r} onClick={() => setRoomFilter(r)}>
            <span
              className="inline-block px-3.5 py-2 rounded-full text-[12.5px] font-semibold whitespace-nowrap border"
              style={{
                background: roomFilter === r ? "var(--color-ink)" : "var(--color-card)",
                color: roomFilter === r ? "var(--color-accent-ink)" : "var(--color-ink-soft)",
                borderColor: roomFilter === r ? "var(--color-ink)" : "var(--color-input-border)",
              }}
            >
              {r}
            </span>
          </button>
        ))}
      </div>

      <div className="px-5 py-4 flex flex-col gap-6 max-w-[780px] w-full mx-auto">
        {/* Favorieten */}
        <div className="flex flex-col gap-3">
          <div className="text-[13px] font-bold tracking-wider uppercase text-label">Favorieten</div>
          <div className="flex gap-3 flex-wrap">
            {favorieten.map((key) => {
              const item = favorietItem(key);
              if (!item) return null;
              return (
                <div
                  key={key}
                  {...pressHandlers}
                  onClick={item.onOpen}
                  className="relative w-[132px] p-3.5 rounded-[20px] bg-card border border-card-border flex flex-col gap-2.5 cursor-pointer"
                >
                  <div className="w-[38px] h-[38px] rounded-xl bg-accent-tint text-accent flex items-center justify-center">
                    {key === "laadpaal" || key === "automatisering" ? <BoltIcon size={19} /> : <LampIcon size={19} />}
                  </div>
                  <div>
                    <div className="text-[13.5px] font-bold">{item.label}</div>
                    <div className="text-[11.5px] text-muted mt-0.5">{item.sub}</div>
                  </div>
                  {editMode && (
                    <div className="absolute top-2 right-2 flex flex-col gap-1">
                      <button
                        onClick={(e) => {
                          e.stopPropagation();
                          startTransition(() => moveFavoriet(key, -1));
                        }}
                        className="w-5 h-5 rounded-md bg-white/65 flex items-center justify-center"
                      >
                        <ChevronLeftIcon size={11} className="rotate-90" />
                      </button>
                      <button
                        onClick={(e) => {
                          e.stopPropagation();
                          startTransition(() => moveFavoriet(key, 1));
                        }}
                        className="w-5 h-5 rounded-md bg-white/65 flex items-center justify-center"
                      >
                        <ChevronRightIcon size={11} className="rotate-90" />
                      </button>
                    </div>
                  )}
                </div>
              );
            })}
            {favorieten.length === 0 && (
              <div className="text-[13px] text-hint py-3.5">
                Nog geen favorieten — houd een kaart lang ingedrukt om vast te pinnen.
              </div>
            )}
          </div>
        </div>

        {/* Verlichting */}
        <div className="flex flex-col gap-3.5">
          <div className="text-[13px] font-bold tracking-wider uppercase text-label">Verlichting</div>
          {lichtGroepen.map((g) => (
            <div key={g.kamer} className="flex flex-col gap-2.5">
              <div className="text-[14px] font-bold text-ink-soft">{g.kamer}</div>
              <div className="flex flex-col gap-2">
                {g.lampen.map((l) => {
                  const pinKey = `lamp:${l.id}`;
                  const pinned = favorieten.includes(pinKey);
                  return (
                    <div
                      key={l.id}
                      {...pressHandlers}
                      className="relative flex items-center gap-3 px-3.5 py-3 rounded-2xl"
                      style={{
                        background: l.aan ? "var(--color-card)" : "var(--color-cream)",
                        border: `1px solid ${l.aan ? "#F0DDC2" : "var(--color-card-border)"}`,
                      }}
                    >
                      <button
                        onClick={() => startTransition(() => toggleLamp(l.id))}
                        className="w-[42px] h-[42px] rounded-[13px] flex items-center justify-center shrink-0"
                        style={{
                          background: l.aan ? "#F5E8CB" : "var(--color-card-border)",
                          color: l.aan ? "#A9761C" : "var(--color-hint)",
                        }}
                      >
                        <LampIcon size={20} />
                      </button>
                      <button onClick={() => setSelectedLampId(l.id)} className="flex-1 min-w-0 text-left">
                        <div className="text-[14px] font-semibold" style={{ color: l.aan ? "var(--color-ink)" : "var(--color-muted)" }}>
                          {l.naam}
                        </div>
                        <div className="text-[12px] text-muted mt-0.5">{l.aan ? `Aan · ${l.helderheid}%` : "Uit"}</div>
                      </button>
                      <button
                        onClick={() => startTransition(() => toggleLamp(l.id))}
                        className="w-[46px] h-[27px] rounded-full relative shrink-0"
                        style={{ background: l.aan ? "#A9761C" : "#DCCBB4" }}
                      >
                        <div
                          className="absolute top-[3px] w-[21px] h-[21px] rounded-full bg-card transition-all"
                          style={{ left: l.aan ? "22px" : "3px" }}
                        />
                      </button>
                      <button onClick={() => setSelectedLampId(l.id)} className="w-[26px] h-[26px] rounded-full flex items-center justify-center shrink-0">
                        <ChevronRightIcon size={14} className="text-hint" />
                      </button>
                      {editMode && (
                        <button
                          onClick={() => startTransition(() => toggleFavoriet(pinKey))}
                          className="w-[26px] h-[26px] rounded-lg flex items-center justify-center shrink-0"
                          style={{ background: pinned ? "var(--color-ink)" : "rgba(255,255,255,0.75)" }}
                        >
                          <PinIcon size={13} style={{ color: pinned ? "var(--color-accent-ink)" : "var(--color-ink-soft)" }} />
                        </button>
                      )}
                    </div>
                  );
                })}
              </div>
            </div>
          ))}
        </div>

        {/* Energie */}
        <div className="flex flex-col gap-3.5">
          <div className="text-[13px] font-bold tracking-wider uppercase text-[#2F6E58]">Energie</div>

          <div className="grid grid-cols-3 gap-2.5">
            <EnergyTile icon={<BoltIcon size={16} />} waarde={fmtKw(energieStatus.verbruikNuKw)} label="Verbruik nu" />
            <EnergyTile icon={<BoltIcon size={16} />} waarde={fmtKw(energieStatus.opwekNuKw)} label="Zonopwek nu" />
            <EnergyTile icon={<BoltIcon size={16} />} waarde={fmtKw(energieStatus.terugleveringNuKw)} label="Teruglevering" />
          </div>
          <div className="grid grid-cols-3 gap-2.5">
            <DagTotaalTile label="Verbruikt" waarde={fmtKwh(energieStatus.verbruikVandaagKwh)} />
            <DagTotaalTile label="Opgewekt" waarde={fmtKwh(energieStatus.opwekVandaagKwh)} />
            <DagTotaalTile label="Teruggeleverd" waarde={fmtKwh(energieStatus.teruggeleverdVandaagKwh)} />
          </div>

          <div className="p-4.5 rounded-[20px] bg-card flex flex-col gap-3" style={{ border: "1px solid #DCE8DE" }}>
            <div className="flex items-center justify-between flex-wrap gap-2">
              <div className="text-[13.5px] font-bold">Verbruik &amp; opwek</div>
              <div className="flex gap-1 bg-[#F1F5EF] rounded-full p-[3px]">
                {(["dag", "week", "maand"] as const).map((p) => (
                  <button
                    key={p}
                    onClick={() => setPeriode(p)}
                    className="px-3.5 py-1.5 rounded-full text-[12px] font-semibold capitalize"
                    style={{
                      background: periode === p ? "var(--color-card)" : "transparent",
                      color: periode === p ? "var(--color-ink)" : "var(--color-muted)",
                    }}
                  >
                    {p}
                  </button>
                ))}
              </div>
            </div>
            <div className="flex items-stretch gap-3 h-[110px]">
              {metingenVoorPeriode.map((m) => (
                <div key={m.label} className="flex-1 flex flex-col items-center justify-end gap-1.5">
                  <div className="flex-1 w-full flex items-end gap-[3px]">
                    <div
                      className="flex-1 rounded-t"
                      style={{ height: `${(m.verbruik / maxWaarde) * 100}%`, background: "#B0512C", minHeight: 2 }}
                    />
                    <div
                      className="flex-1 rounded-t"
                      style={{ height: `${(m.opwek / maxWaarde) * 100}%`, background: "#5C7F55", minHeight: 2 }}
                    />
                  </div>
                  <div className="text-[11px] font-semibold text-muted">{m.label}</div>
                </div>
              ))}
            </div>
            <div className="flex gap-4.5">
              <Legend kleur="#B0512C" label="Verbruik" />
              <Legend kleur="#5C7F55" label="Opwek" />
            </div>
          </div>

          <div className="px-4.5 py-3.5 rounded-2xl bg-[#F1F5EF] flex items-center gap-3" style={{ border: "1px solid #DCE8DE" }}>
            <div className="w-9 h-9 rounded-[11px] bg-[#E4ECDD] text-[#2F6E58] flex items-center justify-center shrink-0">
              <BoltIcon size={18} />
            </div>
            <div className="min-w-0">
              <div className="text-[13.5px] font-bold">Warmtepomp — {fmtKwh(energieStatus.warmtepompVandaagKwh)} vandaag</div>
              <div className="text-[11.5px] text-muted mt-0.5">
                Laatst bijgewerkt: {energieStatus.warmtepompBijgewerkt ? fmtLeadenGeleden(new Date(energieStatus.warmtepompBijgewerkt)) : "onbekend"} (Vaillant-cloud, ~30 min interval)
              </div>
            </div>
          </div>

          {/* Laadpaal */}
          <div {...pressHandlers} className="relative p-4.5 rounded-[20px] bg-card flex flex-col gap-3.5" style={{ border: "1px solid #DCE8DE" }}>
            <div className="flex items-center justify-between gap-3">
              <div className="flex items-center gap-3 min-w-0">
                <div className="w-[38px] h-[38px] rounded-xl bg-[#E4ECDD] text-[#2F6E58] flex items-center justify-center shrink-0">
                  <BoltIcon size={19} />
                </div>
                <div className="min-w-0">
                  <div className="text-[14.5px] font-bold">Laadpaal — Alfen Eve</div>
                  <div className="text-[12px] text-muted mt-0.5">
                    {laadpaal.status === "laden" ? `Laadt met ${fmtKw(laadpaal.huidigVermogenKw)}` : laadpaalInfo.label}
                  </div>
                </div>
              </div>
              <span
                className="px-3 py-1.5 rounded-full text-[12px] font-bold shrink-0"
                style={{ background: laadpaalInfo.bg, color: laadpaalInfo.c }}
              >
                {laadpaalInfo.label}
              </span>
              {editMode && <FavPinButton pinKey="laadpaal" favorieten={favorieten} startTransition={startTransition} />}
            </div>
            <div className="flex gap-2">
              <ActionButton onClick={() => startTransition(() => setLaadpaalStatus("laden"))}>Starten</ActionButton>
              <ActionButton onClick={() => startTransition(() => setLaadpaalStatus("gepauzeerd"))}>Pauzeren</ActionButton>
              <ActionButton onClick={() => startTransition(() => setLaadpaalStatus("vrij"))}>Stoppen</ActionButton>
            </div>
            <div className="flex flex-col gap-1.5">
              <div className="text-[11.5px] font-bold tracking-wide uppercase text-label">Sessiegeschiedenis</div>
              {laadpaal.sessies.map((s) => (
                <div key={s.id} className="grid grid-cols-3 gap-3.5 items-center py-2 border-b border-divider text-[12.5px]">
                  <span className="text-ink-soft whitespace-nowrap">
                    {new Date(s.datum).toLocaleDateString("nl-NL", { day: "numeric", month: "short" })}
                  </span>
                  <span className="text-muted whitespace-nowrap">{fmtDuur(s.duurMinuten)}</span>
                  <span className="font-bold whitespace-nowrap text-right">{fmtKwh(s.kwh)}</span>
                </div>
              ))}
            </div>
          </div>

          {/* Zonne-overschot */}
          <div {...pressHandlers} className="relative p-4.5 rounded-[20px] bg-card flex flex-col gap-3.5" style={{ border: "1px solid #DCE8DE" }}>
            <div className="flex items-center justify-between gap-3">
              <div className="flex items-center gap-3 min-w-0">
                <div className="w-[38px] h-[38px] rounded-xl bg-warning-bg text-warning flex items-center justify-center shrink-0">
                  <BoltIcon size={19} />
                </div>
                <div className="min-w-0">
                  <div className="text-[14.5px] font-bold">Zonne-overschot verdelen</div>
                  <div className="text-[12px] text-muted mt-0.5 truncate">
                    {automatisering.laatsteActie
                      ? `Laatste actie: ${automatisering.laatsteActie}${automatisering.laatsteActieOp ? " · " + fmtTijd(new Date(automatisering.laatsteActieOp)) : ""}`
                      : "Alleen handmatige acties — automatisch verdelen komt later"}
                  </div>
                </div>
              </div>
              <button
                onClick={() => startTransition(() => toggleAutomatisering())}
                className="w-[46px] h-[27px] rounded-full relative shrink-0"
                style={{ background: automatisering.aan ? "#A9761C" : "#DCCBB4" }}
              >
                <div
                  className="absolute top-[3px] w-[21px] h-[21px] rounded-full bg-card transition-all"
                  style={{ left: automatisering.aan ? "22px" : "3px" }}
                />
              </button>
              {editMode && <FavPinButton pinKey="automatisering" favorieten={favorieten} startTransition={startTransition} />}
            </div>
            <div className="flex gap-2">
              <button
                onClick={() => startTransition(() => automatiseringHandmatigeActie("Boost warmwater"))}
                className="flex-1 py-2.5 rounded-xl bg-track text-ink text-[12.5px] font-semibold text-center"
              >
                Boost warmwater nu
              </button>
              <button
                onClick={() => startTransition(() => automatiseringHandmatigeActie("Auto laden"))}
                className="flex-1 py-2.5 rounded-xl bg-track text-ink text-[12.5px] font-semibold text-center"
              >
                Auto nu laden
              </button>
            </div>
          </div>
        </div>

        {/* Camera's */}
        <div className="flex flex-col gap-3.5">
          <div className="text-[13px] font-bold tracking-wider uppercase text-label">Camera&apos;s</div>
          <div className="grid grid-cols-2 md:grid-cols-3 gap-3">
            {cameras.map((c) => (
              <button
                key={c.id}
                onClick={() => setSelectedCameraId(c.id)}
                className="relative rounded-[18px] overflow-hidden bg-ink aspect-video flex items-center justify-center"
              >
                <VideoIcon size={26} className="text-hint" />
                <div className="absolute top-2.5 left-2.5 flex items-center gap-1.5 px-2 py-1 rounded-full bg-black/50">
                  <span className="text-[10px] font-bold text-accent-ink tracking-wide">VOORBEELD</span>
                </div>
                <div className="absolute bottom-0 left-0 right-0 px-3 py-2.5 flex flex-col gap-0.5" style={{ background: "linear-gradient(transparent, rgba(0,0,0,0.65))" }}>
                  <div className="text-[12.5px] font-bold text-accent-ink text-left">{c.naam}</div>
                  <div className="text-[11px] text-left" style={{ color: "#E4D5C1" }}>
                    {c.laatsteBeweging ? `Beweging: ${fmtTijd(new Date(c.laatsteBeweging))}` : "Geen beweging vandaag"}
                  </div>
                </div>
              </button>
            ))}
          </div>
        </div>
      </div>

      {/* Lamp detail sheet */}
      {selectedLamp && (
        <div className="fixed inset-0 z-40 flex items-end justify-center bg-black/35" onClick={() => setSelectedLampId(null)}>
          <div
            className="w-full max-w-[480px] bg-card rounded-t-[24px] p-5 flex flex-col gap-4.5"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="flex items-center justify-between">
              <div>
                <div className="text-[17px] font-bold">{selectedLamp.naam}</div>
                <div className="text-[12.5px] text-muted">{selectedLamp.kamer}</div>
              </div>
              <button onClick={() => setSelectedLampId(null)} className="w-[34px] h-[34px] rounded-full bg-track flex items-center justify-center">
                ✕
              </button>
            </div>
            <div className="flex flex-col gap-2">
              <div className="flex justify-between text-[13px] font-semibold text-ink-soft">
                <span>Helderheid</span>
                <span>{selectedLamp.helderheid}%</span>
              </div>
              <input
                type="range"
                min={1}
                max={100}
                defaultValue={selectedLamp.helderheid}
                onMouseUp={(e) => startTransition(() => setLampHelderheid(selectedLamp.id, Number(e.currentTarget.value)))}
                onTouchEnd={(e) => startTransition(() => setLampHelderheid(selectedLamp.id, Number(e.currentTarget.value)))}
                className="w-full accent-accent"
              />
            </div>
            <div className="flex flex-col gap-2">
              <div className="text-[13px] font-semibold text-ink-soft">Kleurtemperatuur</div>
              <div className="flex gap-2.5">
                {KLEUR_TEMP_OPTS.map((t) => {
                  const swatch = kleurTempSwatch(t.key);
                  return (
                    <button
                      key={t.key}
                      onClick={() => startTransition(() => setLampKleurTemp(selectedLamp.id, t.key))}
                      className="flex-1 py-3 rounded-2xl text-[12px] font-bold text-center"
                      style={{
                        background: swatch.bg,
                        color: swatch.c,
                        border: `2px solid ${selectedLamp.kleurTemp === t.key ? "var(--color-ink)" : "transparent"}`,
                      }}
                    >
                      {t.label}
                    </button>
                  );
                })}
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Camera fullscreen */}
      {selectedCamera && (
        <div
          className="fixed inset-0 z-40 flex flex-col items-center justify-center p-6 bg-black/85"
          onClick={() => setSelectedCameraId(null)}
        >
          <div className="w-full max-w-[640px] flex flex-col gap-3" onClick={(e) => e.stopPropagation()}>
            <div className="flex items-center justify-between">
              <div className="text-[15px] font-bold text-accent-ink">{selectedCamera.naam}</div>
              <button onClick={() => setSelectedCameraId(null)} className="w-[34px] h-[34px] rounded-full bg-white/15 flex items-center justify-center text-accent-ink">
                ✕
              </button>
            </div>
            <div className="w-full aspect-video rounded-2xl bg-[#1c1a17] flex items-center justify-center">
              <VideoIcon size={40} className="text-hint" />
            </div>
            <div className="text-[12.5px] text-hint text-center">
              Voorbeelddata — hier komt straks het live camerabeeld via Home Assistant.
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

function EnergyTile({ icon, waarde, label }: { icon: React.ReactNode; waarde: string; label: string }) {
  return (
    <div className="p-4 rounded-2xl bg-card" style={{ border: "1px solid #DCE8DE" }}>
      <div className="w-8 h-8 rounded-[10px] bg-[#E4ECDD] text-[#2F6E58] flex items-center justify-center mb-2">{icon}</div>
      <div className="text-[19px] font-bold tabular-nums">{waarde}</div>
      <div className="text-[12px] text-ink-soft mt-0.5">{label}</div>
    </div>
  );
}

function DagTotaalTile({ label, waarde }: { label: string; waarde: string }) {
  return (
    <div className="px-3 py-2.5 rounded-2xl bg-[#F1F5EF] flex flex-col gap-0.5 min-w-0" style={{ border: "1px solid #DCE8DE" }}>
      <div className="text-[11px] font-semibold truncate" style={{ color: "#4A6B4F" }}>
        {label}
      </div>
      <div className="text-[14px] font-bold tabular-nums whitespace-nowrap" style={{ color: "#2F6E58" }}>
        {waarde}
      </div>
    </div>
  );
}

function Legend({ kleur, label }: { kleur: string; label: string }) {
  return (
    <div className="flex items-center gap-1.5">
      <div className="w-3.5 h-1 rounded-sm" style={{ background: kleur }} />
      <span className="text-[12px] text-ink-soft">{label}</span>
    </div>
  );
}

function ActionButton({ children, onClick }: { children: React.ReactNode; onClick: () => void }) {
  return (
    <button onClick={onClick} className="flex-1 py-2.5 rounded-xl bg-track text-ink text-[12.5px] font-semibold text-center">
      {children}
    </button>
  );
}

function FavPinButton({
  pinKey,
  favorieten,
  startTransition,
}: {
  pinKey: string;
  favorieten: string[];
  startTransition: (fn: () => void) => void;
}) {
  const pinned = favorieten.includes(pinKey);
  return (
    <button
      onClick={() => startTransition(() => toggleFavoriet(pinKey))}
      className="w-[26px] h-[26px] rounded-lg flex items-center justify-center shrink-0"
      style={{ background: pinned ? "var(--color-ink)" : "rgba(255,255,255,0.75)" }}
    >
      <PinIcon size={13} style={{ color: pinned ? "var(--color-accent-ink)" : "var(--color-ink-soft)" }} />
    </button>
  );
}
