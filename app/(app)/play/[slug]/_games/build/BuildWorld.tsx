"use client";

import { useCallback, useMemo, useState } from "react";
import Link from "next/link";
import { Canvas, type ThreeEvent } from "@react-three/fiber";
import { OrbitControls } from "@react-three/drei";
import { GameChrome } from "@/components/game/GameChrome";
import { useAttemptRecorder } from "@/components/game/useAttemptRecorder";
import type { HowTo } from "@/components/game/HowToPlay";
import { makeRng, mulberry32 } from "@/lib/math/rng";
import { tutorHref } from "@/lib/topics";
import type { GameProps } from "../../GameHost";
import {
  type Blocks,
  bounds,
  check,
  floorArea,
  genCommission,
  GRID,
  heightAt,
  key,
  parseKey,
  perimeter,
  volume,
} from "./build-model";
import styles from "./BuildWorld.module.css";

const HOW_TO: HowTo = {
  goal: "Build what the commission asks for — the exact floor, the exact number of blocks, or the scaled-up plan.",
  controls: [
    "Tap the ground to drop a block. Tap a block to stack another on top.",
    "Switch to Take away to remove blocks.",
    "Drag to spin the view around; scroll to zoom.",
  ],
  rules: [
    "The blueprint panel measures what you have built as you build it.",
    "Floor area is how many squares you have covered. Perimeter is the edge around them.",
    "Volume is just how many blocks are in it.",
    "Nothing is timed and you can take any block back.",
  ],
};

const MAX_HEIGHT = 8;

function Ground({ onPlace }: { onPlace: (c: number, r: number) => void }) {
  const half = GRID / 2;
  return (
    <mesh
      rotation={[-Math.PI / 2, 0, 0]}
      position={[0, 0, 0]}
      onPointerDown={(e: ThreeEvent<PointerEvent>) => {
        e.stopPropagation();
        const c = Math.floor(e.point.x + half);
        const r = Math.floor(e.point.z + half);
        if (c >= 0 && c < GRID && r >= 0 && r < GRID) onPlace(c, r);
      }}
    >
      <planeGeometry args={[GRID, GRID]} />
      <meshStandardMaterial color="#e9e2d3" />
    </mesh>
  );
}

function GridLines() {
  const half = GRID / 2;
  const pts: number[] = [];
  for (let i = 0; i <= GRID; i++) {
    pts.push(i - half, 0.01, -half, i - half, 0.01, half);
    pts.push(-half, 0.01, i - half, half, 0.01, i - half);
  }
  const array = new Float32Array(pts);
  return (
    <lineSegments>
      <bufferGeometry>
        <bufferAttribute attach="attributes-position" args={[array, 3]} />
      </bufferGeometry>
      <lineBasicMaterial color="#cfc4ae" />
    </lineSegments>
  );
}

function Blocks3D({
  blocks,
  onBlock,
}: {
  blocks: Blocks;
  onBlock: (c: number, r: number, e: ThreeEvent<PointerEvent>) => void;
}) {
  const half = GRID / 2;
  const cubes: { c: number; r: number; y: number }[] = [];
  for (const [k, h] of Object.entries(blocks)) {
    const [c, r] = parseKey(k);
    for (let y = 0; y < h; y++) cubes.push({ c, r, y });
  }
  return (
    <>
      {cubes.map(({ c, r, y }) => (
        <mesh
          key={`${c},${r},${y}`}
          position={[c - half + 0.5, y + 0.5, r - half + 0.5]}
          onPointerDown={(e: ThreeEvent<PointerEvent>) => {
            e.stopPropagation();
            onBlock(c, r, e);
          }}
        >
          <boxGeometry args={[0.96, 0.96, 0.96]} />
          <meshStandardMaterial color={y % 2 === 0 ? "#c98a63" : "#d9a077"} />
        </mesh>
      ))}
    </>
  );
}

export default function BuildWorld({
  slug,
  topicId,
  name, concept,
  levels,
  initialLevel,
  seed,
}: GameProps) {
  const [level, setLevel] = useState(initialLevel);
  const [nonce, setNonce] = useState(0);
  const recorder = useAttemptRecorder({ gameSlug: slug, level });

  const commission = useMemo(() => {
    const rng = makeRng(mulberry32(seed + nonce * 7919 + level * 2113));
    return genCommission(level, (a, b) => rng.int(a, b));
  }, [level, nonce, seed]);

  const [blocks, setBlocks] = useState<Blocks>({});
  const [mode, setMode] = useState<"add" | "remove">("add");
  const [submitted, setSubmitted] = useState(false);
  const [k, setK] = useState(0);

  if (k !== nonce) {
    setK(nonce);
    setBlocks({});
    setMode("add");
    setSubmitted(false);
  }

  const place = useCallback(
    (c: number, r: number) => {
      if (submitted) return;
      setBlocks((prev) => {
        const h = prev[key(c, r)] ?? 0;
        if (mode === "remove") {
          if (h <= 0) return prev;
          const next = { ...prev };
          if (h - 1 === 0) delete next[key(c, r)];
          else next[key(c, r)] = h - 1;
          return next;
        }
        if (h >= MAX_HEIGHT) return prev;
        return { ...prev, [key(c, r)]: h + 1 };
      });
    },
    [mode, submitted],
  );

  const result = check(commission, blocks);
  const b = bounds(blocks);

  const submit = useCallback(() => {
    setSubmitted(true);
    recorder.record({
      type: "attempt",
      prompt: { kind: commission.kind, detail: commission.detail },
      response: {
        floorArea: floorArea(blocks),
        perimeter: perimeter(blocks),
        volume: volume(blocks),
        ok: result.met,
      },
      elapsedMs: 0,
    });
    void recorder.flush();
  }, [commission, blocks, result.met, recorder]);

  const nextJob = useCallback(() => setNonce((n) => n + 1), []);
  const changeLevel = useCallback((next: number) => {
    setLevel(next);
    setNonce((n) => n + 1);
  }, []);

  return (
    <GameChrome
      slug={slug}
      concept={concept}
      title={name}
      topicId={topicId}
      levels={levels}
      level={level}
      onLevel={changeLevel}
      instructions={commission.detail}
      howTo={HOW_TO}
      status={
        <>
          <span className={styles.pip}>{commission.title}</span>
          <span className={styles.toggle}>
            <button
              type="button"
              className={mode === "add" ? styles.modeOn : styles.modeOff}
              onClick={() => setMode("add")}
            >
              Build
            </button>
            <button
              type="button"
              className={mode === "remove" ? styles.modeOn : styles.modeOff}
              onClick={() => setMode("remove")}
            >
              Take away
            </button>
          </span>
          <button type="button" className={styles.mini} onClick={() => setBlocks({})}>
            Clear the site
          </button>
        </>
      }
    >
      <div className={styles.stage}>
        <div className={styles.canvasWrap}>
          <Canvas
            orthographic
            camera={{ position: [16, 14, 16], zoom: 34, near: 0.1, far: 200 }}
            dpr={[1, 2]}
          >
            <ambientLight intensity={0.75} />
            <directionalLight position={[8, 14, 6]} intensity={1.1} />
            <Ground onPlace={place} />
            <GridLines />
            <Blocks3D blocks={blocks} onBlock={(c, r) => place(c, r)} />
            <OrbitControls
              enablePan={false}
              minPolarAngle={0.25}
              maxPolarAngle={Math.PI / 2.2}
              makeDefault
            />
          </Canvas>
        </div>

        <aside className={styles.blueprint}>
          <h3 className={styles.h3}>Blueprint</h3>
          <dl className={styles.measures}>
            <div>
              <dt>Floor area</dt>
              <dd>
                {b ? (
                  <>
                    {floorArea(blocks)}
                    {floorArea(blocks) === b.width * b.depth ? (
                      <span className={styles.sub}>
                        {" "}
                        = {b.width} × {b.depth}
                      </span>
                    ) : null}
                  </>
                ) : (
                  0
                )}
              </dd>
            </div>
            <div>
              <dt>Perimeter</dt>
              <dd>{perimeter(blocks)}</dd>
            </div>
            <div>
              <dt>Blocks</dt>
              <dd>
                {volume(blocks)}
                {b && floorArea(blocks) === b.width * b.depth && b.height > 0 ? (
                  <span className={styles.sub}>
                    {" "}
                    = {b.width} × {b.depth} × {b.height}
                  </span>
                ) : null}
              </dd>
            </div>
            <div>
              <dt>Size</dt>
              <dd>{b ? `${b.width} × ${b.depth} × ${b.height}` : "—"}</dd>
            </div>
          </dl>

          <h3 className={styles.h3}>The commission</h3>
          <ul className={styles.checks}>
            {result.lines.map((l) => (
              <li key={l.label} className={l.ok ? styles.ok : styles.pending}>
                <span>{l.label}</span>
                <span className={styles.vals}>
                  {l.got} <span className={styles.want}>/ {l.want}</span>
                </span>
              </li>
            ))}
          </ul>

          <button
            type="button"
            className="btn primary"
            onClick={submit}
            disabled={submitted || volume(blocks) === 0}
          >
            Hand it over
          </button>
        </aside>

        {submitted ? (
          <div className={styles.overlay}>
            <div className={`card ${styles.panel}`}>
              <h2 className={styles.h2}>
                {result.met ? "The client is delighted." : "Not to plan."}
              </h2>
              <ul className={styles.recap}>
                {result.lines.map((l) => (
                  <li key={l.label} className={l.ok ? styles.ok : styles.bad}>
                    {l.label}: {l.got} — wanted {l.want}
                  </li>
                ))}
              </ul>
              <p className={styles.note}>
                {result.met
                  ? b && commission.kind === "volume"
                    ? `${b.width} × ${b.depth} × ${b.height} = ${volume(blocks)} blocks.`
                    : b
                      ? `${b.width} × ${b.depth} = ${floorArea(blocks)} squares, with ${perimeter(blocks)} edges around them.`
                      : ""
                  : "Have another look at the blueprint panel — it measures what you have built as you build it."}
              </p>
              <div className={styles.actions}>
                <button
                  type="button"
                  className="btn primary"
                  onClick={result.met ? nextJob : () => setSubmitted(false)}
                >
                  {result.met ? "Next commission" : "Keep building"}
                </button>
                <Link className="btn" href={tutorHref(topicId, { level })}>
                  See this in the tutor
                </Link>
              </div>
            </div>
          </div>
        ) : null}
      </div>
    </GameChrome>
  );
}
