import { describe, expect, it, vi } from "vitest";
import { fetchGameVersion, parseGameVersion } from "./versions";

describe("game versions", () => {
  it("reads and normalizes a package.json version", () => {
    expect(
      parseGameVersion(
        { url: "https://example.com/package.json", format: "package-json" },
        '{"version":"1.2.3"}',
      ),
    ).toBe("v1.2.3");
  });

  it("reads the release number from a game version script", () => {
    expect(
      parseGameVersion(
        {
          url: "https://example.com/version.js",
          format: "game-version-script",
        },
        "const GAME_VERSION = Object.freeze({ number: '2.4.1', saveSchema: 1 });",
      ),
    ).toBe("v2.4.1");
  });

  it("rejects invalid version content", () => {
    expect(() =>
      parseGameVersion(
        { url: "https://example.com/package.json", format: "package-json" },
        '{"version":"latest"}',
      ),
    ).toThrow("invalid");
  });

  it("rejects an unsuccessful response", async () => {
    const fetcher = vi.fn<typeof fetch>().mockResolvedValue(
      new Response("missing", { status: 404 }),
    );
    await expect(
      fetchGameVersion(
        { url: "https://example.com/package.json", format: "package-json" },
        fetcher,
      ),
    ).rejects.toThrow("HTTP 404");
  });
});
