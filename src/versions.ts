import type { VersionSource } from "./types";

const VERSION_PATTERN = /^v?\d+(?:\.\d+){0,3}(?:[-+][0-9A-Za-z.-]+)?$/;

function normalizeVersion(value: unknown): string {
  if (typeof value !== "string" || !VERSION_PATTERN.test(value.trim())) {
    throw new Error("The game version is missing or invalid.");
  }

  const version = value.trim();
  return version.startsWith("v") ? version : `v${version}`;
}

export function parseGameVersion(
  source: VersionSource,
  content: string,
): string {
  if (source.format === "package-json") {
    const packageInfo = JSON.parse(content) as { version?: unknown };
    return normalizeVersion(packageInfo.version);
  }

  const match = content.match(
    /\bGAME_VERSION\s*=\s*Object\.freeze\s*\(\s*\{[\s\S]*?\bnumber\s*:\s*["']([^"']+)["']/,
  );
  return normalizeVersion(match?.[1]);
}

export async function fetchGameVersion(
  source: VersionSource,
  fetcher: typeof fetch = fetch,
): Promise<string> {
  const response = await fetcher(source.url, {
    cache: "no-cache",
    headers: { Accept: "application/json, text/plain;q=0.9, */*;q=0.1" },
    signal: AbortSignal.timeout(8_000),
  });
  if (!response.ok) {
    throw new Error(`Version request failed with HTTP ${response.status}.`);
  }
  return parseGameVersion(source, await response.text());
}
