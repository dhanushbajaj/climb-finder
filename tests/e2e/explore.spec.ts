import { expect, test } from "@playwright/test";
import { stubExternal } from "./helpers";

const outdoor = {
  areas: [
    {
      id: "a1",
      name: "Gatineau Park Crag",
      lat: 45.5,
      lng: -75.8,
      path: ["Canada", "Quebec"],
      totalClimbs: 42,
      disciplines: { sport: 30, trad: 12, boulder: 0, tr: 0 },
      distanceKm: 12.3,
      url: "https://openbeta.io/area/a1",
    },
    {
      id: "a2",
      name: "Boulder Field",
      lat: 45.3,
      lng: -75.6,
      path: [],
      totalClimbs: 15,
      disciplines: { sport: 0, trad: 0, boulder: 15, tr: 0 },
      distanceKm: 15,
      url: "https://openbeta.io/area/a2",
    },
  ],
};
const osm = {
  gyms: [{ osmId: "node/1", name: "Coyote Rock Gym", lat: 45.41, lng: -75.69, address: "1 Main St", website: null, distanceKm: 1.2 }],
};

test.beforeEach(async ({ page }) => {
  await stubExternal(page);
  await page.route("**/api/outdoor?*", (r) => r.fulfill({ json: outdoor }));
  await page.route("**/api/gyms-osm?*", (r) => r.fulfill({ json: osm }));
});

test("search an area and see outdoor and indoor climbing", async ({ page }) => {
  await page.goto("/");
  await page.getByLabel("Search location").fill("Ottawa");
  await page.getByRole("button", { name: "Search" }).click();
  await expect(page).toHaveURL(/\/explore\?lat=45\.42150&lng=-75\.69720&r=25/);

  const list = page.getByTestId("outdoor-list");
  await expect(list.getByText("Gatineau Park Crag")).toBeVisible();
  await expect(list.getByText("42 climbs · 30 sport · 12 trad")).toBeVisible();
  await expect(page.locator(".leaflet-interactive")).toHaveCount(3); // radius circle + 2 crags

  await page.getByRole("button", { name: "Boulder" }).click();
  await expect(list.getByText("Gatineau Park Crag")).toHaveCount(0);
  await expect(list.getByText("Boulder Field")).toBeVisible();

  await page.getByRole("tab", { name: /indoor/i }).click();
  const indoor = page.getByTestId("indoor-list");
  await expect(indoor.getByText("Coyote Rock Gym")).toBeVisible();

  // Register the OSM gym and add a climb there
  await indoor.getByRole("link", { name: "Add climbs here →" }).click();
  await expect(page.getByLabel("Name")).toHaveValue("Coyote Rock Gym");
  await page.getByRole("button", { name: "Save gym" }).click();
  await expect(page.getByRole("heading", { name: "Coyote Rock Gym" })).toBeVisible();
  await expect(page.getByText("No climbs here yet")).toBeVisible();
  await page.getByRole("link", { name: "Build a climb" }).click();
  await expect(page.getByText(/At Coyote Rock Gym/)).toBeVisible();
});

test("explore shows API errors", async ({ page }) => {
  await page.route("**/api/outdoor?*", (r) => r.fulfill({ status: 502, json: { error: "Couldn't load outdoor climbs: down" } }));
  await page.goto("/explore?lat=45.4&lng=-75.7&r=10");
  await expect(page.getByText("Couldn't load outdoor climbs: down")).toBeVisible();
});
