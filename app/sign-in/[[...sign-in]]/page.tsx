import type { Metadata } from "next";
import { SignIn } from "@clerk/nextjs";

export const metadata: Metadata = {
  title: "Sign in — The Math Table",
  robots: { index: false },
};

// .screen-center rather than relying on body centring: body used to be a centring grid,
// which a full landing page cannot live inside.
export default function SignInPage() {
  return (
    <div className="screen-center">
      <SignIn />
    </div>
  );
}
