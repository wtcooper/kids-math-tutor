/**
 * The shape of a game's self-description.
 *
 * The modal that used to render this text is gone — replaced by the "Watch how to play"
 * walkthrough video (ShowMe), because the play-testers don't read panels, they press
 * play. The type and each game's HOW_TO data remain: they are the authored source of a
 * game's goal, controls and promises, and the walkthrough captions are written from
 * them. A new game should still write its HOW_TO first, then shoot its walkthrough.
 */
export interface HowTo {
  /** One sentence. What counts as winning. */
  goal: string;
  /** How you actually move. Keep each under a dozen words. */
  controls: string[];
  /** What the game will not do to you — the anxiety-shaped promises are the point. */
  rules: string[];
}
