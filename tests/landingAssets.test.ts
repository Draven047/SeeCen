import { describe, expect, test } from "bun:test";
import { readFileSync } from "node:fs";
import {
  assets,
  workflow,
  insights,
  productGroups,
} from "../src/components/landing/content";
import manifest from "../public/landing/v3/manifest.json";

describe("Landing product evidence", () => {
  test("every screen has a real PNG desktop and mobile capture", () => {
    for (const screen of Object.values(assets)) {
      for (const path of [screen.desktop, screen.mobile]) {
        const file = readFileSync(new URL(`../public${path}`, import.meta.url));
        expect(file.subarray(1, 4).toString()).toBe("PNG");
        expect(file.readUInt32BE(16)).toBeGreaterThan(200);
        expect(file.readUInt32BE(20)).toBeGreaterThan(400);
      }
    }
  });
  test("both journeys and every product area have valid screenshots and demo routes", () => {
    for (const item of [...workflow, ...insights, ...productGroups]) {
      expect(assets[item.screen]).toBeDefined();
      expect(item.path.startsWith("/demo/")).toBe(true);
    }
    expect(workflow.map((item) => item.screen)).toEqual([
      "orders",
      "inventory",
      "fulfillment",
    ]);
    expect(insights.map((item) => item.screen)).toEqual([
      "hub",
      "analytics",
      "finance",
    ]);
  });
  test("the provenance manifest covers all product screens", () => {
    expect(manifest.screens).toHaveLength(Object.keys(assets).length);
    expect(manifest.applicationCommit).toMatch(/^[a-f0-9]{40}$/);
    for (const entry of manifest.screens) {
      expect(
        Object.values(assets).some(
          (asset) =>
            asset.desktop.endsWith(entry.desktop) &&
            asset.mobile.endsWith(entry.mobile),
        ),
      ).toBe(true);
    }
  });
  test("social previews no longer reference the old dashboard image", () => {
    const html = readFileSync(
      new URL("../index.html", import.meta.url),
      "utf8",
    );
    expect(html).not.toContain("/landing-hub.png");
    expect(html).toContain("/landing/v3/hub-desktop.png");
  });
});
