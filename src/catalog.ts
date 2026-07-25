import type { GameManifest, ModeFilter } from "./types";

function searchableText(game: GameManifest): string {
  return [
    game.title,
    game.originalTitle,
    game.summary,
    game.version,
    ...game.tags,
  ]
    .filter(Boolean)
    .join(" ")
    .toLocaleLowerCase("zh-CN");
}

export function filterGames(
  games: GameManifest[],
  query: string,
  mode: ModeFilter,
): GameManifest[] {
  const normalizedQuery = query.trim().toLocaleLowerCase("zh-CN");
  return games.filter((game) => {
    const matchesQuery =
      !normalizedQuery || searchableText(game).includes(normalizedQuery);
    const matchesMode = mode === "all" || game.modes.includes(mode);
    return matchesQuery && matchesMode;
  });
}

export function playerLabel(game: GameManifest): string {
  const { min, max } = game.players;
  return min === max ? `${min} 人` : `${min}–${max} 人`;
}
