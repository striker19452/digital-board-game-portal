import "./styles.css";
import { filterGames, playerLabel } from "./catalog";
import {
  defaultLocalHost,
  detectDefaultLaunchMode,
  normalizeLocalHost,
  resolveLaunchUrl,
} from "./launch";
import { games } from "./registry";
import type {
  GameManifest,
  GameStatus,
  LaunchMode,
  ModeFilter,
  PlayMode,
} from "./types";

const MODE_STORAGE_KEY = "board-game-portal-launch-mode";
const HOST_STORAGE_KEY = "board-game-portal-local-host";

const statusLabels: Record<GameStatus, string> = {
  available: "可游玩",
  beta: "测试中",
  "coming-soon": "即将推出",
  maintenance: "维护中",
};

const modeLabels: Record<PlayMode, string> = {
  solo: "单人",
  "local-multiplayer": "本地对战",
  ai: "电脑对战",
  online: "房间联机",
};

const filterOptions: Array<{ value: ModeFilter; label: string }> = [
  { value: "all", label: "全部" },
  { value: "solo", label: "单人" },
  { value: "local-multiplayer", label: "本地对战" },
  { value: "ai", label: "电脑" },
  { value: "online", label: "联机" },
];

function readStorage(key: string): string | null {
  try {
    return window.localStorage.getItem(key);
  } catch {
    return null;
  }
}

function writeStorage(key: string, value: string): void {
  try {
    window.localStorage.setItem(key, value);
  } catch {
    // Storage can be unavailable in strict privacy modes. The current session still works.
  }
}

function escapeHtml(value: string): string {
  return value
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;")
    .replaceAll("'", "&#039;");
}

function readInitialMode(): LaunchMode {
  const saved = readStorage(MODE_STORAGE_KEY);
  if (saved === "public" || saved === "local") return saved;
  return detectDefaultLaunchMode(window.location.hostname);
}

function readInitialHost(): string {
  const saved = readStorage(HOST_STORAGE_KEY);
  return (
    (saved ? normalizeLocalHost(saved) : null) ??
    defaultLocalHost(window.location.hostname)
  );
}

const state: {
  mode: LaunchMode;
  localHost: string;
  query: string;
  filter: ModeFilter;
} = {
  mode: readInitialMode(),
  localHost: readInitialHost(),
  query: "",
  filter: "all",
};

function gameModeText(game: GameManifest): string {
  return game.modes.map((mode) => modeLabels[mode]).join(" · ");
}

function launchState(game: GameManifest): {
  url: string | null;
  enabled: boolean;
  label: string;
} {
  const statusAllowsLaunch =
    game.status === "available" || game.status === "beta";
  const url = resolveLaunchUrl(game, state.mode, state.localHost);

  if (!statusAllowsLaunch) {
    return {
      url: null,
      enabled: false,
      label: game.status === "maintenance" ? "暂时维护" : "敬请期待",
    };
  }

  if (!url) {
    return {
      url: null,
      enabled: false,
      label: state.mode === "public" ? "公网待部署" : "本地未配置",
    };
  }

  return {
    url,
    enabled: true,
    label: state.mode === "public" ? "进入游戏" : "本地启动",
  };
}

function launchAction(game: GameManifest, className = ""): string {
  const launch = launchState(game);
  if (!launch.enabled || !launch.url) {
    return `<span class="launch-button is-disabled ${className}" aria-disabled="true">${escapeHtml(launch.label)}</span>`;
  }

  return `
    <a
      class="launch-button ${className}"
      href="${escapeHtml(launch.url)}"
      target="_blank"
      rel="noopener noreferrer"
      aria-label="${escapeHtml(`${launch.label}：${game.title}，在新标签页打开`)}"
    >
      <span>${escapeHtml(launch.label)}</span>
      <svg aria-hidden="true" viewBox="0 0 20 20">
        <path d="M7 4h9v9M16 4 8.5 11.5M14 10v5a1 1 0 0 1-1 1H5a1 1 0 0 1-1-1V7a1 1 0 0 1 1-1h5"/>
      </svg>
    </a>
  `;
}

function metadata(game: GameManifest): string {
  return `
    <span class="status status-${escapeHtml(game.status)}">${escapeHtml(statusLabels[game.status])}</span>
    <span>${escapeHtml(game.version)}</span>
    <span>${escapeHtml(playerLabel(game))}</span>
    <span>${escapeHtml(gameModeText(game))}</span>
  `;
}

function renderFeatured(game: GameManifest): string {
  const modeNotice = game.notice?.[state.mode];
  return `
    <article class="featured-game">
      <div class="featured-media">
        <img
          src="${escapeHtml(game.cover)}"
          alt="${escapeHtml(`${game.title}游戏封面`)}"
          width="1600"
          height="900"
        />
      </div>
      <div class="featured-copy">
        <p class="section-kicker">本馆精选</p>
        <div class="game-meta">${metadata(game)}</div>
        <h2>${escapeHtml(game.title)}</h2>
        ${
          game.originalTitle
            ? `<p class="original-title">${escapeHtml(game.originalTitle)}</p>`
            : ""
        }
        <p class="featured-summary">${escapeHtml(game.summary)}</p>
        ${
          modeNotice
            ? `<p class="environment-notice"><span aria-hidden="true">◆</span>${escapeHtml(modeNotice)}</p>`
            : ""
        }
        <div class="featured-actions">
          ${launchAction(game, "is-prominent")}
          <span class="launch-context">${state.mode === "public" ? "公网版本" : `${escapeHtml(state.localHost)} 本地服务`}</span>
        </div>
      </div>
    </article>
  `;
}

function renderCatalogItem(game: GameManifest, index: number): string {
  const modeNotice = game.notice?.[state.mode];
  return `
    <article class="catalog-item">
      <div class="catalog-index" aria-hidden="true">${String(index + 1).padStart(2, "0")}</div>
      <div class="catalog-cover">
        <img
          src="${escapeHtml(game.cover)}"
          alt="${escapeHtml(`${game.title}游戏封面`)}"
          width="640"
          height="360"
          loading="lazy"
        />
      </div>
      <div class="catalog-copy">
        <div class="game-meta">${metadata(game)}</div>
        <h3>${escapeHtml(game.title)}</h3>
        ${
          game.originalTitle
            ? `<p class="original-title">${escapeHtml(game.originalTitle)}</p>`
            : ""
        }
        <p>${escapeHtml(game.summary)}</p>
        <ul class="tag-list" aria-label="游戏标签">
          ${game.tags.map((tag) => `<li>${escapeHtml(tag)}</li>`).join("")}
        </ul>
        ${
          modeNotice
            ? `<p class="environment-notice"><span aria-hidden="true">◆</span>${escapeHtml(modeNotice)}</p>`
            : ""
        }
      </div>
      <div class="catalog-action">
        ${launchAction(game)}
      </div>
    </article>
  `;
}

function renderEmptyState(): string {
  return `
    <div class="empty-state">
      <span aria-hidden="true">◇</span>
      <h3>没有找到这类游戏</h3>
      <p>换一个关键词，或清除当前筛选。</p>
      <button class="text-button" type="button" data-action="reset-filters">清除筛选</button>
    </div>
  `;
}

function requiredElement<T extends Element>(selector: string): T {
  const element = document.querySelector<T>(selector);
  if (!element) throw new Error(`Required portal element was not found: ${selector}`);
  return element;
}

const app = requiredElement<HTMLDivElement>("#app");

app.innerHTML = `
  <header class="site-header">
    <a class="brand" href="./" aria-label="数字桌游馆首页">
      <span class="brand-mark" aria-hidden="true">
        <svg viewBox="0 0 32 32">
          <path d="M16 2.5 27.7 9v14L16 29.5 4.3 23V9L16 2.5Z"/>
          <path d="m10.5 12 5.5-3 5.5 3v8L16 23l-5.5-3v-8Z"/>
          <circle cx="16" cy="16" r="1.5"/>
        </svg>
      </span>
      <span>
        <strong>数字桌游馆</strong>
        <small>PRIVATE TABLETOP COLLECTION</small>
      </span>
    </a>

    <div class="header-tools">
      <div class="mode-switch" role="group" aria-label="游戏启动环境">
        <button type="button" data-launch-mode="public">公网</button>
        <button type="button" data-launch-mode="local">本地</button>
      </div>

      <details class="host-settings">
        <summary>
          <svg aria-hidden="true" viewBox="0 0 20 20">
            <path d="M4 6.5h12M4 13.5h12M7 4v5M13 11v5"/>
          </svg>
          本地主机
        </summary>
        <form class="host-panel" id="host-form" novalidate>
          <label for="local-host">运行游戏的电脑地址</label>
          <div class="host-field">
            <input
              id="local-host"
              name="localHost"
              type="text"
              inputmode="url"
              autocomplete="off"
              spellcheck="false"
              aria-describedby="host-help host-error"
            />
            <button type="submit">保存</button>
          </div>
          <p id="host-help">本机使用 127.0.0.1，局域网设备填写运行启动器的电脑 IP。</p>
          <p id="host-error" class="field-error" role="alert"></p>
        </form>
      </details>
    </div>
  </header>

  <main>
    <section class="intro" aria-labelledby="page-title">
      <p class="eyebrow">STRIKER1945 的数字收藏</p>
      <h1 id="page-title">今晚，<br />玩哪一局？</h1>
      <div class="intro-support">
        <p>三个独立世界，一个可靠入口。选择运行环境，带上你的策略，然后开始。</p>
        <div class="collection-note">
          <span class="collection-rule" aria-hidden="true"></span>
          <span><strong>${games.length} 款馆藏</strong><small>清单驱动，持续增加</small></span>
        </div>
      </div>
    </section>

    <section class="featured-section" aria-label="精选游戏">
      <div id="featured-content"></div>
    </section>

    <section class="catalog-section" id="catalog" aria-labelledby="catalog-title">
      <div class="section-heading">
        <div>
          <p class="section-kicker">完整目录</p>
          <h2 id="catalog-title">选择你的桌面</h2>
        </div>
        <p id="result-count" class="result-count" aria-live="polite"></p>
      </div>

      <div class="catalog-tools">
        <label class="search-field" for="game-search">
          <svg aria-hidden="true" viewBox="0 0 20 20">
            <circle cx="8.5" cy="8.5" r="5.5"/>
            <path d="m13 13 4 4"/>
          </svg>
          <span class="sr-only">搜索游戏</span>
          <input id="game-search" type="search" placeholder="搜索标题、玩法或标签" autocomplete="off" />
        </label>
        <div class="filter-list" role="group" aria-label="按游玩模式筛选">
          ${filterOptions
            .map(
              (option) =>
                `<button type="button" class="filter-chip" data-filter="${option.value}">${option.label}</button>`,
            )
            .join("")}
        </div>
      </div>

      <div class="catalog-list" id="catalog-list"></div>
    </section>
  </main>

  <footer>
    <p>每款游戏保持独立，存档与房间不会被门户读取。</p>
    <a href="https://github.com/striker19452" target="_blank" rel="noopener noreferrer">
      GitHub
      <svg aria-hidden="true" viewBox="0 0 20 20">
        <path d="M7 4h9v9M16 4 8.5 11.5M14 10v5a1 1 0 0 1-1 1H5a1 1 0 0 1-1-1V7a1 1 0 0 1 1-1h5"/>
      </svg>
    </a>
  </footer>
`;

const featuredContent =
  requiredElement<HTMLDivElement>("#featured-content");
const catalogList = requiredElement<HTMLDivElement>("#catalog-list");
const resultCount =
  requiredElement<HTMLParagraphElement>("#result-count");
const searchInput = requiredElement<HTMLInputElement>("#game-search");
const hostInput = requiredElement<HTMLInputElement>("#local-host");
const hostError = requiredElement<HTMLParagraphElement>("#host-error");

hostInput.value = state.localHost;

function renderDynamicContent(): void {
  const visibleGames = filterGames(games, state.query, state.filter);
  const showFeatured = state.query.trim() === "" && state.filter === "all";
  const featured = games.find((game) => game.featured) ?? games[0];

  featuredContent.innerHTML =
    showFeatured && featured ? renderFeatured(featured) : "";
  featuredContent.closest<HTMLElement>(".featured-section")?.toggleAttribute(
    "hidden",
    !showFeatured || !featured,
  );

  catalogList.innerHTML = visibleGames.length
    ? visibleGames.map(renderCatalogItem).join("")
    : renderEmptyState();
  resultCount.textContent = `显示 ${visibleGames.length} / ${games.length} 款`;

  document.querySelectorAll<HTMLButtonElement>("[data-launch-mode]").forEach(
    (button) => {
      const active = button.dataset.launchMode === state.mode;
      button.classList.toggle("is-active", active);
      button.setAttribute("aria-pressed", String(active));
    },
  );

  document.querySelectorAll<HTMLButtonElement>("[data-filter]").forEach(
    (button) => {
      const active = button.dataset.filter === state.filter;
      button.classList.toggle("is-active", active);
      button.setAttribute("aria-pressed", String(active));
    },
  );
}

app.addEventListener("click", (event) => {
  const target = event.target as HTMLElement;
  const launchModeButton = target.closest<HTMLButtonElement>(
    "[data-launch-mode]",
  );
  if (launchModeButton) {
    const nextMode = launchModeButton.dataset.launchMode;
    if (nextMode === "public" || nextMode === "local") {
      state.mode = nextMode;
      writeStorage(MODE_STORAGE_KEY, nextMode);
      renderDynamicContent();
    }
    return;
  }

  const filterButton = target.closest<HTMLButtonElement>("[data-filter]");
  if (filterButton) {
    const nextFilter = filterButton.dataset.filter as ModeFilter | undefined;
    if (nextFilter && filterOptions.some((option) => option.value === nextFilter)) {
      state.filter = nextFilter;
      renderDynamicContent();
    }
    return;
  }

  if (target.closest("[data-action='reset-filters']")) {
    state.query = "";
    state.filter = "all";
    searchInput.value = "";
    renderDynamicContent();
    searchInput.focus();
  }
});

searchInput.addEventListener("input", () => {
  state.query = searchInput.value;
  renderDynamicContent();
});

document.querySelector<HTMLFormElement>("#host-form")?.addEventListener(
  "submit",
  (event) => {
    event.preventDefault();
    const normalized = normalizeLocalHost(hostInput.value);
    if (!normalized) {
      hostError.textContent = "请输入有效的主机名或 IPv4 地址，不要包含协议、端口或路径。";
      hostInput.setAttribute("aria-invalid", "true");
      hostInput.focus();
      return;
    }

    hostError.textContent = "";
    hostInput.removeAttribute("aria-invalid");
    hostInput.value = normalized;
    state.localHost = normalized;
    writeStorage(HOST_STORAGE_KEY, normalized);
    renderDynamicContent();
  },
);

renderDynamicContent();
