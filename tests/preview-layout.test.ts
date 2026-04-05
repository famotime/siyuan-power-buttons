import { describe, expect, it } from "vitest";
import { createDefaultConfig } from "@/core/config";
import {
  buildPreviewLayout,
  movePreviewItem,
} from "@/shared/preview-layout";

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

  it("can include hidden buttons in preview when requested", () => {
    const config = createDefaultConfig();
    config.items[1].visible = false;

    const defaultLayout = buildPreviewLayout(config.items);
    const completeLayout = buildPreviewLayout(config.items, { includeHidden: true });

    expect(defaultLayout.statusbarRight).toHaveLength(0);
    expect(completeLayout.statusbarRight).toHaveLength(1);
    expect(completeLayout.statusbarRight[0].visible).toBe(false);
  });

  it("moves buttons across preview surfaces while preserving target order", () => {
    const config = createDefaultConfig();
    config.items.push({
      ...config.items[0],
      id: "extra-2",
      title: "帮助",
      actionId: "help",
      iconValue: "iconHelp",
      surface: "statusbar-right",
      order: 3,
    });

    const moved = movePreviewItem(config.items, config.items[0].id, "statusbar-right", 1);
    const layout = buildPreviewLayout(moved, { includeHidden: true });

    expect(layout.topbar).toHaveLength(0);
    expect(layout.statusbarRight.map(item => item.title)).toEqual(["插件设置", "全局搜索", "帮助"]);
  });
});
