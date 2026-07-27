// Analyse over ingelezen Picnic-bonnetjes. Pure functies: de UI en de server
// acties leveren rauwe rijen aan en lezen berekende uitkomsten terug, net als
// bij de financiënmodule.

// De module kijkt naar hetzelfde jaar als Financiën. Ouder materiaal is er wel
// (Picnic mailt al sinds 2025), maar zou de maandgrafieken en de bulkfrequenties
// vertekenen met een periode waarvoor geen begroting bestaat.
export { PROJECTION_START_YEAR as EERSTE_JAAR } from "@/lib/finance/engine";

export type RegelRij = {
  bezorgdatum: string; // 'YYYY-MM-DD'
  productnaam: string;
  sleutel: string;
  aantal: number;
  prijs: number;
  actielabel: string | null;
};

export type ProductOverride = {
  sleutel: string;
  groep: string | null;
  categorie: string | null;
  houdbaar: boolean | null;
  bulkNegeren: boolean;
};

export const CATEGORIEEN = [
  "Groente & fruit",
  "Zuivel & eieren",
  "Vlees & vis",
  "Brood & beleg",
  "Baby & kind",
  "Voorraadkast",
  "Diepvries",
  "Dranken",
  "Snoep & snacks",
  "Huishouden",
  "Verzorging",
  "Overig",
] as const;
export type Categorie = (typeof CATEGORIEEN)[number];

// Volgorde telt: de eerste match wint. "Olvarit knijpfruit appel" moet bij Baby
// uitkomen en niet bij fruit; "zoete aardappelfriet" bij Diepvries en niet bij
// groente. Specifiek gaat daarom vóór algemeen.
const REGELS: [Categorie, RegExp][] = [
  ["Baby & kind", /olvarit|nutrilon|knijpfruit|luier|billendoek|babyvoeding|hero baby|zwitsal|opvolgmelk|bonb[ée]b[ée]|flesvoeding|groeimelk|babydoekjes|\bbaby\b|fruithapje|maaltijdhapje/],
  ["Huishouden", /toiletpapier|wasmiddel|allesreiniger|afwas|vuilniszak|afvalzak|vuilzak|tissue|schoonmaak|reiniger|spons|vaatwas|wasverzachter|keukenrol|aluminiumfolie|vershoudfolie|ontkalk|luchtverfrisser|dettol|\bhg\b/],
  ["Verzorging", /shampoo|tandpasta|tandenborstel|zeep|deo|douchegel|crème|creme|tampon|maandverband|scheer|body ?lotion|haargel|zonnebrand|watten|conditioner|haarlak|bodylotion/],
  ["Dranken", /sodastream|frisdrank|cola|\bbier\b|\bwijn\b|limonade|sinaasappelsap|appelsap|\bsap\b|spa |bruisend water|mineraalwater|ice tea|thee\b|koffie|espresso|cappuccino/],
  ["Diepvries", /diepvries|\bijs\b|ijsjes|friet|pizza|frikandel|kroket|vissticks|erwtjes diepvries/],
  ["Zuivel & eieren", /melk|kwark|yoghurt|\bkaas\b|boter|\broom\b|\beieren\b|scharrelei|\bvla\b|karnemelk|skyr|mozzarella|\bbrie\b|feta|creme fraiche|crème fraîche|hüttenkäse|halvarine|margarine|blue band|becel|croma|bak ?& ?braad|eitjes/],
  ["Vlees & vis", /gehakt|\bkip\b|kipfilet|kipgehakt|rundvlees|varkens|worst|\bham\b|\bspek\b|zalm|tonijn|garnaal|schnitzel|hamburger|shoarma|spare ?ribs|pangasius|kabeljauw|filets|slavink|rookworst|spek|zeevis|sliptong|soepbal|gehaktbal|kipreepjes|vissticks/],
  ["Brood & beleg", /brood|broodje|\bbol\b|croissant|beschuit|cracker|hagelslag|pindakaas|\bjam\b|appelstroop|speculoos|chocopasta|knäckebröd|wrap|tortilla/],
  ["Snoep & snacks", /chocola|\bkoek\b|koekjes|chips|snoep|\bdrop\b|\breep\b|biscuit|nootjes gezouten|zoutjes|popcorn|winegum|stroopwafel|crunchy bar|mueslireep|granolareep/],
  ["Groente & fruit", /banaan|banane|appel|\bpeer\b|peren|peertjes|citroen|paprika|tomaat|tomaten\b|avocado|\bsla\b|komkommer|wortel|\bui\b|uien|aardappel|broccoli|courgette|spinazie|perzik|druif|druiven|\bbes\b|bessen|aardbei|meloen|champignon|\bprei\b|bloemkool|sperzieboon|pompoen|kiwi|sinaasappel|mandarijn|mango|ananas|blauwe bes|rucola|andijvie|boerenkool|venkel|radijs|knoflook|gember|limoen|verspakket|maaltijdbox/],
  ["Voorraadkast", /pasta|spaghetti|penne|macaroni|\brijst\b|\bmeel\b|bloem\b|suiker|\bzout\b|\bolie\b|azijn|\bsaus\b|ketchup|mayonaise|mosterd|\bsoep\b|muesli|granola|cornflakes|havermout|noten|walnoot|amandel|cashew|zaad|chiazaad|kruiden|bouillon|\bblik\b|conserven|linzen|kikkererwt|couscous|quinoa|honing|pindakaas|kokosmelk|tomatenblokjes|passata|tomatensaus|pesto|pijnboompit|orzo|havervlok|zonnebloempit|tapenade|sambal|kokosolie/],
];

export function categoriseerProduct(naam: string): Categorie {
  const n = naam.toLowerCase();
  for (const [cat, re] of REGELS) if (re.test(n)) return cat;
  return "Overig";
}

// Bulk inslaan heeft alleen zin als een product de tijd uitzit. Vers, gekoeld en
// diepvries vallen af — diepvries niet omdat het bederft, maar omdat de vriezer
// de beperking is, niet de houdbaarheid.
const HOUDBARE_CATEGORIEEN = new Set<string>([
  "Voorraadkast", "Dranken", "Huishouden", "Verzorging", "Snoep & snacks", "Baby & kind",
]);

export function isHoudbaar(categorie: string): boolean {
  return HOUDBARE_CATEGORIEEN.has(categorie);
}

/** Groepeersleutel voor "hetzelfde product over bonnen heen". Bewust géén
 *  formaatinformatie weggooien: "halfvolle melk 1 liter" en "2 liter" zijn
 *  verschillende producten met een andere prijs per liter, en samenvoegen zou
 *  de prijstrend onbruikbaar maken. */
export function productSleutel(naam: string): string {
  return naam
    .toLowerCase()
    .replace(/[•·]/g, " ")
    .replace(/[^a-z0-9à-ÿ ]/gi, " ")
    .replace(/\s+/g, " ")
    .trim();
}

// Eenheden die hetzelfde betekenen maar anders geschreven worden. Picnic wisselt
// hier zelf tussen ("9 rollen" werd later "9 stuks"), waardoor één product als
// twee producten in de lijst belandde.
const EENHEDEN: [RegExp, string][] = [
  [/\b(rollen|rol|stuks|stuk|st)\b/g, "stuks"],
  [/\b(gram|gr)\b/g, "gram"],
  [/\b(liter|ltr)\b/g, "liter"],
];

// Smaak- en ingrediëntwoorden. Twee fruithapjes met een andere smaak zijn voor
// de vraag "kan dit in bulk" hetzelfde product; het formaat blijft wél staan,
// want 1 liter en 2 liter melk hebben een andere prijs per liter.
const SMAAKWOORDEN =
  /\b(appel|peer|peren|perzik|mango|framboos|banaan|bosbes|bes|bessen|aardbei|abrikoos|pompoen|kip|rund|aardappel|wortel|courgette|witvis|spinazie|tomaat|linzen|bolognese|vanille|naturel|kokos|kokosmelk|gierst|rogge|biet|paarse|zoete|spelt|amandel|speculaas|hazelnoot|karamel|citroen|sinaasappel|kers|pruim|yoghurt|ham|macaroni|curry|stoof|nuts|seeds|4 nuts)\b/g;

/** Grovere sleutel dan productSleutel: vat varianten van hetzelfde product
 *  samen. Haalt lang niet alles binnen — twee verschillende Olvarit-maaltijden
 *  blijven apart — vandaar dat een handmatige groep hiervan wint. */
export function productFamilie(naam: string): string {
  let n = naam.toLowerCase().replace(/[•·]/g, " ").replace(/[^a-z0-9à-ÿ ]/gi, " ");
  for (const [re, vv] of EENHEDEN) n = n.replace(re, vv);
  n = n.replace(SMAAKWOORDEN, " ");
  return n.replace(/\s+/g, " ").trim() || productSleutel(naam);
}

export type ProductStat = {
  sleutel: string;
  naam: string;
  /** Groep waarin dit product voor bulkdoeleinden meetelt. */
  groep: string;
  groepIsHandmatig: boolean;
  /** Bezorgdatums waarop dit product voorkwam. */
  datums: string[];
  categorie: string;
  categorieIsHandmatig: boolean;
  houdbaar: boolean;
  houdbaarIsHandmatig: boolean;
  bulkNegeren: boolean;
  keerGekocht: number; // aantal bezorgingen waarin het voorkwam
  stuks: number;
  totaal: number;
  prijsPerStuk: number;
  eerste: string;
  laatste: string;
  /** Aankopen per maand over de periode waarin het product voorkomt. */
  frequentiePerMaand: number;
  /** Uitgave per maand — de maat die bepaalt of bulk de moeite waard is. */
  uitgavePerMaand: number;
  /** Prijs per stuk per bezorging, oplopend in de tijd. */
  prijsverloop: { datum: string; prijsPerStuk: number }[];
};

function maandenTussen(van: string, tot: string): number {
  const d1 = new Date(van + "T00:00:00Z");
  const d2 = new Date(tot + "T00:00:00Z");
  const dagen = (d2.getTime() - d1.getTime()) / 86400000;
  return Math.max(dagen / 30.44, 1); // minimaal één maand, anders exploderen de tarieven
}

/** Het tijdvenster waarover alles gemeten wordt: de eerste tot de laatste
 *  bezorging in de hele dataset.
 *
 *  Eerder rekende elk product over zijn eigen venster, en dat brak op twee
 *  manieren. Een product dat één keer gekocht is kreeg een venster van
 *  minimaal één maand, waardoor de volle prijs als maandlast telde — €17,98
 *  opvolgmelk werd "€17,98 per maand". En twee producten die elk in een korte
 *  periode vielen maar maanden uit elkaar lagen, kregen samengevoegd ineens een
 *  veel breder venster: samenvoegen verlaagde dan de maanduitgave, waardoor een
 *  groep uit de bulklijst kon vallen terwijl de leden er los in stonden.
 *
 *  Met één gedeeld venster zijn producten onderling vergelijkbaar en is
 *  samenvoegen zuiver optellen. */
export function meetVenster(regels: RegelRij[]): { eerste: string; laatste: string; maanden: number } {
  const datums = regels.map((r) => r.bezorgdatum).sort();
  const eerste = datums[0] ?? "";
  const laatste = datums[datums.length - 1] ?? "";
  return { eerste, laatste, maanden: eerste ? maandenTussen(eerste, laatste) : 1 };
}

export function productStats(regels: RegelRij[], overrides: ProductOverride[]): ProductStat[] {
  const ovr = new Map(overrides.map((o) => [o.sleutel, o]));
  const venster = meetVenster(regels);
  const groepen = new Map<
    string,
    { naam: string; datums: Map<string, { stuks: number; bedrag: number }> }
  >();

  for (const r of regels) {
    const g = groepen.get(r.sleutel) ?? { naam: r.productnaam, datums: new Map() };
    g.naam = r.productnaam; // laatste gezien naam wint als weergavenaam
    const d = g.datums.get(r.bezorgdatum) ?? { stuks: 0, bedrag: 0 };
    d.stuks += r.aantal;
    d.bedrag += r.prijs;
    g.datums.set(r.bezorgdatum, d);
    groepen.set(r.sleutel, g);
  }

  const uit: ProductStat[] = [];
  for (const [sleutel, g] of groepen) {
    const datums = [...g.datums.entries()].sort((a, b) => a[0].localeCompare(b[0]));
    const stuks = datums.reduce((s, [, d]) => s + d.stuks, 0);
    const totaal = Math.round(datums.reduce((s, [, d]) => s + d.bedrag, 0) * 100) / 100;
    const eerste = datums[0][0];
    const laatste = datums[datums.length - 1][0];
    const o = ovr.get(sleutel);
    const autoCat = categoriseerProduct(g.naam);
    const categorie = o?.categorie ?? autoCat;
    uit.push({
      sleutel,
      naam: g.naam,
      groep: o?.groep?.trim() || productFamilie(g.naam),
      groepIsHandmatig: !!o?.groep?.trim(),
      datums: datums.map(([d]) => d),
      categorie,
      categorieIsHandmatig: o?.categorie != null,
      houdbaar: o?.houdbaar ?? isHoudbaar(categorie),
      houdbaarIsHandmatig: o?.houdbaar != null,
      bulkNegeren: o?.bulkNegeren ?? false,
      keerGekocht: datums.length,
      stuks,
      totaal,
      prijsPerStuk: stuks ? Math.round((totaal / stuks) * 100) / 100 : 0,
      eerste,
      laatste,
      frequentiePerMaand: datums.length / venster.maanden,
      uitgavePerMaand: totaal / venster.maanden,
      prijsverloop: datums.map(([datum, d]) => ({
        datum,
        prijsPerStuk: d.stuks ? Math.round((d.bedrag / d.stuks) * 100) / 100 : 0,
      })),
    });
  }
  return uit.sort((a, b) => b.totaal - a.totaal);
}

// Geen eurodrempel meer. Een vast bedrag per maand werkt niet: bij een handvol
// bezorgingen valt alles eronder en bij een vol jaar staat hij weer te ruim, want
// de uitkomst hangt af van hoeveel er is ingelezen. Het aantal bezorgingen waarin
// iets terugkwam is wél een stabiel signaal — dat zegt "dit is een patroon" —
// en het bedrag staat erbij zodat je zelf ziet of het de moeite waard is.
export const BULK_MIN_KEER = 2;
export const BULK_STERK_KEER = 3;
export const BULK_MAX_RIJEN = 15;

export type GroepStat = {
  groep: string;
  /** Weergavenaam: de duurste variant, want die herken je het snelst terug. */
  naam: string;
  varianten: number;
  handmatig: boolean;
  categorie: string;
  houdbaar: boolean;
  bulkNegeren: boolean;
  keerGekocht: number; // aantal bezorgingen waarin de groep voorkwam
  stuks: number;
  totaal: number;
  prijsPerStuk: number;
  uitgavePerMaand: number;
  producten: ProductStat[];
};

/** Vat producten samen tot groepen. Bulkinkoop gaat over "koop ik dit vaak",
 *  en dan tellen tien smaken fruithapjes als één ding — niet als tien losse
 *  producten die elk net onder de drempel blijven. */
export function groepStats(stats: ProductStat[]): GroepStat[] {
  const m = new Map<string, ProductStat[]>();
  for (const s of stats) (m.get(s.groep) ?? m.set(s.groep, []).get(s.groep)!).push(s);

  const uit: GroepStat[] = [];
  for (const [groep, leden] of m) {
    const gesorteerd = [...leden].sort((a, b) => b.totaal - a.totaal);
    const datums = new Set<string>();
    for (const l of leden) for (const d of l.datums) datums.add(d);
    const stuks = leden.reduce((s, l) => s + l.stuks, 0);
    const totaal = Math.round(leden.reduce((s, l) => s + l.totaal, 0) * 100) / 100;
    const handmatig = leden.some((l) => l.groepIsHandmatig);
    uit.push({
      groep,
      // Een zelfgekozen groepnaam is de naam die jij eraan gaf; anders valt hij
      // terug op de duurste variant, want die herken je het snelst terug.
      naam: handmatig ? groep : gesorteerd[0].naam,
      varianten: leden.length,
      handmatig,
      categorie: gesorteerd[0].categorie,
      // Eén variant die niet houdbaar is maakt de groep nog niet onhoudbaar;
      // andersom is één houdbare variant te weinig. De meerderheid beslist.
      houdbaar: leden.filter((l) => l.houdbaar).length * 2 >= leden.length,
      bulkNegeren: leden.every((l) => l.bulkNegeren),
      keerGekocht: datums.size,
      stuks,
      totaal,
      prijsPerStuk: stuks ? Math.round((totaal / stuks) * 100) / 100 : 0,
      // Alle leden delen hetzelfde meetvenster, dus samenvoegen is optellen.
      uitgavePerMaand: leden.reduce((s, l) => s + l.uitgavePerMaand, 0),
      producten: gesorteerd,
    });
  }
  return uit.sort((a, b) => b.totaal - a.totaal);
}


export type BulkKandidaat = GroepStat & { besparingIndicatie: number; sterk: boolean };

/** Houdbare productgroepen die terugkomen, met de grootste maanduitgave bovenaan.
 *  `besparingIndicatie` is bewust ruw: 10% van de jaaruitgave, als grootteorde om
 *  te bepalen wat het aankijken waard is — geen belofte, want de werkelijke
 *  bulkkorting is hier niet bekend. */
export function bulkKandidaten(groepen: GroepStat[]): BulkKandidaat[] {
  return groepen
    .filter((g) => g.houdbaar && !g.bulkNegeren && g.keerGekocht >= BULK_MIN_KEER)
    .map((g) => ({
      ...g,
      besparingIndicatie: (g.uitgavePerMaand * 12) / 10,
      sterk: g.keerGekocht >= BULK_STERK_KEER,
    }))
    .sort((a, b) => Number(b.sterk) - Number(a.sterk) || b.uitgavePerMaand - a.uitgavePerMaand)
    .slice(0, BULK_MAX_RIJEN);
}

export type MaandTotaal = { maand: string; bedrag: number; bezorgingen: number };

export function perMaand(
  regels: RegelRij[],
  bonnen: { bezorgdatum: string; totaal: number | null }[],
): MaandTotaal[] {
  const m = new Map<string, MaandTotaal>();
  for (const b of bonnen) {
    const k = b.bezorgdatum.slice(0, 7);
    const v = m.get(k) ?? { maand: k, bedrag: 0, bezorgingen: 0 };
    v.bedrag += b.totaal ?? 0;
    v.bezorgingen += 1;
    m.set(k, v);
  }
  return [...m.values()]
    .map((v) => ({ ...v, bedrag: Math.round(v.bedrag * 100) / 100 }))
    .sort((a, b) => a.maand.localeCompare(b.maand));
}

export function perCategorie(stats: ProductStat[]): { label: string; value: number }[] {
  const m = new Map<string, number>();
  for (const s of stats) m.set(s.categorie, (m.get(s.categorie) || 0) + s.totaal);
  return [...m.entries()]
    .map(([label, value]) => ({ label, value: Math.round(value * 100) / 100 }))
    .filter((c) => c.value > 0)
    .sort((a, b) => b.value - a.value);
}
