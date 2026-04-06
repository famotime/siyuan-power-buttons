import { describe, expect, it } from "vitest";
import {
  getDockPosition,
  getPreviewLayoutKey,
  isConfigurableSurface,
  isDockSurface,
  isStatusBarSurface,
} from "@/shared/surface-metadata";

describe("surface metadata", () => {
  it("maps every supported surface to a preview layout key", () => {
    expect(getPreviewLayoutKey("topbar")).toBe("topbar");
    expect(getPreviewLayoutKey("dock-left-top")).toBe("leftDockTop");
    expect(getPreviewLayoutKey("dock-left-bottom")).toBe("leftDockBottom");
    expect(getPreviewLayoutKey("dock-right-top")).toBe("rightDockTop");
    expect(getPreviewLayoutKey("dock-right-bottom")).toBe("rightDockBottom");
    expect(getPreviewLayoutKey("dock-bottom-left")).toBe("bottomDockLeft");
    expect(getPreviewLayoutKey("dock-bottom-right")).toBe("bottomDockRight");
    expect(getPreviewLayoutKey("statusbar-left")).toBe("statusbarLeft");
    expect(getPreviewLayoutKey("statusbar-right")).toBe("statusbarRight");
    expect(getPreviewLayoutKey("canvas")).toBe("canvas");
  });

  it("exposes dock positions and surface group predicates from one place", () => {
    expect(getDockPosition("dock-left-top")).toBe("LeftTop");
    expect(getDockPosition("dock-bottom-right")).toBe("BottomRight");
    expect(isDockSurface("dock-right-bottom")).toBe(true);
    expect(isStatusBarSurface("statusbar-right")).toBe(true);
    expect(isConfigurableSurface("statusbar-left")).toBe(true);
    expect(isConfigurableSurface("dock-left-top")).toBe(false);
  });
});
