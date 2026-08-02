import type { Metadata } from "next";
import { pageTitle } from "@/lib/app";
import { ClerkProvider } from "@clerk/nextjs";
import "./globals.css";

export const metadata: Metadata = {
  title: pageTitle(),
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  // afterSignOutUrl matters: without it sign-out returns to a gated route and
  // the user watches a redirect they cannot see flash past.
  return (
    <ClerkProvider afterSignOutUrl="/sign-in">
      <html lang="en">
        <body>{children}</body>
      </html>
    </ClerkProvider>
  );
}
