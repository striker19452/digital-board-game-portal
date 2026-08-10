import { describe, expect, it } from "vitest";
import {
  defaultLocalHost,
  detectDefaultLaunchMode,
  isLocalEnvironment,
  normalizeLocalHost,
  resolveLaunchUrl,
} from "./launch";
import type { GameManifest } from "./types";

const game: GameManifest = {
  id: "test",
  title: "测试",
  summary: "测试",
  cover: "covers/test.webp",
  version: "v1",
  versionSource: {
    url: "https://example.com/package.json",
    format: "package-json",
  },
  status: "available",
  modes: ["solo"],
  players: { min: 1, max: 1 },
  tags: [],
  launch: {
    public: "https://example.com/game/",
    local: {
      runtime: "static",
      directory: "../test",
      port: 4199,
      path: "/play/",
    },
  },
};

describe("launch environment", () => {
  it.each(["localhost", "127.0.0.1", "192.168.1.20", "172.16.2.3"])(
    "treats %s as local",
    (host) => expect(isLocalEnvironment(host)).toBe(true),
  );

  it("defaults public hosts to public mode", () => {
    expect(detectDefaultLaunchMode("striker19452.github.io")).toBe("public");
    expect(defaultLocalHost("striker19452.github.io")).toBe("127.0.0.1");
  });

  it("normalizes safe hostnames and rejects URLs", () => {
    expect(normalizeLocalHost(" 192.168.1.8 ")).toBe("192.168.1.8");
    expect(normalizeLocalHost("tabletop.local")).toBe("tabletop.local");
    expect(normalizeLocalHost("https://example.com")).toBeNull();
    expect(normalizeLocalHost("999.1.1.1")).toBeNull();
  });

  it("builds public and local launch URLs", () => {
    expect(resolveLaunchUrl(game, "public", "127.0.0.1")).toBe(
      "https://example.com/game/",
    );
    expect(resolveLaunchUrl(game, "local", "192.168.1.20")).toBe(
      "http://192.168.1.20:4199/play/",
    );
  });
});
