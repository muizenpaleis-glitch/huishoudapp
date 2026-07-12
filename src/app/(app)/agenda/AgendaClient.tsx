"use client";

import { useMemo, useState, useTransition } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { ModuleHeader } from "@/components/ModuleHeader";
import { PrimaryButton, Toggle } from "@/components/ui";
import { ChevronLeftIcon, ChevronRightIcon, PlusIcon, InfoIcon } from "@/components/icons";
import { saveEvent, removeEvent } from "./actions";
import type { CalEvent } from "@/lib/google-calendar";

const TZ = "Europe/Amsterdam";
const WEEKDAGEN = ["ma", "di", "wo", "do", "vr", "za", "zo"];
const MAANDEN = [
  "Januari", "Februari", "Maart", "April", "Mei", "Juni",
  "Juli", "Augustus", "September", "Oktober", "November", "December",
];

const amsDateFmt = new Intl.DateTimeFormat("en-CA", { timeZone: TZ, year: "numeric", month: "2-digit", day: "2-digit" });
const amsTimeFmt = new Intl.DateTimeFormat("nl-NL", { timeZone: TZ, hour: "2-digit", minute: "2-digit", hour12: false });

function amsDate(iso: string): string {
  return amsDateFmt.format(new Date(iso));
}
function amsTime(iso: string): string {
  return amsTimeFmt.format(new Date(iso));
}
function addDays(dateStr: string, days: number): string {
  const [y, m, d] = dateStr.split("-").map(Number);
  return new Date(Date.UTC(y, m - 1, d + days)).toISOString().slice(0, 10);
}
function fmtLangeDatum(dateStr: string): string {
  const [y, m, d] = dateStr.split("-").map(Number);
  return `${d} ${MAANDEN[m - 1].toLowerCase()} ${y}`;
}

type SheetState =
  | { mode: "new"; date: string }
  | { mode: "edit"; event: CalEvent }
  | null;

export function AgendaClient({
  maand,
  vandaag,
  events,
  error,
  demo,
}: {
  maand: string;
  vandaag: string;
  events: CalEvent[];
  error: string | null;
  demo: boolean;
}) {
  const [y, m] = maand.split("-").map(Number);
  const inMonth = vandaag.slice(0, 7) === maand;
  const [selectedDay, setSelectedDay] = useState<string>(inMonth ? vandaag : `${maand}-01`);
  const [sheet, setSheet] = useState<SheetState>(null);

  const prevMaand = m === 1 ? `${y - 1}-12` : `${y}-${String(m - 1).padStart(2, "0")}`;
  const nextMaand = m === 12 ? `${y + 1}-01` : `${y}-${String(m + 1).padStart(2, "0")}`;

  const { gridDays, byDay } = useMemo(() => {
    const first = new Date(Date.UTC(y, m - 1, 1));
    const offset = (first.getUTCDay() + 6) % 7;
    const daysInMonth = new Date(Date.UTC(y, m, 0)).getUTCDate();
    const weeks = Math.ceil((offset + daysInMonth) / 7);
    const total = weeks * 7;
    const startStr = addDays(`${maand}-01`, -offset);
    const gridDays = Array.from({ length: total }, (_, i) => addDays(startStr, i));

    const byDay = new Map<string, CalEvent[]>();
    const push = (day: string, ev: CalEvent) => {
      const arr = byDay.get(day) ?? [];
      arr.push(ev);
      byDay.set(day, arr);
    };
    for (const ev of events) {
      if (ev.allDay) {
        let d = ev.start.slice(0, 10);
        const endExcl = ev.end.slice(0, 10);
        let guard = 0;
        while (d < endExcl && guard < 60) {
          push(d, ev);
          d = addDays(d, 1);
          guard++;
        }
      } else {
        push(amsDate(ev.start), ev);
      }
    }
    for (const arr of byDay.values()) {
      arr.sort((a, b) => {
        if (a.allDay !== b.allDay) return a.allDay ? -1 : 1;
        return a.start.localeCompare(b.start);
      });
    }
    return { gridDays, byDay };
  }, [events, maand, y, m]);

  const dagEvents = byDay.get(selectedDay) ?? [];

  return (
    <div className="flex flex-col min-h-full">
      <ModuleHeader
        title="Agenda"
        subtitle={`${MAANDEN[m - 1]} ${y}`}
        right={
          <Link
            href={`/agenda?maand=${vandaag.slice(0, 7)}`}
            onClick={() => setSelectedDay(vandaag)}
            className="px-3.5 py-2 rounded-full bg-card border border-input-border text-[13px] font-semibold text-ink-soft"
          >
            Vandaag
          </Link>
        }
      />

      {demo && (
        <div className="px-5 mt-3 max-w-[900px] w-full mx-auto">
          <div className="rounded-xl bg-warning-bg border border-warning-border px-3.5 py-2.5 text-[12.5px] text-warning-dark flex items-center gap-2">
            <InfoIcon size={15} /> Voorbeeldweergave — de echte Google-agenda is nog niet gekoppeld.
          </div>
        </div>
      )}
      {error && (
        <div className="px-5 mt-3 max-w-[900px] w-full mx-auto">
          <div className="rounded-xl bg-danger-bg border border-danger-border px-3.5 py-2.5 text-[12.5px] text-danger">
            Kon de agenda niet laden: {error}
          </div>
        </div>
      )}

      <div className="px-5 mt-3 max-w-[900px] w-full mx-auto flex flex-col md:flex-row gap-5 pb-6">
        {/* Month grid */}
        <div className="flex-1 min-w-0">
          <div className="flex items-center justify-between mb-3">
            <Link
              href={`/agenda?maand=${prevMaand}`}
              className="w-9 h-9 rounded-full bg-card border border-input-border flex items-center justify-center"
            >
              <ChevronLeftIcon size={16} />
            </Link>
            <div className="text-[15px] font-bold">
              {MAANDEN[m - 1]} {y}
            </div>
            <Link
              href={`/agenda?maand=${nextMaand}`}
              className="w-9 h-9 rounded-full bg-card border border-input-border flex items-center justify-center"
            >
              <ChevronRightIcon size={16} />
            </Link>
          </div>

          <div className="grid grid-cols-7 gap-1 mb-1">
            {WEEKDAGEN.map((d) => (
              <div key={d} className="text-center text-[11px] font-semibold uppercase tracking-wide text-label py-1">
                {d}
              </div>
            ))}
          </div>

          <div className="grid grid-cols-7 gap-1">
            {gridDays.map((day) => {
              const dayNum = Number(day.slice(8, 10));
              const isCurrentMonth = day.slice(0, 7) === maand;
              const isToday = day === vandaag;
              const isSelected = day === selectedDay;
              const dayEvents = byDay.get(day) ?? [];
              return (
                <button
                  key={day}
                  onClick={() => setSelectedDay(day)}
                  className="aspect-square rounded-xl flex flex-col items-center pt-1.5 gap-1 border transition"
                  style={{
                    background: isSelected ? "var(--color-accent)" : isCurrentMonth ? "var(--color-card)" : "transparent",
                    borderColor: isSelected
                      ? "var(--color-accent)"
                      : isToday
                        ? "var(--color-accent)"
                        : isCurrentMonth
                          ? "var(--color-card-border)"
                          : "transparent",
                  }}
                >
                  <span
                    className="text-[12.5px] font-semibold leading-none"
                    style={{
                      color: isSelected
                        ? "var(--color-accent-ink)"
                        : isToday
                          ? "var(--color-accent)"
                          : isCurrentMonth
                            ? "var(--color-ink)"
                            : "var(--color-hint)",
                    }}
                  >
                    {dayNum}
                  </span>
                  <div className="flex gap-0.5 flex-wrap justify-center px-1">
                    {dayEvents.slice(0, 3).map((ev, i) => (
                      <span
                        key={ev.id + i}
                        className="w-1.5 h-1.5 rounded-full"
                        style={{
                          background: isSelected
                            ? "var(--color-accent-ink)"
                            : ev.allDay
                              ? "var(--color-success)"
                              : "var(--color-accent)",
                        }}
                      />
                    ))}
                  </div>
                </button>
              );
            })}
          </div>
        </div>

        {/* Day agenda */}
        <div className="md:w-[320px] shrink-0 flex flex-col gap-3">
          <div className="flex items-center justify-between">
            <div className="text-[14px] font-bold capitalize">{fmtLangeDatum(selectedDay)}</div>
            <button
              onClick={() => setSheet({ mode: "new", date: selectedDay })}
              className="w-9 h-9 rounded-full bg-accent flex items-center justify-center shadow-[0_4px_12px_rgba(196,99,59,0.3)]"
            >
              <PlusIcon size={18} className="text-accent-ink" />
            </button>
          </div>

          {dagEvents.length === 0 ? (
            <div className="text-[13px] text-muted py-6 text-center">Geen afspraken op deze dag.</div>
          ) : (
            <div className="flex flex-col gap-2">
              {dagEvents.map((ev) => (
                <button
                  key={ev.id}
                  onClick={() => setSheet({ mode: "edit", event: ev })}
                  className="text-left rounded-2xl border border-card-border bg-card p-3 flex gap-3 items-start"
                >
                  <div className="flex flex-col items-center pt-0.5 w-12 shrink-0">
                    {ev.allDay ? (
                      <span className="text-[11px] font-semibold text-success">hele dag</span>
                    ) : (
                      <>
                        <span className="text-[12.5px] font-bold">{amsTime(ev.start)}</span>
                        <span className="text-[11px] text-muted">{amsTime(ev.end)}</span>
                      </>
                    )}
                  </div>
                  <div
                    className="w-1 self-stretch rounded-full shrink-0"
                    style={{ background: ev.allDay ? "var(--color-success)" : "var(--color-accent)" }}
                  />
                  <div className="min-w-0 flex-1">
                    <div className="text-[14px] font-semibold leading-snug">{ev.title}</div>
                    {ev.location && <div className="text-[12px] text-muted mt-0.5 truncate">{ev.location}</div>}
                  </div>
                </button>
              ))}
            </div>
          )}
        </div>
      </div>

      {sheet && (
        <EventSheet
          key={sheet.mode === "edit" ? sheet.event.id : "new-" + sheet.date}
          sheet={sheet}
          demo={demo}
          onClose={() => setSheet(null)}
        />
      )}
    </div>
  );
}

function EventSheet({
  sheet,
  demo,
  onClose,
}: {
  sheet: NonNullable<SheetState>;
  demo: boolean;
  onClose: () => void;
}) {
  const router = useRouter();
  const [pending, startTransition] = useTransition();
  const [error, setError] = useState<string | null>(null);

  const editing = sheet.mode === "edit";
  const ev = editing ? sheet.event : null;

  const initialDate = editing ? amsDate(ev!.start) : sheet.date;
  const initialAllDay = editing ? ev!.allDay : false;
  const initialEndDate = editing
    ? ev!.allDay
      ? addDays(ev!.end.slice(0, 10), -1)
      : amsDate(ev!.end)
    : sheet.date;

  const [title, setTitle] = useState(ev?.title ?? "");
  const [allDay, setAllDay] = useState(initialAllDay);
  const [startDate, setStartDate] = useState(initialDate);
  const [endDate, setEndDate] = useState(initialEndDate);
  const [startTime, setStartTime] = useState(editing && !ev!.allDay ? amsTime(ev!.start) : "09:00");
  const [endTime, setEndTime] = useState(editing && !ev!.allDay ? amsTime(ev!.end) : "10:00");
  const [location, setLocation] = useState(ev?.location ?? "");
  const [description, setDescription] = useState(ev?.description ?? "");

  function onSave() {
    if (!title.trim()) {
      setError("Geef de afspraak een titel.");
      return;
    }
    if (demo) {
      setError("Dit is de voorbeeldweergave — koppel eerst de echte Google-agenda om op te slaan.");
      return;
    }
    setError(null);
    startTransition(async () => {
      try {
        await saveEvent(ev?.id ?? null, {
          title,
          allDay,
          startDate,
          endDate: allDay ? (endDate < startDate ? startDate : endDate) : startDate,
          startTime,
          endTime,
          location,
          description,
        });
        onClose();
        router.refresh();
      } catch (e) {
        setError(e instanceof Error ? e.message : "Opslaan mislukt");
      }
    });
  }

  function onDelete() {
    if (!ev) return;
    if (demo) {
      setError("Dit is de voorbeeldweergave — er valt niets te verwijderen.");
      return;
    }
    startTransition(async () => {
      try {
        await removeEvent(ev.id);
        onClose();
        router.refresh();
      } catch (e) {
        setError(e instanceof Error ? e.message : "Verwijderen mislukt");
      }
    });
  }

  return (
    <div className="fixed inset-0 z-40 flex items-end md:items-center justify-center" onClick={onClose}>
      <div className="absolute inset-0 bg-ink/35" />
      <div
        className="relative w-full max-w-[480px] bg-card rounded-t-[26px] md:rounded-[26px] p-5 pb-7 flex flex-col gap-4 shadow-[0_-10px_34px_rgba(94,72,50,0.22)] max-h-[88vh] overflow-y-auto"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex items-center justify-between">
          <div className="text-[17px] font-bold">{editing ? "Afspraak bewerken" : "Nieuwe afspraak"}</div>
          <button
            onClick={onClose}
            className="w-8 h-8 rounded-full bg-track flex items-center justify-center text-muted text-lg leading-none"
          >
            ×
          </button>
        </div>

        <input
          value={title}
          onChange={(e) => setTitle(e.target.value)}
          placeholder="Titel van de afspraak"
          autoFocus
          className="agenda-input text-[15px] font-semibold"
        />

        <button
          type="button"
          onClick={() => setAllDay((v) => !v)}
          className="flex items-center justify-between bg-cream rounded-2xl px-4 py-3 border border-card-border"
        >
          <span className="text-[14px] font-semibold">Hele dag</span>
          <Toggle on={allDay} />
        </button>

        <div className="flex flex-col gap-2.5">
          <div className="flex items-center gap-2.5">
            <label className="text-[13px] text-muted w-16 shrink-0">Van</label>
            <input type="date" value={startDate} onChange={(e) => setStartDate(e.target.value)} className="agenda-input" />
            {!allDay && (
              <input type="time" value={startTime} onChange={(e) => setStartTime(e.target.value)} className="agenda-input w-28 shrink-0" />
            )}
          </div>
          {allDay ? (
            <div className="flex items-center gap-2.5">
              <label className="text-[13px] text-muted w-16 shrink-0">Tot</label>
              <input type="date" value={endDate} min={startDate} onChange={(e) => setEndDate(e.target.value)} className="agenda-input" />
            </div>
          ) : (
            <div className="flex items-center gap-2.5">
              <label className="text-[13px] text-muted w-16 shrink-0">Tot</label>
              <input type="time" value={endTime} onChange={(e) => setEndTime(e.target.value)} className="agenda-input w-28" />
            </div>
          )}
        </div>

        <input
          value={location}
          onChange={(e) => setLocation(e.target.value)}
          placeholder="Locatie (optioneel)"
          className="agenda-input"
        />
        <textarea
          value={description}
          onChange={(e) => setDescription(e.target.value)}
          placeholder="Notitie (optioneel)"
          rows={2}
          className="agenda-input resize-none"
        />

        {error && <div className="text-[13px] text-danger font-semibold">{error}</div>}

        <div className="flex gap-2.5 mt-1">
          {editing && (
            <button
              onClick={onDelete}
              disabled={pending}
              className="px-4 py-3.5 rounded-full border border-danger-border text-danger text-[14px] font-semibold disabled:opacity-50"
            >
              Verwijderen
            </button>
          )}
          <PrimaryButton onClick={onSave} disabled={pending} className="flex-1">
            {pending ? "Bezig…" : editing ? "Opslaan" : "Toevoegen"}
          </PrimaryButton>
        </div>
      </div>

      <style jsx global>{`
        .agenda-input {
          flex: 1;
          min-width: 0;
          padding: 11px 14px;
          border-radius: 14px;
          border: 1px solid var(--color-input-border);
          background: var(--color-cream);
          font-size: 14px;
          color: var(--color-ink);
          outline: none;
          box-sizing: border-box;
          width: 100%;
        }
      `}</style>
    </div>
  );
}
