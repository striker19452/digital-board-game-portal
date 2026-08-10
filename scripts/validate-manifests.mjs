import { access, readFile, readdir } from "node:fs/promises";
import { constants } from "node:fs";
import { dirname, join, resolve } from "node:path";
import { fileURLToPath } from "node:url";

const scriptDirectory = dirname(fileURLToPath(import.meta.url));
const projectRoot = resolve(scriptDirectory, "..");
const gamesDirectory = join(projectRoot, "src", "games");
const publicDirectory = join(projectRoot, "public");

const statuses = new Set([
  "available",
  "beta",
  "coming-soon",
  "maintenance",
]);
const modes = new Set(["solo", "local-multiplayer", "ai", "online"]);
const runtimes = new Set(["static", "vite", "node"]);
const versionSourceFormats = new Set([
  "package-json",
  "game-version-script",
]);

function assert(condition, message, errors) {
  if (!condition) errors.push(message);
}

function isNonEmptyString(value) {
  return typeof value === "string" && value.trim().length > 0;
}

async function pathExists(path) {
  try {
    await access(path, constants.F_OK);
    return true;
  } catch {
    return false;
  }
}

export async function loadManifests() {
  const names = (await readdir(gamesDirectory))
    .filter((name) => name.endsWith(".json"))
    .sort();

  return Promise.all(
    names.map(async (name) => {
      const path = join(gamesDirectory, name);
      const content = await readFile(path, "utf8");
      return { name, path, manifest: JSON.parse(content) };
    }),
  );
}

export async function validateManifests() {
  const entries = await loadManifests();
  const errors = [];
  const ids = new Map();
  const ports = new Map([[4173, "portal"]]);
  let featuredCount = 0;

  assert(entries.length > 0, "No game manifests were found.", errors);

  for (const { name, manifest: game } of entries) {
    const label = `[${name}]`;
    assert(isNonEmptyString(game.id), `${label} id is required.`, errors);
    assert(isNonEmptyString(game.title), `${label} title is required.`, errors);
    assert(
      isNonEmptyString(game.summary),
      `${label} summary is required.`,
      errors,
    );
    assert(
      versionSourceFormats.has(game.versionSource?.format),
      `${label} versionSource format is invalid.`,
      errors,
    );
    if (isNonEmptyString(game.versionSource?.url)) {
      try {
        const parsed = new URL(game.versionSource.url);
        assert(
          parsed.protocol === "https:",
          `${label} versionSource URL must use HTTPS.`,
          errors,
        );
      } catch {
        errors.push(`${label} versionSource URL is invalid.`);
      }
    } else {
      errors.push(`${label} versionSource URL is required.`);
    }
    assert(statuses.has(game.status), `${label} status is invalid.`, errors);
    assert(Array.isArray(game.tags), `${label} tags must be an array.`, errors);
    assert(
      Array.isArray(game.modes) &&
        game.modes.length > 0 &&
        game.modes.every((mode) => modes.has(mode)),
      `${label} modes contain an unsupported value.`,
      errors,
    );
    assert(
      Number.isInteger(game.players?.min) &&
        Number.isInteger(game.players?.max) &&
        game.players.min > 0 &&
        game.players.min <= game.players.max,
      `${label} players must contain a valid min/max range.`,
      errors,
    );

    if (game.id) {
      assert(!ids.has(game.id), `${label} duplicates id "${game.id}".`, errors);
      ids.set(game.id, name);
    }

    if (game.featured) featuredCount += 1;

    assert(
      isNonEmptyString(game.cover),
      `${label} cover is required.`,
      errors,
    );
    if (isNonEmptyString(game.cover)) {
      const normalizedCover = game.cover.replace(/^\.?\//, "");
      const coverPath = resolve(publicDirectory, normalizedCover);
      assert(
        coverPath.startsWith(publicDirectory),
        `${label} cover must stay inside public/.`,
        errors,
      );
      assert(
        await pathExists(coverPath),
        `${label} cover does not exist: ${game.cover}`,
        errors,
      );
    }

    const publicUrl = game.launch?.public;
    const local = game.launch?.local;
    assert(
      Boolean(publicUrl || local),
      `${label} requires at least one public or local launch target.`,
      errors,
    );

    if (publicUrl) {
      try {
        const parsed = new URL(publicUrl);
        assert(
          parsed.protocol === "https:",
          `${label} public launch URL must use HTTPS.`,
          errors,
        );
      } catch {
        errors.push(`${label} public launch URL is invalid.`);
      }
    }

    if (local) {
      assert(
        runtimes.has(local.runtime),
        `${label} local runtime is unsupported.`,
        errors,
      );
      assert(
        isNonEmptyString(local.directory),
        `${label} local directory is required.`,
        errors,
      );
      assert(
        Number.isInteger(local.port) &&
          local.port >= 1024 &&
          local.port <= 65535,
        `${label} local port must be between 1024 and 65535.`,
        errors,
      );
      assert(
        isNonEmptyString(local.path) && local.path.startsWith("/"),
        `${label} local path must start with "/".`,
        errors,
      );

      if (Number.isInteger(local.port)) {
        assert(
          !ports.has(local.port),
          `${label} local port ${local.port} conflicts with ${ports.get(local.port)}.`,
          errors,
        );
        ports.set(local.port, game.id);
      }
    }
  }

  assert(featuredCount <= 1, "Only one game can be featured.", errors);
  return { entries, errors };
}

if (process.argv[1] === fileURLToPath(import.meta.url)) {
  const { entries, errors } = await validateManifests();
  if (errors.length) {
    console.error(`Manifest validation failed with ${errors.length} error(s):`);
    for (const error of errors) console.error(`- ${error}`);
    process.exitCode = 1;
  } else {
    console.log(`Validated ${entries.length} game manifests.`);
  }
}
