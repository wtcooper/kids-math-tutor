import type { Worksheet as Sheet } from "@/lib/math/worksheet";
import styles from "./Worksheet.module.css";

/**
 * The printable sheet. Hidden on screen; the print stylesheet hides everything else.
 *
 * Rendered from data rather than an HTML string, so no innerHTML anywhere.
 */
export function WorksheetSheet({ sheet }: { sheet: Sheet | null }) {
  if (!sheet) return null;

  return (
    <div className={styles.printArea} data-print>
      <div className={styles.psheet}>
        <h1 className={styles.h1}>{sheet.title}</h1>
        <p className={styles.meta}>
          {sheet.levelName} · Name: ______________________ Date: ____________
        </p>

        {sheet.layout === "columns" ? (
          <div className={styles.cols4}>
            {sheet.items.map((it) => (
              <div key={it.q}>{it.q} = ______</div>
            ))}
          </div>
        ) : (
          <div className={styles.pgrid}>
            {sheet.items.map((it, i) => (
              <div key={i} className={styles.pitem}>
                <div className={styles.n}>{i + 1}</div>
                <div className={styles.p}>{it.q}</div>
              </div>
            ))}
          </div>
        )}
      </div>

      <div className={`${styles.psheet} ${styles.keyPage}`}>
        <h2 className={styles.h2}>Answer key</h2>
        <div className={sheet.layout === "columns" ? styles.cols5 : styles.pkey}>
          {sheet.items.map((it, i) => (
            <div key={i}>
              {sheet.layout === "columns" ? `${it.q} = ${it.a}` : `${i + 1}. ${it.a}`}
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
