import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { requireAllowedPerson } from "@/lib/auth/person";
import { BY_ID } from "@/lib/topics";
import { ABOUT } from "@/lib/topics.about";
import { GAMES } from "@/lib/games";
import { runtimeFor } from "@/lib/math/registry";
import { TutorShell } from "@/components/tutor/TutorShell";

interface Props {
  params: Promise<{ topicId: string }>;
  searchParams: Promise<{ level?: string; mode?: string }>;
}

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { topicId } = await params;
  const topic = BY_ID[topicId];
  // No grade label in the tab title — the original's was "The Math Table — Grades 4-6",
  // the one place the no-grade-labels rule was being broken.
  return { title: topic ? `${topic.name} — The Math Table` : "The Math Table" };
}

const MODES = ["learn", "drill", "picture", "watch", "try", "practice"] as const;
type Mode = (typeof MODES)[number];

export default async function TutorTopicPage({ params, searchParams }: Props) {
  await requireAllowedPerson();

  const { topicId } = await params;
  const topic = BY_ID[topicId];
  if (!topic) notFound();

  const { level, mode } = await searchParams;

  const parsedLevel = Number(level);
  const safeLevel =
    Number.isInteger(parsedLevel) && parsedLevel >= 1 && parsedLevel <= topic.levels.length
      ? parsedLevel
      : 1;

  const isFacts = topic.engine === "facts";
  const requested = MODES.includes(mode as Mode) ? (mode as Mode) : undefined;

  // A mode that does not exist for this engine falls back rather than rendering nothing.
  // Flashcards only ever have Learn/Drill; the step modes need a ported build().
  const hasSteps = Boolean(runtimeFor(topicId)?.build);
  const stepModes: Mode[] = ["picture", "watch", "try"];
  const safeMode: Mode = isFacts
    ? requested === "drill"
      ? "drill"
      : "learn"
    : hasSteps && requested && stepModes.includes(requested)
      ? requested
      : "practice";

  const game = GAMES[topicId];

  return (
    <TutorShell
      topic={topic}
      blurb={ABOUT[topicId]}
      level={safeLevel}
      mode={safeMode}
      playHref={game ? `/play/${topicId}?level=${safeLevel}` : undefined}
    />
  );
}
