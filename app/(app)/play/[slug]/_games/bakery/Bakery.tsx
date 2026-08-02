"use client";

import { useCallback, useMemo, useState } from "react";
import Link from "next/link";
import { GameChrome } from "@/components/game/GameChrome";
import { useAttemptRecorder } from "@/components/game/useAttemptRecorder";
import type { HowTo } from "@/components/game/HowToPlay";
import type { Workings } from "@/components/game/Workings";
import { makeRng, mulberry32 } from "@/lib/math/rng";
import { tutorHref } from "@/lib/topics";
import type { GameProps } from "../../GameHost";
import {
  bestOffer,
  CUPS_PER_POUND,
  flourText,
  genDay,
  GRAMS_PER_CUP,
  maxTrays,
  money,
  rateText,
  sackText,
  simulate,
  unitRate,
  type Units,
} from "./bakery-model";
import styles from "./Bakery.module.css";

const HOW_TO: HowTo = {
  goal: "Finish the day with at least the profit on the order board.",
  controls: [
    "Pick a sack of flour, choose how many trays to bake, then set your markup.",
    "Optionally clear whatever is left at the end of the day at a discount.",
  ],
  rules: [
    "Nothing here is marked right or wrong. The till just tells you what happened.",
    "The price per pound is not printed. Divide the price by the pounds to find it.",
    "The bigger sack is usually cheaper per pound — but not always. Work it out.",
    "Charge more and you make more per roll, but fewer people buy.",
    "Flour you buy and do not bake with is money left in the sack.",
    "The cups/grams switch restates everything in metric. The sums come out the same.",
  ],
};

export default function Bakery({ slug, topicId, name, concept, levels, initialLevel, seed }: GameProps) {
  const [level, setLevel] = useState(initialLevel);
  const [nonce, setNonce] = useState(0);
  const [units, setUnits] = useState<Units>("us");
  const recorder = useAttemptRecorder({ gameSlug: slug, level });

  const day = useMemo(() => {
    const rng = makeRng(mulberry32(seed + nonce * 7919 + level * 1741));
    return genDay(level, (a, b) => rng.int(a, b));
  }, [level, nonce, seed]);

  const [offerIndex, setOfferIndex] = useState(0);
  const [trays, setTrays] = useState(1);
  const [markupIndex, setMarkupIndex] = useState(0);
  const [clearance, setClearance] = useState(false);
  const [sold, setSold] = useState(false);
  const [key, setKey] = useState(0);
  /** Her worked-out price per pound for each sack, keyed by index. */
  const [rateGuess, setRateGuess] = useState<Record<number, string>>({});

  if (key !== nonce) {
    setKey(nonce);
    setOfferIndex(0);
    setTrays(1);
    setMarkupIndex(0);
    setClearance(false);
    setSold(false);
    setRateGuess({});
  }

  const cap = maxTrays(day, day.offers[offerIndex]);
  const safeTrays = Math.min(trays, cap);
  const result = simulate(day, { offerIndex, trays: safeTrays, markupIndex, clearance });

  const openShop = useCallback(() => {
    setSold(true);
    recorder.record({
      type: "attempt",
      prompt: { target: day.target, offers: day.offers.map(unitRate) },
      response: {
        offer: offerIndex,
        trays: safeTrays,
        markup: day.markups[markupIndex],
        clearance,
        profit: result.profit,
        ok: result.metTarget,
      },
      elapsedMs: 0,
    });
    void recorder.flush();
  }, [day, offerIndex, safeTrays, markupIndex, clearance, result, recorder]);

  const nextDay = useCallback(() => setNonce((n) => n + 1), []);
  const changeLevel = useCallback((next: number) => {
    setLevel(next);
    setNonce((n) => n + 1);
  }, []);

  const cheapest = bestOffer(day.offers);
  const chosen = day.offers[offerIndex];

  const workings: Workings = useMemo(() => {
    if (sold) return { now: "The day is done — see how the till came out." };
    const solvedRates = day.offers.filter(
      (o, i) => (rateGuess[i] ?? "") !== "" && Number(rateGuess[i]) === unitRate(o),
    ).length;

    if (solvedRates < day.offers.length) {
      return {
        now: `Which sack is the better buy? Divide each price by how many pounds it holds.`,
        listTitle: "Price per pound",
        lines: day.offers.map((o, i) => ({
          text:
            (rateGuess[i] ?? "") !== "" && Number(rateGuess[i]) === unitRate(o)
              ? `${o.cents}¢ ÷ ${o.pounds} lb = ${unitRate(o)}¢`
              : `${o.cents}¢ ÷ ${o.pounds} lb = ?`,
          state:
            (rateGuess[i] ?? "") !== "" && Number(rateGuess[i]) === unitRate(o)
              ? ("done" as const)
              : ("current" as const),
        })),
        hint: "A unit rate is just the total shared out one pound at a time — divide the price by the pounds. The bigger sack is usually cheaper per pound, but not always.",
      };
    }

    return {
      now: `${safeTrays} tray${safeTrays === 1 ? "" : "s"} costs ${money(result.totalCost)} and makes ${result.bunsMade} rolls. Adding ${day.markups[markupIndex]}% on top gives ${money(result.price)} each.`,
      listTitle: "Where the price comes from",
      lines: [
        { text: `flour ${money(result.flourCost)} + everything else ${money(result.otherCost)}`, state: "done" },
        { text: `${money(result.totalCost)} ÷ ${result.bunsMade} rolls = ${money(result.costPerBun)} each`, state: "done" },
        {
          text: `${money(result.costPerBun)} + ${day.markups[markupIndex]}% = ${money(result.price)}`,
          state: "current",
        },
      ],
      hint: `To add ${day.markups[markupIndex]}%, work out ${day.markups[markupIndex]}% of the cost and add it on. A higher price earns more per roll but sells fewer — the target needs both.`,
    };
  }, [sold, day, rateGuess, safeTrays, result, markupIndex]);

  return (
    <GameChrome
      slug={slug}
      concept={concept}
      title={name}
      topicId={topicId}
      levels={levels}
      level={level}
      onLevel={changeLevel}
      instructions="Buy flour, bake, set your price. The till tells you how the day went."
      howTo={HOW_TO}
      workings={workings}
      workingsKey={`${level}-${nonce}`}
      status={
        <>
          <span className={styles.pip}>Today&rsquo;s target: {money(day.target)} profit</span>
          <span className={styles.soft}>
            {flourText(day.cupsPerTray, units)} per tray · {day.bunsPerTray} rolls per tray
          </span>
          <span className={styles.toggle}>
            <button
              type="button"
              className={units === "us" ? styles.unitOn : styles.unitOff}
              onClick={() => setUnits("us")}
            >
              cups &amp; lb
            </button>
            <button
              type="button"
              className={units === "metric" ? styles.unitOn : styles.unitOff}
              onClick={() => setUnits("metric")}
            >
              grams
            </button>
          </span>
        </>
      }
    >
      <div className={styles.stage}>
        <section className={styles.step}>
          <h3 className={styles.h3}>1 · Buy flour</h3>
          <div className={styles.offers}>
            {day.offers.map((o, i) => (
              <button
                key={i}
                type="button"
                className={`${styles.offer} ${offerIndex === i ? styles.on : ""}`}
                onClick={() => {
                  setOfferIndex(i);
                  setTrays(1);
                }}
                disabled={sold}
              >
                <span className={styles.offerSize}>{sackText(o, units)}</span>
                <span className={styles.offerPrice}>{money(o.cents)}</span>
              </button>
            ))}
          </div>
          {/*
            The price per pound is NOT printed any more. It was, and it handed over the
            one calculation this step exists for — the whole level was decided before she
            did anything. Now she works it out, and the box checks itself for free.
          */}
          <div className={styles.rateRow}>
            <span className={styles.rateLabel}>
              Which is cheaper {units === "us" ? "per pound" : "per kilo"}? Work it out:
            </span>
            {day.offers.map((o, i) => {
              const typed = rateGuess[i] ?? "";
              const right = typed !== "" && Number(typed) === unitRate(o);
              return (
                <label key={i} className={styles.rateGuess}>
                  <span className={styles.rateFor}>{sackText(o, units)}</span>
                  <input
                    className={`${styles.rateInput} ${right ? styles.rateOk : ""}`}
                    inputMode="numeric"
                    value={typed}
                    placeholder="¢"
                    disabled={sold}
                    aria-label={`Cents per pound for the ${o.pounds} pound sack`}
                    onChange={(e) =>
                      setRateGuess((prev) => ({
                        ...prev,
                        [i]: e.target.value.replace(/[^\d]/g, "").slice(0, 4),
                      }))
                    }
                  />
                  {right ? <span className={styles.rateTick}>{money(unitRate(o))}/lb</span> : null}
                </label>
              );
            })}
          </div>
          <p className={styles.conv}>
            {units === "us"
              ? `1 lb of flour is about ${CUPS_PER_POUND} cups.`
              : `1 cup of flour is about ${GRAMS_PER_CUP} g — that is the only conversion here.`}
          </p>
        </section>

        <section className={styles.step}>
          <h3 className={styles.h3}>2 · Bake</h3>
          <div className={styles.row}>
            <button
              type="button"
              className={styles.step10}
              onClick={() => setTrays((t) => Math.max(1, t - 1))}
              disabled={sold || safeTrays <= 1}
            >
              −
            </button>
            <span className={styles.trays}>{safeTrays}</span>
            <span className={styles.unit}>tray{safeTrays === 1 ? "" : "s"}</span>
            <button
              type="button"
              className={styles.step10}
              onClick={() => setTrays((t) => Math.min(cap, t + 1))}
              disabled={sold || safeTrays >= cap}
            >
              +
            </button>
            <span className={styles.calc}>
              {safeTrays} × {flourText(day.cupsPerTray, units)} = {flourText(result.cupsUsed, units)}{" "}
              used
              {result.cupsWasted > 0
                ? ` · ${flourText(result.cupsWasted, units)} left in the sack`
                : ""}
            </span>
          </div>
          <p className={styles.made}>
            {safeTrays} × {day.bunsPerTray} = <strong>{result.bunsMade} rolls</strong> ·{" "}
            {money(result.totalCost)} spent, so {money(result.costPerBun)} each to make
          </p>
        </section>

        <section className={styles.step}>
          <h3 className={styles.h3}>3 · Set the price</h3>
          <div className={styles.markups}>
            {day.markups.map((m, i) => {
              const preview = simulate(day, {
                offerIndex,
                trays: safeTrays,
                markupIndex: i,
                clearance,
              });
              return (
                <button
                  key={m}
                  type="button"
                  className={`${styles.markup} ${markupIndex === i ? styles.on : ""}`}
                  onClick={() => setMarkupIndex(i)}
                  disabled={sold}
                >
                  <span className={styles.markupPct}>+{m}%</span>
                  <span className={styles.markupPrice}>
                    {markupIndex === i ? `${money(preview.price)} each` : "?"}
                  </span>
                </button>
              );
            })}
          </div>
          <p className={styles.calc}>
            {money(result.costPerBun)} + {day.markups[markupIndex]}% ={" "}
            <strong>{money(result.price)}</strong>
          </p>
        </section>

        <section className={styles.step}>
          <h3 className={styles.h3}>4 · End of day</h3>
          <label className={styles.check}>
            <input
              type="checkbox"
              checked={clearance}
              onChange={(e) => setClearance(e.target.checked)}
              disabled={sold}
            />
            <span>
              Sell what is left at {day.clearanceOff}% off — {money(result.salePrice)} each
            </span>
          </label>
        </section>

        {!sold ? (
          <button type="button" className="btn primary" onClick={openShop}>
            Open the shop
          </button>
        ) : null}

        {sold ? (
          <div className={styles.overlay}>
            <div className={`card ${styles.panel}`}>
              <h2 className={styles.h2}>
                {result.metTarget ? "A good day." : "The till is light."}
              </h2>

              <table className={styles.till}>
                <tbody>
                  <tr>
                    <td>Flour</td>
                    <td className={styles.money}>−{money(result.flourCost)}</td>
                  </tr>
                  <tr>
                    <td>
                      Butter, sugar, oven — {safeTrays} tray{safeTrays === 1 ? "" : "s"}
                    </td>
                    <td className={styles.money}>−{money(result.otherCost)}</td>
                  </tr>
                  <tr>
                    <td>
                      Sold {result.sold} at {money(result.price)}
                    </td>
                    <td className={styles.money}>{money(result.sold * result.price)}</td>
                  </tr>
                  {result.clearanceSold > 0 ? (
                    <tr>
                      <td>
                        {result.clearanceSold} more at {money(result.salePrice)}
                      </td>
                      <td className={styles.money}>
                        {money(result.clearanceSold * result.salePrice)}
                      </td>
                    </tr>
                  ) : null}
                  {result.leftover > 0 ? (
                    <tr className={styles.dim}>
                      <td>{result.leftover} unsold</td>
                      <td className={styles.money}>—</td>
                    </tr>
                  ) : null}
                  <tr className={styles.total}>
                    <td>Profit</td>
                    <td className={result.metTarget ? styles.good : styles.bad}>
                      {money(result.profit)}
                    </td>
                  </tr>
                </tbody>
              </table>

              <p className={styles.note}>
                {result.metTarget
                  ? `Target was ${money(day.target)}.`
                  : `Target was ${money(day.target)}. ` +
                    (unitRate(day.offers[offerIndex]) > unitRate(cheapest)
                      ? `The ${cheapest.pounds} lb sack was ${money(unitRate(day.offers[offerIndex]) - unitRate(cheapest))} cheaper per pound.`
                      : result.leftover > 0
                        ? "You baked more than the shop could sell at that price."
                        : "Try a different markup — a higher price sells fewer.")}
              </p>

              <div className={styles.actions}>
                <button type="button" className="btn primary" onClick={nextDay}>
                  {result.metTarget ? "Next day" : "Try today again"}
                </button>
                <Link className="btn" href={tutorHref(topicId, { level })}>
                  See this in the tutor
                </Link>
              </div>
            </div>
          </div>
        ) : null}
      </div>
    </GameChrome>
  );
}
