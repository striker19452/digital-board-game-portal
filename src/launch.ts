import type { GameManifest, LaunchMode } from "./types";

const privateIpv4Patterns = [
  /^10\./,
  /^127\./,
  /^169\.254\./,
  /^192\.168\./,
  /^172\.(1[6-9]|2\d|3[01])\./,
];

export function isLocalEnvironment(hostname: string): boolean {
  const host = hostname.trim().toLowerCase().replace(/^\[|\]$/g, "");
  return (
    host === "localhost" ||
    host === "::1" ||
    host.endsWith(".local") ||
    privateIpv4Patterns.some((pattern) => pattern.test(host))
  );
}

export function detectDefaultLaunchMode(hostname: string): LaunchMode {
  return isLocalEnvironment(hostname) ? "local" : "public";
}

export function normalizeLocalHost(value: string): string | null {
  const candidate = value.trim().toLowerCase();
  if (!candidate || candidate.length > 253) return null;
  if (candidate.includes("://") || /[/?#\s]/.test(candidate)) return null;

  const ipv4Parts = candidate.split(".");
  if (
    ipv4Parts.length === 4 &&
    ipv4Parts.every((part) => /^\d{1,3}$/.test(part))
  ) {
    return ipv4Parts.every((part) => Number(part) <= 255) ? candidate : null;
  }

  if (
    candidate === "localhost" ||
    candidate
      .split(".")
      .every(
        (label) =>
          label.length > 0 &&
          label.length <= 63 &&
          /^[a-z0-9](?:[a-z0-9-]*[a-z0-9])?$/.test(label),
      )
  ) {
    return candidate;
  }

  return null;
}

export function defaultLocalHost(pageHostname: string): string {
  return isLocalEnvironment(pageHostname) ? pageHostname : "127.0.0.1";
}

export function resolveLaunchUrl(
  game: GameManifest,
  mode: LaunchMode,
  localHost: string,
): string | null {
  if (mode === "public") return game.launch.public ?? null;
  if (!game.launch.local) return null;

  const path = game.launch.local.path.startsWith("/")
    ? game.launch.local.path
    : `/${game.launch.local.path}`;
  return `http://${localHost}:${game.launch.local.port}${path}`;
}
