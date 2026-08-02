import type { Metadata } from "next";
import Link from "next/link";
import { requireAllowedPerson } from "@/lib/auth/person";
import { GROUPS, TOPICS, topicsInGroup, tutorHref } from "@/lib/topics";
import { GAMES } from "@/lib/games";
import styles from "./page.module.css";

export const metadata: Metadata = {
  title: "The Math Table",
};

const LEVEL_PILLS = 3;

export default async function LandingPage() {
  // Enforced here, at the page, rather than only in a layout: a layout's children can
  // begin rendering before its redirect lands, which puts content into the RSC payload.
  const person = await requireAllowedPerson();

  const levelCount = TOPICS.reduce((n, t) => n + t.levels.length, 0);

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
            Pick a topic to work through, or open the whole table and roam.
          </p>
        </div>
        <a className="btn ghost sm" href="/sign-out">
          Sign out
        </a>
      </header>

      <a className={`card ${styles.hero}`} href="/tutor">
        <div className={styles.heroBody}>
          <h2 className={styles.heroTitle}>The Math Tutor</h2>
          <p className={styles.heroText}>
            Every topic and every level in one place, with pictures, worked examples,
            guided practice and printable worksheets. Start here if you are not sure
            what to work on.
          </p>
          <div className={styles.heroStats}>
            <span className={styles.pill}>{TOPICS.length} topics</span>
            <span className={styles.pill}>{levelCount} levels</span>
            <span className={styles.pill}>4 ways to learn each one</span>
          </div>
        </div>
        <span className="btn primary">Open</span>
      </a>

      {GROUPS.map((group) => {
        const topics = topicsInGroup(group);
        return (
          <section key={group} className={styles.group}>
            <div className={styles.groupHead}>
              <h2 className={styles.groupName}>{group}</h2>
              <span className={styles.groupCount}>
                {topics.length} {topics.length === 1 ? "topic" : "topics"}
              </span>
            </div>

            <div className={styles.grid}>
              {topics.map((topic) => {
                const game = GAMES[topic.id];
                const shown = topic.levels.slice(0, LEVEL_PILLS);
                const rest = topic.levels.length - shown.length;

                return (
                  <Link
                    key={topic.id}
                    href={tutorHref(topic.id)}
                    className={`card ${styles.topicCard}`}
                  >
                    <div className={styles.topicHead}>
                      <h3 className={styles.topicName}>{topic.name}</h3>
                      {game ? <span className={styles.playBadge}>Play</span> : null}
                    </div>
                    <p className={styles.topicTagline}>{topic.tagline}</p>
                    <div className={styles.levels}>
                      {/*
                        Level *names*, never a bare number. "Sevens, eights & nines — the
                        hard ones" describes what she'd practise; "Level 3" invites a
                        comparison, which the whole design avoids.
                      */}
                      {shown.map((lvl) => (
                        <span key={lvl} className={styles.pill}>
                          {lvl}
                        </span>
                      ))}
                      {rest > 0 ? (
                        <span className={`${styles.pill} ${styles.more}`}>
                          +{rest} more
                        </span>
                      ) : null}
                    </div>
                  </Link>
                );
              })}
            </div>
          </section>
        );
      })}

      <footer className={styles.footer}>
        <span>Made for Clementine and Jasper.</span>
      </footer>
    </main>
  );
}
