/* @vitest-environment jsdom */
import { describe, expect, it } from "vitest";
import { readNativeSurfaceSnapshot } from "@/shared/runtime-snapshot";

function mockRect(element: Element, rect: Partial<DOMRect>): void {
  Object.defineProperty(element, "getBoundingClientRect", {
    configurable: true,
    value: () => ({
      x: rect.left ?? 0,
      y: rect.top ?? 0,
      top: rect.top ?? 0,
      left: rect.left ?? 0,
      right: rect.right ?? rect.left ?? 0,
      bottom: rect.bottom ?? rect.top ?? 0,
      width: rect.width ?? 0,
      height: rect.height ?? 0,
      toJSON: () => ({}),
    }),
  });
}

describe("runtime surface snapshot", () => {
  it("collects native buttons and skips plugin-owned entries", () => {
    document.body.innerHTML = `
      <div id="toolbar">
        <button id="barWorkspace" title="工作空间"><svg viewBox="0 0 24 24"><circle cx="12" cy="12" r="10" /></svg></button>
        <button title="插件按钮" data-power-buttons-owned="true"></button>
      </div>
      <div id="status">
        <button id="barDock" title="停靠区"></button>
        <button id="statusHelp" title="帮助"></button>
      </div>
      <div id="dockLeft">
        <button class="dock__item" data-type="file" aria-label="文件"></button>
        <button class="dock__item" data-type="bookmark" aria-label="书签"></button>
        <button class="dock__item" data-type="siyuan-power-buttons-demo" aria-label="插件 Dock"></button>
      </div>
      <div id="dockBottom">
        <button class="dock__item" data-type="graph" aria-label="关系图"></button>
      </div>
    `;

    const status = document.getElementById("status");
    const dockLeft = document.getElementById("dockLeft");
    const dockBottom = document.getElementById("dockBottom");
    const [barDock, statusHelp] = Array.from(document.querySelectorAll("#status button"));
    const [dockFile, dockBookmark] = Array.from(document.querySelectorAll("#dockLeft .dock__item"));
    const [dockGraph] = Array.from(document.querySelectorAll("#dockBottom .dock__item"));

    mockRect(status!, { left: 0, right: 200, width: 200 });
    mockRect(barDock, { left: 10, right: 30, width: 20 });
    mockRect(statusHelp, { left: 160, right: 180, width: 20 });
    mockRect(dockLeft!, { top: 0, bottom: 200, height: 200 });
    mockRect(dockFile, { top: 10, bottom: 30, height: 20 });
    mockRect(dockBookmark, { top: 160, bottom: 180, height: 20 });
    mockRect(dockBottom!, { left: 0, right: 240, width: 240 });
    mockRect(dockGraph, { left: 20, right: 40, width: 20 });

    const snapshot = readNativeSurfaceSnapshot(document);

    expect(snapshot.map(item => item.title)).toEqual(["工作空间", "停靠区", "帮助", "文件", "书签", "关系图"]);
    expect(snapshot.find(item => item.title === "工作空间")?.surface).toBe("topbar");
    expect(snapshot.find(item => item.title === "停靠区")?.surface).toBe("statusbar-left");
    expect(snapshot.find(item => item.title === "帮助")?.surface).toBe("statusbar-right");
    expect(snapshot.find(item => item.title === "文件")?.surface).toBe("dock-left-top");
    expect(snapshot.find(item => item.title === "书签")?.surface).toBe("dock-left-bottom");
    expect(snapshot.find(item => item.title === "关系图")?.surface).toBe("dock-bottom-left");
    expect(snapshot.every(item => item.editable === false)).toBe(true);
  });
});
