import { expect, test, type Page } from "@playwright/test";
import type {
  BrowserSpeechRecognition,
  VoiceResultEvent,
} from "../../src/hooks/useVoiceSearch";
type Harness = {
  result: (text: string, final?: boolean) => void;
  late: (text: string) => void;
  error: (code: string) => void;
  end: () => void;
  started: number;
  aborted: number;
  stopped: number;
  config: Record<string, unknown>;
};
declare global {
  interface Window {
    __voiceTest: Harness;
  }
}
async function mockSpeech(
  page: Page,
  mode: "standard" | "prefixed" | "unsupported" = "standard",
) {
  await page.addInitScript((mode) => {
    const current: { instance?: FakeRecognition } = {};
    let late: ((event: VoiceResultEvent) => void) | null = null;
    const event = (text: string, final = false): VoiceResultEvent => ({
      resultIndex: 0,
      results: {
        length: 1,
        0: { length: 1, isFinal: final, 0: { transcript: text } },
      },
    });
    class FakeRecognition implements BrowserSpeechRecognition {
      lang = "";
      interimResults = false;
      continuous = true;
      maxAlternatives = 5;
      onstart: (() => void) | null = null;
      onend: (() => void) | null = null;
      onspeechend: (() => void) | null = null;
      onresult: ((e: VoiceResultEvent) => void) | null = null;
      onerror: ((e: { error: string }) => void) | null = null;
      constructor() {
        current.instance = this;
      }
      start() {
        window.__voiceTest.started++;
        window.__voiceTest.config = {
          lang: this.lang,
          interimResults: this.interimResults,
          continuous: this.continuous,
          maxAlternatives: this.maxAlternatives,
        };
        late = this.onresult;
        this.onstart?.();
      }
      stop() {
        window.__voiceTest.stopped++;
      }
      abort() {
        window.__voiceTest.aborted++;
      }
    }
    window.__voiceTest = {
      result: (text, final = false) =>
        current.instance?.onresult?.(event(text, final)),
      late: (text) => late?.(event(text, true)),
      error: (code) => current.instance?.onerror?.({ error: code }),
      end: () => current.instance?.onend?.(),
      started: 0,
      aborted: 0,
      stopped: 0,
      config: {},
    };
    Object.defineProperty(window, "SpeechRecognition", {
      value: mode === "standard" ? FakeRecognition : undefined,
      configurable: true,
    });
    Object.defineProperty(window, "webkitSpeechRecognition", {
      value: mode === "prefixed" ? FakeRecognition : undefined,
      configurable: true,
    });
  }, mode);
}
test("keyboard voice input, interim/final review, typing cancellation and persisted hint", async ({
  page,
}) => {
  await mockSpeech(page);
  const errors: string[] = [];
  page.on("pageerror", (e) => errors.push(e.message));
  let submissions = 0;
  page.on("request", (r) => {
    if (r.url().includes("/api/search/parse")) submissions++;
  });
  await page.goto("/");
  const mic = page.getByRole("button", {
    name: "Start voice search",
    exact: true,
  });
  await mic.focus();
  await page.keyboard.press("Enter");
  await expect(
    page.getByRole("button", { name: "Stop voice search" }),
  ).toHaveAttribute("aria-pressed", "true");
  await expect(page.getByRole("tooltip")).toContainText("Try saying:");
  await page.getByRole("button", { name: "Dismiss voice tip" }).click();
  expect(
    await page.evaluate(() =>
      localStorage.getItem("nestwell.voice-hint-dismissed.v1"),
    ),
  ).toBe("true");
  expect(await page.evaluate(() => window.__voiceTest.config)).toEqual({
    lang: "en-GB",
    interimResults: true,
    continuous: false,
    maxAlternatives: 1,
  });
  await page.evaluate(() => window.__voiceTest.result("three bed house"));
  await expect(
    page.locator('[role="status"][aria-live="polite"]'),
  ).toContainText("Listening: three bed house");
  const input = page.getByRole("searchbox", {
    name: "Describe your ideal home",
  });
  await expect(input).toHaveValue("");
  await page.evaluate(() =>
    window.__voiceTest.result("3-bed house in London under £600k", true),
  );
  await expect(input).toHaveValue("3-bed house in London under £600k");
  await expect(input).toBeFocused();
  expect(submissions).toBe(0);
  expect(new URL(page.url()).pathname).toBe("/");
  await input.fill("My edited query");
  await page.evaluate(() =>
    window.__voiceTest.late("Late speech must not replace edits"),
  );
  await expect(input).toHaveValue("My edited query");
  await mic.focus();
  await page.keyboard.press("Space");
  await expect(
    page.getByRole("button", { name: "Stop voice search" }),
  ).toBeVisible();
  await input.fill("Typed while listening");
  await page.evaluate(() => window.__voiceTest.late("Another late event"));
  await expect(input).toHaveValue("Typed while listening");
  await expect(mic).toBeVisible();
  expect(await page.evaluate(() => window.__voiceTest.aborted)).toBeGreaterThan(
    0,
  );
  await page.reload();
  await page.getByRole("button", { name: "Start voice search" }).click();
  await expect(page.getByRole("tooltip")).toHaveCount(0);
  await page.keyboard.press("Escape");
  await input.fill("Buy a studio in Leeds");
  await input.press("Enter");
  await page.waitForURL(/for-sale/);
  await expect(page.locator("article").first()).toBeVisible();
  expect(submissions).toBe(1);
  expect(errors).toEqual([]);
});
test("prefixed API, manual stop and processing until final text", async ({
  page,
}) => {
  await mockSpeech(page, "prefixed");
  await page.goto("/");
  await page.getByRole("button", { name: "Start voice search" }).click();
  await page.getByRole("button", { name: "Stop voice search" }).click();
  await expect(
    page.getByRole("button", { name: "Processing voice input" }),
  ).toBeDisabled();
  await expect(
    page.locator('[role="status"][aria-live="polite"]'),
  ).toContainText("Processing voice input");
  await page.evaluate(() =>
    window.__voiceTest.result("House in Bristol", true),
  );
  await expect(page.getByRole("searchbox")).toHaveValue("House in Bristol");
  await expect(page.getByRole("searchbox")).toBeFocused();
});
test("unsupported browser has an accessible tooltip, no recorder and usable text search", async ({
  page,
}) => {
  await mockSpeech(page, "unsupported");
  const errors: string[] = [];
  page.on("pageerror", (e) => errors.push(e.message));
  await page.goto("/");
  await expect(
    page.getByRole("button", {
      name: "Voice search isn't supported in this browser.",
    }),
  ).toBeDisabled();
  await page.getByRole("group", { name: "Voice search unavailable" }).focus();
  await expect(page.getByRole("tooltip")).toHaveText(
    "Voice search isn't supported in this browser.",
  );
  await expect(
    page.getByRole("button", { name: "Record voice query" }),
  ).toHaveCount(0);
  await page.getByRole("searchbox").fill("Buy a flat in Manchester");
  await page.getByRole("button", { name: "Search properties" }).click();
  await page.waitForURL(/for-sale/);
  await expect(page.locator("article").first()).toBeVisible();
  expect(errors).toEqual([]);
});
test("permission help dialog traps focus, closes on Escape, and permission retry works", async ({
  page,
}) => {
  await mockSpeech(page);
  await page.goto("/");
  await page.getByRole("button", { name: "Start voice search" }).click();
  await page.evaluate(() => window.__voiceTest.error("not-allowed"));
  await expect(
    page.locator('[role="status"][aria-live="polite"]'),
  ).toContainText("Microphone permission was denied");
  await page.getByRole("button", { name: "How to enable" }).click();
  const dialog = page.getByRole("dialog");
  await expect(dialog).toBeVisible();
  for (let i = 0; i < 8; i++) {
    await page.keyboard.press("Tab");
    await expect
      .poll(() => dialog.evaluate((el) => el.contains(document.activeElement)))
      .toBe(true);
  }
  await page.keyboard.press("Escape");
  await expect(dialog).toBeHidden();
  await expect(
    page.getByRole("button", { name: "How to enable" }),
  ).toBeFocused();
  await page.getByRole("button", { name: "Start voice search" }).click();
  await page.evaluate(() => window.__voiceTest.result("Home in Leeds", true));
  await expect(page.getByRole("searchbox")).toHaveValue("Home in Leeds");
});
test("network, no-speech and aborted errors remain recoverable", async ({
  page,
}) => {
  await mockSpeech(page);
  await page.goto("/");
  for (const [code, message] of [
    ["network", "couldn’t connect"],
    ["no-speech", "No speech was detected"],
    ["aborted", "was interrupted"],
  ]) {
    await page.getByRole("button", { name: "Start voice search" }).click();
    await page.evaluate((code) => window.__voiceTest.error(code), code);
    await expect(
      page.locator('[role="status"][aria-live="polite"]'),
    ).toContainText(message);
  }
});
test("reduced motion stops pulse and automatic placeholder changes", async ({
  page,
}) => {
  await mockSpeech(page);
  await page.emulateMedia({ reducedMotion: "reduce" });
  await page.goto("/");
  const input = page.getByRole("searchbox");
  const placeholder = await input.getAttribute("placeholder");
  await page.getByRole("button", { name: "Start voice search" }).click();
  const ring = page
    .getByRole("button", { name: "Stop voice search" })
    .locator("span");
  expect(await ring.evaluate((el) => getComputedStyle(el).animationName)).toBe(
    "none",
  );
  await page.waitForTimeout(4700);
  await expect(input).toHaveAttribute("placeholder", placeholder!);
});
test("results load without a query, announce counts, and gallery traps keyboard focus", async ({
  page,
}) => {
  const errors: string[] = [];
  page.on("pageerror", (e) => errors.push(e.message));
  await page.goto("/for-sale");
  const count = page
    .getByRole("status")
    .filter({ hasText: "100 properties found" });
  await expect(count).toHaveAttribute("aria-live", "polite");
  await expect(count).toHaveAttribute("aria-atomic", "true");
  await page
    .getByRole("combobox", { name: "Location", exact: true })
    .fill("London");
  await expect(
    page
      .locator('[role="status"][aria-live="polite"]')
      .filter({ hasText: "20 properties found" }),
  ).toBeVisible();
  await page.locator("article a").first().click();
  const gallery = page.getByRole("button", {
    name: "Open photo 1 in full screen",
  });
  await gallery.click();
  const dialog = page.getByRole("dialog");
  await expect(dialog).toBeVisible();
  for (let i = 0; i < 12; i++) {
    await page.keyboard.press(i % 2 ? "Shift+Tab" : "Tab");
    await expect
      .poll(() => dialog.evaluate((el) => el.contains(document.activeElement)))
      .toBe(true);
  }
  await page.keyboard.press("ArrowRight");
  await expect(dialog).toContainText("Photo 2 of");
  await page.keyboard.press("Escape");
  await expect(dialog).toBeHidden();
  await expect(
    page.getByRole("button", { name: "Open photo 2 in full screen" }),
  ).toBeFocused();
  expect(
    await page
      .getByRole("button", { name: "Open photo 2 in full screen" })
      .getAttribute("class"),
  ).toContain("focus-visible");
  expect(errors).toEqual([]);
});
test("mobile voice button remains reachable without horizontal overflow", async ({
  page,
}) => {
  await mockSpeech(page);
  await page.setViewportSize({ width: 390, height: 844 });
  await page.goto("/");
  await page.getByRole("button", { name: "Start voice search" }).click();
  await expect(
    page.getByRole("button", { name: "Stop voice search" }),
  ).toBeVisible();
  expect(
    await page.evaluate(
      () => document.documentElement.scrollWidth <= innerWidth,
    ),
  ).toBe(true);
  await page.evaluate(() =>
    window.__voiceTest.result("Buy a flat in Leeds", true),
  );
  await expect(page.getByRole("searchbox")).toHaveValue("Buy a flat in Leeds");
});
