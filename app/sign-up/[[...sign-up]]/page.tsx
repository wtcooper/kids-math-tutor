import type { Metadata } from "next";
import { SignUp } from "@clerk/nextjs";

export const metadata: Metadata = {
  title: "Sign up — The Math Table",
  robots: { index: false },
};

// Reachable only to finish an invitation — Clerk's restricted mode refuses anyone
// uninvited, and the people table refuses anyone not on it even if they get an account.
export default function SignUpPage() {
  return (
    <div className="screen-center">
      <SignUp />
    </div>
  );
}
