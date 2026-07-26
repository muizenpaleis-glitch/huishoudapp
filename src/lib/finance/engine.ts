// Faithful TypeScript port of the finance_cockpit.html computation engine.
// Pure functions only — no DOM, no persistence. The UI and server actions
// feed raw state in and read computed results out, exactly as the original
// dashboard recomputed live from localStorage. Numbers must match the HTML.

/* ================================================================
   1. CONSTANTS (from the Jaarbegroting + corrected MJP sheet)
   ================================================================ */
export const RECURRING_INCOME_BUDGET = 101699; // Jaarlijks terugkerend inkomen
export const RECURRING_SPEND_BUDGET = 63336.8; // Jaarlijks terugkerend uitgaven
export const MONTHLY_RECURRING_BUDGET = RECURRING_SPEND_BUDGET / 12; // €5.278,07
export const MONTHLY_INCOME_BUDGET = RECURRING_INCOME_BUDGET / 12; // €8.474,92

// Operational result per MJP year (authoritative for the plan line)
export const OP_RESULT: Record<number, number> = {
  2026: 21741.24, 2027: 6250.18, 2028: 8779.56, 2029: 22996.31, 2030: 25044.96, 2031: 27037.93,
};
// Yearly transfers into the beleggingsrekening
export const INVESTMENTS: Record<number, number> = {
  2026: 11300, 2027: 11526, 2028: 11526, 2029: 11526, 2030: 11526, 2031: 11526,
};
export const PLANNED_INCIDENTAL_TAIL = 2000; // "Onvoorzien" beyond the MJP horizon (2031)
export const PLAN_START_NET_WORTH = 34079; // MJP start position
export const CRITICAL_THRESHOLD = 15000; // MJP "Kritieke vermogensgrens"
export const PROJECTION_START_YEAR = 2026;

export type Project = { name: string; budget: number; year: number; done: boolean };
export type Yearly = { name: string; budget: number };

export const DEFAULT_PROJECTS: Project[] = [
  { name: "Belastingreservering Suus", budget: 6300, year: 2026, done: false },
  { name: "Warmtepomp", budget: 11000, year: 2026, done: false },
  { name: "Kantoor afmaken", budget: 1200, year: 2026, done: false },
  { name: "Trapkast bouwen", budget: 750, year: 2026, done: false },
  { name: "Bedombouw", budget: 450, year: 2026, done: false },
  { name: "Oven", budget: 900, year: 2026, done: false },
  { name: "Tuinverbouwing", budget: 4831, year: 2026, done: false },
  { name: "Nieuwe badkamer", budget: 12000, year: 2027, done: false },
  { name: "Inductieplaat", budget: 1300, year: 2028, done: false },
  { name: "Magnetron", budget: 700, year: 2028, done: false },
  { name: "Tuinverbouwing II", budget: 350, year: 2028, done: false },
  { name: "Witgoed", budget: 750, year: 2028, done: false },
  { name: "Witgoed II", budget: 750, year: 2029, done: false },
  { name: "Nieuwe auto", budget: 30000, year: 2030, done: false },
  { name: "Tuinverbouwing III", budget: 750, year: 2030, done: false },
  { name: "Witgoed III", budget: 750, year: 2030, done: false },
  { name: "Dakkapel", budget: 15000, year: 2031, done: false },
  { name: "Onvoorzien 2026", budget: 1500, year: 2026, done: false },
  { name: "Onvoorzien 2027", budget: 2000, year: 2027, done: false },
  { name: "Onvoorzien 2028", budget: 1800, year: 2028, done: false },
  { name: "Onvoorzien 2029", budget: 1700, year: 2029, done: false },
  { name: "Onvoorzien 2030", budget: 2000, year: 2030, done: false },
  { name: "Onvoorzien 2031", budget: 2000, year: 2031, done: false },
];

export const DEFAULT_YEARLY: Yearly[] = [
  { name: "Vakanties", budget: 8051 },
  { name: "Uitjes en activiteiten", budget: 1500 },
  { name: "Schilderwerk huis", budget: 1200 },
  { name: "Gemeentelijke belastingen", budget: 1700 },
  { name: "Auto onderhoud", budget: 500 },
  { name: "Zorgverzekering", budget: 2980 },
  { name: "Overige onderhoud huis", budget: 1500 },
];

// Household accounts: checking + joint savings. Transfers between them are internal.
export const OWN_ACCOUNTS = ["NL06ASNB8851233594", "NL16ASNB8851233608"];

const HW_TERMS =
  /(KARWEI|BAUHAUS|HUBO|GAMMA|PRAXIS|HORNBACH|BOUWMAAT|TOOLSTATION|HEATTRANSFORMERS|WARMTEPOMP|BADKAMER|SANITAIR|DAKKAPEL|KEUKEN|BOUWMARKT|HOUTHANDEL|INSTALLATIEBEDRIJF)/i;
const HW_BANK_CATS = ["Klussen & onderhoud", "Huishouden & elektronica"];
const INVEST_TERMS =
  /(DE ?GIRO|FLATEX|MEESMAN|BRAND ?NEW ?DAY|DOELBELEGGEN|BELEGGEN|BELEGGING|SAXO ?BANK|TRADE ?REPUBLIC|PEAKS|SEMMIE|SCALABLE|INTERACTIVE BROKERS|VANGUARD|BINCKBANK|\bBUX\b|\bETF\b)/i;

// Monthly budget per BANK category, mapped from the Jaarbegroting.
export const DEFAULT_CATEGORY_BUDGETS: Record<string, number> = {
  Boodschappen: 500.0,
  "Eten & drinken": 210.0,
  "Huur & hypotheek": 2174.97,
  "Gas water & licht": 285.73,
  "Internet TV & Bellen": 50.45,
  Verzekeringen: 149.95,
  Vervoer: 100.0,
  Kinderen: 682.49,
  "Huishouden & elektronica": 267.32,
  "Hobby sport & vrije tijd": 91.0,
  "Zak- & kleedgeld": 500.0,
  "Verzorging & gezondheid": 29.17,
  Cadeaus: 75.0,
  "Goede doelen": 125.0,
  Lening: 148.06,
  "Klussen & onderhoud": 35.0,
  Bankkosten: 3.65,
};

export type Settings = {
  startNetWorth: number;
  returnRate: number;
  horizon: number;
  savingsGrowth: number;
  monthlyBudget: number;
  monthlyIncome: number;
  threshold: number;
  savingsAccounts: string[];
  investmentAccounts: string[];
  savingsIncidentalThreshold: number;
  categoryBudgets: Record<string, number>;
  personalSavings: number;
  investmentValue: number;
  categoryInflatie: Record<string, number>;
  inflatieDefault: number;
  inkomenGroei: number;
};

export const DEFAULT_SETTINGS: Settings = {
  startNetWorth: PLAN_START_NET_WORTH,
  returnRate: 0,
  horizon: 15,
  savingsGrowth: 2,
  monthlyBudget: MONTHLY_RECURRING_BUDGET,
  monthlyIncome: MONTHLY_INCOME_BUDGET,
  threshold: 200,
  savingsAccounts: ["NL16ASNB8851233608"],
  investmentAccounts: [],
  savingsIncidentalThreshold: 1500,
  categoryBudgets: {},
  personalSavings: 0,
  investmentValue: 0,
  categoryInflatie: {},
  inflatieDefault: 2.5,
  inkomenGroei: 2.0,
};

/* ================================================================
   2. TYPES + CLASSIFICATION
   ================================================================ */
export type Tx = {
  id: string;
  date: string; // YYYY-MM-DD
  iban: string;
  name: string;
  balanceBefore: number;
  amount: number;
  code: string;
  seq: string;
  desc: string;
  bankCat: string;
};

export type ClassName = "recurring" | "yearly" | "incidental" | "exclude";
export type Override = {
  cls?: ClassName;
  project?: string;
  bankCat?: string;
  notInvestment?: boolean;
  savingsInc?: boolean;
};
export type Overrides = Record<string, Override>;

export function effBankCat(t: Tx, overrides: Overrides): string {
  const o = overrides[t.id];
  return o && o.bankCat ? o.bankCat : t.bankCat;
}

function isSavingsTransfer(t: Tx, settings: Settings): boolean {
  return !!(t.iban && (settings.savingsAccounts || []).includes(t.iban));
}

export function rebuildInvestIbans(transactions: Tx[], settings: Settings) {
  const investIbans = new Set(settings.investmentAccounts || []);
  const found = new Map<string, string>();
  for (const t of transactions) {
    if (!t.iban || investIbans.has(t.iban)) continue;
    const m = (t.name + " " + t.desc).match(INVEST_TERMS);
    if (m) {
      investIbans.add(t.iban);
      if (!found.has(t.iban)) found.set(t.iban, m[1]);
    }
  }
  const investDetected = [...found.entries()].map(([iban, term]) => ({ iban, term }));
  return { investIbans, investDetected };
}

function isInvestmentCandidate(t: Tx, investIbans: Set<string>): boolean {
  return !!(t.iban && investIbans.has(t.iban));
}
function isInvestmentTransfer(t: Tx, investIbans: Set<string>, overrides: Overrides): boolean {
  if (!isInvestmentCandidate(t, investIbans)) return false;
  const o = overrides[t.id];
  return !(o && o.notInvestment);
}
function savingsIsIncidental(t: Tx, overrides: Overrides, settings: Settings): boolean {
  const o = overrides[t.id];
  if (o && o.savingsInc !== undefined) return o.savingsInc;
  return Math.abs(t.amount) >= (settings.savingsIncidentalThreshold || 1500);
}

export function guessProject(t: Tx): string {
  const text = t.name + " " + t.desc;
  if (/HEATTRANSFORMERS|WARMTEPOMP/i.test(text)) return "Warmtepomp";
  if (/BADKAMER|SANITAIR/i.test(text)) return "Nieuwe badkamer";
  if (/DAKKAPEL/i.test(text)) return "Dakkapel";
  if (/INDUCTIE/i.test(text)) return "Inductieplaat";
  if (/MAGNETRON/i.test(text)) return "Magnetron";
  if (/OVEN|KEUKEN/i.test(text)) return "Oven";
  if (/WITGOED|VAATWAS|KOELKAST|WASMACHINE|WASDROGER|VRIEZER/i.test(text)) return "Witgoed";
  if (/AUTO|GARAGE/i.test(text)) return "Nieuwe auto";
  if (/TUIN|PERGOLA|PERGULA/i.test(text)) return "Tuinverbouwing";
  if (/KAST/i.test(text)) return "Trapkast bouwen";
  if (/BELASTING/i.test(text)) return "Belastingreservering Suus";
  return "Onvoorzien " + t.date.slice(0, 4);
}
export function guessYearly(t: Tx, overrides: Overrides): string {
  if (effBankCat(t, overrides) === "Vakantie") return "Vakanties";
  return "";
}

export function autoClassify(
  t: Tx,
  overrides: Overrides,
  settings: Settings,
  investIbans: Set<string>,
): { cls: ClassName; project: string } {
  const bankCat = effBankCat(t, overrides);
  if (t.iban && OWN_ACCOUNTS.includes(t.iban)) return { cls: "exclude", project: "" };
  if (isSavingsTransfer(t, settings) || isInvestmentTransfer(t, investIbans, overrides))
    return { cls: "exclude", project: "" };
  if (bankCat === "Sparen") return { cls: "exclude", project: "" };

  const yi = guessYearly(t, overrides);
  if (yi) return { cls: "yearly", project: yi };

  const text = t.name + " " + t.desc;
  const big = Math.abs(t.amount) > settings.threshold;
  if (big && (HW_TERMS.test(text) || HW_BANK_CATS.includes(bankCat))) {
    return { cls: "incidental", project: guessProject(t) };
  }
  return { cls: "recurring", project: "" };
}

export type Effective = { cls: ClassName; project: string; bankCat: string; isOverride: boolean };
export function effective(
  t: Tx,
  overrides: Overrides,
  settings: Settings,
  investIbans: Set<string>,
): Effective {
  const auto = autoClassify(t, overrides, settings, investIbans);
  const ovr = overrides[t.id];
  return {
    cls: ovr && ovr.cls ? ovr.cls : auto.cls,
    project: ovr && ovr.project !== undefined && ovr.project !== "" ? ovr.project : auto.project,
    bankCat: ovr && ovr.bankCat ? ovr.bankCat : t.bankCat,
    isOverride: !!ovr,
  };
}

/* ================================================================
   3. AGGREGATION
   ================================================================ */
export type SavingsMonth = { deposit: number; withdraw: number; depositReg: number; withdrawReg: number };
export type Agg = ReturnType<typeof aggregate>;

export function aggregate(
  list: Tx[],
  overrides: Overrides,
  settings: Settings,
  investIbans: Set<string>,
) {
  const months = new Set<string>();
  const monthsByYear: Record<number, Set<string>> = {};
  const recurringSpendByYear: Record<number, number> = {};
  const recurringSpendByMonth: Record<string, number> = {};
  const recurringIncomeByMonth: Record<string, number> = {};
  const recurringIncomeByYear: Record<number, number> = {};
  const incidentalNetByYear: Record<number, number> = {};
  const incidentalByProject: Record<string, number> = {};
  const yearlyByYear: Record<number, number> = {};
  const yearlyByItem: Record<string, number> = {};
  const yearlyByItemYear: Record<string, number> = {};
  const spendByCat: Record<string, number> = {};
  const recurringSpendByCat: Record<string, number> = {};
  const recurringSpendByCatMonth: Record<string, Record<string, number>> = {};
  const flowByMonth: Record<string, { inc: number; out: number }> = {};

  let recurringIncome = 0;
  let recurringSpend = 0;
  let incidentalTotal = 0;
  let incidentalCount = 0;
  let yearlyTotal = 0;
  let yearlyCount = 0;
  let excludedTotal = 0;

  const savings = {
    byMonth: {} as Record<string, SavingsMonth>,
    deposit: 0,
    withdraw: 0,
    depositInc: 0,
    withdrawInc: 0,
    count: 0,
    items: [] as { id: string; date: string; desc: string; amount: number; incidental: boolean }[],
    net: 0,
    depositReg: 0,
    withdrawReg: 0,
    netReg: 0,
    monthCount: 1,
    netRegPerMonth: 0,
  };
  const invest = {
    byYear: {} as Record<number, number>,
    total: 0,
    count: 0,
    items: [] as { id: string; date: string; desc: string; amount: number; excluded: boolean }[],
  };

  for (const t of list) {
    const e = effective(t, overrides, settings, investIbans);
    const month = t.date.slice(0, 7);
    const year = parseInt(t.date.slice(0, 4), 10);
    months.add(month);
    (monthsByYear[year] = monthsByYear[year] || new Set()).add(month);

    if (isSavingsTransfer(t, settings)) {
      const inc = savingsIsIncidental(t, overrides, settings);
      const sm =
        savings.byMonth[month] ||
        (savings.byMonth[month] = { deposit: 0, withdraw: 0, depositReg: 0, withdrawReg: 0 });
      if (t.amount < 0) {
        savings.deposit += -t.amount;
        sm.deposit += -t.amount;
        if (inc) savings.depositInc += -t.amount;
        else sm.depositReg += -t.amount;
      } else {
        savings.withdraw += t.amount;
        sm.withdraw += t.amount;
        if (inc) savings.withdrawInc += t.amount;
        else sm.withdrawReg += t.amount;
      }
      savings.count++;
      savings.items.push({
        id: t.id,
        date: t.date,
        desc: (t.desc || t.name || "").trim(),
        amount: t.amount,
        incidental: inc,
      });
    }
    if (isInvestmentCandidate(t, investIbans) && t.amount < 0) {
      const counted = isInvestmentTransfer(t, investIbans, overrides);
      invest.items.push({
        id: t.id,
        date: t.date,
        desc: (t.desc || t.name || "").trim(),
        amount: t.amount,
        excluded: !counted,
      });
      if (counted) {
        invest.byYear[year] = (invest.byYear[year] || 0) + -t.amount;
        invest.total += -t.amount;
        invest.count++;
      }
    }

    if (e.cls === "exclude") {
      excludedTotal += Math.abs(t.amount);
      continue;
    }
    if (!flowByMonth[month]) flowByMonth[month] = { inc: 0, out: 0 };
    if (t.amount > 0) flowByMonth[month].inc += t.amount;
    else flowByMonth[month].out += -t.amount;

    if (t.amount < 0) spendByCat[e.bankCat] = (spendByCat[e.bankCat] || 0) - t.amount;

    if (e.cls === "incidental") {
      incidentalNetByYear[year] = (incidentalNetByYear[year] || 0) - t.amount;
      const proj = e.project || "Onvoorzien " + year;
      incidentalByProject[proj] = (incidentalByProject[proj] || 0) - t.amount;
      incidentalTotal -= t.amount;
      incidentalCount++;
    } else if (e.cls === "yearly") {
      const item = e.project || "Uitjes en activiteiten";
      yearlyByYear[year] = (yearlyByYear[year] || 0) - t.amount;
      yearlyByItem[item] = (yearlyByItem[item] || 0) - t.amount;
      const key = item + "|" + year;
      yearlyByItemYear[key] = (yearlyByItemYear[key] || 0) - t.amount;
      yearlyTotal -= t.amount;
      yearlyCount++;
    } else {
      if (t.amount > 0) {
        recurringIncome += t.amount;
        recurringIncomeByMonth[month] = (recurringIncomeByMonth[month] || 0) + t.amount;
        recurringIncomeByYear[year] = (recurringIncomeByYear[year] || 0) + t.amount;
      } else {
        recurringSpend += -t.amount;
        recurringSpendByYear[year] = (recurringSpendByYear[year] || 0) - t.amount;
        recurringSpendByMonth[month] = (recurringSpendByMonth[month] || 0) - t.amount;
      }
      recurringSpendByCat[e.bankCat] = (recurringSpendByCat[e.bankCat] || 0) - t.amount;
      const cm = recurringSpendByCatMonth[e.bankCat] || (recurringSpendByCatMonth[e.bankCat] = {});
      cm[month] = (cm[month] || 0) - t.amount;
    }
  }

  const monthCount = Math.max(months.size, 1);
  const spendPerMonth = recurringSpend / monthCount;
  const incomePerMonth = recurringIncome / monthCount;

  const deviationByYear: Record<number, number> = {};
  const spendDevByYear: Record<number, number> = {};
  const incomeDevByYear: Record<number, number> = {};
  let deviationTotal = 0;
  for (const y in monthsByYear) {
    const yr = Number(y);
    const m = monthsByYear[yr].size;
    const spendDev = m * settings.monthlyBudget - (recurringSpendByYear[yr] || 0);
    const incomeDev = (recurringIncomeByYear[yr] || 0) - m * settings.monthlyIncome;
    spendDevByYear[yr] = spendDev;
    incomeDevByYear[yr] = incomeDev;
    deviationByYear[yr] = spendDev + incomeDev;
    deviationTotal += deviationByYear[yr];
  }

  savings.net = savings.deposit - savings.withdraw;
  savings.depositReg = savings.deposit - savings.depositInc;
  savings.withdrawReg = savings.withdraw - savings.withdrawInc;
  savings.netReg = savings.depositReg - savings.withdrawReg;
  savings.monthCount = Math.max(Object.keys(savings.byMonth).length, 1);
  savings.netRegPerMonth = savings.netReg / savings.monthCount;
  savings.items.sort((a, b) => (a.date < b.date ? 1 : a.date > b.date ? -1 : 0));
  invest.items.sort((a, b) => (a.date < b.date ? 1 : a.date > b.date ? -1 : 0));

  return {
    months,
    monthsByYear,
    recurringSpendByYear,
    recurringSpendByMonth,
    recurringIncomeByMonth,
    recurringIncomeByYear,
    recurringIncome,
    recurringSpend,
    incidentalNetByYear,
    incidentalByProject,
    incidentalTotal,
    incidentalCount,
    yearlyByYear,
    yearlyByItem,
    yearlyByItemYear,
    yearlyTotal,
    yearlyCount,
    excludedTotal,
    spendByCat,
    recurringSpendByCat,
    recurringSpendByCatMonth,
    flowByMonth,
    savings,
    invest,
    monthCount,
    spendPerMonth,
    incomePerMonth,
    deviationByYear,
    spendDevByYear,
    incomeDevByYear,
    deviationTotal,
  };
}

/* ================================================================
   4. BUFFER + PROJECTION
   ================================================================ */
export function computeBufferActual(agg: Agg, settings: Settings): number {
  const year = PROJECTION_START_YEAR;
  const aInc = agg.recurringIncomeByYear[year] || 0;
  const aSpend = agg.recurringSpendByYear[year] || 0;
  const aNetResult = aInc - aSpend - agg.yearlyTotal - agg.incidentalTotal;
  return settings.startNetWorth + aNetResult - agg.invest.total;
}

function grown(value: number, year: number, settings: Settings): number {
  return value * Math.pow(1 + settings.savingsGrowth / 100, year - 2031);
}
// OP_RESULT is no longer extrapolated: the plan now derives the operational
// result from the household's own budget lines (opResultaatVoorJaar). The
// table survives purely as the `sheet` comparison figure for 2026–2031.
function investmentForYear(year: number, settings: Settings): number {
  return INVESTMENTS[year] !== undefined ? INVESTMENTS[year] : grown(INVESTMENTS[2031], year, settings);
}
export function plannedIncidentalForYear(year: number, settings: Settings, projects: Project[]): number {
  let total = year > 2031 ? grown(PLANNED_INCIDENTAL_TAIL, year, settings) : 0;
  for (const p of projects) if ((p.year || PROJECTION_START_YEAR) === year) total += p.budget || 0;
  return total;
}

/** Planned transfer into the investment pot for a year. A per-year override
 *  wins; otherwise the original MJP table, extrapolated past 2031. */
export function investeringVoorJaar(jaar: number, settings: Settings, mjpRows: MjpJaarRow[]): number {
  const row = mjpRows.find((r) => r.jaar === jaar);
  if (row && row.investeringen != null) return row.investeringen;
  return investmentForYear(jaar, settings);
}

export function projectSeries(
  agg: Agg,
  settings: Settings,
  projects: Project[],
  yearly: (Yearly & { inflatie?: number | null })[],
  budgetJaar: BudgetJaarOverride[] = [],
  mjpRows: MjpJaarRow[] = [],
) {
  const offset = settings.startNetWorth - PLAN_START_NET_WORTH;
  const r = settings.returnRate / 100;

  const relief: Record<number, number> = {};
  for (const p of projects) {
    if (!(p.budget > 0)) continue;
    const spent = Math.max(0, agg.incidentalByProject[p.name] || 0);
    const released = p.done ? p.budget : Math.min(p.budget, spent);
    if (!released) continue;
    const y = p.year || PROJECTION_START_YEAR;
    relief[y] = (relief[y] || 0) + released;
  }

  const start = PLAN_START_NET_WORTH + offset;
  const plan = [start];
  const actual = [start];
  const total = [start];
  let planNw = PLAN_START_NET_WORTH;
  let cumDelta = 0;
  let cumInvest = 0;
  for (let i = 0; i < settings.horizon; i++) {
    const year = PROJECTION_START_YEAR + i;
    // Operational result now comes from the household's own budget lines
    // (income − vaste lasten − jaarposten, each indexed per post) instead of
    // the fixed OP_RESULT table, so the plan reflects what was actually
    // budgeted. The old table survives inside opResultaatVoorJaar as the
    // `sheet` comparison figure.
    const opResultaat = opResultaatVoorJaar(year, agg, settings, yearly, budgetJaar, mjpRows).gebruikt;
    const investering = investeringVoorJaar(year, settings, mjpRows);
    planNw =
      planNw * (1 + r) +
      opResultaat -
      investering -
      plannedIncidentalForYear(year, settings, projects);
    cumInvest += investering;

    const deviation = agg.deviationByYear[year] || 0;
    const monthsLoaded = (agg.monthsByYear[year] && agg.monthsByYear[year].size) || 0;
    const yearlyDeviation = monthsLoaded
      ? jaarpostenVoorJaar(year, yearly, settings, budgetJaar) * (monthsLoaded / 12) -
        (agg.yearlyByYear[year] || 0)
      : 0;
    cumDelta +=
      deviation + yearlyDeviation + (relief[year] || 0) - (agg.incidentalNetByYear[year] || 0);

    plan.push(planNw + offset);
    actual.push(planNw + offset + cumDelta);
    total.push(planNw + offset + cumDelta + cumInvest);
  }
  return { plan, actual, total };
}

/* ================================================================
   5. TIME FILTER
   ================================================================ */
export type TimeGran = "all" | "year" | "quarter" | "month";
export function quarterOf(dateStr: string): string {
  return dateStr.slice(0, 4) + "-Q" + (Math.floor((parseInt(dateStr.slice(5, 7), 10) - 1) / 3) + 1);
}
export function inPeriod(dateStr: string, gran: TimeGran, period: string): boolean {
  if (gran === "all") return true;
  if (gran === "year") return dateStr.slice(0, 4) === period;
  if (gran === "month") return dateStr.slice(0, 7) === period;
  if (gran === "quarter") return quarterOf(dateStr) === period;
  return true;
}
export function periodsFor(transactions: Tx[], gran: TimeGran): string[] {
  const set = new Set<string>();
  for (const t of transactions) {
    if (gran === "year") set.add(t.date.slice(0, 4));
    else if (gran === "month") set.add(t.date.slice(0, 7));
    else if (gran === "quarter") set.add(quarterOf(t.date));
  }
  return [...set].sort();
}

export const MONTH_NAMES = [
  "jan", "feb", "mrt", "apr", "mei", "jun", "jul", "aug", "sep", "okt", "nov", "dec",
];
export function labelMonth(p: string): string {
  const [y, m] = p.split("-");
  return MONTH_NAMES[parseInt(m, 10) - 1] + " " + y;
}

/* ================================================================
   6. CATEGORY BUDGET BASIS
   ================================================================ */
export function catBudgetInfo(
  cat: string,
  agg: Agg,
  settings: Settings,
): { budget: number; basis: "budget" | "avg"; avg: number } {
  const avg = (agg.recurringSpendByCat[cat] || 0) / agg.monthCount;
  const ovr = settings.categoryBudgets || {};
  if (Object.prototype.hasOwnProperty.call(ovr, cat)) return { budget: ovr[cat], basis: "budget", avg };
  if (cat in DEFAULT_CATEGORY_BUDGETS) return { budget: DEFAULT_CATEGORY_BUDGETS[cat], basis: "budget", avg };
  return { budget: avg, basis: "avg", avg };
}

/* ================================================================
   7. MULTI-YEAR BUDGET DERIVATION
   Turns the base-year budgets into a per-year plan: index each line
   forward with its own inflation rate, unless an explicit override
   exists for that year. Pure functions — the caller supplies the
   stored overrides, so nothing here touches the database.
   ================================================================ */

export type BudgetJaarOverride = { jaar: number; soort: "categorie" | "jaarpost"; naam: string; bedrag: number };
export type MjpJaarRow = {
  jaar: number;
  inkomen: number | null;
  investeringen: number | null;
  opResultaat: number | null;
  notitie?: string | null;
};

/** Index a base-year amount forward. Years before the base deflate symmetrically. */
function geindexeerd(basis: number, pct: number, jaar: number): number {
  return basis * Math.pow(1 + pct / 100, jaar - PROJECTION_START_YEAR);
}

export function categorieInflatie(cat: string, settings: Settings): number {
  const per = settings.categoryInflatie || {};
  return Object.prototype.hasOwnProperty.call(per, cat) ? per[cat] : settings.inflatieDefault;
}

function findOverride(
  overrides: BudgetJaarOverride[],
  jaar: number,
  soort: "categorie" | "jaarpost",
  naam: string,
): number | null {
  const hit = overrides.find((o) => o.jaar === jaar && o.soort === soort && o.naam === naam);
  return hit ? hit.bedrag : null;
}

/** Base-year monthly budget for a category. Deliberately NOT catBudgetInfo():
 *  that falls back to the historical average, which is negative for income
 *  categories (recurringSpendByCat subtracts positive amounts) and would drag
 *  the plan total below zero. Here an unbudgeted category is simply 0 until
 *  the household gives it a budget. */
export function categorieBasisBudget(cat: string, settings: Settings): number {
  const ovr = settings.categoryBudgets || {};
  if (Object.prototype.hasOwnProperty.call(ovr, cat)) return ovr[cat];
  if (cat in DEFAULT_CATEGORY_BUDGETS) return DEFAULT_CATEGORY_BUDGETS[cat];
  return 0;
}

export type Referentie = {
  bedrag: number; // €/maand
  bron: "werkelijk" | "budget";
  jaar: number; // the year the figure describes
  maanden: number; // months of data behind it — 0 when it's a budget figure
};

/** What a year's indexation starts from: last year's *actual* monthly spend
 *  whenever that year has imported transactions, otherwise last year's budget.
 *  Budgeting on what a category really cost beats budgeting on what it was
 *  supposed to cost — but only the first step out of the data is measured;
 *  every year beyond it chains off the previous year's derived budget, since
 *  there is nothing to measure yet. */
export function categorieReferentie(
  cat: string,
  jaar: number,
  agg: Agg,
  settings: Settings,
  overrides: BudgetJaarOverride[],
): Referentie {
  const vorig = jaar - 1;
  const werkelijk = werkelijkPerMaandVoorJaar(cat, vorig, agg);
  if (werkelijk) {
    return { bedrag: werkelijk.perMaand, bron: "werkelijk", jaar: vorig, maanden: werkelijk.maanden };
  }
  if (vorig < PROJECTION_START_YEAR) {
    return { bedrag: categorieBasisBudget(cat, settings), bron: "budget", jaar: PROJECTION_START_YEAR, maanden: 0 };
  }
  return {
    bedrag: categorieBudgetVoorJaar(cat, vorig, agg, settings, overrides).bedrag,
    bron: "budget",
    jaar: vorig,
    maanden: 0,
  };
}

/** Monthly budget for one bank category in one year, plus where it came from. */
export function categorieBudgetVoorJaar(
  cat: string,
  jaar: number,
  agg: Agg,
  settings: Settings,
  overrides: BudgetJaarOverride[],
): {
  bedrag: number;
  afgeleid: number;
  bron: "override" | "afgeleid";
  referentie: Referentie;
} {
  const referentie = categorieReferentie(cat, jaar, agg, settings, overrides);
  // The base year has nothing before it to index from, so its budget is the
  // budget itself; every later year steps one year forward from its reference.
  const afgeleid =
    jaar <= PROJECTION_START_YEAR && referentie.bron === "budget"
      ? categorieBasisBudget(cat, settings)
      : referentie.bedrag * (1 + categorieInflatie(cat, settings) / 100);
  const ovr = findOverride(overrides, jaar, "categorie", cat);
  return ovr != null
    ? { bedrag: ovr, afgeleid, bron: "override", referentie }
    : { bedrag: afgeleid, afgeleid, bron: "afgeleid", referentie };
}

/** Categories to show in a budget year: everything with a budget, plus any
 *  category the household actually spends money in (net positive), so
 *  unbudgeted spend is visible instead of silently missing. Income categories
 *  net negative here and are excluded. */
export function budgetCategorieen(agg: Agg, settings: Settings): string[] {
  const metBudget = new Set([
    ...Object.keys(DEFAULT_CATEGORY_BUDGETS),
    ...Object.keys(settings.categoryBudgets || {}),
  ]);
  for (const [cat, bedrag] of Object.entries(agg.recurringSpendByCat)) {
    if (bedrag > 0) metBudget.add(cat);
  }
  return [...metBudget].sort((a, b) => a.localeCompare(b));
}

/** Total recurring spend for a year, in euros per year. */
export function vasteLastenVoorJaar(
  jaar: number,
  agg: Agg,
  settings: Settings,
  overrides: BudgetJaarOverride[],
): number {
  return (
    budgetCategorieen(agg, settings).reduce(
      (s, c) => s + categorieBudgetVoorJaar(c, jaar, agg, settings, overrides).bedrag,
      0,
    ) * 12
  );
}

export function jaarpostVoorJaar(
  post: Yearly & { inflatie?: number | null },
  jaar: number,
  settings: Settings,
  overrides: BudgetJaarOverride[],
): { bedrag: number; afgeleid: number; bron: "override" | "afgeleid" } {
  const pct = post.inflatie ?? settings.inflatieDefault;
  const afgeleid = geindexeerd(post.budget || 0, pct, jaar);
  const ovr = findOverride(overrides, jaar, "jaarpost", post.name);
  return ovr != null
    ? { bedrag: ovr, afgeleid, bron: "override" }
    : { bedrag: afgeleid, afgeleid, bron: "afgeleid" };
}

export function jaarpostenVoorJaar(
  jaar: number,
  yearly: (Yearly & { inflatie?: number | null })[],
  settings: Settings,
  overrides: BudgetJaarOverride[],
): number {
  return yearly.reduce((s, y) => s + jaarpostVoorJaar(y, jaar, settings, overrides).bedrag, 0);
}

export function inkomenVoorJaar(jaar: number, settings: Settings, mjpRows: MjpJaarRow[]): number {
  const row = mjpRows.find((r) => r.jaar === jaar);
  if (row && row.inkomen != null) return row.inkomen;
  return geindexeerd(RECURRING_INCOME_BUDGET, settings.inkomenGroei, jaar);
}

/** Actual net recurring spend for one category in one calendar year, as a
 *  monthly average over the months that were actually imported for that year.
 *  Returns null when that year has no data at all, so the caller can show "—"
 *  instead of a misleading zero. `maanden` lets the UI say how many months the
 *  average rests on — seven months is not a full year. */
export function werkelijkPerMaandVoorJaar(
  cat: string,
  jaar: number,
  agg: Agg,
): { perMaand: number; maanden: number } | null {
  const perMaand = agg.recurringSpendByCatMonth[cat];
  const maandenVanJaar = agg.monthsByYear[jaar];
  if (!maandenVanJaar || maandenVanJaar.size === 0) return null;
  let totaal = 0;
  for (const m of maandenVanJaar) totaal += (perMaand && perMaand[m]) || 0;
  return { perMaand: totaal / maandenVanJaar.size, maanden: maandenVanJaar.size };
}

export function maandenInJaar(jaar: number, agg: Agg): number {
  return agg.monthsByYear[jaar]?.size ?? 0;
}

/** Operational result: income minus recurring spend minus yearly posts.
 *  `sheet` is the original spreadsheet figure, kept for comparison so the
 *  gap between the two is visible instead of silently resolved. */
export function opResultaatVoorJaar(
  jaar: number,
  agg: Agg,
  settings: Settings,
  yearly: (Yearly & { inflatie?: number | null })[],
  overrides: BudgetJaarOverride[],
  mjpRows: MjpJaarRow[],
): {
  inkomen: number;
  vasteLasten: number;
  jaarposten: number;
  afgeleid: number;
  gebruikt: number;
  sheet: number | null;
  bron: "override" | "afgeleid";
} {
  const inkomen = inkomenVoorJaar(jaar, settings, mjpRows);
  const vasteLasten = vasteLastenVoorJaar(jaar, agg, settings, overrides);
  const jaarposten = jaarpostenVoorJaar(jaar, yearly, settings, overrides);
  const afgeleid = inkomen - vasteLasten - jaarposten;
  const row = mjpRows.find((r) => r.jaar === jaar);
  const sheet = OP_RESULT[jaar] ?? null;
  return row && row.opResultaat != null
    ? { inkomen, vasteLasten, jaarposten, afgeleid, gebruikt: row.opResultaat, sheet, bron: "override" }
    : { inkomen, vasteLasten, jaarposten, afgeleid, gebruikt: afgeleid, sheet, bron: "afgeleid" };
}

/* ================================================================
   8. RITME-ANALYSE
   Which posts are budgeted at the wrong cadence? A category budgeted
   per month but only actually paid once or twice a year belongs in the
   yearly block, and a yearly item that turns up every month belongs in
   the monthly budget. Computed straight from transactions so it covers
   both classes, and reports the months it saw so the household can
   sanity-check the advice instead of trusting it blindly.
   ================================================================ */

export type RitmeAdvies = "naar-jaarpost" | "naar-maandbudget" | "past";

export type RitmePost = {
  naam: string;
  soort: "categorie" | "jaarpost";
  maandenMetUitgave: number;
  maandenTotaal: number;
  maanden: string[]; // 'YYYY-MM', sorted
  totaal: number;
  perActieveMaand: number;
  advies: RitmeAdvies;
};

// A post seen in at most a third of the loaded months is lumpy; one seen in at
// least two thirds is steady. Below the floor the move isn't worth the effort.
const RITME_LUMPY = 1 / 3;
const RITME_STEADY = 2 / 3;
const RITME_MIN_BEDRAG = 150;
// With only one or two months loaded every post that occurs at all sits in
// 100% of them, which would flag every yearly item as "really monthly". Below
// this many months the ratio carries no signal, so no advice is given.
export const RITME_MIN_MAANDEN = 4;

export function ritmeAnalyse(
  transactions: Tx[],
  overrides: Overrides,
  settings: Settings,
  investIbans: Set<string>,
  jaar: number,
): RitmePost[] {
  const groepen = new Map<string, { soort: "categorie" | "jaarpost"; maanden: Set<string>; totaal: number }>();
  const alleMaanden = new Set<string>();

  for (const t of transactions) {
    if (parseInt(t.date.slice(0, 4), 10) !== jaar) continue;
    const e = effective(t, overrides, settings, investIbans);
    if (e.cls === "exclude") continue;
    const maand = t.date.slice(0, 7);
    alleMaanden.add(maand);
    if (e.cls !== "recurring" && e.cls !== "yearly") continue;
    // Only outgoing money says something about spending cadence.
    if (t.amount >= 0) continue;

    const soort = e.cls === "yearly" ? ("jaarpost" as const) : ("categorie" as const);
    const naam = e.cls === "yearly" ? e.project || "Onbekende jaarpost" : e.bankCat;
    const key = soort + "|" + naam;
    const g = groepen.get(key) ?? { soort, maanden: new Set<string>(), totaal: 0 };
    g.maanden.add(maand);
    g.totaal += -t.amount;
    groepen.set(key, g);
  }

  const maandenTotaal = alleMaanden.size;
  if (maandenTotaal === 0) return [];

  return [...groepen.entries()]
    .map(([key, g]) => {
      const naam = key.slice(key.indexOf("|") + 1);
      const ratio = g.maanden.size / maandenTotaal;
      let advies: RitmeAdvies = "past";
      if (g.totaal >= RITME_MIN_BEDRAG && maandenTotaal >= RITME_MIN_MAANDEN) {
        if (g.soort === "categorie" && ratio <= RITME_LUMPY) advies = "naar-jaarpost";
        else if (g.soort === "jaarpost" && ratio >= RITME_STEADY) advies = "naar-maandbudget";
      }
      return {
        naam,
        soort: g.soort,
        maandenMetUitgave: g.maanden.size,
        maandenTotaal,
        maanden: [...g.maanden].sort(),
        totaal: g.totaal,
        perActieveMaand: g.totaal / g.maanden.size,
        advies,
      };
    })
    .sort((a, b) => {
      // Advice first, then biggest amounts — the ones worth acting on float up.
      const rang = (p: RitmePost) => (p.advies === "past" ? 1 : 0);
      return rang(a) - rang(b) || b.totaal - a.totaal;
    });
}
