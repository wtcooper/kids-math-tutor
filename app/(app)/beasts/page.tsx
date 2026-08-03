import type { Metadata } from "next";
import { requireAllowedPerson } from "@/lib/auth/person";
import { pageTitle } from "@/lib/app";
import { BeastBook } from "@/components/beasts/BeastBook";

export const metadata: Metadata = { title: pageTitle("The Beast Book") };

export default async function BeastsPage() {
  await requireAllowedPerson();
  return <BeastBook />;
}
