import { expect, test } from "@playwright/test";
import { solidPng, stubExternal, tapWall } from "./helpers";

test.beforeEach(async ({ page }) => stubExternal(page));

test("build a climb in the sandbox, solve it and save it", async ({ page }) => {
  await page.goto("/climbs/new/sandbox");
  const wall = { widthCm: 300, heightCm: 420 };
  await expect(page.locator('[data-testid="wall-canvas"] canvas').first()).toBeVisible();

  const palette = page.getByRole("toolbar", { name: "Hold types" });
  const inspector = page.getByTestId("hold-inspector");

  // Start jug
  await palette.getByRole("button", { name: "Jug" }).click();
  await tapWall(page, wall, 150, 150);
  await inspector.getByRole("button", { name: "Start" }).click();
  // Intermediate jugs and the finish
  await tapWall(page, wall, 130, 220);
  await tapWall(page, wall, 170, 290);
  await tapWall(page, wall, 150, 360);
  await inspector.getByRole("button", { name: "Finish" }).click();
  // Footholds
  await palette.getByRole("button", { name: "Foot chip" }).click();
  for (const [x, y] of [[135, 50], [165, 50], [150, 100], [115, 165], [175, 205]]) await tapWall(page, wall, x, y);

  await expect(page.getByText("9 holds")).toBeVisible();
  await page.getByRole("button", { name: "Solve this climb" }).click();
  const beta = page.getByTestId("beta");
  await expect(beta).toBeVisible({ timeout: 15_000 });
  await expect(beta.getByText(/Match both hands on the jug at 1\.5 m/)).toBeVisible();
  await expect(beta.getByText(/matches on the jug at 3\.6 m/)).toBeVisible();

  // Step through
  await page.getByRole("button", { name: "Next move" }).click();
  await expect(page.getByText(/Move 1 of \d+/)).toBeVisible();

  // Undo removes the last foothold and clears the beta
  await page.getByRole("button", { name: "↶ Undo" }).click();
  await expect(page.getByText("8 holds")).toBeVisible();
  await expect(beta).toHaveCount(0);
  await page.getByRole("button", { name: "↷ Redo" }).click();

  await page.getByLabel("Name").fill("Ladder test");
  await page.getByLabel("Grade").fill("V0");
  await page.getByRole("button", { name: "Save climb" }).click();
  await expect(page).toHaveURL(/\/climbs\/local-/);
  await expect(page.getByRole("heading", { name: "Ladder test" })).toBeVisible();
  await page.getByRole("button", { name: "Solve for my size" }).click();
  await expect(page.getByTestId("beta")).toBeVisible({ timeout: 15_000 });

  await page.goto("/climbs");
  await expect(page.getByTestId("my-climbs").getByText("Ladder test")).toBeVisible();
});

test("explains a blocked climb for a short climber", async ({ page }) => {
  await page.goto("/climbs/new/sandbox");
  const wall = { widthCm: 300, heightCm: 420 };
  const inspector = page.getByTestId("hold-inspector");
  await tapWall(page, wall, 150, 150);
  await inspector.getByRole("button", { name: "Start" }).click();
  await tapWall(page, wall, 150, 330);
  await inspector.getByRole("button", { name: "Finish" }).click();
  await page.getByLabel("Your height (cm)").fill("150");
  await page.getByRole("button", { name: "Solve this climb" }).click();
  await expect(page.getByTestId("beta-error")).toContainText(/crux|reach/i, { timeout: 15_000 });
});

test("mark holds on a wall photo and solve", async ({ page }) => {
  await page.goto("/climbs/new/camera");
  await page.getByTestId("photo-input").setInputFiles({ name: "wall.png", mimeType: "image/png", buffer: solidPng(300, 420) });
  await expect(page.locator('[data-testid="wall-canvas"] canvas').first()).toBeVisible();
  // 300x420 px photo with a 420 cm wall height → 300 cm wide
  const wall = { widthCm: 300, heightCm: 420 };
  const inspector = page.getByTestId("hold-inspector");
  await tapWall(page, wall, 150, 150);
  await inspector.getByRole("button", { name: "Start" }).click();
  await tapWall(page, wall, 150, 240);
  await tapWall(page, wall, 150, 320);
  await inspector.getByRole("button", { name: "Finish" }).click();
  await page.getByRole("button", { name: "Solve this climb" }).click();
  await expect(page.getByTestId("beta")).toBeVisible({ timeout: 15_000 });

  await page.getByLabel("Name").fill("Photo problem");
  await page.getByRole("button", { name: "Save climb" }).click();
  await expect(page.getByRole("heading", { name: "Photo problem" })).toBeVisible();
});
