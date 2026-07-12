import type { Tx } from "./engine";

// ASN bank export format: 20 comma-separated fields, text fields wrapped in
// single quotes that themselves contain unescaped apostrophes (e.g. "YVE'S
// SOUVENIR"). A quote only closes when the next character is a delimiter, so a
// plain char-by-char state machine parses every row correctly (the original
// used PapaParse as a fast path with this as the fallback; the data has no
// escape chars, so this alone is equivalent).
export function parseAsnLine(line: string): string[] {
  const out: string[] = [];
  let cur = "";
  let inQ = false;
  for (let i = 0; i < line.length; i++) {
    const c = line[i];
    if (inQ) {
      if (c === "'" && (i + 1 >= line.length || line[i + 1] === ",")) inQ = false;
      else cur += c;
    } else if (c === "'" && cur === "") {
      inQ = true;
    } else if (c === ",") {
      out.push(cur);
      cur = "";
    } else {
      cur += c;
    }
  }
  out.push(cur);
  return out;
}

// Column map (0-based, no header): 0 booking date dd-mm-yyyy | 2 counterparty
// IBAN | 3 name | 8 balance before | 10 amount | 14 global code | 15 seq |
// 17 description | 19 bank category.
export function parseAsnCsv(text: string): Tx[] {
  const txs: Tx[] = [];
  const lines = text.split(/\r?\n/);
  for (const line of lines) {
    if (!line.trim()) continue;
    const fields = parseAsnLine(line);
    if (fields.length < 20) continue;

    const [d, m, y] = fields[0].split("-");
    if (!d || !m || !y) continue;
    const amount = parseFloat(fields[10]);
    if (!isFinite(amount)) continue;

    txs.push({
      id: fields[0] + "|" + fields[15] + "|" + fields[10],
      date: `${y}-${m}-${d}`,
      iban: fields[2] || "",
      name: fields[3] || "",
      balanceBefore: parseFloat(fields[8]) || 0,
      amount,
      code: fields[14] || "",
      seq: fields[15] || "",
      desc: fields[17] || "",
      bankCat: fields[19] || "Overig",
    });
  }
  return txs;
}

// Deduplicating merge — matches the original mergeTransactions (by composite id),
// newest first.
export function mergeTransactions(existing: Tx[], newTxs: Tx[]): { merged: Tx[]; added: number } {
  const known = new Set(existing.map((t) => t.id));
  const merged = [...existing];
  let added = 0;
  for (const t of newTxs) {
    if (!known.has(t.id)) {
      merged.push(t);
      known.add(t.id);
      added++;
    }
  }
  merged.sort((a, b) => (a.date < b.date ? 1 : a.date > b.date ? -1 : 0));
  return { merged, added };
}
