// Analyse over ingelezen Picnic-bonnetjes. Pure functies: de UI en de server
// acties leveren rauwe rijen aan en lezen berekende uitkomsten terug, net als
// bij de financiënmodule.

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

export type ProductStat = {
  sleutel: string;
  naam: string;
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

export function productStats(regels: RegelRij[], overrides: ProductOverride[]): ProductStat[] {
  const ovr = new Map(overrides.map((o) => [o.sleutel, o]));
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
    const maanden = maandenTussen(eerste, laatste);
    uit.push({
      sleutel,
      naam: g.naam,
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
      frequentiePerMaand: datums.length / maanden,
      uitgavePerMaand: totaal / maanden,
      prijsverloop: datums.map(([datum, d]) => ({
        datum,
        prijsPerStuk: d.stuks ? Math.round((d.bedrag / d.stuks) * 100) / 100 : 0,
      })),
    });
  }
  return uit.sort((a, b) => b.totaal - a.totaal);
}

// Twee drempels in plaats van één. De lage drempel bepaalt wat in de lijst komt:
// met een handvol bezorgingen zou één strenge grens een leeg paneel opleveren, en
// daar heeft niemand iets aan. De hoge drempel markeert waar het patroon sterk
// genoeg voor is om er echt naar te handelen.
export const BULK_MIN_KEER = 2;
export const BULK_MIN_UITGAVE_PER_MAAND = 3;
export const BULK_STERK_KEER = 3;
export const BULK_STERK_UITGAVE_PER_MAAND = 8;

export type BulkKandidaat = ProductStat & { besparingIndicatie: number; sterk: boolean };

/** Houdbare producten die terugkomen, met de grootste maanduitgave bovenaan.
 *  `besparingIndicatie` is bewust ruw: 10% van de jaaruitgave, als grootteorde om
 *  te bepalen wat het aankijken waard is — geen belofte, want de werkelijke
 *  bulkkorting is hier niet bekend. */
export function bulkKandidaten(stats: ProductStat[]): BulkKandidaat[] {
  return stats
    .filter(
      (s) =>
        s.houdbaar &&
        !s.bulkNegeren &&
        s.keerGekocht >= BULK_MIN_KEER &&
        s.uitgavePerMaand >= BULK_MIN_UITGAVE_PER_MAAND,
    )
    .map((s) => ({
      ...s,
      besparingIndicatie: (s.uitgavePerMaand * 12) / 10,
      sterk: s.keerGekocht >= BULK_STERK_KEER && s.uitgavePerMaand >= BULK_STERK_UITGAVE_PER_MAAND,
    }))
    .sort((a, b) => Number(b.sterk) - Number(a.sterk) || b.uitgavePerMaand - a.uitgavePerMaand);
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
