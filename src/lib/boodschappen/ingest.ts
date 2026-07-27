import "server-only";
import { createHash } from "node:crypto";
import { prisma } from "@/lib/prisma";
import { parsePicnicBonnetje } from "./picnic";
import { productSleutel } from "./engine";
import { haalPicnicMails, noteerSync } from "./gmail";

export type Uitkomst = "nieuw" | "bestond" | "geen-bonnetje";

/** Slaat één bonnetje op. `bronId` maakt het idempotent: opnieuw synchroniseren
 *  of dezelfde mail nog eens plakken levert geen dubbele bestelling op. */
export async function bewaarBonnetje(
  bron: "gmail" | "handmatig",
  bronId: string,
  plaintext: string,
): Promise<Uitkomst> {
  const bon = parsePicnicBonnetje(plaintext);
  if (!bon) return "geen-bonnetje";

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
  geenBonnetje: number;
};

/** Haalt Picnic-mails op en verwerkt ze. Zonder `sinds` is dit de eenmalige
 *  historische import; met `sinds` de dagelijkse ronde. */
export async function syncVanGmail(sinds?: Date): Promise<SyncResultaat> {
  try {
    const mails = await haalPicnicMails(sinds);
    const uit: SyncResultaat = { gevonden: mails.length, nieuw: 0, bestond: 0, geenBonnetje: 0 };
    for (const m of mails) {
      const r = await bewaarBonnetje("gmail", m.id, m.plaintext);
      if (r === "nieuw") uit.nieuw++;
      else if (r === "bestond") uit.bestond++;
      else uit.geenBonnetje++; // o.a. "Bedankt voor je bestelling!" — bewust genegeerd
    }
    await noteerSync();
    return uit;
  } catch (e) {
    await noteerSync(e instanceof Error ? e.message : String(e));
    throw e;
  }
}
