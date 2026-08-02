import type { Metadata } from "next";
import { APP_NAME, pageTitle } from "@/lib/app";

export const metadata: Metadata = {
  title: pageTitle("Not on the list"),
  robots: { index: false },
};

/**
 * Signed in with Clerk, but not in the `people` table (or revoked).
 *
 * Deliberately says nothing about who *is* on the list.
 */
export default function NoAccessPage() {
  return (
    <div className="screen-center">
      <div className="card" style={{ maxWidth: "44ch", textAlign: "center" }}>
        <h1 style={{ fontSize: "1.3rem", marginBottom: 10 }}>This one is private</h1>
        <p style={{ color: "var(--ink2)", fontSize: "0.95rem", margin: "0 0 18px" }}>
          You are signed in, but this account is not set up for {APP_NAME}. If that
          seems wrong, ask Wade to add you.
        </p>
        <a className="btn" href="/sign-out">
          Sign out
        </a>
      </div>
    </div>
  );
}
