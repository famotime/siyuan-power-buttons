import { describe, expect, it } from "vitest";
import {
  COMMON_EMOJI_OPTIONS,
  filterIconParkIcons,
  getIconParkCategories,
  ICONPARK_ICON_OPTIONS,
} from "@/shared/icon-catalog";

describe("IconPark icon catalog", () => {
  it("contains a large generated icon catalog with outline entries", () => {
    expect(ICONPARK_ICON_OPTIONS.length).toBeGreaterThan(2000);
    expect(ICONPARK_ICON_OPTIONS.some(icon => icon.value === "iconpark:Search")).toBe(true);
    expect(ICONPARK_ICON_OPTIONS.some(icon => icon.value === "iconpark:Setting")).toBe(true);
  });

  it("filters IconPark icons by name, label, and keywords", () => {
    expect(filterIconParkIcons("search").some(icon => icon.value === "iconpark:Search")).toBe(true);
    expect(filterIconParkIcons("setting").some(icon => icon.value === "iconpark:Setting")).toBe(true);
    expect(filterIconParkIcons("配置").some(icon => icon.value === "iconpark:Setting")).toBe(true);
  });

  it("filters IconPark icons by category", () => {
    const categories = getIconParkCategories();

    expect(categories.length).toBeGreaterThan(10);
    expect(categories).toContain("编辑");
    expect(categories).toContain("通用");
    expect(filterIconParkIcons("", "编辑").length).toBeGreaterThan(10);
  });

  it("contains common emoji options for direct picking", () => {
    expect(COMMON_EMOJI_OPTIONS.length).toBeGreaterThan(6);
    expect(COMMON_EMOJI_OPTIONS).toContain("⚡");
    expect(COMMON_EMOJI_OPTIONS).toContain("🔍");
    expect(COMMON_EMOJI_OPTIONS).toContain("⚙️");
  });
});
