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
function opResultForYear(year: number, settings: Settings): number {
  return OP_RESULT[year] !== undefined ? OP_RESULT[year] : grown(OP_RESULT[2031], year, settings);
}
function investmentForYear(year: number, settings: Settings): number {
  return INVESTMENTS[year] !== undefined ? INVESTMENTS[year] : grown(INVESTMENTS[2031], year, settings);
}
export function plannedIncidentalForYear(year: number, settings: Settings, projects: Project[]): number {
  let total = year > 2031 ? grown(PLANNED_INCIDENTAL_TAIL, year, settings) : 0;
  for (const p of projects) if ((p.year || PROJECTION_START_YEAR) === year) total += p.budget || 0;
  return total;
}

export function projectSeries(agg: Agg, settings: Settings, projects: Project[], yearly: Yearly[]) {
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

  const yearlyBudgetTotal = yearly.reduce((s, y) => s + (y.budget || 0), 0);

  const start = PLAN_START_NET_WORTH + offset;
  const plan = [start];
  const actual = [start];
  const total = [start];
  let planNw = PLAN_START_NET_WORTH;
  let cumDelta = 0;
  let cumInvest = 0;
  for (let i = 0; i < settings.horizon; i++) {
    const year = PROJECTION_START_YEAR + i;
    planNw =
      planNw * (1 + r) +
      opResultForYear(year, settings) -
      investmentForYear(year, settings) -
      plannedIncidentalForYear(year, settings, projects);
    cumInvest += investmentForYear(year, settings);

    const deviation = agg.deviationByYear[year] || 0;
    const monthsLoaded = (agg.monthsByYear[year] && agg.monthsByYear[year].size) || 0;
    const yearlyDeviation = monthsLoaded
      ? yearlyBudgetTotal * (monthsLoaded / 12) - (agg.yearlyByYear[year] || 0)
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
