import { test, expect } from "@playwright/test";

test("career, mission deployment, pause and reload persistence", async ({ page }, info) => {
  const errors: string[] = [];
  page.on("pageerror", error => errors.push(error.message));
  await page.goto("/");
  await page.getByRole("button", { name: "開始服役", exact: true }).click();
  await page.locator("input").fill("Audit Recruit");
  await page.getByRole("button", { name: "入伍", exact: true }).click();
  await expect(page.getByRole("heading", { name: "基地", exact: true })).toBeVisible();
  await page.getByRole("button", { name: /任務室/ }).click();
  await page.getByRole("button", { name: /公路巡邏/ }).click();
  await page.getByRole("button", { name: "部署", exact: true }).click();
  await expect(page.locator("canvas")).toBeVisible();
  await expect.poll(() => page.locator("canvas").evaluate(canvas => canvas.width), { timeout: 30000 }).toBeGreaterThan(300);
  await page.keyboard.down("w");
  await expect.poll(() => page.evaluate(() => window.__controlsTest?.getSpeed() ?? 0)).toBeGreaterThan(0);
  await page.keyboard.up("w");
  await page.keyboard.press("Escape");
  await expect(page.getByText("暫停", { exact: true }).first()).toBeVisible();
  await page.screenshot({ path: info.outputPath("mission.png") });
  await page.reload();
  await page.getByRole("button", { name: "繼續任務", exact: true }).click();
  await expect(page.getByText("Audit Recruit", { exact: true })).toBeVisible();
  await expect(page.locator("body")).not.toHaveJSProperty("scrollWidth", 0);
  expect(errors).toEqual([]);
});

test("settings export and invalid import preserve career", async ({ page }) => {
  await page.goto("/");
  await page.getByRole("button", { name: "開始服役", exact: true }).click();
  await page.getByRole("button", { name: "入伍", exact: true }).click();
  await page.getByRole("button", { name: "主選單", exact: true }).click();
  await page.getByRole("button", { name: "設定", exact: true }).click();
  const download = page.waitForEvent("download");
  await page.getByRole("button", { name: "匯出存檔", exact: true }).click();
  expect((await download).suggestedFilename()).toBe("enlisted-career.json");
  const before = await page.evaluate(() => localStorage.getItem("enlisted.career.v1"));
  await page.getByLabel("匯入存檔", { exact: true }).setInputFiles({ name: "invalid.json", mimeType: "application/json", buffer: Buffer.from("null") });
  await expect(page.getByRole("status")).toContainText("格式無效");
  expect(await page.evaluate(() => localStorage.getItem("enlisted.career.v1"))).toBe(before);
});
