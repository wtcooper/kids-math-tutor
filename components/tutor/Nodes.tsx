import type { DisplayNode, Inline } from "@/lib/math/types";
import { RichText } from "./RichText";
import styles from "./Nodes.module.css";

/**
 * Renderers for the display vocabulary.
 *
 * The original emitted HTML strings from build(); these consume the data model instead,
 * so the same node can be drawn by the tutor, by a game's round-end panel, or (later)
 * differently on a small screen. Class names deliberately echo the original's CSS
 * vocabulary so the visual result matches.
 */

export function InlineBit({ item }: { item: Inline }) {
  switch (item.t) {
    case "text":
      return <span>{item.v}</span>;
    case "mut":
      return <span className={styles.mut}>{item.v}</span>;
    case "hi":
      return <span className={styles.hi}>{item.v}</span>;
    case "box":
      return <span className={styles.box}>{item.v}</span>;
    case "grn":
      return <span className={styles.grn}>{item.v}</span>;
    case "op":
      return <span className={styles.op}>{item.v}</span>;
    case "frac":
      return <Fraction whole={item.whole} num={item.num} den={item.den} />;
    case "pow":
      return (
        <span className={styles.powWrap}>
          {item.base}
          {/*
            Flex items ignore vertical-align, which is why the original rendered "5 2"
            instead of 5³ until it used align-self. This class handles both cases.
          */}
          <i className={styles.pw}>{item.exp}</i>
        </span>
      );
  }
}

export function Fraction({
  whole,
  num,
  den,
}: {
  whole?: number;
  num: number;
  den: number;
}) {
  if (den === 1 && !whole) return <span>{num}</span>;
  return (
    <span className={styles.mx}>
      {whole ? <span className={styles.whole}>{whole}</span> : null}
      <span className={styles.fr}>
        <span className={styles.fn}>{num}</span>
        <span className={styles.fd}>{den}</span>
      </span>
    </span>
  );
}

export function WorkLine({ items, big }: { items: Inline[]; big?: boolean }) {
  return (
    <div className={`${styles.wl} ${big ? styles.big : ""}`}>
      {items.map((it, i) => (
        <InlineBit key={i} item={it} />
      ))}
    </div>
  );
}

function FracBar({
  parts,
  shaded,
  tone = 1,
  labelEach,
}: {
  parts: number;
  shaded: number;
  tone?: 1 | 2 | 3;
  labelEach?: boolean;
}) {
  return (
    <div className={styles.fbar}>
      {Array.from({ length: parts }, (_, i) => (
        <div
          key={i}
          className={`${styles.seg} ${i < shaded ? styles[`on${tone}`] : ""}`}
        >
          {labelEach ? <span>1/{parts}</span> : null}
        </div>
      ))}
    </div>
  );
}

function NumberLine({
  min,
  max,
  marks,
  point,
  pointLabel,
  jump,
}: {
  min: number;
  max: number;
  marks: number[];
  point?: number;
  pointLabel?: string;
  jump?: [number, number];
}) {
  const pct = (v: number) => ((v - min) / (max - min)) * 100;
  return (
    <div className={styles.nline}>
      <div className={styles.axis} />
      {marks.map((m) => (
        <div key={m} className={styles.tick} style={{ left: `${pct(m)}%` }}>
          <span className={styles.tickLabel}>{m}</span>
        </div>
      ))}
      {jump ? (
        <div
          className={styles.jump}
          style={{
            left: `${pct(Math.min(jump[0], jump[1]))}%`,
            width: `${Math.abs(pct(jump[1]) - pct(jump[0]))}%`,
          }}
        />
      ) : null}
      {point !== undefined ? (
        <div className={styles.point} style={{ left: `${pct(point)}%` }}>
          {pointLabel ? <span className={styles.pointLabel}>{pointLabel}</span> : null}
        </div>
      ) : null}
    </div>
  );
}

function ShapeSvg({
  kind,
  w,
  h,
  unit,
  extra,
}: {
  kind: string;
  w: number;
  h: number;
  unit: string;
  extra?: number;
}) {
  // One scale for both axes. Clamping width and height independently destroyed the
  // aspect ratio — a triangle labelled "base 19, height 4" came out nearly equilateral,
  // and a picture that disagrees with its own labels is worse than no picture at all
  // (BUILD-NOTES issue 8).
  const maxPx = 240;
  const scale = Math.min(maxPx / Math.max(w, h), 16);
  const W = w * scale;
  const H = h * scale;
  const pad = 34;
  const vbW = W + pad * 2;
  const vbH = H + pad * 2;
  const fill = "rgba(190,110,78,.12)";
  const stroke = "#BE6E4E";
  const label = { fill: "#6E6053", fontSize: 13, fontFamily: "ui-monospace, monospace" };

  let shape: React.ReactNode = null;
  if (kind === "rect" || kind === "area" || kind === "perim") {
    shape = <rect x={pad} y={pad} width={W} height={H} fill={fill} stroke={stroke} strokeWidth={2} rx={3} />;
  } else if (kind === "tri") {
    shape = (
      <>
        <polygon
          points={`${pad},${pad + H} ${pad + W},${pad + H} ${pad + W * 0.42},${pad}`}
          fill={fill}
          stroke={stroke}
          strokeWidth={2}
        />
        <line
          x1={pad + W * 0.42}
          y1={pad}
          x2={pad + W * 0.42}
          y2={pad + H}
          stroke={stroke}
          strokeDasharray="4 4"
          strokeWidth={1.5}
        />
      </>
    );
  } else if (kind === "para") {
    const skew = W * 0.24;
    shape = (
      <>
        <polygon
          points={`${pad + skew},${pad} ${pad + W + skew},${pad} ${pad + W},${pad + H} ${pad},${pad + H}`}
          fill={fill}
          stroke={stroke}
          strokeWidth={2}
        />
        <line
          x1={pad + skew}
          y1={pad}
          x2={pad + skew}
          y2={pad + H}
          stroke={stroke}
          strokeDasharray="4 4"
          strokeWidth={1.5}
        />
      </>
    );
  } else if (kind === "vol" || kind === "prism") {
    // Depth is drawn from the actual depth number rather than a fixed offset.
    const d = Math.min((extra ?? 4) * scale * 0.6, 70);
    shape = (
      <>
        <polygon points={`${pad},${pad + d} ${pad + d},${pad} ${pad + W + d},${pad} ${pad + W},${pad + d}`} fill="rgba(190,110,78,.2)" stroke={stroke} strokeWidth={2} />
        <polygon points={`${pad + W},${pad + d} ${pad + W + d},${pad} ${pad + W + d},${pad + H} ${pad + W},${pad + H + d}`} fill="rgba(190,110,78,.28)" stroke={stroke} strokeWidth={2} />
        <rect x={pad} y={pad + d} width={W} height={H} fill={fill} stroke={stroke} strokeWidth={2} />
      </>
    );
  } else if (kind === "ell") {
    const nw = (extra ?? 4) * scale;
    const nh = nw * 0.6;
    shape = (
      <polygon
        points={`${pad},${pad} ${pad + W},${pad} ${pad + W},${pad + H - nh} ${pad + W - nw},${pad + H - nh} ${pad + W - nw},${pad + H} ${pad},${pad + H}`}
        fill={fill}
        stroke={stroke}
        strokeWidth={2}
      />
    );
  }

  return (
    <div className={styles.shape}>
      <svg viewBox={`0 0 ${vbW} ${vbH}`} width={Math.min(vbW, 340)} role="img">
        {shape}
        <text x={pad + W / 2} y={pad + H + 22} textAnchor="middle" {...label}>
          {w} {unit}
        </text>
        <text x={pad - 10} y={pad + H / 2} textAnchor="end" {...label}>
          {h} {unit}
        </text>
      </svg>
    </div>
  );
}

export function Node({ node }: { node: DisplayNode }) {
  switch (node.t) {
    case "workLine":
      return <WorkLine items={node.items} big={node.big} />;
    case "note":
      return (
        <div className={styles.note}>
          <RichText rich={node.body} />
        </div>
      );
    case "banner":
      return (
        <div className={styles.banner}>
          <RichText rich={node.body} />
        </div>
      );
    case "columns":
      return (
        <div className={styles.columns}>
          {node.cols.map((c) => (
            <div key={c.title} className={styles.col}>
              <div className={styles.colTitle}>{c.title}</div>
              <div className={styles.wl}>
                {c.items.map((it, i) => (
                  <InlineBit key={i} item={it} />
                ))}
              </div>
            </div>
          ))}
        </div>
      );
    case "fracBar":
      return (
        <FracBar
          parts={node.parts}
          shaded={node.shaded}
          tone={node.tone}
          labelEach={node.labelEach}
        />
      );
    case "twoBars":
      return (
        <div className={styles.twoBars}>
          <div>
            {node.top.label ? <div className={styles.barLabel}>{node.top.label}</div> : null}
            <FracBar parts={node.top.parts} shaded={node.top.shaded} tone={node.top.tone} />
          </div>
          <div>
            {node.bottom.label ? (
              <div className={styles.barLabel}>{node.bottom.label}</div>
            ) : null}
            <FracBar
              parts={node.bottom.parts}
              shaded={node.bottom.shaded}
              tone={node.bottom.tone ?? 2}
            />
          </div>
        </div>
      );
    case "numberLine":
      return (
        <NumberLine
          min={node.min}
          max={node.max}
          marks={node.marks}
          point={node.point}
          pointLabel={node.pointLabel}
          jump={node.jump}
        />
      );
    case "unitGrid":
      return (
        <div
          className={styles.fgrid}
          style={{ gridTemplateColumns: `repeat(${node.cols}, 1fr)` }}
        >
          {Array.from({ length: node.rows * node.cols }, (_, i) => (
            <div key={i} className={styles.cellSq} />
          ))}
        </div>
      );
    case "percentBar":
      return (
        <div className={styles.pbar}>
          <div className={styles.pfill} style={{ width: `${node.percent}%` }} />
          <span className={styles.pmark} style={{ left: `${node.percent}%` }}>
            {node.percent}%
          </span>
          {node.value ? (
            <span className={styles.pmark2} style={{ left: `${node.percent}%` }}>
              {node.value}
            </span>
          ) : null}
        </div>
      );
    case "hundredSquare":
      return (
        <div className={styles.pgrid100}>
          {Array.from({ length: 100 }, (_, i) => (
            <span
              key={i}
              className={i < node.on ? styles.on : i < node.on + (node.part ?? 0) ? styles.part : ""}
            />
          ))}
        </div>
      );
    case "ratioTable":
      return (
        <table className={styles.rtable}>
          <thead>
            <tr>
              {node.head.map((h) => (
                <th key={h}>{h}</th>
              ))}
            </tr>
          </thead>
          <tbody>
            {node.rows.map((r, ri) => (
              <tr key={ri}>
                {r.map((c, ci) => (
                  <td
                    key={ci}
                    className={
                      node.highlight && node.highlight[0] === ri && node.highlight[1] === ci
                        ? styles.hiCell
                        : ""
                    }
                  >
                    {c}
                  </td>
                ))}
              </tr>
            ))}
          </tbody>
        </table>
      );
    case "balance":
      return (
        <div className={styles.scale}>
          <div className={styles.pan}>
            {node.left.map((it, i) => (
              <InlineBit key={i} item={it} />
            ))}
          </div>
          <div className={styles.beam} />
          <div className={styles.pan}>
            {node.right.map((it, i) => (
              <InlineBit key={i} item={it} />
            ))}
          </div>
        </div>
      );
    case "shape":
      return (
        <ShapeSvg kind={node.kind} w={node.w} h={node.h} unit={node.unit} extra={node.extra} />
      );
    case "blocks":
      return (
        <div className={styles.blocks}>
          {node.count > 24 ? (
            <>
              <span className={styles.countBadge}>{node.count}</span>
              <span className={`${styles.blk} ${styles[`p${node.place}`]}`} />
            </>
          ) : (
            Array.from({ length: node.count }, (_, i) => (
              <span key={i} className={`${styles.blk} ${styles[`p${node.place}`]}`} />
            ))
          )}
        </div>
      );
  }
}

export function Nodes({ nodes }: { nodes: DisplayNode[] }) {
  return (
    <>
      {nodes.map((n, i) => (
        <Node key={i} node={n} />
      ))}
    </>
  );
}
