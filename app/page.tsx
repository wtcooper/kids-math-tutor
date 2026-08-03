import type { Metadata } from "next";
import Link from "next/link";
import { requireAllowedPerson } from "@/lib/auth/person";
import { BY_ID, GROUPS, TOPICS, topicsInGroup } from "@/lib/topics";
import { GAMES } from "@/lib/games";
import { APP_NAME, APP_TAGLINE, GROUP_BLURBS, pageTitle } from "@/lib/app";
import styles from "./page.module.css";

export const metadata: Metadata = {
  title: pageTitle(),
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
    topicCount: topicsInGroup(group).length,
  })).filter((s) => s.games.length > 0);

  return (
    <>
      {/* A real app bar rather than a line of small caps, so opening this feels like
          arriving somewhere rather than loading a document. */}
      <header className={styles.bar}>
        <div className={styles.barInner}>
          <Link href="/" className={styles.brand}>
            <span className={styles.logo} aria-hidden>
              <svg viewBox="0 0 32 32" width="30" height="30">
                <rect x="1" y="1" width="30" height="30" rx="9" fill="#be6e4e" />
                <circle cx="10.5" cy="10.5" r="3.1" fill="#fdf3e7" />
                <rect x="18" y="7.4" width="6.2" height="6.2" rx="1.8" fill="#fdf3e7" />
                <path d="M8 21.5h7M11.5 18v7" stroke="#fdf3e7" strokeWidth="2.1" strokeLinecap="round" />
                <path d="M18.4 21.5h6.2" stroke="#fdf3e7" strokeWidth="2.1" strokeLinecap="round" />
                <path d="M18.4 24.6h6.2" stroke="#fdf3e7" strokeWidth="2.1" strokeLinecap="round" />
              </svg>
            </span>
            <span className={styles.brandText}>
              <span className={styles.brandName}>{APP_NAME}</span>
              <span className={styles.brandTag}>{APP_TAGLINE}</span>
            </span>
          </Link>
          <a className="btn ghost sm" href="/sign-out">
            Sign out
          </a>
        </div>
      </header>

      <main className="wrap">
        <div className={styles.welcome}>
          <h1 className={styles.title}>Hello, {person.displayName}</h1>
          <p className={styles.subtitle}>
            Two ways in. The tutor walks you through a topic step by step; the games let
            you push the same ideas around until they make sense.
          </p>
        </div>

        <Link className={`card ${styles.hero}`} href="/tutor">
          <div className={styles.heroBody}>
            <span className={styles.heroKicker}>Start here</span>
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
          <Link href="/beasts" className={styles.beastLink}>
            ✦ The Beast Book
          </Link>
        </div>
        <p className={styles.gamesIntro}>
          Each one is built so the maths <em>is</em> the game — take the maths out and
          there is nothing left to play. Nothing here is timed, and getting it wrong never
          costs you anything.
        </p>

        {sections.map(({ group, games, topicCount }) => (
          <section key={group} className={styles.group}>
            <div className={styles.domainHead}>
              <h3 className={styles.domain}>{group}</h3>
              <span className={styles.domainCount}>
                {topicCount} topic{topicCount === 1 ? "" : "s"} in the tutor
              </span>
            </div>
            <p className={styles.domainBlurb}>{GROUP_BLURBS[group]}</p>
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
                  <p className={styles.gameConcept}>
                    <span className={styles.conceptLabel}>The maths</span>
                    {game.concept}
                  </p>
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
    </>
  );
}
