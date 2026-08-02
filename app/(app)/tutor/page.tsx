import type { Metadata } from "next";
import { requireAllowedPerson } from "@/lib/auth/person";
import { TutorApp } from "@/components/tutor/TutorApp";

export const metadata: Metadata = {
  // No grade label: the original's tab title was "The Math Table — Grades 4–6", the one
  // place the no-grade-labels rule was being broken.
  title: "The Math Tutor",
};

interface Props {
  searchParams: Promise<{ topic?: string; level?: string; mode?: string }>;
}

/**
 * The tutor: one page, every topic, chosen from a dropdown — the same shape as the
 * original single-file app, rebuilt in TypeScript.
 *
 * Query params make it deep-linkable, which is what the games' "See this in the tutor"
 * buttons use: /tutor?topic=factors&level=3.
 */
export default async function TutorPage({ searchParams }: Props) {
  await requireAllowedPerson();
  const { topic, level, mode } = await searchParams;

  return (
    <TutorApp
      initialTopicId={topic}
      initialLevel={Number(level) || undefined}
      initialMode={mode}
    />
  );
}
