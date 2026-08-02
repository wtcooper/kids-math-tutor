/**
 * What the app calls itself, in one place.
 *
 * It was "The Math Table" — accurate, and it read like a filing cabinet. This is a thing
 * two kids open on purpose, so it is named like one. Change these two strings and the
 * name changes everywhere: tab titles, the header, the sign-in page.
 */
export const APP_NAME = "Number Lab";

/** The one line under the name. Says what the place is, not what it is called. */
export const APP_TAGLINE = "Somewhere to work it out, and somewhere to play with it.";

/** Page title helper, so every tab reads the same way. */
export function pageTitle(page?: string): string {
  return page ? `${page} — ${APP_NAME}` : APP_NAME;
}

/**
 * What each domain is actually for, in one sentence.
 *
 * Written for a kid deciding where to go, not for a curriculum document — so they say
 * what the maths *does* rather than naming the skill.
 */
export const GROUP_BLURBS: Readonly<Record<string, string>> = {
  "Math facts":
    "The times tables and their division twins, drilled until they arrive without being sent for.",
  "Whole numbers":
    "The written methods for big numbers — carrying, borrowing, long multiplication and division — plus what numbers are built out of.",
  Fractions:
    "Pieces of a whole: giving them names, spotting when two names mean the same piece, and putting them together.",
  "Decimals & percents":
    "The same fractions written with a point, and what a sale sign actually saves you.",
  "Ratios & algebra":
    "Recipes that scale up, comparisons between two amounts, and finding the number hiding behind an x.",
  Geometry:
    "How much space a shape covers, how far it is around the outside, and how much fits inside it.",
};
