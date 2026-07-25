import { describe, expect, it } from "vitest";
import { filterGames, playerLabel } from "./catalog";
import type { GameManifest } from "./types";

const games: GameManifest[] = [
  {
    id: "solo",
    title: "单人冒险",
    originalTitle: "Solo Adventure",
    summary: "掷骰探索",
    cover: "covers/solo.webp",
    version: "v1",
    status: "available",
    modes: ["solo"],
    players: { min: 1, max: 1 },
    tags: ["骰子"],
    launch: {},
  },
  {
    id: "duel",
    title: "双人对决",
    summary: "隐藏信息",
    cover: "covers/duel.webp",
    version: "v1",
    status: "beta",
    modes: ["local-multiplayer", "online"],
    players: { min: 1, max: 2 },
    tags: ["联机"],
    launch: {},
  },
];

describe("catalog", () => {
  it("searches title, original title, summary and tags", () => {
    expect(filterGames(games, "solo", "all")).toHaveLength(1);
    expect(filterGames(games, "隐藏", "all")[0]?.id).toBe("duel");
    expect(filterGames(games, "骰子", "all")[0]?.id).toBe("solo");
  });

  it("combines query and mode filters", () => {
    expect(filterGames(games, "对决", "online")[0]?.id).toBe("duel");
    expect(filterGames(games, "对决", "solo")).toHaveLength(0);
  });

  it("formats fixed and ranged player counts", () => {
    expect(playerLabel(games[0]!)).toBe("1 人");
    expect(playerLabel(games[1]!)).toBe("1–2 人");
  });
});
