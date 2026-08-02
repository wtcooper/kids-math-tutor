import type { Metadata } from "next";
import Link from "next/link";
import { requireAllowedPerson } from "@/lib/auth/person";
import { BY_ID, GROUPS, TOPICS } from "@/lib/topics";
import { GAMES } from "@/lib/games";
import styles from "./page.module.css";

export const metadata: Metadata = {
  title: "The Math Table",
};

export default async function LandingPage() {
  // Enforced here, at the page, rather than only in a layout: a layout's children can
  // begin rendering before its redirect lands, which puts content into the RSC payload.
  const person = await requireAllowedPerson();

  const levelCount = TOPICS.reduce((n, t) => n + t.levels.length, 0);

  // Games grouped by the same domains the tutor uses, so the sections line up. One card
  // per game, not per topic — Munchers and Split both teach factors and are not the same
  // thing to play.
  const sections = GROUPS.map((group) => ({
    group,
    games: GAMES.filter((g) => BY_ID[g.topicId]?.group === group),
  })).filter((s) => s.games.length > 0);

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
        <span className={styles.groupCount}>{GAMES.length} to play</span>
      </div>

      {sections.map(({ group, games }) => (
        <section key={group} className={styles.group}>
          <h3 className={styles.domain}>{group}</h3>
          <div className={styles.grid}>
            {games.map((game) => (
              <Link
                key={game.slug}
                href={`/play/${game.slug}`}
                className={`card ${styles.gameCard}`}
              >
                <div className={styles.gameHead}>
                  <h4 className={styles.gameName}>{game.name}</h4>
                  <span className={styles.playBadge}>Play</span>
                </div>
                <p className={styles.gameBlurb}>{game.blurb}</p>
                <span className={styles.gameFoot}>
                  <span className={styles.gameTopic}>{BY_ID[game.topicId].name}</span>
                  <span
                    className={`${styles.focus} ${game.focus === "fluency" ? styles.fluency : styles.understanding}`}
                  >
                    {game.focus === "fluency" ? "Get faster" : "See why"}
                  </span>
                </span>
              </Link>
            ))}
          </div>
        </section>
      ))}

      <footer className={styles.footer}>
        <span>Made for Clementine and Jasper.</span>
      </footer>
    </main>
  );
}
