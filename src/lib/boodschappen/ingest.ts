import "server-only";
import { createHash } from "node:crypto";
import { prisma } from "@/lib/prisma";
import { parsePicnicBonnetje, herkenMailsoort } from "./picnic";
import { productSleutel, EERSTE_JAAR } from "./engine";
import { haalPicnicMails, noteerSync } from "./gmail";

export type Uitkomst = "nieuw" | "bestond" | "anders" | "onleesbaar" | "te-oud";

/** Slaat één bonnetje op. `bronId` maakt het idempotent: opnieuw synchroniseren
 *  of dezelfde mail nog eens plakken levert geen dubbele bestelling op. */
export async function bewaarBonnetje(
  bron: "gmail" | "handmatig",
  bronId: string,
  plaintext: string,
  mailDatum?: Date,
): Promise<Uitkomst> {
  const bon = parsePicnicBonnetje(plaintext, mailDatum);
  // Onderscheid tussen "dit was een bestelbevestiging" (verwacht, telt niet mee)
  // en "dit zag eruit als een bonnetje maar viel niet te lezen" (verdacht, wil je
  // weten). Zonder dat onderscheid is een parserprobleem niet te zien.
  if (!bon) return herkenMailsoort(plaintext) === "anders" ? "anders" : "onleesbaar";
  // Grens op de bezorgdatum, niet op de datum van de mail: een bezorging van
  // begin januari hoort bij dit jaar, ook als het bonnetje in december verstuurd is.
  if (parseInt(bon.bezorgdatum.slice(0, 4), 10) < EERSTE_JAAR) return "te-oud";

  const bestaat = await prisma.boodschapBon.findUnique({ where: { bronId } });
  if (bestaat) return "bestond";

  await prisma.boodschapBon.create({
    data: {
      bron,
      bronId,
      bezorgdatum: bon.bezorgdatum,
      subtotaal: bon.subtotaal,
      totaal: bon.totaal,
      statiegeld: bon.statiegeld,
      ingeleverd: bon.ingeleverdStatiegeld,
      voordeel: bon.voordeel,
      tegoed: bon.picnicTegoedVerrekend,
      klopt: bon.controle.subtotaalKlopt && bon.controle.totaalKlopt,
      regels: {
        create: bon.regels.map((r) => ({
          ordernummer: r.ordernummer,
          productnaam: r.productnaam,
          sleutel: productSleutel(r.productnaam),
          aantal: r.aantal,
          prijs: r.prijs,
          actielabel: r.actielabel,
          bundelTotaal: r.bundel ? r.bundel.totaal : null,
        })),
      },
    },
  });
  return "nieuw";
}

/** Handmatig geplakte tekst. De bronId is een hash van de inhoud, zodat twee
 *  keer hetzelfde plakken niet dubbel telt maar een ander bonnetje wel binnenkomt. */
export async function bewaarGeplakt(plaintext: string): Promise<Uitkomst> {
  const hash = createHash("sha256").update(plaintext.trim()).digest("hex").slice(0, 32);
  return bewaarBonnetje("handmatig", `plak-${hash}`, plaintext);
}

export type SyncResultaat = {
  gevonden: number;
  nieuw: number;
  bestond: number;
  anders: number;
  onleesbaar: number;
  teOud: number;
  /** Datums van de mails die niet te lezen waren — genoeg om ze in Gmail terug
   *  te vinden en te kijken wat er anders aan is. */
  onleesbareDatums: string[];
};

/** Haalt Picnic-mails op en verwerkt ze. Zonder `sinds` is dit de eenmalige
 *  historische import; met `sinds` de dagelijkse ronde. */
export async function syncVanGmail(sinds?: Date): Promise<SyncResultaat> {
  try {
    const mails = await haalPicnicMails(sinds);
    const uit: SyncResultaat = {
      gevonden: mails.length,
      nieuw: 0,
      bestond: 0,
      anders: 0,
      onleesbaar: 0,
      teOud: 0,
      onleesbareDatums: [],
    };
    for (const m of mails) {
      const r = await bewaarBonnetje("gmail", m.id, m.plaintext, m.datum);
      if (r === "nieuw") uit.nieuw++;
      else if (r === "bestond") uit.bestond++;
      else if (r === "te-oud") uit.teOud++;
      else if (r === "anders") uit.anders++; // bevestigingen en pakketmails
      else {
        uit.onleesbaar++;
        if (uit.onleesbareDatums.length < 10) {
          uit.onleesbareDatums.push(m.datum.toISOString().slice(0, 10));
        }
      }
    }
    await noteerSync();
    return uit;
  } catch (e) {
    await noteerSync(e instanceof Error ? e.message : String(e));
    throw e;
  }
}
