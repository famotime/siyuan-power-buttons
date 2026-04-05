import { describe, expect, it } from "vitest";
import {
  compareVersionStrings,
  getExperimentalFeatureSupport,
} from "@/core/compatibility/version-guard";

describe("version guard", () => {
  it("compares semantic version strings", () => {
    expect(compareVersionStrings("3.5.7", "3.5.7")).toBe(0);
    expect(compareVersionStrings("3.5.8", "3.5.7")).toBe(1);
    expect(compareVersionStrings("3.5.6", "3.5.7")).toBe(-1);
    expect(compareVersionStrings("3.10.0", "3.9.9")).toBe(1);
  });

  it("blocks experimental features on mobile frontends", () => {
    const result = getExperimentalFeatureSupport({
      feature: "shortcutAdapter",
      enabled: true,
      frontend: "browser-mobile",
      appVersion: "3.5.7",
      minAppVersion: "3.5.7",
    });

    expect(result.supported).toBe(false);
    expect(result.reason).toContain("仅支持桌面端");
    expect(result.reason).toContain("browser-mobile");
  });

  it("blocks experimental features when the app version is below the required baseline", () => {
    const result = getExperimentalFeatureSupport({
      feature: "clickSequenceAdapter",
      enabled: true,
      frontend: "desktop",
      appVersion: "3.5.6",
      minAppVersion: "3.5.7",
    });

    expect(result.supported).toBe(false);
    expect(result.reason).toContain(">= 3.5.7");
    expect(result.reason).toContain("当前版本：3.5.6");
  });

  it("allows desktop frontends that meet the minimum version", () => {
    const result = getExperimentalFeatureSupport({
      feature: "clickSequenceAdapter",
      enabled: true,
      frontend: "desktop-window",
      appVersion: "3.5.7",
      minAppVersion: "3.5.7",
    });

    expect(result).toEqual({
      supported: true,
    });
  });

  it("blocks disabled experimental adapters before runtime execution", () => {
    const result = getExperimentalFeatureSupport({
      feature: "shortcutAdapter",
      enabled: false,
      frontend: "desktop",
      appVersion: "3.5.7",
      minAppVersion: "3.5.7",
    });

    expect(result.supported).toBe(false);
    expect(result.reason).toContain("当前未启用");
  });
});
