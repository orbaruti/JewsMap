import { test, expect } from "@playwright/test";
import { mockApprovedContent, setDarkTheme } from "./helpers";
import emptyApproved from "./fixtures/approved-empty.json";

async function settleMainView(page: import("@playwright/test").Page) {
  await page.emulateMedia({ reducedMotion: "reduce" });
  await page.waitForFunction(() => {
    const w = window as unknown as { ERAS_DATA?: { persons: unknown[] }[] };
    return (w.ERAS_DATA?.[0]?.persons?.length ?? 0) > 0;
  });
  await page.evaluate(() => window.scrollTo(0, 0));
  // Scroll-driven layout (tree / HUD) needs a beat before pixels stabilize.
  await page.waitForTimeout(800);
}

test.describe("visual regression", () => {
  test("main tree dark theme", async ({ page }) => {
    await mockApprovedContent(page, emptyApproved);
    await setDarkTheme(page);
    await page.setViewportSize({ width: 1280, height: 720 });
    await page.goto("/index.html");
    await settleMainView(page);
    await expect(page).toHaveScreenshot("viewport-dark.png", {
      fullPage: false,
      timeout: 20_000,
    });
  });

  test("main tree light theme", async ({ page }) => {
    await mockApprovedContent(page, emptyApproved);
    await page.addInitScript(() => {
      localStorage.setItem("seder-hadorot-theme", "light");
      document.documentElement.setAttribute("data-theme", "light");
    });
    await page.setViewportSize({ width: 1280, height: 720 });
    await page.goto("/index.html");
    await settleMainView(page);
    await expect(page).toHaveScreenshot("viewport-light.png", {
      fullPage: false,
      timeout: 20_000,
    });
  });
});
