"use client";

import { useCallback, useMemo, useState } from "react";
import Link from "next/link";
import { GameChrome } from "@/components/game/GameChrome";
import { useAttemptRecorder } from "@/components/game/useAttemptRecorder";
import type { HowTo } from "@/components/game/HowToPlay";
import { makeRng, mulberry32 } from "@/lib/math/rng";
import { tutorHref } from "@/lib/topics";
import type { GameProps } from "../../GameHost";
import {
  bestOffer,
  genDay,
  maxTrays,
  pence,
  simulate,
  unitRate,
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
    "The bigger sack is usually cheaper per kilo — but not always. Work it out.",
    "Charge more and you make more per bun, but fewer people buy.",
    "Flour you buy and do not bake with is money left in the sack.",
  ],
};

export default function Bakery({ slug, topicId, name, levels, initialLevel, seed }: GameProps) {
  const [level, setLevel] = useState(initialLevel);
  const [nonce, setNonce] = useState(0);
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

  if (key !== nonce) {
    setKey(nonce);
    setOfferIndex(0);
    setTrays(1);
    setMarkupIndex(0);
    setClearance(false);
    setSold(false);
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

  return (
    <GameChrome
      slug={slug}
      title={name}
      topicId={topicId}
      levels={levels}
      level={level}
      onLevel={changeLevel}
      instructions="Buy flour, bake, set your price. The till tells you how the day went."
      howTo={HOW_TO}
      status={
        <>
          <span className={styles.pip}>Today&rsquo;s target: {pence(day.target)} profit</span>
          <span className={styles.soft}>
            {day.gramsPerTray} g per tray · {day.bunsPerTray} buns per tray
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
                <span className={styles.offerSize}>{o.grams / 1000} kg</span>
                <span className={styles.offerPrice}>{pence(o.pence)}</span>
                <span className={styles.offerRate}>{pence(unitRate(o))} per kg</span>
              </button>
            ))}
          </div>
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
              {safeTrays} × {day.gramsPerTray} g = {result.gramsUsed} g used
              {result.gramsWasted > 0 ? ` · ${result.gramsWasted} g left in the sack` : ""}
            </span>
          </div>
          <p className={styles.made}>
            {safeTrays} × {day.bunsPerTray} = <strong>{result.bunsMade} buns</strong> ·{" "}
            {pence(result.totalCost)} spent, so {pence(result.costPerBun)} each to make
          </p>
        </section>

        <section className={styles.step}>
          <h3 className={styles.h3}>3 · Set the price</h3>
          <div className={styles.markups}>
            {day.markups.map((m, i) => {
              const preview = simulate(day, { offerIndex, trays: safeTrays, markupIndex: i, clearance });
              return (
                <button
                  key={m}
                  type="button"
                  className={`${styles.markup} ${markupIndex === i ? styles.on : ""}`}
                  onClick={() => setMarkupIndex(i)}
                  disabled={sold}
                >
                  <span className={styles.markupPct}>+{m}%</span>
                  <span className={styles.markupPrice}>{pence(preview.price)} each</span>
                </button>
              );
            })}
          </div>
          <p className={styles.calc}>
            {pence(result.costPerBun)} + {day.markups[markupIndex]}% ={" "}
            <strong>{pence(result.price)}</strong>
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
              Sell what is left at {day.clearanceOff}% off — {pence(result.salePrice)} each
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
                    <td className={styles.money}>−{pence(result.flourCost)}</td>
                  </tr>
                  <tr>
                    <td>
                      Butter, sugar, oven — {safeTrays} tray{safeTrays === 1 ? "" : "s"}
                    </td>
                    <td className={styles.money}>−{pence(result.otherCost)}</td>
                  </tr>
                  <tr>
                    <td>
                      Sold {result.sold} at {pence(result.price)}
                    </td>
                    <td className={styles.money}>{pence(result.sold * result.price)}</td>
                  </tr>
                  {result.clearanceSold > 0 ? (
                    <tr>
                      <td>
                        {result.clearanceSold} more at {pence(result.salePrice)}
                      </td>
                      <td className={styles.money}>
                        {pence(result.clearanceSold * result.salePrice)}
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
                      {pence(result.profit)}
                    </td>
                  </tr>
                </tbody>
              </table>

              <p className={styles.note}>
                {result.metTarget
                  ? `Target was ${pence(day.target)}.`
                  : `Target was ${pence(day.target)}. ` +
                    (unitRate(day.offers[offerIndex]) > unitRate(cheapest)
                      ? `The ${cheapest.grams / 1000} kg sack was ${pence(unitRate(day.offers[offerIndex]) - unitRate(cheapest))} cheaper per kilo.`
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
