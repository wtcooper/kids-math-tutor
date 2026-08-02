import { describe, expect, it } from "vitest";
import { tutorHref } from "@/lib/topics";
describe("tutorHref", () => {
  it("points at the single-page tutor, not a per-topic route", () => {
    expect(tutorHref("factors")).toBe("/tutor?topic=factors");
    expect(tutorHref("mul", { level: 3, mode: "try" })).toBe(
      "/tutor?topic=mul&level=3&mode=try",
    );
  });
});
