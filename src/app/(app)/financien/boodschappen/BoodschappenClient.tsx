"use client";

import { useMemo, useState, useTransition } from "react";
import { BackButton, Card } from "@/components/ui";
import { fmtEUR0 } from "@/lib/finance/format";
import {
  productStats,
  groepStats,
  bulkKandidaten,
  perMaand,
  perCategorie,
  CATEGORIEEN,
  BULK_MIN_KEER,
  BULK_STERK_KEER,
  BULK_MAX_RIJEN,
  type RegelRij,
  type ProductOverride,
  type ProductStat,
} from "@/lib/boodschappen/engine";
import { CategoryDonut } from "../charts";
import type { BonRij } from "./page";
import {
  plakBonnetje,
  syncNu,
  ontkoppelGmail,
  verwijderBon,
  setProductGroep,
  setProductCategorie,
  setProductHoudbaar,
  setBulkNegeren,
} from "./actions";

type GmailStatus = {
  geconfigureerd: boolean;
  gekoppeld: boolean;
  email: string | null;
  laatsteSync: string | null;
  laatsteFout: string | null;
  laatsteUitkomst: string | null;
};

const MAANDNAMEN = ["jan", "feb", "mrt", "apr", "mei", "jun", "jul", "aug", "sep", "okt", "nov", "dec"];
function maandLabel(m: string) {
  const [j, mm] = m.split("-");
  return `${MAANDNAMEN[parseInt(mm, 10) - 1]} '${j.slice(2)}`;
}

export function BoodschappenClient({
  bonnen,
  regels,
  overrides,
  gmail,
  terugkoppeling,
}: {
  bonnen: BonRij[];
  regels: RegelRij[];
  overrides: ProductOverride[];
  gmail: GmailStatus;
  terugkoppeling: { soort: string; adres?: string; melding?: string } | null;
}) {
  const [, start] = useTransition();
  const [zoek, setZoek] = useState("");
  const [melding, setMelding] = useState<string | null>(null);
  const [plaktekst, setPlaktekst] = useState("");
  const [bezig, setBezig] = useState(false);

  const stats = useMemo(() => productStats(regels, overrides), [regels, overrides]);
  const groepen = useMemo(() => groepStats(stats), [stats]);
  const bulk = useMemo(() => bulkKandidaten(groepen), [groepen]);
  const maanden = useMemo(() => perMaand(regels, bonnen), [regels, bonnen]);
  const categorieen = useMemo(() => perCategorie(stats), [stats]);

  const besteed = bonnen.reduce((s, b) => s + (b.totaal ?? 0), 0);
  const gemPerBezorging = bonnen.length ? besteed / bonnen.length : 0;
  const voordeel = bonnen.reduce((s, b) => s + b.voordeel, 0);
  const laatsteMaand = maanden[maanden.length - 1];
  const scheve = bonnen.filter((b) => !b.klopt);

  const zichtbaar = useMemo(() => {
    const q = zoek.trim().toLowerCase();
    const lijst = q ? stats.filter((s) => s.naam.toLowerCase().includes(q)) : stats;
    return lijst.slice(0, q ? 200 : 40);
  }, [stats, zoek]);

  async function doePlak() {
    setBezig(true);
    try {
      const r = await plakBonnetje(plaktekst);
      setMelding(r.melding);
      if (r.ok) setPlaktekst("");
    } catch (e) {
      setMelding(`Er ging iets mis bij het verwerken: ${e instanceof Error ? e.message : e}`);
    } finally {
      setBezig(false);
    }
  }
  async function doeSync(alles: boolean) {
    setBezig(true);
    setMelding("Bezig met ophalen…");
    try {
      const r = await syncNu(alles);
      setMelding(r.melding);
    } catch {
      // Breekt de server de aanvraag af (tijdslimiet), dan komt er geen antwoord
      // terug. Zwijgen zou lijken alsof er niets gebeurd is, terwijl de ronde
      // wél bonnetjes heeft weggeschreven.
      setMelding(
        "De ronde werd afgebroken voordat hij klaar was — waarschijnlijk de tijdslimiet van de server. " +
          "Wat al ingelezen was, is bewaard. Klik nog een keer: hij slaat over wat er al in staat.",
      );
    } finally {
      setBezig(false);
    }
  }

  const maxMaand = Math.max(1, ...maanden.map((m) => m.bedrag));

  return (
    <div className="pt-16 md:pt-6 px-5 pb-8 overflow-y-auto">
      <div className="max-w-[1080px] mx-auto flex flex-col gap-4">
        <div className="flex items-center gap-3">
          <BackButton href="/financien" />
          <div className="min-w-0">
            <div className="text-[21px] font-bold tracking-tight">Boodschappen</div>
            <div className="text-[13px] text-muted">
              {bonnen.length} bezorging{bonnen.length === 1 ? "" : "en"} · {regels.length} productregels
              · uit de Picnic-bonnetjes
            </div>
          </div>
        </div>

        {terugkoppeling && (
          <Card className="p-4 text-[13px]">
            {terugkoppeling.soort === "gekoppeld" ? (
              <span style={{ color: "#5C7F55" }}>Gmail gekoppeld op {terugkoppeling.adres}.</span>
            ) : terugkoppeling.soort === "geweigerd" ? (
              <span style={{ color: "#A9761C" }}>Toestemming geweigerd — er is niets gekoppeld.</span>
            ) : (
              <span style={{ color: "#B0512C" }}>
                Koppelen mislukte. {terugkoppeling.melding}
              </span>
            )}
          </Card>
        )}

        {bonnen.length === 0 ? (
          <Card className="p-5 flex flex-col gap-2">
            <div className="text-[15px] font-semibold">Nog geen bonnetjes ingelezen</div>
            <p className="text-[13.5px] text-muted leading-relaxed">
              Koppel hieronder Gmail om alle &ldquo;Je bonnetje&rdquo;-mails van Picnic op te halen, of
              plak er één handmatig om te zien wat de module met je gegevens doet.
            </p>
          </Card>
        ) : (
          <>
            {/* KPI's */}
            <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
              <Kpi
                label={laatsteMaand ? `Uitgaven ${maandLabel(laatsteMaand.maand)}` : "Laatste maand"}
                waarde={fmtEUR0(laatsteMaand?.bedrag ?? 0)}
                sub={`${laatsteMaand?.bezorgingen ?? 0} bezorging(en)`}
              />
              <Kpi
                label="Gemiddeld per bezorging"
                waarde={fmtEUR0(gemPerBezorging)}
                sub={`over ${bonnen.length} bezorgingen`}
              />
              <Kpi label="Totaal geregistreerd" waarde={fmtEUR0(besteed)} sub="alle ingelezen bonnetjes" />
              <Kpi
                label="Voordeel behaald"
                waarde={fmtEUR0(voordeel)}
                sub={besteed > 0 ? `${((voordeel / besteed) * 100).toFixed(1)}% van het totaal` : "—"}
              />
            </div>

            {scheve.length > 0 && (
              <Card className="p-4 text-[12.5px]" style={{ color: "#A9761C" }}>
                Bij {scheve.length} bonnetje(s) klopt de optelling van het bonnetje zelf niet. Dat wijst
                op een gewijzigd mailformaat bij Picnic — de bedragen van die bezorgingen zijn met
                voorzichtigheid te gebruiken.
              </Card>
            )}

            {/* Uitgaven per maand */}
            <Card className="p-4.5 flex flex-col gap-3">
              <div className="text-[13px] font-bold tracking-wider uppercase text-label">
                Uitgaven per maand
              </div>
              <div className="flex items-end gap-2 overflow-x-auto pb-1" style={{ minHeight: 140 }}>
                {maanden.map((m) => (
                  <div key={m.maand} className="flex flex-col items-center gap-1.5 shrink-0 w-14">
                    <div className="text-[10.5px] text-muted">{fmtEUR0(m.bedrag)}</div>
                    <div
                      className="w-8 rounded-t-md"
                      style={{ height: `${(m.bedrag / maxMaand) * 90}px`, background: "#C4633B" }}
                      title={`${m.bezorgingen} bezorging(en)`}
                    />
                    <div className="text-[10.5px] text-muted">{maandLabel(m.maand)}</div>
                  </div>
                ))}
              </div>
            </Card>

            {/* Categorieën */}
            <Card className="p-4.5 flex flex-col gap-3">
              <div className="text-[13px] font-bold tracking-wider uppercase text-label">
                Uitgaven per categorie
              </div>
              <CategoryDonut data={categorieen} />
              <div className="text-[11.5px] text-muted">
                Categorie wordt uit de productnaam afgeleid. Klopt er iets niet, pas het dan aan bij het
                product hieronder — die keuze geldt dan voor alle bezorgingen.
              </div>
            </Card>

            {/* Bulk */}
            <Card className="p-4.5 flex flex-col gap-3">
              <div className="flex items-baseline justify-between gap-3 flex-wrap">
                <div className="text-[13px] font-bold tracking-wider uppercase text-label">
                  Kandidaten voor bulk inkopen
                </div>
                <div className="text-[12px] text-muted">
                  {bulk.filter((b) => b.sterk).length} duidelijk · {bulk.length} in beeld
                </div>
              </div>
              {bulk.length === 0 ? (
                <div className="text-[12.5px] text-muted">
                  Nog geen houdbaar product dat in minstens {BULK_MIN_KEER} bezorgingen terugkwam. Lees
                  meer bonnetjes in en dit vult zich vanzelf.
                </div>
              ) : (
                <div className="overflow-x-auto">
                  <table className="w-full text-[12.5px] border-collapse min-w-[640px]">
                    <thead>
                      <tr className="text-left text-label border-b border-divider">
                        <th className="py-2 pr-3 font-semibold">Product of groep</th>
                        <th className="py-2 pr-3 font-semibold text-right">Bezorgingen</th>
                        <th className="py-2 pr-3 font-semibold text-right">Per stuk</th>
                        <th className="py-2 pr-3 font-semibold text-right">Totaal</th>
                        <th className="py-2 pr-3 font-semibold text-right">Per maand</th>
                        <th className="py-2 pr-3 font-semibold">Signaal</th>
                        <th className="py-2 font-semibold"></th>
                      </tr>
                    </thead>
                    <tbody>
                      {bulk.map((b) => (
                        <tr key={b.groep} className="border-b border-divider/60">
                          <td className="py-1.5 pr-3 align-top">
                            <div>
                              {b.naam}
                              {b.handmatig && (
                                <span className="text-[10.5px] text-accent align-super ml-1">
                                  eigen groep
                                </span>
                              )}
                              <span className="text-muted"> · {b.categorie}</span>
                            </div>
                            {b.varianten > 1 && (
                              <div className="text-[11px] text-muted mt-0.5 leading-snug">
                                {b.producten
                                  .slice(0, 4)
                                  .map((p) => `${p.naam} (${fmtEUR0(p.totaal)})`)
                                  .join(" · ")}
                                {b.varianten > 4 && ` · nog ${b.varianten - 4}`}
                              </div>
                            )}
                          </td>
                          <td className="py-1.5 pr-3 text-right align-top">
                            {b.keerGekocht}× · {b.stuks} stuks
                          </td>
                          <td className="py-1.5 pr-3 text-right align-top">
                            {fmtEUR0(b.prijsPerStuk)}
                          </td>
                          <td className="py-1.5 pr-3 text-right align-top">{fmtEUR0(b.totaal)}</td>
                          <td className="py-1.5 pr-3 text-right font-semibold align-top">
                            {fmtEUR0(b.uitgavePerMaand)}
                          </td>
                          <td
                            className="py-1.5 pr-3 align-top"
                            style={{ color: b.sterk ? "#5C7F55" : "var(--color-muted)" }}
                          >
                            {b.sterk ? "duidelijk patroon" : "nog dun"}
                          </td>
                          <td className="py-1.5 text-right hidden md:table-cell align-top">
                            <button
                              onClick={() =>
                                start(async () => {
                                  for (const p of b.producten) await setBulkNegeren(p.sleutel, true);
                                })
                              }
                              className="px-2.5 py-1 rounded-full border border-input-border text-[11.5px] font-semibold text-ink-soft whitespace-nowrap"
                              title="Niet meer voorstellen voor bulk"
                            >
                              Niet tonen
                            </button>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}
              <div className="text-[11.5px] text-muted leading-relaxed">
Varianten van hetzelfde product worden samengeteld — smaken van een fruithapje,
                of &ldquo;9 rollen&rdquo; en &ldquo;9 stuks&rdquo; van hetzelfde pak. Dat gaat automatisch op de
                productnaam en vangt niet alles; hoort er iets bij dat er niet automatisch bij komt,
                geef die producten dan dezelfde <b>groep</b> in de lijst hieronder.
                <br />
<b>Per maand</b> en <b>bezorgingen</b> slaan op de groep als geheel: drie smaken in
                één bezorging is één bezorging, en het bedrag is de som. Alles wordt gemeten over
                dezelfde periode — van je eerste tot je laatste bezorging — zodat producten onderling
                vergelijkbaar zijn en samenvoegen niets verschuift behalve de optelling.
                <br />
                In beeld komt elke houdbare groep die in minstens {BULK_MIN_KEER} bezorgingen terugkwam,
                de {BULK_MAX_RIJEN} grootste op maanduitgave. &ldquo;Duidelijk patroon&rdquo; betekent
                minstens {BULK_STERK_KEER} bezorgingen — dan is het geen toeval meer. Er zit bewust geen
                eurodrempel op: wat een bedrag per maand voorstelt hangt af van hoeveel je hebt ingelezen,
                dus dat oordeel laat ik aan jou. Vers, gekoeld en diepvries vallen af; diepvries niet
                omdat het bederft, maar omdat je vriezer de grens is.
              </div>
            </Card>

            {/* Producten */}
            <Card className="p-4.5 flex flex-col gap-3">
              <div className="flex items-baseline justify-between gap-3 flex-wrap">
                <div className="text-[13px] font-bold tracking-wider uppercase text-label">
                  Producten
                </div>
                <input
                  value={zoek}
                  onChange={(e) => setZoek(e.target.value)}
                  placeholder="Zoek een product…"
                  className="px-3 py-1.5 rounded-full border border-input-border bg-card text-[12.5px] outline-none"
                />
              </div>
              <div className="overflow-x-auto">
                <table className="w-full text-[12.5px] border-collapse min-w-[720px]">
                  <thead>
                    <tr className="text-left text-label border-b border-divider">
                      <th className="py-2 pr-3 font-semibold">Product</th>
                      <th className="py-2 pr-3 font-semibold text-right">Gekocht</th>
                      <th className="py-2 pr-3 font-semibold text-right">Per stuk</th>
                      <th className="py-2 pr-3 font-semibold text-right">Totaal</th>
                      <th className="py-2 pr-3 font-semibold">Groep</th>
                      <th className="py-2 pr-3 font-semibold">Categorie</th>
                      <th className="py-2 font-semibold">Houdbaar</th>
                    </tr>
                  </thead>
                  <tbody>
                    {zichtbaar.map((s) => (
                      <ProductRij key={s.sleutel} s={s} onStart={start} />
                    ))}
                  </tbody>
                </table>
              </div>
              <div className="text-[11.5px] text-muted">
                {zoek
                  ? `${zichtbaar.length} van ${stats.length} producten`
                  : `De ${zichtbaar.length} duurste van ${stats.length} producten — zoek hierboven voor de rest.`}{" "}
                Prijs per stuk is het gemiddelde over alle bezorgingen. Geef twee producten dezelfde{" "}
                <b>groep</b> om ze in de bulklijst als één post te behandelen; leeg laten betekent
                automatisch bepaald (de grijze tekst toont welke groep dat is).
              </div>
            </Card>
          </>
        )}

        {/* ── Web-only: koppelen, invoer, beheer ── */}
        <div className="hidden md:flex flex-col gap-4">
          <Card className="p-4.5 flex flex-col gap-3">
            <div className="text-[13px] font-bold tracking-wider uppercase text-label">
              Gmail-koppeling
            </div>
            {!gmail.geconfigureerd ? (
              <p className="text-[12.5px] text-muted leading-relaxed">
                Er is nog geen OAuth-client ingesteld. Zet <code>GOOGLE_OAUTH_CLIENT_ID</code> en{" "}
                <code>GOOGLE_OAUTH_CLIENT_SECRET</code> in Vercel; ik loop je stap voor stap door het
                aanmaken ervan in Google Cloud. Zolang dat er niet is, kun je bonnetjes hieronder
                plakken.
              </p>
            ) : gmail.gekoppeld ? (
              <>
                <div className="text-[12.5px] text-muted">
                  Gekoppeld op <b className="text-ink">{gmail.email}</b>
                  {gmail.laatsteSync && (
                    <> · laatst opgehaald {new Date(gmail.laatsteSync).toLocaleString("nl-NL")}</>
                  )}
                </div>
                {gmail.laatsteFout && (
                  <div className="text-[12.5px]" style={{ color: "#B0512C" }}>
                    Laatste poging gaf een fout: {gmail.laatsteFout}
                  </div>
                )}
                <div className="flex gap-2 flex-wrap">
                  <button
                    onClick={() => doeSync(false)}
                    disabled={bezig}
                    className="px-3.5 py-2 rounded-full bg-ink text-accent-ink text-[12.5px] font-semibold disabled:opacity-50"
                  >
                    Nieuwe bonnetjes ophalen
                  </button>
                  <button
                    onClick={() => doeSync(true)}
                    disabled={bezig}
                    className="px-3.5 py-2 rounded-full border border-input-border text-[12.5px] font-semibold text-ink-soft disabled:opacity-50"
                  >
                    Volledige historie ophalen
                  </button>
                  <button
                    onClick={() => start(() => ontkoppelGmail())}
                    className="px-3.5 py-2 rounded-full border border-input-border text-[12.5px] font-semibold text-danger"
                  >
                    Ontkoppelen
                  </button>
                </div>
                {(melding || gmail.laatsteUitkomst) && (
                  <div className="text-[12.5px] text-ink-soft border-t border-divider pt-2">
                    {melding ?? (
                      <>
                        <span className="text-muted">Laatste ronde: </span>
                        {gmail.laatsteUitkomst}
                      </>
                    )}
                  </div>
                )}
                <div className="text-[11.5px] text-muted">
                  Er draait ook elke ochtend een automatische ronde. Alleen mails van Picnic worden
                  gelezen; bestelbevestigingen worden overgeslagen omdat daar nog geen productregels in
                  staan.
                </div>
              </>
            ) : (
              <>
                <p className="text-[12.5px] text-muted leading-relaxed">
                  Koppel je Gmail om alle bonnetjes automatisch op te halen. De app vraagt alleen
                  leesrechten en gebruikt ze uitsluitend voor mails van {""}
                  <code>info@service.picnic.nl</code>.
                </p>
                <a
                  href="/api/boodschappen/gmail/start"
                  className="self-start px-3.5 py-2 rounded-full bg-ink text-accent-ink text-[12.5px] font-semibold"
                >
                  Gmail koppelen
                </a>
              </>
            )}
          </Card>

          <Card className="p-4.5 flex flex-col gap-3">
            <div className="text-[13px] font-bold tracking-wider uppercase text-label">
              Bonnetje plakken
            </div>
            <p className="text-[11.5px] text-muted">
              Open een &ldquo;Je bonnetje&rdquo;-mail, selecteer alles en plak het hier. Werkt ook zonder
              Gmail-koppeling; hetzelfde bonnetje twee keer plakken telt niet dubbel.
            </p>
            <textarea
              value={plaktekst}
              onChange={(e) => setPlaktekst(e.target.value)}
              rows={6}
              placeholder="Hier is het bonnetje bij je bezorging van …"
              className="px-3 py-2 rounded-xl border border-input-border bg-card text-[12.5px] font-mono"
            />
            <button
              onClick={doePlak}
              disabled={bezig || !plaktekst.trim()}
              className="self-start px-3.5 py-2 rounded-full bg-ink text-accent-ink text-[12.5px] font-semibold disabled:opacity-50"
            >
              Verwerken
            </button>
            {melding && <div className="text-[12.5px] text-ink-soft">{melding}</div>}
          </Card>

          {bonnen.length > 0 && (
            <Card className="p-4.5 flex flex-col gap-3">
              <div className="text-[13px] font-bold tracking-wider uppercase text-label">
                Ingelezen bonnetjes
              </div>
              <div className="overflow-x-auto">
                <table className="w-full text-[12.5px] border-collapse min-w-[600px]">
                  <thead>
                    <tr className="text-left text-label border-b border-divider">
                      <th className="py-2 pr-3 font-semibold">Bezorgd</th>
                      <th className="py-2 pr-3 font-semibold text-right">Producten</th>
                      <th className="py-2 pr-3 font-semibold text-right">Statiegeld</th>
                      <th className="py-2 pr-3 font-semibold text-right">Voordeel</th>
                      <th className="py-2 pr-3 font-semibold text-right">Totaal</th>
                      <th className="py-2 pr-3 font-semibold">Bron</th>
                      <th className="py-2 font-semibold"></th>
                    </tr>
                  </thead>
                  <tbody>
                    {bonnen.map((b) => (
                      <tr key={b.id} className="border-b border-divider/60">
                        <td className="py-1.5 pr-3">
                          {b.bezorgdatum}
                          {!b.klopt && <span style={{ color: "#A9761C" }}> · telt niet op</span>}
                        </td>
                        <td className="py-1.5 pr-3 text-right">{b.regels}</td>
                        <td className="py-1.5 pr-3 text-right text-muted">{fmtEUR0(b.statiegeld)}</td>
                        <td className="py-1.5 pr-3 text-right text-muted">{fmtEUR0(b.voordeel)}</td>
                        <td className="py-1.5 pr-3 text-right font-semibold">
                          {b.totaal == null ? "—" : fmtEUR0(b.totaal)}
                        </td>
                        <td className="py-1.5 pr-3 text-muted">{b.bron}</td>
                        <td className="py-1.5 text-right">
                          <button
                            onClick={() => start(() => verwijderBon(b.id))}
                            className="w-7 h-7 rounded-full text-danger"
                            title="Verwijder dit bonnetje"
                          >
                            ✕
                          </button>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </Card>
          )}
        </div>
      </div>
    </div>
  );
}

function ProductRij({ s, onStart }: { s: ProductStat; onStart: (fn: () => void) => void }) {
  return (
    <tr className="border-b border-divider/60">
      <td className="py-1.5 pr-3">
        {s.naam}
        {s.bulkNegeren && <span className="text-muted"> · niet voor bulk</span>}
      </td>
      <td className="py-1.5 pr-3 text-right">
        {s.keerGekocht}× · {s.stuks} st
      </td>
      <td className="py-1.5 pr-3 text-right">{fmtEUR0(s.prijsPerStuk)}</td>
      <td className="py-1.5 pr-3 text-right font-semibold">{fmtEUR0(s.totaal)}</td>
      <td className="py-1.5 pr-3">
        <input
          key={`${s.sleutel}-groep`}
          defaultValue={s.groepIsHandmatig ? s.groep : ""}
          placeholder={s.groep}
          onBlur={(e) => {
            const v = e.target.value.trim();
            if (v === (s.groepIsHandmatig ? s.groep : "")) return;
            onStart(() => setProductGroep(s.sleutel, v || null));
          }}
          title="Producten met dezelfde groep tellen samen in de bulklijst. Leeg = automatisch bepaald."
          className="w-40 px-2 py-1 rounded-lg border bg-card text-[12px]"
          style={{
            borderColor: s.groepIsHandmatig ? "var(--color-accent)" : "var(--color-input-border)",
          }}
        />
      </td>
      <td className="py-1.5 pr-3">
        <select
          value={s.categorie}
          onChange={(e) => onStart(() => setProductCategorie(s.sleutel, e.target.value))}
          className="px-2 py-1 rounded-lg border bg-card text-[12px]"
          style={{
            borderColor: s.categorieIsHandmatig ? "var(--color-accent)" : "var(--color-input-border)",
          }}
        >
          {CATEGORIEEN.map((c) => (
            <option key={c} value={c}>
              {c}
            </option>
          ))}
        </select>
      </td>
      <td className="py-1.5">
        <label className="flex items-center gap-1.5 text-[11.5px] text-muted">
          <input
            type="checkbox"
            checked={s.houdbaar}
            onChange={(e) => onStart(() => setProductHoudbaar(s.sleutel, e.target.checked))}
          />
          {s.houdbaarIsHandmatig ? "handmatig" : "afgeleid"}
        </label>
      </td>
    </tr>
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
