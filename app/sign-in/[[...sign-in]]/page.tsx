import type { Metadata } from "next";
import { SignIn } from "@clerk/nextjs";

export const metadata: Metadata = {
  title: "Sign in — The Math Table",
  robots: { index: false },
};

export default function SignInPage() {
  return <SignIn />;
}
