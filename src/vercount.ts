const VERCOUNT_SCRIPT_URL = "https://events.vercount.one/js";
const COUNTER_TIMEOUT_MS = 8_000;

type CounterState = "local" | "ready" | "unavailable";

function hasCounterValue(element: HTMLElement): boolean {
  return /\d/.test(element.textContent ?? "");
}

/**
 * Loads Vercount as a non-critical enhancement after the portal has rendered.
 * Network errors, service errors and timeouts only change the counter's own
 * fallback state; they never interrupt the catalog or launch controls.
 */
export function initVercount(isLocalEnvironment: boolean): void {
  const counter = document.querySelector<HTMLElement>("[data-vercount]");
  const pageViews = document.querySelector<HTMLElement>(
    "#vercount_value_page_pv",
  );

  if (!counter || !pageViews) return;

  let settled = false;
  let timeoutId = 0;
  let observer: MutationObserver | undefined;

  const settle = (state: CounterState): void => {
    if (settled) return;
    settled = true;
    window.clearTimeout(timeoutId);
    observer?.disconnect();
    counter.dataset.state = state;

    if (state === "ready") {
      counter.setAttribute(
        "aria-label",
        `本页累计访问 ${pageViews.textContent ?? ""} 次`,
      );
    } else if (state === "local") {
      counter.setAttribute("aria-label", "本地浏览不计入访问统计");
    } else {
      counter.setAttribute("aria-label", "访问统计暂不可用");
    }
  };

  const detectValues = (): void => {
    if (hasCounterValue(pageViews)) {
      settle("ready");
    }
  };

  try {
    if (isLocalEnvironment) {
      settle("local");
      return;
    }

    observer = new MutationObserver(detectValues);
    observer.observe(pageViews, {
      childList: true,
      characterData: true,
      subtree: true,
    });

    const script = document.createElement("script");
    script.src = VERCOUNT_SCRIPT_URL;
    script.async = true;
    script.dataset.vercountScript = "";
    script.addEventListener("load", detectValues, { once: true });
    script.addEventListener("error", () => settle("unavailable"), {
      once: true,
    });
    document.head.append(script);

    timeoutId = window.setTimeout(
      () => settle("unavailable"),
      COUNTER_TIMEOUT_MS,
    );
  } catch {
    settle("unavailable");
  }
}
