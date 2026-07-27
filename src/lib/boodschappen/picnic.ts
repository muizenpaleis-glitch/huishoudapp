// Parser voor de "Je bonnetje"-mails van Picnic.
//
// Werkt volledig op de plaintext-body. De requirements gingen ervan uit dat het
// totaalbedrag alleen in de HTML-body stond, opgesplitst in losse euro- en
// centcellen — dat blijkt niet zo: elke onderzochte mail heeft Subtotaal én
// Totaal gewoon in de plaintext staan. Dat scheelt een fragiele HTML-parser.
//
// Twee dingen die alleen uit echte bonnetjes bleken en waar de parser op let:
//
//  1. Na "Subtotaal" kan een correctieblok staan ("Wat vervelend dat niet alles
//     in orde was") met regels die er precies uitzien als een product, maar met
//     een lege prijs. Productregels worden daarom alleen binnen een Order-blok
//     gelezen, niet met een losse regex over de hele body.
//  2. "Statiegeld", "Flessen en blikjes" en "Tasjes" komen twee keer voor: vóór
//     Subtotaal is het in rekening gebracht, erna is het ingeleverd/terugbetaald.
//     De positie ten opzichte van Subtotaal bepaalt de betekenis. Let op:
//     statiegeld is het TOTAAL, waarvan flessen en tasjes de uitsplitsing zijn —
//     apart optellen telt dubbel.
//  3. Bundelacties ("8 voor €11") staan als een reeks productregels waarvan
//     alleen de laatste een prijs draagt; de rest heeft een lege prijs. Die
//     regels zijn wel degelijk gekocht en mogen niet vervallen.
//
// De rekenregels van het bonnetje, geverifieerd op elk onderzocht exemplaar tot
// op de cent — regelprijzen zijn ná korting, Subtotaal staat ervóór:
//
//   Subtotaal = som(regelprijzen) + statiegeld + voordeel
//   Totaal    = Subtotaal − voordeel − ingeleverd statiegeld + verrekend tegoed
//
// `controle` hieronder toetst beide, zodat een toekomstige wijziging in het
// mailformaat opvalt in plaats van stilletjes verkeerde bedragen op te leveren.

export type BonRegel = {
  ordernummer: string;
  aantal: number;
  productnaam: string;
  actielabel: string | null; // Family, BundelBonus, "15% korting", "nu €2.99"
  /** Regelbedrag inclusief aantal. Bij een bundel het naar rato toebedeelde
   *  deel, zodat de som van de regels het bundelbedrag exact benadert. */
  prijs: number;
  /** Gevuld wanneer deze regel deel is van een bundelactie; `prijs` is dan een
   *  toebedeeld aandeel en niet wat er letterlijk op het bonnetje stond. */
  bundel: { label: string; totaal: number; stuks: number } | null;
};

export type Bonnetje = {
  bezorgdatum: string; // 'YYYY-MM-DD'
  ordernummers: string[];
  regels: BonRegel[];
  // In rekening gebracht (vóór Subtotaal)
  statiegeld: number;
  flessenBlikjes: number;
  tasjes: number;
  picnicTegoedVerrekend: number; // negatief bedrag op het bonnetje
  subtotaal: number | null;
  // Terugbetaald (ná Subtotaal)
  ingeleverdStatiegeld: number;
  ingeleverdFlessenBlikjes: number;
  ingeleverdTasjes: number;
  totaal: number | null;
  voordeel: number;
  /** Som van de productregels — bedoeld als controlegetal tegen `subtotaal`. */
  regelsom: number;
  controle: {
    subtotaalKlopt: boolean; // regelsom + statiegeld + voordeel === subtotaal
    totaalKlopt: boolean; // subtotaal − voordeel − ingeleverd + tegoed === totaal
  };
};

const MAANDEN = [
  "januari", "februari", "maart", "april", "mei", "juni",
  "juli", "augustus", "september", "oktober", "november", "december",
];

/** Herkent een bonnetje aan de body, niet aan het onderwerp: dat varieert
 *  ("Je bonnetje", maar ook "Je bonne-bonne- bonnetje"). De bestelbevestiging
 *  ("Bedankt voor je bestelling!") mist deze zin en valt er dus buiten. */
export function isBonnetje(plaintext: string): boolean {
  return /Hier is het bonnetje bij je bezorging van/i.test(plaintext);
}

function parseBedrag(raw: string): number | null {
  const m = raw.trim().match(/^([+-]?)\s*€?\s*(\d+)[.,](\d{2})$/);
  if (m) return (m[1] === "-" ? -1 : 1) * (parseInt(m[2], 10) + parseInt(m[3], 10) / 100);
  const heel = raw.trim().match(/^([+-]?)\s*€?\s*(\d+)$/);
  if (heel) return (heel[1] === "-" ? -1 : 1) * parseInt(heel[2], 10);
  return null;
}

function parseBezorgdatum(plaintext: string): string | null {
  const m = plaintext.match(
    /Hier is het bonnetje bij je bezorging van\s+\w+\s+(\d{1,2})\s+([a-zA-Zé]+)\s*(\d{4})?/i,
  );
  if (!m) return null;
  const dag = parseInt(m[1], 10);
  const maand = MAANDEN.indexOf(m[2].toLowerCase());
  if (maand < 0) return null;
  // Het jaartal staat er in alle onderzochte mails bij; ontbreekt het toch, dan
  // vult de aanroeper het aan met het jaar van de mail zelf.
  const jaar = m[3] ? parseInt(m[3], 10) : null;
  if (jaar == null) return null;
  return `${jaar}-${String(maand + 1).padStart(2, "0")}-${String(dag).padStart(2, "0")}`;
}

/** Bedrag dat onder een `* Kop *`-regel staat, of null als die kop er niet is.
 *  `vanaf`/`tot` begrenzen het zoekgebied zodat dezelfde kop vóór en ná
 *  Subtotaal uit elkaar gehouden wordt. */
function bedragOnderKop(regels: string[], kop: RegExp, vanaf: number, tot: number): number | null {
  for (let i = vanaf; i < tot; i++) {
    const m = regels[i].match(/^\*\s*(.+?)\s*\*$/);
    if (!m || !kop.test(m[1])) continue;
    for (let j = i + 1; j < Math.min(i + 4, tot); j++) {
      const b = parseBedrag(regels[j]);
      if (b != null) return b;
    }
  }
  return null;
}

/** Bedrag onder een sectiekop van de vorm:  Kop / --------------- / bedrag */
function bedragOnderSectie(regels: string[], kop: string): number | null {
  for (let i = 0; i < regels.length; i++) {
    if (regels[i].trim().toLowerCase() !== kop.toLowerCase()) continue;
    if (!/^-{3,}$/.test((regels[i + 1] || "").trim())) continue;
    for (let j = i + 2; j < Math.min(i + 6, regels.length); j++) {
      const b = parseBedrag(regels[j]);
      if (b != null) return b;
    }
  }
  return null;
}

export function parsePicnicBonnetje(plaintext: string): Bonnetje | null {
  if (!isBonnetje(plaintext)) return null;
  const bezorgdatum = parseBezorgdatum(plaintext);
  if (!bezorgdatum) return null;

  const regels = plaintext.split(/\r?\n/);
  // Alles ná deze regel is nabeschouwing (correcties, btw, adres) en bevat geen
  // gekochte producten meer.
  const subtotaalIndex = regels.findIndex(
    (r) => r.trim().toLowerCase() === "subtotaal" && /^-{3,}$/.test((regels[regels.indexOf(r) + 1] || "").trim()),
  );
  const einde = subtotaalIndex >= 0 ? subtotaalIndex : regels.length;

  // Eerst rauw uitlezen: productregels met hun (mogelijk lege) prijs.
  type Rauw = { order: string; aantal: number; naam: string; label: string | null; prijs: number | null };
  const rauw: Rauw[] = [];
  const ordernummers: string[] = [];
  let huidigeOrder: string | null = null;

  for (let i = 0; i < einde; i++) {
    const regel = regels[i].trim();

    const order = regel.match(/^Order\s+([\d-]+)$/i);
    if (order) {
      huidigeOrder = order[1];
      if (!ordernummers.includes(huidigeOrder)) ordernummers.push(huidigeOrder);
      continue;
    }

    const product = regel.match(/^\[(\d+)\]\s*(.+)$/);
    if (!product || !huidigeOrder) continue;

    // Volgende niet-lege regel bevat "<actielabel> | <prijs>".
    let j = i + 1;
    while (j < einde && regels[j].trim() === "") j++;
    const prijsRegel = (regels[j] || "").trim();
    const pipe = prijsRegel.lastIndexOf("|");
    if (pipe < 0) continue;
    const label = prijsRegel.slice(0, pipe).trim();
    rauw.push({
      order: huidigeOrder,
      aantal: parseInt(product[1], 10),
      naam: product[2].trim(),
      label: label || null,
      prijs: parseBedrag(prijsRegel.slice(pipe + 1)),
    });
    i = j;
  }

  // Bundels samenvoegen: een reeks regels zonder prijs hoort bij de eerstvolgende
  // regel mét prijs ("8 voor €11"). Het bundelbedrag wordt naar rato van het
  // aantal verdeeld; het restje van de afronding gaat naar de laatste regel,
  // zodat de som exact op het bundelbedrag uitkomt.
  const items: BonRegel[] = [];
  for (let i = 0; i < rauw.length; i++) {
    if (rauw[i].prijs != null) {
      const r = rauw[i];
      items.push({
        ordernummer: r.order,
        aantal: r.aantal,
        productnaam: r.naam,
        actielabel: r.label,
        prijs: r.prijs!,
        bundel: null,
      });
      continue;
    }
    let eind = i;
    while (eind < rauw.length && rauw[eind].prijs == null) eind++;
    if (eind >= rauw.length) {
      // Geen afsluitende prijsregel: registreer ze op 0 in plaats van ze te laten
      // vervallen, zodat het product zichtbaar blijft en de controle afgaat.
      for (let k = i; k < rauw.length; k++) {
        const r = rauw[k];
        items.push({ ordernummer: r.order, aantal: r.aantal, productnaam: r.naam, actielabel: r.label, prijs: 0, bundel: null });
      }
      break;
    }
    const groep = rauw.slice(i, eind + 1);
    const totaal = rauw[eind].prijs!;
    const label = rauw[eind].label || "Bundel";
    const stuks = groep.reduce((s, r) => s + r.aantal, 0);
    let toegekend = 0;
    groep.forEach((r, idx) => {
      const deel =
        idx === groep.length - 1
          ? Math.round((totaal - toegekend) * 100) / 100
          : Math.round((totaal * r.aantal) / stuks * 100) / 100;
      toegekend = Math.round((toegekend + deel) * 100) / 100;
      items.push({
        ordernummer: r.order,
        aantal: r.aantal,
        productnaam: r.naam,
        actielabel: label,
        prijs: deel,
        bundel: { label, totaal, stuks },
      });
    });
    i = eind;
  }

  const voor = (kop: RegExp) => bedragOnderKop(regels, kop, 0, einde) ?? 0;
  const na = (kop: RegExp) =>
    subtotaalIndex >= 0 ? (bedragOnderKop(regels, kop, subtotaalIndex, regels.length) ?? 0) : 0;

  const regelsom = Math.round(items.reduce((s, r) => s + r.prijs, 0) * 100) / 100;
  const statiegeld = voor(/^statiegeld$/i);
  const subtotaal = bedragOnderSectie(regels, "Subtotaal");
  const totaal = bedragOnderSectie(regels, "Totaal");
  const voordeel = bedragOnderSectie(regels, "Voordeel") ?? 0;
  const ingeleverdStatiegeld = na(/^ingeleverd statiegeld$/i);
  const tegoed = voor(/^verrekening picnic-tegoed$/i);
  const cent = (v: number) => Math.round(v * 100);

  return {
    regelsom,
    statiegeld,
    subtotaal,
    totaal,
    voordeel,
    ingeleverdStatiegeld,
    picnicTegoedVerrekend: tegoed,
    controle: {
      subtotaalKlopt:
        subtotaal != null && Math.abs(cent(regelsom + statiegeld + voordeel) - cent(subtotaal)) <= 1,
      totaalKlopt:
        subtotaal != null &&
        totaal != null &&
        Math.abs(cent(subtotaal - voordeel - ingeleverdStatiegeld + tegoed) - cent(totaal)) <= 1,
    },
    bezorgdatum,
    ordernummers,
    regels: items,
    // Uitsplitsing van het statiegeld hierboven — informatief, niet los optellen.
    flessenBlikjes: voor(/^flessen en blikjes$/i),
    tasjes: voor(/^tasjes$/i),
    ingeleverdFlessenBlikjes: na(/^flessen en blikjes$/i),
    ingeleverdTasjes: na(/^tasjes$/i),
  };
}
