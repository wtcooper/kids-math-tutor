/**
 * The Bakery — arithmetic that decides the outcome rather than arithmetic that gets marked.
 *
 * Plan 02 flags this as the option most at risk of becoming "a word problem wearing a
 * costume". The defence is that **nothing here is checked**. There is no answer box and
 * no right or wrong: you buy flour, bake, set a price, and the till says what happened.
 * Picking the worse unit rate is not marked incorrect — it just leaves you with less
 * money, which you can see.
 *
 * Money is whole cents and flour is whole cups, integers throughout. Money in floats is
 * how a till ends up reading $4.6000000000001.
 *
 * Units are US kitchen units — pounds on the sack, cups in the recipe — because that is
 * what she cooks and shops in. A toggle restates everything in grams and kilos; the sums
 * are identical either way, which is the point of showing it.
 */

/** A clean kitchen approximation, and the one the conversion panel states outright. */
export const CUPS_PER_POUND = 4;
/** For the metric view only. A cup of flour is about 120 g. */
export const GRAMS_PER_CUP = 120;

export interface Offer {
  /** Sack size in pounds. */
  pounds: number;
  cents: number;
}

export function cupsIn(offer: Offer): number {
  return offer.pounds * CUPS_PER_POUND;
}

/** Cents per pound — the number that decides which sack is actually cheaper. */
export function unitRate(offer: Offer): number {
  return Math.round(offer.cents / offer.pounds);
}

export function bestOffer(offers: Offer[]): Offer {
  return offers.reduce((a, b) => (unitRate(a) <= unitRate(b) ? a : b));
}

export interface Day {
  offers: Offer[];
  /** Recipe, in cups. */
  cupsPerTray: number;
  bunsPerTray: number;
  /**
   * Everything that is not flour — butter, sugar, the oven — per tray, in cents.
   *
   * Without it the sums were correct and absurd: flour alone makes a roll cost about four
   * cents, and a game about money quoting four-cent rolls reads as play money. The whole
   * justification for this one is "when will I ever use this".
   */
  otherPerTray: number;
  /** Rolls wanted at cost price; demand falls as the price rises. */
  baseDemand: number;
  /** Rolls fewer sold per cent of price. */
  slope: number;
  /** Profit in cents needed to call the day a good one. */
  target: number;
  markups: number[];
  clearanceOff: number;
}

export interface Choices {
  offerIndex: number;
  trays: number;
  markupIndex: number;
  clearance: boolean;
}

export interface DayResult {
  flourCost: number;
  otherCost: number;
  totalCost: number;
  cupsBought: number;
  cupsUsed: number;
  cupsWasted: number;
  bunsMade: number;
  costPerBun: number;
  price: number;
  demand: number;
  sold: number;
  leftover: number;
  salePrice: number;
  clearanceSold: number;
  revenue: number;
  profit: number;
  metTarget: boolean;
  /** True when the trays chosen need more flour than was bought. */
  overBaked: boolean;
}

export function demandAt(day: Day, price: number): number {
  return Math.max(0, day.baseDemand - Math.round(day.slope * price));
}

export function maxTrays(day: Day, offer: Offer): number {
  return Math.floor(cupsIn(offer) / day.cupsPerTray);
}

export function simulate(day: Day, choices: Choices): DayResult {
  const offer = day.offers[choices.offerIndex];
  const cupsBought = cupsIn(offer);
  const cupsUsed = choices.trays * day.cupsPerTray;
  const overBaked = cupsUsed > cupsBought;
  const bunsMade = choices.trays * day.bunsPerTray;

  const flourCost = offer.cents;
  const otherCost = choices.trays * day.otherPerTray;
  const totalCost = flourCost + otherCost;
  // Cost per roll rounded up: you cannot recover half a cent.
  const costPerBun = bunsMade > 0 ? Math.ceil(totalCost / bunsMade) : 0;
  const markup = day.markups[choices.markupIndex];
  const price = Math.max(1, Math.round(costPerBun * (1 + markup / 100)));

  const demand = demandAt(day, price);
  const sold = overBaked ? 0 : Math.min(bunsMade, demand);
  const leftover = overBaked ? 0 : bunsMade - sold;

  const salePrice = Math.max(1, Math.round((price * (100 - day.clearanceOff)) / 100));
  const clearanceDemand = choices.clearance ? demandAt(day, salePrice) - sold : 0;
  const clearanceSold = choices.clearance
    ? Math.max(0, Math.min(leftover, clearanceDemand))
    : 0;

  const revenue = sold * price + clearanceSold * salePrice;
  const profit = revenue - totalCost;

  return {
    flourCost,
    otherCost,
    totalCost,
    cupsBought,
    cupsUsed,
    cupsWasted: Math.max(0, cupsBought - cupsUsed),
    bunsMade,
    costPerBun,
    price,
    demand,
    sold,
    leftover: leftover - clearanceSold,
    salePrice,
    clearanceSold,
    revenue,
    profit,
    metTarget: !overBaked && profit >= day.target,
    overBaked,
  };
}

/** The best profit available on this day, by trying every combination. */
export function bestProfit(day: Day): number {
  let best = -Infinity;
  for (let o = 0; o < day.offers.length; o++) {
    const cap = maxTrays(day, day.offers[o]);
    for (let t = 1; t <= cap; t++) {
      for (let m = 0; m < day.markups.length; m++) {
        for (const c of [false, true]) {
          const r = simulate(day, { offerIndex: o, trays: t, markupIndex: m, clearance: c });
          if (!r.overBaked && r.profit > best) best = r.profit;
        }
      }
    }
  }
  return best;
}

/** Cents as dollars. Never formats a float — that is where the stray fractions come from. */
export function money(cents: number): string {
  const sign = cents < 0 ? "−" : "";
  const abs = Math.abs(cents);
  return `${sign}$${Math.floor(abs / 100)}.${String(abs % 100).padStart(2, "0")}`;
}

export type Units = "us" | "metric";

/** A flour amount in cups, said in whichever units are switched on. */
export function flourText(cups: number, units: Units): string {
  if (units === "us") {
    return `${cups} cup${cups === 1 ? "" : "s"}`;
  }
  return `${cups * GRAMS_PER_CUP} g`;
}

/** A sack, said in whichever units are switched on. */
export function sackText(offer: Offer, units: Units): string {
  if (units === "us") return `${offer.pounds} lb`;
  const grams = offer.pounds * CUPS_PER_POUND * GRAMS_PER_CUP;
  return grams >= 1000 ? `${(grams / 1000).toFixed(1)} kg` : `${grams} g`;
}

/** The per-unit price, said in whichever units are switched on. */
export function rateText(offer: Offer, units: Units): string {
  if (units === "us") return `${money(unitRate(offer))} per lb`;
  const kilos = (offer.pounds * CUPS_PER_POUND * GRAMS_PER_CUP) / 1000;
  return `${money(Math.round(offer.cents / kilos))} per kg`;
}

export function genDay(level: number, rnd: (a: number, b: number) => number): Day {
  const cupsPerTray = rnd(2, 4);
  const bunsPerTray = [8, 10, 12][rnd(0, 2)];

  // Sacks with genuinely different unit rates — the bigger one is usually but not always
  // the better buy, so she has to work it out rather than learn a habit.
  const smallPounds = rnd(2, 3);
  // Cents per pound, in the range flour actually costs.
  const smallRate = rnd(70, 110);
  const bigPounds = smallPounds + rnd(2, 5);
  const bigRateBetter = rnd(1, 10) > 3;
  const bigRate = bigRateBetter ? smallRate - rnd(10, 28) : smallRate + rnd(8, 20);

  const offers: Offer[] = [
    { pounds: smallPounds, cents: smallPounds * smallRate },
    { pounds: bigPounds, cents: bigPounds * bigRate },
  ];
  if (level >= 3) {
    const midPounds = smallPounds + 1;
    const midRate = Math.min(smallRate, bigRate) + rnd(4, 14);
    offers.push({ pounds: midPounds, cents: midPounds * midRate });
  }

  const markups = level <= 1 ? [50, 100] : level <= 2 ? [40, 80, 120] : [30, 60, 90, 120];

  const day: Day = {
    offers,
    cupsPerTray,
    bunsPerTray,
    otherPerTray: 20 * rnd(11, 20),
    baseDemand: rnd(60, 110),
    slope: level <= 2 ? 0.5 : 0.8,
    target: 0,
    markups,
    clearanceOff: [20, 25, 30][rnd(0, 2)],
  };

  // Set the target from what is actually achievable, so it is always reachable and always
  // demands a decent choice. A fixed number would sometimes be impossible.
  const best = bestProfit(day);
  const share = level <= 1 ? 0.55 : level <= 2 ? 0.65 : level <= 3 ? 0.72 : 0.8;
  day.target = Math.max(1, Math.round((best * share) / 10) * 10);
  return day;
}
