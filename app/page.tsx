import type { Metadata } from "next";
import Link from "next/link";
import { requireAllowedPerson } from "@/lib/auth/person";
import { BY_ID, GROUPS, TOPICS } from "@/lib/topics";
import { GAMES } from "@/lib/games";
import styles from "./page.module.css";

export const metadata: Metadata = {
  title: "The Math Table",
};

/** Short pitch per game — what the mechanic actually is, not what it drills. */
const BLURBS: Record<string, string> = {
  "facts-mul": "Numbers drift past in lanes. Draw a line between two that make the target.",
  "facts-div": "Same lanes, run backwards — link a number to what divides it.",
  factors: "Move around the grid and eat only the numbers that fit the rule.",
};

export default async function LandingPage() {
  // Enforced here, at the page, rather than only in a layout: a layout's children can
  // begin rendering before its redirect lands, which puts content into the RSC payload.
  const person = await requireAllowedPerson();

  const levelCount = TOPICS.reduce((n, t) => n + t.levels.length, 0);

  // Games grouped by the same domains the tutor uses, so the sections line up.
  const gameIds = Object.keys(GAMES);
  const sections = GROUPS.map((group) => ({
    group,
    ids: gameIds.filter((id) => BY_ID[id]?.group === group),
  })).filter((s) => s.ids.length > 0);

  return (
    <main className="wrap">
      <header className={styles.top}>
        <div>
          <span className={styles.mark}>
            <span className={styles.dot} />
            <span className={styles.markText}>The Math Table</span>
          </span>
          <h1 className={styles.title}>Hello, {person.displayName}</h1>
          <p className={styles.subtitle}>
            Work through a topic in the tutor, or play one of the games.
          </p>
        </div>
        <a className="btn ghost sm" href="/sign-out">
          Sign out
        </a>
      </header>

      <Link className={`card ${styles.hero}`} href="/tutor">
        <div className={styles.heroBody}>
          <h2 className={styles.heroTitle}>The Math Tutor</h2>
          <p className={styles.heroText}>
            Every topic and every level on one page. Pick a topic, pick a level, then see
            the picture, watch the steps, try it yourself, or just practise.
          </p>
          <div className={styles.heroStats}>
            <span className={styles.pill}>{TOPICS.length} topics</span>
            <span className={styles.pill}>{levelCount} levels</span>
            <span className={styles.pill}>4 ways to learn each one</span>
          </div>
        </div>
        <span className="btn primary">Open the tutor</span>
      </Link>

      <div className={styles.gamesHead}>
        <h2 className={styles.groupName}>Games</h2>
        <span className={styles.groupCount}>
          {gameIds.length} to play — more coming
        </span>
      </div>

      {sections.map(({ group, ids }) => (
        <section key={group} className={styles.group}>
          <h3 className={styles.domain}>{group}</h3>
          <div className={styles.grid}>
            {ids.map((id) => {
              const game = GAMES[id];
              const topic = BY_ID[id];
              return (
                <Link key={id} href={`/play/${id}`} className={`card ${styles.gameCard}`}>
                  <div className={styles.gameHead}>
                    <h4 className={styles.gameName}>{game.cardName}</h4>
                    <span className={styles.playBadge}>Play</span>
                  </div>
                  <p className={styles.gameBlurb}>{BLURBS[id] ?? topic.tagline}</p>
                  <span className={styles.gameTopic}>{topic.name}</span>
                </Link>
              );
            })}
          </div>
        </section>
      ))}

      <footer className={styles.footer}>
        <span>Made for Clementine and Jasper.</span>
      </footer>
    </main>
  );
}
