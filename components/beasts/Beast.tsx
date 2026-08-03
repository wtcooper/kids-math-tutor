import type { Stage } from "@/lib/beasts";

/**
 * The creatures, drawn. Pure SVG built from primitives so every stage of every family
 * ships with zero image assets and can be tinted from the registry.
 *
 * Stages: an egg; a small round hatchling; the grown beast with its family features in
 * full; and the elder, which is the grown beast plus a little crown and sparkle. An
 * undiscovered family renders as a dark silhouette with a question mark.
 */

function shade(hex: string, f: number): string {
  const n = parseInt(hex.slice(1), 16);
  const r = Math.round(((n >> 16) & 255) * f);
  const g = Math.round(((n >> 8) & 255) * f);
  const b = Math.round((n & 255) * f);
  return `rgb(${r},${g},${b})`;
}

export function Beast({
  family,
  hue,
  stage,
  size = 120,
}: {
  family: string;
  hue: string;
  stage: Stage | null;
  size?: number;
}) {
  const dark = shade(hue, 0.62);
  const cream = "#FDF6E5";

  if (stage === null) {
    return (
      <svg width={size} height={size} viewBox="0 0 120 120" aria-label="an undiscovered creature">
        <ellipse cx="60" cy="98" rx="30" ry="8" fill="rgba(0,0,0,.12)" />
        <path d="M60 22c18 0 30 16 30 38s-12 34-30 34-30-12-30-34 12-38 30-38z" fill="#C9BCA6" />
        <text x="60" y="72" textAnchor="middle" fontSize="34" fill="#8A7C64" fontFamily="Georgia,serif">
          ?
        </text>
      </svg>
    );
  }

  if (stage === "egg") {
    return (
      <svg width={size} height={size} viewBox="0 0 120 120" aria-label="an egg">
        <ellipse cx="60" cy="100" rx="26" ry="7" fill="rgba(0,0,0,.15)" />
        <path d="M60 26c16 0 27 15 27 36s-11 32-27 32-27-11-27-32 11-36 27-36z" fill={cream} stroke={dark} strokeWidth="2.5" />
        <circle cx="52" cy="58" r="5" fill={hue} />
        <circle cx="70" cy="72" r="4" fill={hue} />
        <circle cx="64" cy="46" r="3" fill={hue} />
      </svg>
    );
  }

  const small = stage === "hatchling";
  const s = small ? 0.72 : 1;
  const cy = small ? 74 : 62;

  return (
    <svg width={size} height={size} viewBox="0 0 120 120" aria-label={`a ${stage} ${family}`}>
      <ellipse cx="60" cy="104" rx={34 * s} ry="8" fill="rgba(0,0,0,.15)" />
      <g transform={`translate(60 ${cy}) scale(${s}) translate(-60 -62)`}>
        {family === "tally-fox" ? (
          <>
            <path d="M38 40 L46 18 L56 38 Z" fill={hue} stroke={dark} strokeWidth="2" />
            <path d="M82 40 L74 18 L64 38 Z" fill={hue} stroke={dark} strokeWidth="2" />
            <ellipse cx="60" cy="66" rx="32" ry="30" fill={hue} stroke={dark} strokeWidth="2.5" />
            <ellipse cx="60" cy="78" rx="18" ry="14" fill={cream} />
            {[0, 1, 2, 3].map((i) => (
              <line key={i} x1={40 + i * 6} y1="56" x2={40 + i * 6} y2="68" stroke={dark} strokeWidth="2.5" />
            ))}
            <line x1="37" y1="68" x2="63" y2="56" stroke={dark} strokeWidth="2.5" />
            <circle cx="50" cy="58" r="3.4" fill="#2A1B12" />
            <circle cx="70" cy="58" r="3.4" fill="#2A1B12" />
            <ellipse cx="60" cy="70" rx="4" ry="3" fill="#2A1B12" />
          </>
        ) : family === "prime-beetle" ? (
          <>
            <ellipse cx="60" cy="70" rx="34" ry="28" fill={hue} stroke={dark} strokeWidth="2.5" />
            <path d="M60 42 L74 58 L68 78 L52 78 L46 58 Z" fill={cream} opacity=".55" />
            <line x1="60" y1="42" x2="60" y2="78" stroke={dark} strokeWidth="1.5" opacity=".6" />
            <line x1="46" y1="58" x2="74" y2="58" stroke={dark} strokeWidth="1.5" opacity=".6" />
            {[-2, -1, 0, 1, 2].map((i) => (
              <line key={i} x1={60 + i * 13} y1="94" x2={60 + i * 15} y2="102" stroke={dark} strokeWidth="3" strokeLinecap="round" />
            ))}
            <circle cx="50" cy="88" r="3.2" fill={cream} />
            <circle cx="70" cy="88" r="3.2" fill={cream} />
            <circle cx="50" cy="89" r="1.6" fill="#2A1B26" />
            <circle cx="70" cy="89" r="1.6" fill="#2A1B26" />
          </>
        ) : family === "brick-tortoise" ? (
          <>
            <ellipse cx="60" cy="88" rx="36" ry="10" fill={dark} />
            <path d="M26 84 q0 -44 34 -44 q34 0 34 44 Z" fill={hue} stroke={dark} strokeWidth="2.5" />
            <line x1="30" y1="70" x2="90" y2="70" stroke={dark} strokeWidth="2" />
            <line x1="46" y1="42" x2="46" y2="70" stroke={dark} strokeWidth="2" />
            <line x1="74" y1="42" x2="74" y2="70" stroke={dark} strokeWidth="2" />
            <line x1="38" y1="70" x2="38" y2="84" stroke={dark} strokeWidth="2" />
            <line x1="60" y1="70" x2="60" y2="84" stroke={dark} strokeWidth="2" />
            <line x1="82" y1="70" x2="82" y2="84" stroke={dark} strokeWidth="2" />
            <circle cx="96" cy="78" r="9" fill={shade(hue, 1.15)} stroke={dark} strokeWidth="2" />
            <circle cx="99" cy="76" r="1.8" fill="#2A2418" />
          </>
        ) : family === "gear-owl" ? (
          <>
            <path d="M38 36 L46 22 L52 36 Z" fill={hue} stroke={dark} strokeWidth="2" />
            <path d="M82 36 L74 22 L68 36 Z" fill={hue} stroke={dark} strokeWidth="2" />
            <ellipse cx="60" cy="66" rx="30" ry="32" fill={hue} stroke={dark} strokeWidth="2.5" />
            {[0, 60, 120, 180, 240, 300].map((a) => (
              <g key={a} transform={`rotate(${a} 48 56)`}>
                <rect x="46.6" y="44" width="2.8" height="5" fill={cream} />
              </g>
            ))}
            {[0, 60, 120, 180, 240, 300].map((a) => (
              <g key={`r${a}`} transform={`rotate(${a} 72 56)`}>
                <rect x="70.6" y="44" width="2.8" height="5" fill={cream} />
              </g>
            ))}
            <circle cx="48" cy="56" r="8.5" fill={cream} />
            <circle cx="72" cy="56" r="8.5" fill={cream} />
            <circle cx="48" cy="56" r="3.6" fill="#22300F" />
            <circle cx="72" cy="56" r="3.6" fill="#22300F" />
            <path d="M56 66 L60 72 L64 66 Z" fill={shade(hue, 1.25)} />
            <ellipse cx="60" cy="84" rx="14" ry="10" fill={cream} opacity=".5" />
          </>
        ) : family === "half-newt" ? (
          <>
            <path d="M60 34 q26 0 26 30 q0 26 -18 30 l10 12 q-18 6 -18 -8 q0 14 -18 8 l10 -12 q-18 -4 -18 -30 q0 -30 26 -30z" fill={hue} stroke={dark} strokeWidth="2.5" />
            <path d="M60 34 q26 0 26 30 q0 26 -18 30 l10 12 q-14 5 -18 -6 Z" fill={shade(hue, 0.78)} />
            <line x1="60" y1="34" x2="60" y2="100" stroke={cream} strokeWidth="2.5" strokeDasharray="5 4" />
            <circle cx="50" cy="54" r="3.4" fill="#12303E" />
            <circle cx="70" cy="54" r="3.4" fill={cream} />
            <circle cx="70" cy="54" r="1.7" fill="#12303E" />
            <path d="M52 66 q8 6 16 0" stroke="#12303E" strokeWidth="2.4" fill="none" strokeLinecap="round" />
          </>
        ) : (
          <>
            <path d="M34 52 q-10 -18 6 -24 q4 12 8 16 Z" fill={hue} stroke={dark} strokeWidth="2" />
            <path d="M86 52 q10 -18 -6 -24 q-4 12 -8 16 Z" fill={hue} stroke={dark} strokeWidth="2" />
            <ellipse cx="60" cy="68" rx="30" ry="28" fill={hue} stroke={dark} strokeWidth="2.5" />
            <ellipse cx="60" cy="80" rx="16" ry="12" fill={cream} opacity=".65" />
            <line x1="44" y1="46" x2="76" y2="46" stroke={dark} strokeWidth="3" strokeLinecap="round" />
            <path d="M44 46 l-3 7 M76 46 l3 7" stroke={dark} strokeWidth="2.4" strokeLinecap="round" />
            <circle cx="50" cy="58" r="3.4" fill="#301410" />
            <circle cx="70" cy="58" r="3.4" fill="#301410" />
            <path d="M54 68 q6 5 12 0" stroke="#301410" strokeWidth="2.2" fill="none" strokeLinecap="round" />
          </>
        )}
        {stage === "elder" ? (
          <>
            <path d="M48 16 L54 26 L60 14 L66 26 L72 16 L70 30 L50 30 Z" fill="#E3C14A" stroke="#A2711D" strokeWidth="1.5" />
            <circle cx="26" cy="34" r="2.4" fill="#E3C14A" />
            <circle cx="94" cy="30" r="2" fill="#E3C14A" />
            <circle cx="90" cy="94" r="2.4" fill="#E3C14A" />
          </>
        ) : null}
      </g>
    </svg>
  );
}
