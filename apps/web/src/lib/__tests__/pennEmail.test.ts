import { describe, it, expect } from "vitest";
import { isPennEmail } from "../pennEmail";

describe("isPennEmail", () => {
  it("accepts upenn.edu and Penn schools' subdomains, in any case", () => {
    for (const email of ["ada@upenn.edu", "ada@wharton.upenn.edu", "ada@seas.upenn.edu", "Ada@UPENN.EDU"]) {
      expect(isPennEmail(email), email).toBe(true);
    }
  });

  it("rejects other domains, including look-alikes", () => {
    for (const email of [
      "ada@gmail.com",
      "ada@upenn.edu.evil.com",
      "ada@notupenn.edu",
      "ada@fakeupenn.edu",
      "upenn.edu@gmail.com",
      "ada@",
      "@upenn.edu",
      "upenn.edu",
      "",
      null,
      undefined,
    ]) {
      expect(isPennEmail(email), String(email)).toBe(false);
    }
  });
});
