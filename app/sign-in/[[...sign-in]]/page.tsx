import type { Metadata } from "next";
import { pageTitle } from "@/lib/app";
import { SignIn } from "@clerk/nextjs";

export const metadata: Metadata = {
  title: pageTitle("Sign in"),
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
