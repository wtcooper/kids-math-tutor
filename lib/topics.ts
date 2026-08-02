import { GENERATED_TOPICS, GENERATED_GROUPS } from "./topics.generated";

export type Engine = "grid" | "steps" | "facts";

export interface Topic {
  /** URL-safe slug, identical to the id the original tutor uses. */
  id: string;
  /** Display name. The original calls this field `label`. */
  name: string;
  group: string;
  engine: Engine;
  tagline: string;
  levels: readonly string[];
}

export const TOPICS: readonly Topic[] = GENERATED_TOPICS;

/** Group order is first-appearance order, matching the tutor's own dropdown. */
export const GROUPS: readonly string[] = GENERATED_GROUPS;

export const BY_ID: Readonly<Record<string, Topic>> = Object.fromEntries(
  TOPICS.map((t) => [t.id, t]),
);

export function topicsInGroup(group: string): Topic[] {
  return TOPICS.filter((t) => t.group === group);
}

export function tutorHref(
  id: string,
  opts: { level?: number; mode?: string } = {},
): string {
  const q = new URLSearchParams();
  if (opts.level) q.set("level", String(opts.level));
  if (opts.mode) q.set("mode", opts.mode);
  const s = q.toString();
  return `/tutor/${id}${s ? `?${s}` : ""}`;
}
