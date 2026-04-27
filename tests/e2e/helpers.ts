import type { Page } from "@playwright/test";

/** Mock PostgREST approved_content so the app does not depend on live Supabase data. */
export async function mockApprovedContent(page: Page, bodyJson: unknown) {
  await page.route("**/rest/v1/approved_content**", async (route) => {
    await route.fulfill({
      status: 200,
      contentType: "application/json",
      headers: {
        "content-profile": "public",
        "content-range": "0-0/*",
      },
      body: JSON.stringify(bodyJson),
    });
  });
}

export async function setDarkTheme(page: Page) {
  await page.addInitScript(() => {
    localStorage.setItem("seder-hadorot-theme", "dark");
    document.documentElement.setAttribute("data-theme", "dark");
  });
}
