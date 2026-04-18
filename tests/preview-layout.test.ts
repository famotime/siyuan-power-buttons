import { describe, expect, it } from "vitest";
import { createDefaultConfig } from "@/core/config";
import {
  buildPreviewLayout,
  movePreviewItem,
} from "@/shared/preview-layout";

describe("preview layout", () => {
  it("maps configurable buttons into topbar and statusbar regions", () => {
    const config = createDefaultConfig();
    const layout = buildPreviewLayout(config.items);

    expect(layout.topbar.length).toBe(1);
    expect(layout.statusbarLeft.length).toBe(1);
    expect(layout.statusbarRight.length).toBe(0);
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

    expect(layout.topbar.map(item => item.title)).toEqual(["最近文档", "返回"]);
    expect(layout.bottomDockLeft.length).toBe(0);
  });

  it("can include hidden buttons in preview when requested", () => {
    const config = createDefaultConfig();
    config.items[1].surface = "statusbar-right";
    config.items[1].visible = false;

    const defaultLayout = buildPreviewLayout(config.items);
    const completeLayout = buildPreviewLayout(config.items, { includeHidden: true });

    expect(defaultLayout.statusbarRight).toHaveLength(0);
    expect(completeLayout.statusbarRight).toHaveLength(1);
    expect(completeLayout.statusbarRight[0].visible).toBe(false);
  });

  it("treats canvas as a configurable preview surface for user buttons", () => {
    const config = createDefaultConfig();
    config.items[0].surface = "canvas";

    const layout = buildPreviewLayout(config.items, { includeHidden: true });

    expect(layout.canvas.map(item => item.title)).toContain("最近文档");
    expect(layout.topbar).toHaveLength(0);
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
    expect(layout.statusbarRight.map(item => item.title)).toEqual(["帮助", "最近文档"]);
  });
});
