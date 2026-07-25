import type { GameManifest } from "./types";

const modules = import.meta.glob<GameManifest>("./games/*.json", {
  eager: true,
  import: "default",
});

export const games = Object.values(modules).sort((left, right) => {
  if (left.featured !== right.featured) return left.featured ? -1 : 1;
  return left.title.localeCompare(right.title, "zh-CN");
});
