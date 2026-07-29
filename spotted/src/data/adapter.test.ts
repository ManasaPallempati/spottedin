import { describe, expect, it } from "vitest";
import { resolveDataMode } from "./adapter";
import { createMockAdapter } from "./mock";

describe("resolveDataMode", () => {
  it("defaults to mock with zero credentials", () => {
    expect(resolveDataMode({})).toBe("mock");
  });

  it("honors an explicit SPOTTED_DATA_MODE", () => {
    expect(resolveDataMode({ SPOTTED_DATA_MODE: "mock", NEXT_PUBLIC_SUPABASE_URL: "x", NEXT_PUBLIC_SUPABASE_ANON_KEY: "y" })).toBe("mock");
    expect(resolveDataMode({ SPOTTED_DATA_MODE: "supabase" })).toBe("supabase");
  });

  it("auto-selects supabase only when both env vars exist", () => {
    expect(resolveDataMode({ NEXT_PUBLIC_SUPABASE_URL: "x" })).toBe("mock");
    expect(resolveDataMode({ NEXT_PUBLIC_SUPABASE_URL: "x", NEXT_PUBLIC_SUPABASE_ANON_KEY: "y" })).toBe("supabase");
  });
});

describe("mock adapter", () => {
  const data = createMockAdapter();

  it("serves the 10 seed listings", async () => {
    expect(await data.listListings()).toHaveLength(10);
  });

  it("filters by category and query", async () => {
    const shoes = await data.listListings({ category: "SHOES" });
    expect(shoes.map((l) => l.title)).toEqual(["1461 LOAFERS", "SAMBA OG"]);
    const y2k = await data.listListings({ query: "y2k" });
    expect(y2k.length).toBeGreaterThan(0);
  });

  it("returns null for unknown ids", async () => {
    expect(await data.getListing("nope")).toBeNull();
    expect(await data.getListing("4")).not.toBeNull();
  });

  it("serves sellers, fits, threads, orders", async () => {
    expect((await data.getSeller("y2kcloset"))?.rating).toBe(5.0);
    expect(await data.listFits()).toHaveLength(3);
    expect(await data.listThreads()).toHaveLength(1);
    expect((await data.getThread("t1"))?.messages.length).toBe(3);
    expect((await data.getOrder("o1"))?.carrier).toBe("USPS");
  });
});
