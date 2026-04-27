import { test, expect } from "@playwright/test";
import { mockApprovedContent, setDarkTheme } from "./helpers";
import emptyApproved from "./fixtures/approved-empty.json";
import newPersonApproved from "./fixtures/approved-new-person.json";

test.describe("main app", () => {
  test.beforeEach(async ({ page }) => {
    await mockApprovedContent(page, emptyApproved);
    await setDarkTheme(page);
  });

  test("loads timeline, era nav, and person cards", async ({ page }) => {
    await page.goto("/index.html");
    await page.waitForFunction(() => {
      const w = window as unknown as { ERAS_DATA?: { persons: unknown[] }[] };
      return (w.ERAS_DATA?.[0]?.persons?.length ?? 0) > 0;
    });

    await expect(page.getByTestId("era-nav")).toBeVisible();
    await expect(page.getByTestId("year-hud")).toBeVisible();
    await expect(page.getByTestId("person-card").first()).toBeVisible();
  });

  test("search opens and finds Avraham by Hebrew substring", async ({ page }) => {
    await page.goto("/index.html");
    await page.waitForFunction(() => {
      const w = window as unknown as { ERAS_DATA?: unknown[] };
      return (w.ERAS_DATA?.length ?? 0) > 0;
    });

    await page.getByTestId("search-toggle").click();
    await expect(page.getByTestId("search-overlay")).toBeVisible();
    await page.getByTestId("search-input").fill("אברהם");
    await expect(page.getByTestId("search-result-item").first()).toBeVisible();
    await expect(page.getByTestId("search-result-item").first()).toContainText("אברהם");
  });

  test("merged approved_content appears on window.ERAS_DATA", async ({ page }) => {
    await mockApprovedContent(page, newPersonApproved);
    await page.goto("/index.html");
    await page.waitForFunction(() => {
      const w = window as unknown as { ERAS_DATA?: { persons: { id: string }[] }[] };
      const persons = w.ERAS_DATA?.[0]?.persons ?? [];
      return persons.some((p) => p.id === "e2e-test-person");
    });

    const hasTestPerson = await page.evaluate(() => {
      const w = window as unknown as { ERAS_DATA?: { persons: { id: string; nameHe: string }[] }[] };
      const p = w.ERAS_DATA?.[0]?.persons?.find((x) => x.id === "e2e-test-person");
      return p?.nameHe === "איש בדיקה";
    });
    expect(hasTestPerson).toBe(true);
  });

  test("open detail for Adam matches bundled data", async ({ page }) => {
    await page.goto("/index.html");
    await page.waitForFunction(() => {
      const w = window as unknown as { ERAS_DATA?: unknown[] };
      return (w.ERAS_DATA?.length ?? 0) > 0;
    });

    await page.locator('[data-person-id="adam"]').first().click();
    await expect(page.getByTestId("detail-panel")).toBeVisible();
    await expect(page.getByTestId("detail-name-he")).toHaveText("אדם");
    await expect(page.getByTestId("detail-name-en")).toHaveText("Adam");
    await expect(page.getByTestId("detail-summary")).toContainText("האדם הראשון");
  });
});
