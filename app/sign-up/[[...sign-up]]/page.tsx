import type { Metadata } from "next";
import { SignUp } from "@clerk/nextjs";

export const metadata: Metadata = {
  title: "Sign up — The Math Table",
  robots: { index: false },
};

// Reachable only to finish an invitation — Clerk's restricted mode refuses
// anyone without one.
export default function SignUpPage() {
  return <SignUp />;
}
