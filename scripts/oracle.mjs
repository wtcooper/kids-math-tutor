/**
 * Runs the original single-file tutor's script inside node:vm so the TypeScript port can
 * be checked against it.
 *
 * The original is one synchronous IIFE that assigns window.__mt before its boot calls, so
 * once the script has run the whole topic registry — generators, builders, practice
 * checkers — is reachable as plain functions.
 *
 * Two uses:
 *   node scripts/oracle.mjs            → writes lib/topics.generated.ts
 *   import { loadOracle } from '...'   → differential tests in test/
 *
 * The DOM stub only has to cover what the boot path touches, which is very little: the
 * tutor fills two <select>s, sets some innerHTML and attaches listeners. Nothing in
 * gen()/build()/picture() touches the DOM at all.
 */
import { readFileSync, writeFileSync } from "node:fs";
import { dirname, resolve } from "node:path";
import { fileURLToPath } from "node:url";
import vm from "node:vm";

const HERE = dirname(fileURLToPath(import.meta.url));
export const REPO = resolve(HERE, "..");
const DEFAULT_HTML = resolve(REPO, "docs/math-table.html");

function makeElement(id = "") {
  const el = {
    id,
    value: "",
    innerHTML: "",
    textContent: "",
    className: "",
    checked: false,
    dataset: {},
    style: {},
    classList: { add() {}, remove() {}, toggle() {}, contains: () => false },
    children: [],
    appendChild(c) {
      this.children.push(c);
      return c;
    },
    setAttribute() {},
    getAttribute: () => null,
    removeAttribute() {},
    addEventListener() {},
    removeEventListener() {},
    dispatchEvent: () => true,
    focus() {},
    blur() {},
    click() {},
    scrollIntoView() {},
    closest: () => null,
    querySelector: () => makeElement(),
    querySelectorAll: () => [],
    getBoundingClientRect: () => ({ top: 0, left: 0, width: 0, height: 0 }),
    insertAdjacentHTML() {},
    remove() {},
  };
  return el;
}

function makeSandbox(random) {
  const elements = new Map();
  const get = (key) => {
    if (!elements.has(key)) elements.set(key, makeElement(key));
    return elements.get(key);
  };

  const document = {
    getElementById: (id) => get(id),
    querySelector: (sel) => get(sel),
    querySelectorAll: () => [],
    createElement: (tag) => makeElement(tag),
    addEventListener() {},
    removeEventListener() {},
    body: makeElement("body"),
    documentElement: makeElement("html"),
  };

  const window = {
    document,
    addEventListener() {},
    removeEventListener() {},
    requestAnimationFrame: () => 0,
    cancelAnimationFrame() {},
    getComputedStyle: () => ({ getPropertyValue: () => "" }),
    matchMedia: () => ({ matches: false, addEventListener() {} }),
    location: { hash: "", search: "", href: "" },
    print() {},
    open: () => null,
    localStorage: { getItem: () => null, setItem() {}, removeItem() {} },
  };

  const sandbox = {
    window,
    document,
    navigator: { userAgent: "node" },
    console,
    setTimeout,
    clearTimeout,
    setInterval,
    clearInterval,
    requestAnimationFrame: () => 0,
    cancelAnimationFrame() {},
    Math: Object.create(Math),
  };
  // Only Math.random is swapped; everything else on Math is inherited untouched.
  sandbox.Math.random = random;
  sandbox.globalThis = sandbox;
  sandbox.self = sandbox;
  return sandbox;
}

/** Pull the single inline <script> block out of the document. */
function extractScript(html) {
  const open = html.indexOf("<script>");
  const close = html.lastIndexOf("</script>");
  if (open < 0 || close < 0) throw new Error("oracle: no <script> block found");
  return html.slice(open + "<script>".length, close);
}

/**
 * @param {() => number} random  substitute for Math.random, so gen() is reproducible
 * @param {string} htmlPath
 * @returns the tutor's own __mt handle: { S, TOPICS, BY_ID, ... }
 */
export function loadOracle(random = Math.random, htmlPath = DEFAULT_HTML) {
  let code = extractScript(readFileSync(htmlPath, "utf8"));

  // ABOUT, GROUPS and FACT_LEVELS are module-scope inside the tutor's IIFE and are not on
  // window.__mt. Appending to the end of the file would be outside the closure and see
  // none of them, so splice the export in just before the IIFE closes.
  //
  // Guarded with typeof so a future build.sh that renames one of these yields undefined
  // rather than throwing and taking the whole registry down with it.
  const EXPORTS = `
;try{ window.__mt.ABOUT = typeof ABOUT !== "undefined" ? ABOUT : {};
      window.__mt.GROUPS = typeof GROUPS !== "undefined" ? GROUPS : [];
      window.__mt.FACT_LEVELS = typeof FACT_LEVELS !== "undefined" ? FACT_LEVELS : [];
}catch(e){}
`;
  const closeIife = code.lastIndexOf("})();");
  if (closeIife < 0) throw new Error("oracle: could not find the IIFE close");
  code = code.slice(0, closeIife) + EXPORTS + code.slice(closeIife);

  const sandbox = makeSandbox(random);
  vm.createContext(sandbox);
  vm.runInContext(code, sandbox, { filename: "math-table.html" });

  const mt = sandbox.window.__mt;
  if (!mt || !Array.isArray(mt.TOPICS)) {
    throw new Error(
      "oracle: window.__mt.TOPICS missing — the tutor's structure changed, " +
        "so the port's safety net is gone. Fix this before trusting any test.",
    );
  }
  return mt;
}

/** Serialise the registry the React app needs. Rendering functions are dropped. */
export function extractTopics(mt) {
  return mt.TOPICS.map((t) => ({
    id: t.id,
    name: t.label,
    group: t.group,
    engine: t.engine,
    tagline: t.tagline ?? "",
    levels: t.levels.slice(),
  }));
}

function main() {
  const mt = loadOracle();
  const topics = extractTopics(mt);
  const groups = [...new Set(topics.map((t) => t.group))];
  const about = mt.ABOUT ?? {};

  const levelCount = topics.reduce((n, t) => n + t.levels.length, 0);
  console.log(
    `oracle: ${topics.length} topics, ${groups.length} groups, ${levelCount} levels`,
  );

  const banner =
    "// GENERATED by scripts/oracle.mjs from docs/math-table.html — do not edit.\n" +
    "// Regenerate with `npm run topics:gen`; verify with `npm run topics:check`.\n\n";

  writeFileSync(
    resolve(REPO, "lib/topics.generated.ts"),
    banner +
      `import type { Topic } from "./topics";\n\n` +
      `export const GENERATED_TOPICS: readonly Topic[] = ${JSON.stringify(topics, null, 2)} as const;\n\n` +
      `export const GENERATED_GROUPS: readonly string[] = ${JSON.stringify(groups, null, 2)} as const;\n`,
  );

  writeFileSync(
    resolve(REPO, "lib/topics.about.ts"),
    banner +
      `/** Long-form topic descriptions. Kept separate from the registry: ~30KB of prose\n` +
      ` *  that has no business in the landing page's payload. */\n` +
      `export const ABOUT: Record<string, string> = ${JSON.stringify(about, null, 2)};\n`,
  );

  console.log("wrote lib/topics.generated.ts and lib/topics.about.ts");
}

if (process.argv[1] === fileURLToPath(import.meta.url)) main();
