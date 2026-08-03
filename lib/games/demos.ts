/**
 * "Show me" walkthroughs — one per game: real screenshots of a session being played,
 * one plain sentence per step.
 *
 * These exist because the how-to text failed its audience: a reader can finish the
 * Machine Shop panel and still have no idea what to do. Pictures of an actual round,
 * stepped through, are how a kid actually learns a game.
 *
 * The captions live here; step N's image is `/demos/<slug>/<N>.jpg` (1-based), captured
 * from a real session at the stage's own size. Keep each caption to one sentence a
 * nine-year-old can read, and keep it about what to DO, not what the game is.
 */
export const DEMOS: Readonly<Record<string, readonly string[]>> = {
  "crossing-mul": [
    "The banner says which numbers to step — here it wants the 5s, counted in order.",
    "Tap a stone in the glowing row ahead. Only the next number in the count will hold you.",
    "A wrong stone just sinks — you splash back to the bank and nothing is lost.",
    "Step every row in order, then hop onto the far bank. That is one crossing done.",
  ],
  "crossing-div": [
    "The banner names a target number — you step the numbers that divide it, smallest first.",
    "Tap a stone in the glowing row ahead. Only the next divisor in order will hold you.",
    "A wrong stone just sinks — you splash back to the bank and nothing is lost.",
    "Step every row in order, then hop onto the far bank. That is one crossing done.",
  ],
  munchers: [
    "Read the rule first — nothing moves until you press Start.",
    "Tap a square next to yours to step onto it, then tap your own square to eat the number — but only if it fits the rule.",
    "The Grumps are eating the right numbers too. A number you leave sitting is one they may take.",
  ],
  split: [
    "Slide under a rock and tap to shoot it.",
    "Say how the rock shatters — into equal rocks. Every choice is a division that comes out exact.",
    "The pink crystals are primes: they cannot break. Clear the board down to nothing but primes.",
  ],
  enclosure: [
    "The signboard is the job: fence off exactly this many squares.",
    "Walk the fence one post at a time — tap the next corner, or use the arrow keys.",
    "Close the loop back on the red post. Wheat grows in every square you enclosed — count it against the sign.",
  ],
  tiles: [
    "Slide the two cutters to cut the slab into four pieces — cutting at a whole ten makes the pieces friendly.",
    "Each piece shows its sides. Work out its area and type it into the piece.",
    "The four pieces added together are the whole multiplication's answer.",
  ],
  cut: [
    "The gap in the wall is a fraction of one brick — the chalk line marks exactly where it ends.",
    "Slice your brick with the knife until the pieces are a size that can fill the gap exactly.",
    "Lay pieces into the gap. Flush with the chalk line is right; sticking past it is not.",
  ],
  beam: [
    "Each machine wants a fraction of the one beam of light.",
    "Choose the splitter setting — it has to be a number every machine's bottom number divides into.",
    "Feed each machine whole strands until it starts running. Every machine lit means the beam was shared exactly.",
  ],
  balance: [
    "Both pans weigh the same, and every bag holds the same secret number of stones.",
    "Every move does the same thing to BOTH pans — that is why the scale never tips.",
    "When one bag stands alone, whatever balances it is what was inside. Say what x is.",
  ],
  machine: [
    "The order slip on the test bench says the number your machine must put out.",
    "Tap the empty socket — the dashed hole between the numbers.",
    "Tap a part from the bin and it drops in. The bench instantly shows what your machine makes — this one does not match the slip yet.",
    "Swap parts until the outlet reads exactly what the slip ordered. Harder levels add more sockets and a mystery n.",
  ],
  bakery: [
    "Start by buying flour: divide each sack's price by its pounds to find which is really cheaper.",
    "Choose how many trays to bake and what to charge. Nothing is marked wrong — a poor choice just earns less.",
    "Open the shop and read the till. Did the day beat the profit target?",
  ],
  build: [
    "The commission asks for something exact — a floor of so many squares, or a box of so many blocks.",
    "Tap the ground to lay a block, tap a block to stack on it, drag to spin the site around.",
    "The blueprint measures what you have built. When it matches the commission, hand it over.",
  ],
};
