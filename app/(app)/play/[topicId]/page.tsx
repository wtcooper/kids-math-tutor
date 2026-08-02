import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { requireAllowedPerson } from "@/lib/auth/person";
import { BY_ID } from "@/lib/topics";
import { GAMES } from "@/lib/games";
import { GameHost } from "./GameHost";

interface Props {
  params: Promise<{ topicId: string }>;
  searchParams: Promise<{ level?: string }>;
}

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { topicId } = await params;
  const game = GAMES[topicId];
  return { title: game ? `${game.name} — The Math Table` : "The Math Table" };
}

export default async function PlayPage({ params, searchParams }: Props) {
  await requireAllowedPerson();

  const { topicId } = await params;
  const topic = BY_ID[topicId];
  const game = GAMES[topicId];
  if (!topic || !game) notFound();

  const { level } = await searchParams;
  const parsed = Number(level);
  const initialLevel =
    Number.isInteger(parsed) && parsed >= 1 && parsed <= topic.levels.length ? parsed : 1;

  return (
    <GameHost
      gameId={game.id}
      variant={game.variant ?? ""}
      topicId={topicId}
      levels={topic.levels}
      initialLevel={initialLevel}
    />
  );
}
