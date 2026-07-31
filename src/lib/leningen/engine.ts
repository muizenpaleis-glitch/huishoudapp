// Aflosschema's en rentesommen voor de leningenmodule. Pure functies.
//
// Uitgangspunt: wat de bank rapporteert is de waarheid. Hoofdsom, restant en de
// maandlasten worden opgeslagen zoals ze op het overzicht staan; het schema wordt
// erbij gesimuleerd om vragen te beantwoorden die de bank niet toont ("hoeveel
// rente heb ik al betaald", "hoeveel wordt het in totaal"). Loopt de simulatie
// uit de pas met het gerapporteerde restant, dan zegt de module dat — dan is er
// onderweg iets gebeurd (rentewijziging, extra aflossing) wat het model niet kent.

export type Aflossingsvorm = "annuiteit" | "lineair" | "aflossingsvrij";

export type Lening = {
  id: string;
  naam: string;
  groep: string;
  leningnummer: string | null;
  verstrekker: string | null;
  vorm: Aflossingsvorm;
  hoofdsom: number;
  rente: number; // %/jaar
  startdatum: string; // 'YYYY-MM-DD'
  looptijdMnd: number;
  peildatum: string; // 'YYYY-MM-DD'
  restant: number;
  maandTotaal: number | null;
  maandRente: number | null;
  maandAflossing: number | null;
  renteBetaald: number | null; // handmatig, uit jaaropgaven
  aftrekbaar: boolean;
  notitie: string | null;
};

export type Instellingen = {
  aftrekPercentage: number;
  eigenwoningforfait: number;
};

export type Termijn = {
  nr: number; // 1-based
  datum: string; // 'YYYY-MM-DD', eerste van de maand
  rente: number;
  aflossing: number;
  restantNa: number;
};

function maandenLater(datum: string, n: number): string {
  const [j, m, d] = datum.split("-").map(Number);
  const totaal = (j * 12 + (m - 1)) + n;
  const jj = Math.floor(totaal / 12);
  const mm = (totaal % 12) + 1;
  return `${jj}-${String(mm).padStart(2, "0")}-${String(d).padStart(2, "0")}`;
}

/** Annuïteit: elke maand hetzelfde totaalbedrag, waarbinnen het renteaandeel
 *  daalt. Bij 0% rente valt de formule uit elkaar, vandaar de aparte tak. */
export function annuiteit(hoofdsom: number, rentePerJaar: number, maanden: number): number {
  const r = rentePerJaar / 100 / 12;
  if (maanden <= 0) return 0;
  if (r === 0) return hoofdsom / maanden;
  return (hoofdsom * r) / (1 - Math.pow(1 + r, -maanden));
}

/** Het volledige schema van de eerste tot de laatste termijn. */
export function schema(l: Lening): Termijn[] {
  const r = l.rente / 100 / 12;
  const uit: Termijn[] = [];
  let saldo = l.hoofdsom;
  const vast = l.vorm === "annuiteit" ? annuiteit(l.hoofdsom, l.rente, l.looptijdMnd) : 0;
  const lineaireAflossing = l.hoofdsom / Math.max(1, l.looptijdMnd);

  for (let i = 1; i <= l.looptijdMnd; i++) {
    const rente = saldo * r;
    let aflossing: number;
    if (l.vorm === "annuiteit") aflossing = vast - rente;
    else if (l.vorm === "lineair") aflossing = lineaireAflossing;
    else aflossing = i === l.looptijdMnd ? saldo : 0; // aflossingsvrij: alles aan het eind
    aflossing = Math.min(aflossing, saldo);
    saldo = Math.max(0, saldo - aflossing);
    uit.push({
      nr: i,
      datum: maandenLater(l.startdatum, i),
      rente: Math.round(rente * 100) / 100,
      aflossing: Math.round(aflossing * 100) / 100,
      restantNa: Math.round(saldo * 100) / 100,
    });
  }
  return uit;
}

export type LeningStand = {
  lening: Lening;
  /** Termijnen die op de peildatum verstreken zijn. */
  verstreken: number;
  afgelost: number; // hoofdsom − restant, rechtstreeks uit de bankcijfers
  restant: number;
  renteBetaald: number;
  renteBetaaldIsOpgegeven: boolean;
  renteResterend: number;
  renteTotaal: number;
  /** Restant dat het schema op de peildatum voorspelt. */
  restantVolgensSchema: number;
  /** Verschil tussen model en bank. Groot verschil = het model mist iets. */
  afwijking: number;
  modelKlopt: boolean;
  einddatum: string;
  termijnen: Termijn[];
};

const AFWIJKING_GRENS = 50; // euro; kleiner is afronding, groter is een echt verschil

export function stand(l: Lening): LeningStand {
  const t = schema(l);
  const verstreken = t.filter((x) => x.datum <= l.peildatum).length;
  const restantVolgensSchema = verstreken > 0 ? t[verstreken - 1].restantNa : l.hoofdsom;

  const renteUitSchema = t.slice(0, verstreken).reduce((s, x) => s + x.rente, 0);
  const renteBetaald = l.renteBetaald ?? renteUitSchema;
  const renteResterend = t.slice(verstreken).reduce((s, x) => s + x.rente, 0);
  const afwijking = restantVolgensSchema - l.restant;

  return {
    lening: l,
    verstreken,
    afgelost: Math.round((l.hoofdsom - l.restant) * 100) / 100,
    restant: l.restant,
    renteBetaald: Math.round(renteBetaald * 100) / 100,
    renteBetaaldIsOpgegeven: l.renteBetaald != null,
    renteResterend: Math.round(renteResterend * 100) / 100,
    renteTotaal: Math.round((renteBetaald + renteResterend) * 100) / 100,
    restantVolgensSchema: Math.round(restantVolgensSchema * 100) / 100,
    afwijking: Math.round(afwijking * 100) / 100,
    modelKlopt: Math.abs(afwijking) <= AFWIJKING_GRENS,
    einddatum: t.length ? t[t.length - 1].datum : l.startdatum,
    termijnen: t,
  };
}

/** Netto rente na hypotheekrenteaftrek. Bruto blijft altijd zichtbaar: dat is
 *  wat er van de rekening gaat. Het eigenwoningforfait zit hier bewust niet in —
 *  dat hangt aan de woning en niet aan een lening, en wordt op totaalniveau
 *  verrekend (zie `nettoOverzicht`). */
export function nettoRente(bruto: number, aftrekbaar: boolean, inst: Instellingen): number {
  if (!aftrekbaar) return bruto;
  return Math.round(bruto * (1 - inst.aftrekPercentage / 100) * 100) / 100;
}

export type Totalen = {
  hoofdsom: number;
  afgelost: number;
  restant: number;
  renteBetaald: number;
  renteResterend: number;
  renteTotaal: number;
  renteBetaaldNetto: number;
  renteTotaalNetto: number;
  maandlastBruto: number;
  maandlastNetto: number;
  aandeelAfgelost: number; // 0..1
};

export function totalen(standen: LeningStand[], inst: Instellingen): Totalen {
  const som = (f: (s: LeningStand) => number) => standen.reduce((a, s) => a + f(s), 0);
  const hoofdsom = som((s) => s.lening.hoofdsom);
  const afgelost = som((s) => s.afgelost);
  const renteBetaald = som((s) => s.renteBetaald);
  const renteResterend = som((s) => s.renteResterend);

  const nettoBetaald = som((s) => nettoRente(s.renteBetaald, s.lening.aftrekbaar, inst));
  const nettoTotaal = som((s) =>
    nettoRente(s.renteBetaald + s.renteResterend, s.lening.aftrekbaar, inst),
  );

  // Maandlast: neem wat de bank rapporteert; ontbreekt dat, dan de eerstvolgende
  // termijn uit het schema.
  const maandlastBruto = som((s) => {
    if (s.lening.maandTotaal != null) return s.lening.maandTotaal;
    const t = s.termijnen[s.verstreken];
    return t ? t.rente + t.aflossing : 0;
  });
  const maandRenteBruto = som((s) => {
    if (s.lening.maandRente != null) return s.lening.maandRente;
    const t = s.termijnen[s.verstreken];
    return t ? t.rente : 0;
  });
  const maandRenteNetto = som((s) => {
    const bruto =
      s.lening.maandRente ?? (s.termijnen[s.verstreken]?.rente ?? 0);
    return nettoRente(bruto, s.lening.aftrekbaar, inst);
  });

  return {
    hoofdsom: r2(hoofdsom),
    afgelost: r2(afgelost),
    restant: r2(som((s) => s.restant)),
    renteBetaald: r2(renteBetaald),
    renteResterend: r2(renteResterend),
    renteTotaal: r2(renteBetaald + renteResterend),
    renteBetaaldNetto: r2(nettoBetaald),
    renteTotaalNetto: r2(nettoTotaal),
    maandlastBruto: r2(maandlastBruto),
    maandlastNetto: r2(maandlastBruto - (maandRenteBruto - maandRenteNetto)),
    aandeelAfgelost: hoofdsom > 0 ? afgelost / hoofdsom : 0,
  };
}

function r2(v: number): number {
  return Math.round(v * 100) / 100;
}

export type JaarPunt = {
  jaar: number;
  restant: number; // aan het eind van het jaar, alle leningen samen
  renteInJaar: number;
  aflossingInJaar: number;
  cumulatieveRente: number;
};

/** Reeks per kalenderjaar over alle leningen samen — de basis voor de grafiek. */
export function perJaar(standen: LeningStand[]): JaarPunt[] {
  const perJ = new Map<number, { rente: number; aflossing: number; restant: number }>();
  let eerste = Infinity;
  let laatste = -Infinity;

  for (const s of standen) {
    for (const t of s.termijnen) {
      const j = parseInt(t.datum.slice(0, 4), 10);
      eerste = Math.min(eerste, j);
      laatste = Math.max(laatste, j);
      const v = perJ.get(j) ?? { rente: 0, aflossing: 0, restant: 0 };
      v.rente += t.rente;
      v.aflossing += t.aflossing;
      perJ.set(j, v);
    }
  }
  if (!isFinite(eerste)) return [];

  // Restant per jaareinde: per lening de laatste termijn van dat jaar, of 0 als
  // de lening dan al afgelopen is. Zonder deze correctie zou een afgeloste
  // lening uit de optelling verdwijnen en het totaal ineens lijken te stijgen.
  const uit: JaarPunt[] = [];
  let cum = 0;
  for (let j = eerste; j <= laatste; j++) {
    let restant = 0;
    for (const s of standen) {
      const tot = s.termijnen.filter((t) => parseInt(t.datum.slice(0, 4), 10) <= j);
      if (tot.length) restant += tot[tot.length - 1].restantNa;
      else restant += s.lening.hoofdsom; // begint pas later
    }
    const v = perJ.get(j) ?? { rente: 0, aflossing: 0, restant: 0 };
    cum += v.rente;
    uit.push({
      jaar: j,
      restant: r2(restant),
      renteInJaar: r2(v.rente),
      aflossingInJaar: r2(v.aflossing),
      cumulatieveRente: r2(cum),
    });
  }
  return uit;
}

export function groepeer(standen: LeningStand[]): { groep: string; standen: LeningStand[] }[] {
  const m = new Map<string, LeningStand[]>();
  for (const s of standen) {
    (m.get(s.lening.groep) ?? m.set(s.lening.groep, []).get(s.lening.groep)!).push(s);
  }
  return [...m.entries()]
    .map(([groep, standen]) => ({ groep, standen }))
    .sort(
      (a, b) =>
        b.standen.reduce((s, x) => s + x.restant, 0) -
        a.standen.reduce((s, x) => s + x.restant, 0),
    );
}
