import { describe, expect, it } from "vitest";
import {
  BUILTIN_ICON_OPTIONS,
  COMMON_EMOJI_OPTIONS,
  filterBuiltinIcons,
} from "@/shared/icon-catalog";

describe("builtin icon catalog", () => {
  it("contains common Siyuan icons for direct picking", () => {
    expect(BUILTIN_ICON_OPTIONS.length).toBeGreaterThan(10);
    expect(BUILTIN_ICON_OPTIONS.some(icon => icon.value === "iconSearch")).toBe(true);
    expect(BUILTIN_ICON_OPTIONS.some(icon => icon.value === "iconSettings")).toBe(true);
    expect(BUILTIN_ICON_OPTIONS.some(icon => icon.value === "iconList")).toBe(true);
  });

  it("filters icons by name and chinese label", () => {
    expect(filterBuiltinIcons("search").some(icon => icon.value === "iconSearch")).toBe(true);
    expect(filterBuiltinIcons("设置").some(icon => icon.value === "iconSettings")).toBe(true);
  });

  it("contains common emoji options for direct picking", () => {
    expect(COMMON_EMOJI_OPTIONS.length).toBeGreaterThan(6);
    expect(COMMON_EMOJI_OPTIONS).toContain("⚡");
    expect(COMMON_EMOJI_OPTIONS).toContain("🔍");
    expect(COMMON_EMOJI_OPTIONS).toContain("⚙️");
  });
});
