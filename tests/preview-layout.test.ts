import { describe, expect, it } from "vitest";
import { createDefaultConfig } from "@/core/config";
import { buildPreviewLayout } from "@/shared/preview-layout";

describe("preview layout", () => {
  it("maps buttons into topbar, side docks and statusbar regions", () => {
    const config = createDefaultConfig();
    const layout = buildPreviewLayout(config.items);

    expect(layout.topbar.length).toBe(1);
    expect(layout.leftDockTop.length).toBe(1);
    expect(layout.statusbarRight.length).toBe(1);
    expect(layout.canvas.length).toBe(0);
  });

  it("keeps unknown regions empty and preserves button order", () => {
    const config = createDefaultConfig();
    config.items.push({
      ...config.items[0],
      id: "extra-1",
      title: "返回",
      actionId: "goBack",
      iconValue: "iconLeft",
      surface: "topbar",
      order: 99,
    });

    const layout = buildPreviewLayout(config.items);

    expect(layout.topbar.map(item => item.title)).toEqual(["全局搜索", "返回"]);
    expect(layout.bottomDockLeft.length).toBe(0);
  });
});
