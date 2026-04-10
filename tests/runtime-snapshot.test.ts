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
        <button id="barWorkspace" class="toolbar__item" title="工作空间"><svg viewBox="0 0 24 24"><circle cx="12" cy="12" r="10" /></svg></button>
        <button class="toolbar__item" title="插件按钮" data-power-buttons-owned="true"></button>
      </div>
      <div id="status">
        <button id="barDock" title="停靠区"></button>
        <button id="statusHelp" title="帮助"></button>
      </div>
      <div id="dockLeft">
        <button class="dock__item" data-type="file" aria-label="文件"></button>
        <button class="dock__item" data-type="bookmark" aria-label="书签"></button>
        <button class="dock__item dock__item--pin" aria-label="钉住侧栏"></button>
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
    const [dockFile, dockBookmark, dockPin] = Array.from(document.querySelectorAll("#dockLeft .dock__item"));
    const [dockGraph] = Array.from(document.querySelectorAll("#dockBottom .dock__item"));

    mockRect(status!, { left: 0, right: 200, width: 200 });
    mockRect(barDock, { left: 10, right: 30, width: 20 });
    mockRect(statusHelp, { left: 160, right: 180, width: 20 });
    mockRect(dockLeft!, { top: 0, bottom: 200, height: 200 });
    mockRect(dockFile, { top: 10, bottom: 30, height: 20 });
    mockRect(dockBookmark, { top: 160, bottom: 180, height: 20 });
    mockRect(dockPin, { top: 188, bottom: 196, height: 8 });
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

  it("keeps topbar buttons in row-major order when the toolbar wraps", () => {
    document.body.innerHTML = `
      <div id="toolbar">
        <button id="barAlpha" class="toolbar__item" title="Alpha"></button>
        <button id="barBeta" class="toolbar__item" title="Beta"></button>
        <button id="barGamma" class="toolbar__item" title="Gamma"></button>
        <button id="barDelta" class="toolbar__item" title="Delta"></button>
      </div>
    `;

    const toolbar = document.getElementById("toolbar");
    const [alpha, beta, gamma, delta] = Array.from(document.querySelectorAll("#toolbar button"));

    mockRect(toolbar!, { left: 0, top: 0, width: 120, height: 80, right: 120, bottom: 80 });
    mockRect(alpha, { left: 8, top: 8, width: 20, height: 20, right: 28, bottom: 28 });
    mockRect(beta, { left: 40, top: 8, width: 20, height: 20, right: 60, bottom: 28 });
    mockRect(gamma, { left: 8, top: 40, width: 20, height: 20, right: 28, bottom: 60 });
    mockRect(delta, { left: 40, top: 40, width: 20, height: 20, right: 60, bottom: 60 });

    const snapshot = readNativeSurfaceSnapshot(document);

    expect(snapshot.filter(item => item.surface === "topbar").map(item => item.title)).toEqual(["Alpha", "Beta", "Gamma", "Delta"]);
  });

  it("skips hidden topbar items and window controls", () => {
    document.body.innerHTML = `
      <div id="toolbar">
        <div id="barWorkspace" class="toolbar__item" aria-label="工作空间"></div>
        <div id="barSearch" class="toolbar__item fn__none" data-hide="true" aria-label="全局搜索"></div>
        <div id="barPlugins" class="toolbar__item fn__none" data-hide="true" aria-label="插件"></div>
        <div id="barMore" class="toolbar__item" aria-label="更多"></div>
        <div id="windowControls">
          <div id="minWindow" class="toolbar__item toolbar__item--win" aria-label="最小化"></div>
          <div id="maxWindow" class="toolbar__item toolbar__item--win" aria-label="最大化"></div>
          <div id="closeWindow" class="toolbar__item toolbar__item--close" aria-label="关闭"></div>
        </div>
      </div>
    `;

    const toolbar = document.getElementById("toolbar");
    const workspace = document.getElementById("barWorkspace") as HTMLElement;
    const hiddenSearch = document.getElementById("barSearch") as HTMLElement;
    const hiddenPlugins = document.getElementById("barPlugins") as HTMLElement;
    const more = document.getElementById("barMore") as HTMLElement;
    const minWindow = document.getElementById("minWindow") as HTMLElement;
    const maxWindow = document.getElementById("maxWindow") as HTMLElement;
    const closeWindow = document.getElementById("closeWindow") as HTMLElement;

    mockRect(toolbar!, { left: 0, top: 0, width: 280, height: 32, right: 280, bottom: 32 });
    mockRect(workspace, { left: 8, top: 6, width: 40, height: 20, right: 48, bottom: 26 });
    mockRect(hiddenSearch, { left: 56, top: 6, width: 40, height: 20, right: 96, bottom: 26 });
    mockRect(hiddenPlugins, { left: 104, top: 6, width: 40, height: 20, right: 144, bottom: 26 });
    mockRect(more, { left: 152, top: 6, width: 40, height: 20, right: 192, bottom: 26 });
    mockRect(minWindow, { left: 200, top: 6, width: 20, height: 20, right: 220, bottom: 26 });
    mockRect(maxWindow, { left: 228, top: 6, width: 20, height: 20, right: 248, bottom: 26 });
    mockRect(closeWindow, { left: 256, top: 6, width: 20, height: 20, right: 276, bottom: 26 });

    const snapshot = readNativeSurfaceSnapshot(document);

    expect(snapshot.filter(item => item.surface === "topbar").map(item => item.title)).toEqual(["工作空间", "更多"]);
  });

  it("reads native editor toolbar buttons into the canvas preview area", () => {
    document.body.innerHTML = `
      <div class="layout__center">
        <div data-type="wnd" class="fn__flex">
          <div class="layout-tab-bar--readonly">
            <li class="item item--readonly">
              <span data-type="new" class="block__icon" aria-label="新建文档"></span>
            </li>
          </div>
        </div>
        <div class="protyle-util">
          <div class="block__icons">
            <button data-type="pin" class="block__icon block__icon--show" aria-label="钉住编辑区">
              <svg viewBox="0 0 24 24"><path d="M0 0h24v24H0z" /></svg>
            </button>
            <button data-type="copy" class="block__icon block__icon--show" aria-label="复制">
              <svg viewBox="0 0 24 24"><path d="M0 0h24v24H0z" /></svg>
            </button>
            <button data-type="more" class="block__icon block__icon--show" aria-label="更多">
              <svg viewBox="0 0 24 24"><path d="M0 0h24v24H0z" /></svg>
            </button>
          </div>
        </div>
      </div>
    `;

    const readonlyBar = document.querySelector(".layout-tab-bar--readonly") as HTMLElement;
    const pinButton = document.querySelector('.protyle-util [data-type="pin"]') as HTMLElement;
    const copyButton = document.querySelector('.protyle-util [data-type="copy"]') as HTMLElement;
    const moreButton = document.querySelector('.protyle-util [data-type="more"]') as HTMLElement;

    mockRect(readonlyBar, { left: 0, top: 0, width: 120, height: 28, right: 120, bottom: 28 });
    mockRect(pinButton, { left: 24, top: 360, width: 20, height: 20, right: 44, bottom: 380 });
    mockRect(copyButton, { left: 52, top: 360, width: 20, height: 20, right: 72, bottom: 380 });
    mockRect(moreButton, { left: 80, top: 360, width: 20, height: 20, right: 100, bottom: 380 });

    const snapshot = readNativeSurfaceSnapshot(document);
    const canvasTitles = snapshot.filter(item => item.surface === "canvas").map(item => item.title);

    expect(canvasTitles).toEqual(["钉住编辑区", "复制", "更多"]);
    expect(snapshot.map(item => item.title)).not.toContain("新建文档");
  });

  it("reads native editor breadcrumb buttons into the canvas preview area", () => {
    document.body.innerHTML = `
      <div class="layout__center">
        <div class="protyle">
          <div class="protyle-breadcrumb__bar">
            <button data-type="exit-focus" class="protyle-breadcrumb__icon" aria-label="退出聚焦">
              <svg viewBox="0 0 24 24"><path d="M0 0h24v24H0z" /></svg>
            </button>
            <span class="protyle-breadcrumb__space"></span>
            <button data-type="readonly" class="protyle-breadcrumb__icon" aria-label="只读">
              <svg viewBox="0 0 24 24"><path d="M0 0h24v24H0z" /></svg>
            </button>
            <button data-type="more" class="protyle-breadcrumb__icon" aria-label="更多">
              <svg viewBox="0 0 24 24"><path d="M0 0h24v24H0z" /></svg>
            </button>
          </div>
        </div>
      </div>
    `;

    const exitFocusButton = document.querySelector('.protyle-breadcrumb__bar [data-type="exit-focus"]') as HTMLElement;
    const readonlyButton = document.querySelector('.protyle-breadcrumb__bar [data-type="readonly"]') as HTMLElement;
    const moreButton = document.querySelector('.protyle-breadcrumb__bar [data-type="more"]') as HTMLElement;

    mockRect(exitFocusButton, { left: 24, top: 360, width: 20, height: 20, right: 44, bottom: 380 });
    mockRect(readonlyButton, { left: 52, top: 360, width: 20, height: 20, right: 72, bottom: 380 });
    mockRect(moreButton, { left: 80, top: 360, width: 20, height: 20, right: 100, bottom: 380 });

    const snapshot = readNativeSurfaceSnapshot(document);
    const canvasTitles = snapshot.filter(item => item.surface === "canvas").map(item => item.title);
    const readonlyItem = snapshot.find(item => item.title === "只读");

    expect(canvasTitles).toEqual(["退出聚焦", "只读", "更多"]);
    expect(readonlyItem?.nativeSelectors).toContain(".protyle-breadcrumb__bar [data-type=\"readonly\"]");
  });

  it("reads editor utility actions when Siyuan renders them as block icons with data-action", () => {
    document.body.innerHTML = `
      <div class="layout__center">
        <div class="protyle-util">
          <div class="block__icons">
            <span data-action="copy" class="block__icon block__icon--show" aria-label="复制">
              <svg viewBox="0 0 24 24"><path d="M0 0h24v24H0z" /></svg>
            </span>
            <span data-action="more" class="block__icon block__icon--show" aria-label="更多">
              <svg viewBox="0 0 24 24"><path d="M0 0h24v24H0z" /></svg>
            </span>
          </div>
        </div>
      </div>
    `;

    const copyButton = document.querySelector('.protyle-util [data-action="copy"]') as HTMLElement;
    const moreButton = document.querySelector('.protyle-util [data-action="more"]') as HTMLElement;

    mockRect(copyButton, { left: 24, top: 360, width: 20, height: 20, right: 44, bottom: 380 });
    mockRect(moreButton, { left: 52, top: 360, width: 20, height: 20, right: 72, bottom: 380 });

    const snapshot = readNativeSurfaceSnapshot(document);
    const canvasTitles = snapshot.filter(item => item.surface === "canvas").map(item => item.title);

    expect(canvasTitles).toEqual(["复制", "更多"]);
  });

  it("inlines symbol-based native svg icons so they remain renderable outside the original toolbar", () => {
    document.body.innerHTML = `
      <svg aria-hidden="true" style="display:none">
        <symbol id="iconPin" viewBox="0 0 24 24">
          <path d="M12 2 20 10 14 10 14 22 10 22 10 10 4 10Z"></path>
        </symbol>
      </svg>
      <div class="layout__center">
        <div class="protyle">
          <div class="protyle-breadcrumb__bar">
            <button data-type="readonly" class="protyle-breadcrumb__icon" aria-label="只读">
              <svg viewBox="0 0 24 24"><use href="#iconPin"></use></svg>
            </button>
          </div>
        </div>
      </div>
    `;

    const readonlyButton = document.querySelector('.protyle-breadcrumb__bar [data-type="readonly"]') as HTMLElement;
    mockRect(readonlyButton, { left: 52, top: 360, width: 20, height: 20, right: 72, bottom: 380 });

    const snapshot = readNativeSurfaceSnapshot(document);
    const readonlyItem = snapshot.find(item => item.title === "只读");

    expect(readonlyItem?.iconMarkup).toContain("<path");
    expect(readonlyItem?.iconMarkup).not.toContain("<use");
  });
});
