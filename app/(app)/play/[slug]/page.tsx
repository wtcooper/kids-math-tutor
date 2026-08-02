import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { requireAllowedPerson } from "@/lib/auth/person";
import { BY_ID } from "@/lib/topics";
import { GAME_BY_SLUG } from "@/lib/games";
import { pageTitle } from "@/lib/app";
import { GameHost } from "./GameHost";

interface Props {
  params: Promise<{ slug: string }>;
  searchParams: Promise<{ level?: string }>;
}

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { slug } = await params;
  const game = GAME_BY_SLUG[slug];
  return { title: game ? pageTitle(game.name) : pageTitle() };
}

export default async function PlayPage({ params, searchParams }: Props) {
  await requireAllowedPerson();

  const { slug } = await params;
  const game = GAME_BY_SLUG[slug];
  const topic = game ? BY_ID[game.topicId] : undefined;
  if (!game || !topic) notFound();

  // A game that sizes its own problems names its own levels; the rest reuse the tutor's,
  // so the same words appear in both places.
  const levels = game.levelNames ?? topic.levels;

  const { level } = await searchParams;
  const parsed = Number(level);
  const initialLevel =
    Number.isInteger(parsed) && parsed >= 1 && parsed <= levels.length ? parsed : 1;

  return (
    <GameHost
      impl={game.impl}
      slug={game.slug}
      name={game.name}
      concept={game.concept}
      variant={game.variant ?? ""}
      topicId={game.topicId}
      levels={levels}
      initialLevel={initialLevel}
      // The puzzle games generate their own boards; the seed keeps the server render and
      // the client hydration agreeing on the first one. Same fix as the tutor.
      seed={Math.floor(Math.random() * 2 ** 31)}
    />
  );
}
