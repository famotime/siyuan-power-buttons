import { describe, expect, it } from "vitest";
import { createButtonItem, createDefaultConfig } from "@/core/config";
import {
  buildPreviewLayout,
  movePreviewItem,
  moveSurfaceItem,
} from "@/shared/preview-layout";

describe("preview layout", () => {
  it("maps configurable buttons into topbar and statusbar regions (merged to statusbar right)", () => {
    const layout = buildPreviewLayout([
      createButtonItem({
        id: "topbar-item",
        title: "最近文档",
        surface: "topbar",
        order: 0,
      }),
      createButtonItem({
        id: "statusbar-left-item",
        title: "今日日记",
        surface: "statusbar-left",
        order: 1,
      }),
    ]);

    expect(layout.topbar.length).toBe(1);
    expect(layout.statusbarLeft.length).toBe(0);
    expect(layout.statusbarRight.length).toBe(1);
    expect(layout.canvas.length).toBe(0);
  });

  it("maps a button with multiple surfaces into all corresponding regions", () => {
    const layout = buildPreviewLayout([
      createButtonItem({
        id: "multi-btn",
        title: "快捷操作",
        surfaces: ["topbar", "statusbar-right", "dock-panel"],
        order: 0,
      }),
    ]);

    expect(layout.topbar.length).toBe(1);
    expect(layout.statusbarRight.length).toBe(1);
    expect(layout.dockPanel.length).toBe(1);
    expect(layout.canvas.length).toBe(0);
  });

  it("keeps unknown regions empty and preserves button order", () => {
    const config = createDefaultConfig();
    config.items = [
      createButtonItem({
        id: "recent-docs",
        title: "最近文档",
        surface: "topbar",
        order: 0,
      }),
      createButtonItem({
        id: "go-back",
        title: "返回",
        actionId: "goBack",
        iconValue: "iconLeft",
        surface: "topbar",
        order: 99,
      }),
    ];

    const layout = buildPreviewLayout(config.items);

    expect(layout.topbar.map(item => item.title)).toEqual(["最近文档", "返回"]);
    expect(layout.bottomDockLeft.length).toBe(0);
  });

  it("can include hidden buttons in preview when requested", () => {
    const config = createDefaultConfig();
    config.items = [
      createButtonItem({
        id: "hidden-statusbar-item",
        title: "隐藏按钮",
        surface: "statusbar-right",
        visible: false,
        order: 0,
      }),
    ];

    const defaultLayout = buildPreviewLayout(config.items);
    const completeLayout = buildPreviewLayout(config.items, { includeHidden: true });

    expect(defaultLayout.statusbarRight).toHaveLength(0);
    expect(completeLayout.statusbarRight).toHaveLength(1);
    expect(completeLayout.statusbarRight[0].visible).toBe(false);
  });

  it("treats canvas as a configurable preview surface for user buttons", () => {
    const config = createDefaultConfig();
    config.items = [
      createButtonItem({
        id: "canvas-item",
        title: "最近文档",
        surface: "canvas",
        order: 0,
      }),
    ];

    const layout = buildPreviewLayout(config.items, { includeHidden: true });

    expect(layout.canvas.map(item => item.title)).toContain("最近文档");
    expect(layout.topbar).toHaveLength(0);
  });

  it("moves buttons across preview surfaces while preserving target order", () => {
    const config = createDefaultConfig();
    config.items = [
      createButtonItem({
        id: "recent-docs",
        title: "最近文档",
        surface: "topbar",
        order: 0,
      }),
      createButtonItem({
        id: "help",
        title: "帮助",
        actionId: "help",
        iconValue: "iconHelp",
        surface: "statusbar-right",
        order: 1,
      }),
    ];

    const moved = movePreviewItem(config.items, config.items[0].id, "statusbar-right", 1);
    const layout = buildPreviewLayout(moved, { includeHidden: true });

    expect(layout.topbar).toHaveLength(0);
    expect(layout.statusbarRight.map(item => item.title)).toEqual(["帮助", "最近文档"]);
  });

  it("maps and moves buttons into dock-panel layout region", () => {
    const config = createDefaultConfig();
    config.items = [
      createButtonItem({
        id: "side-panel-1",
        title: "面板按钮1",
        surface: "dock-panel",
        order: 0,
      }),
      createButtonItem({
        id: "side-panel-2",
        title: "面板按钮2",
        surface: "dock-panel",
        order: 1,
      }),
    ];

    const layout = buildPreviewLayout(config.items);
    expect(layout.dockPanel.map(item => item.title)).toEqual(["面板按钮1", "面板按钮2"]);

    const moved = movePreviewItem(config.items, "side-panel-2", "dock-panel", 0);
    const updatedLayout = buildPreviewLayout(moved);
    expect(updatedLayout.dockPanel.map(item => item.title)).toEqual(["面板按钮2", "面板按钮1"]);
  });

  it("reordering buttons in one surface layout does not link to or affect other surfaces", () => {
    const config = createDefaultConfig();
    config.items = [
      createButtonItem({
        id: "btn-a",
        title: "按钮 A",
        surfaces: ["topbar", "dock-panel"],
        order: 0,
      }),
      createButtonItem({
        id: "btn-b",
        title: "按钮 B",
        surfaces: ["topbar", "dock-panel"],
        order: 1,
      }),
    ];
    config.surfaceLayouts = {
      topbar: [
        { type: "button", id: "btn-a" },
        { type: "button", id: "btn-b" },
      ],
      "dock-panel": [
        { type: "button", id: "btn-a" },
        { type: "button", id: "btn-b" },
      ],
    };

    // Reorder in topbar: move btn-b before btn-a
    moveSurfaceItem(config, { id: "btn-b", itemId: "btn-b", surface: "topbar" }, "topbar", 0);

    const layout = buildPreviewLayout(config.items, { surfaceLayouts: config.surfaceLayouts });

    // topbar is reordered to [B, A]
    expect(layout.topbar.map(i => i.title)).toEqual(["按钮 B", "按钮 A"]);

    // dock-panel is untouched and remains [A, B]
    expect(layout.dockPanel.map(i => i.title)).toEqual(["按钮 A", "按钮 B"]);
  });

  it("supports dividers and custom titles in dock-panel layout", () => {
    const config = createDefaultConfig();
    config.items = [
      createButtonItem({
        id: "btn-1",
        title: "工具按钮",
        surfaces: ["dock-panel"],
        order: 0,
      }),
    ];
    config.surfaceLayouts = {
      "dock-panel": [
        { type: "divider", id: "div-section-1", title: "常用工具" },
        { type: "button", id: "btn-1" },
        { type: "divider", id: "div-section-2" },
      ],
    };

    const layout = buildPreviewLayout(config.items, { surfaceLayouts: config.surfaceLayouts });
    expect(layout.dockPanel).toHaveLength(3);
    expect(layout.dockPanel[0].type).toBe("divider");
    expect(layout.dockPanel[0].title).toBe("常用工具");
    expect(layout.dockPanel[1].title).toBe("工具按钮");
    expect(layout.dockPanel[2].type).toBe("divider");
    expect(layout.dockPanel[2].title).toBe("");

    // Move divider to middle
    moveSurfaceItem(config, { id: "div-section-1", type: "divider" }, "dock-panel", 1);
    const updated = buildPreviewLayout(config.items, { surfaceLayouts: config.surfaceLayouts });
    expect(updated.dockPanel[0].title).toBe("工具按钮");
    expect(updated.dockPanel[1].title).toBe("常用工具");
  });
});
