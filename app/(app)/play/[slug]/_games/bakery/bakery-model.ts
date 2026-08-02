/**
 * The Bakery — arithmetic that decides the outcome rather than arithmetic that gets marked.
 *
 * Plan 02 flags this as the option most at risk of becoming "a word problem wearing a
 * costume". The defence is that **nothing here is checked**. There is no answer box and
 * no right or wrong: you buy flour, bake, set a price, and the till says what happened.
 * Picking the worse unit rate is not marked incorrect — it just leaves you with less
 * money, which you can see.
 *
 * Everything is in pence and grams, integers throughout. Money in floats is how you end
 * up with a till reading £4.6000000000001.
 */

export interface Offer {
  /** Sack size in grams. */
  grams: number;
  pence: number;
}

/** Pence per kilo — the number that decides which sack is actually cheaper. */
export function unitRate(offer: Offer): number {
  return Math.round((offer.pence * 1000) / offer.grams);
}

export function bestOffer(offers: Offer[]): Offer {
  return offers.reduce((a, b) => (unitRate(a) <= unitRate(b) ? a : b));
}

export interface Day {
  offers: Offer[];
  gramsPerTray: number;
  bunsPerTray: number;
  /**
   * Everything that is not flour — butter, sugar, the oven — per tray.
   *
   * Without it the sums were technically correct and absurd: flour alone makes a bun cost
   * about fourpence, and a game about money that quotes fourpenny buns reads as play
   * money. The whole justification for this one is "when will I ever use this".
   */
  otherPerTray: number;
  /** Buns wanted at cost price; demand falls as the price rises. */
  baseDemand: number;
  /** Buns fewer sold per penny of price. */
  slope: number;
  /** Profit in pence needed to call the day a good one. */
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
  gramsBought: number;
  gramsUsed: number;
  gramsWasted: number;
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
  return Math.floor(offer.grams / day.gramsPerTray);
}

export function simulate(day: Day, choices: Choices): DayResult {
  const offer = day.offers[choices.offerIndex];
  const gramsUsed = choices.trays * day.gramsPerTray;
  const overBaked = gramsUsed > offer.grams;
  const bunsMade = choices.trays * day.bunsPerTray;

  const flourCost = offer.pence;
  const otherCost = choices.trays * day.otherPerTray;
  const totalCost = flourCost + otherCost;
  // Cost per bun rounded up: you cannot recover half a penny.
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
    gramsBought: offer.grams,
    gramsUsed,
    gramsWasted: Math.max(0, offer.grams - gramsUsed),
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

export function pence(p: number): string {
  const sign = p < 0 ? "−" : "";
  const abs = Math.abs(p);
  return `${sign}£${Math.floor(abs / 100)}.${String(abs % 100).padStart(2, "0")}`;
}

export function genDay(level: number, rnd: (a: number, b: number) => number): Day {
  const gramsPerTray = [200, 250, 300][rnd(0, 2)];
  const bunsPerTray = [8, 10, 12][rnd(0, 2)];

  // Sacks with genuinely different unit rates — the bigger one is usually but not always
  // the better buy, so she has to work it out rather than learn a habit.
  const smallGrams = 1000 * rnd(1, 2);
  // Pence per kilo, in the range real flour actually costs.
  const smallRate = rnd(110, 165);
  const bigGrams = smallGrams + 1000 * rnd(2, 4);
  const bigRateBetter = rnd(1, 10) > 3;
  const bigRate = bigRateBetter ? smallRate - rnd(15, 40) : smallRate + rnd(10, 30);

  const offers: Offer[] = [
    { grams: smallGrams, pence: Math.round((smallGrams * smallRate) / 1000) },
    { grams: bigGrams, pence: Math.round((bigGrams * bigRate) / 1000) },
  ];
  if (level >= 3) {
    const midGrams = smallGrams + 1000;
    const midRate = Math.min(smallRate, bigRate) + rnd(5, 18);
    offers.push({ grams: midGrams, pence: Math.round((midGrams * midRate) / 1000) });
  }

  const markups = level <= 1 ? [50, 100] : level <= 2 ? [40, 80, 120] : [30, 60, 90, 120];

  const day: Day = {
    offers,
    gramsPerTray,
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
