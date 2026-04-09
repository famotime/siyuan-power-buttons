# Editor Canvas Placement Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Let the settings preview read native editor toolbar buttons and allow user-created buttons to be dragged into the editor canvas, with matching runtime rendering.

**Architecture:** Promote `canvas` from preview-only surface to a real configurable surface. Keep native editor buttons read-only in preview, but allow config-backed buttons to be inserted and persisted there. Extend runtime surface mounting so `canvas` buttons render into the editor toolbar host.

**Tech Stack:** TypeScript, Vue 3, Vitest, jsdom, SiYuan plugin DOM APIs

---

### Task 1: Enable `canvas` as a real configurable surface

**Files:**
- Modify: `src/shared/types.ts`
- Modify: `src/shared/constants.ts`
- Modify: `src/features/settings/use-settings-controller.ts`
- Test: `tests/preview-layout.test.ts`

- [ ] **Step 1: Write the failing test**

```ts
it("treats canvas as a configurable preview surface for user buttons", () => {
  const config = createDefaultConfig();
  config.items[0].surface = "canvas";

  const layout = buildPreviewLayout(config.items, { includeHidden: true });

  expect(layout.canvas.map(item => item.title)).toContain("全局搜索");
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `npm test -- tests/preview-layout.test.ts`
Expected: FAIL because `canvas` is not assignable as a configurable item surface.

- [ ] **Step 3: Write minimal implementation**

```ts
export const SURFACES = [
  "topbar",
  "statusbar-left",
  "statusbar-right",
  "canvas",
  // existing dock surfaces...
] as const;

export const CONFIGURABLE_SURFACES = [
  "topbar",
  "statusbar-left",
  "statusbar-right",
  "canvas",
] as const;
```

- [ ] **Step 4: Run test to verify it passes**

Run: `npm test -- tests/preview-layout.test.ts`
Expected: PASS

- [ ] **Step 5: Commit**

```bash
git add src/shared/types.ts src/shared/constants.ts src/features/settings/use-settings-controller.ts tests/preview-layout.test.ts
git commit -m "feat: allow canvas as configurable surface"
```

### Task 2: Extend editor native snapshot coverage

**Files:**
- Modify: `src/shared/runtime-snapshot.ts`
- Test: `tests/runtime-snapshot.test.ts`

- [ ] **Step 1: Write the failing test**

```ts
it("reads native editor toolbar buttons into the canvas preview area", () => {
  document.body.innerHTML = `
    <div class="layout__center">
      <div class="protyle-util">
        <div class="block__icons">
          <button data-type="pin" aria-label="钉住编辑区"></button>
          <button data-type="copy" aria-label="复制"></button>
          <button data-type="more" aria-label="更多"></button>
        </div>
      </div>
    </div>
  `;

  const snapshot = readNativeSurfaceSnapshot(document);

  expect(snapshot.filter(item => item.surface === "canvas").map(item => item.title)).toEqual(["钉住编辑区", "复制", "更多"]);
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `npm test -- tests/runtime-snapshot.test.ts`
Expected: FAIL because only `pin` is currently collected.

- [ ] **Step 3: Write minimal implementation**

```ts
const CANVAS_SELECTORS = [
  ".layout__center .protyle-util .block__icons > button",
  ".layout__center .protyle-util .block__icons [data-type]",
];
```

Filter hidden/plugin-owned nodes and keep row-major ordering.

- [ ] **Step 4: Run test to verify it passes**

Run: `npm test -- tests/runtime-snapshot.test.ts`
Expected: PASS

- [ ] **Step 5: Commit**

```bash
git add src/shared/runtime-snapshot.ts tests/runtime-snapshot.test.ts
git commit -m "feat: read native editor toolbar buttons into canvas preview"
```

### Task 3: Allow dragging config buttons into the editor canvas preview

**Files:**
- Modify: `src/App.vue`
- Modify: `src/features/settings/use-settings-controller.ts`
- Test: `tests/settings-app-layout.test.ts`

- [ ] **Step 1: Write the failing test**

```ts
it("allows a user button to move into the editor canvas preview", async () => {
  const onChange = vi.fn().mockResolvedValue(undefined);
  const target = document.createElement("div");
  document.body.appendChild(target);

  const unmount = mountSettingsApp(target, {
    initialConfig: createDefaultConfig(),
    builtinCommands: [],
    pluginCommands: [],
    onChange,
    onNotify: vi.fn(),
    onReadCurrentLayout: vi.fn().mockResolvedValue([]),
  });

  await nextTick();

  const topbarButton = target.querySelector(".workspace-preview__topbar .workspace-chip.is-draggable") as HTMLButtonElement;
  topbarButton.dispatchEvent(new Event("dragstart"));

  const canvasDropzone = target.querySelector(".workspace-preview__canvas-items") as HTMLElement;
  canvasDropzone.dispatchEvent(new Event("drop"));

  await nextTick();

  expect(onChange.mock.calls.at(-1)?.[0].items[0].surface).toBe("canvas");
  unmount();
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `npm test -- tests/settings-app-layout.test.ts`
Expected: FAIL because canvas drop is not wired and controller rejects non-configurable surfaces.

- [ ] **Step 3: Write minimal implementation**

```vue
<div
  class="workspace-preview__stack workspace-preview__stack--row workspace-preview__canvas-items"
  @dragover.prevent
  @drop="onPreviewSurfaceDrop('canvas')"
>
```

```ts
if (!CONFIGURABLE_SURFACES.includes(surface as typeof CONFIGURABLE_SURFACES[number])) {
  // canvas now allowed through CONFIGURABLE_SURFACES
}
```

Also add item-level drop handling in the canvas list to preserve order.

- [ ] **Step 4: Run test to verify it passes**

Run: `npm test -- tests/settings-app-layout.test.ts`
Expected: PASS

- [ ] **Step 5: Commit**

```bash
git add src/App.vue src/features/settings/use-settings-controller.ts tests/settings-app-layout.test.ts
git commit -m "feat: support dragging buttons into canvas preview"
```

### Task 4: Render config-backed canvas buttons at runtime

**Files:**
- Modify: `src/core/surfaces/surface-manager.ts`
- Test: `tests/surface-manager.test.ts`

- [ ] **Step 1: Write the failing test**

```ts
it("renders canvas buttons into the editor toolbar host", () => {
  document.body.innerHTML = `
    <div class="layout__center">
      <div class="protyle-util">
        <div class="block__icons"></div>
      </div>
    </div>
  `;

  const manager = new SurfaceManager(plugin, executor);
  manager.render([
    createButtonItem({ id: "canvas-1", title: "全局搜索", surface: "canvas" }),
  ]);

  expect(document.querySelector(".protyle-util .block__icons [data-power-buttons-owned='true']")).not.toBeNull();
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `npm test -- tests/surface-manager.test.ts`
Expected: FAIL because runtime renderer does not mount `canvas` items.

- [ ] **Step 3: Write minimal implementation**

```ts
const canvasItems = items.filter(item => item.surface === "canvas");
const canvasHost = document.querySelector(".layout__center .protyle-util .block__icons");
if (canvasHost) {
  // append owned plugin buttons in config order and retain cleanup references
}
```

- [ ] **Step 4: Run test to verify it passes**

Run: `npm test -- tests/surface-manager.test.ts`
Expected: PASS

- [ ] **Step 5: Commit**

```bash
git add src/core/surfaces/surface-manager.ts tests/surface-manager.test.ts
git commit -m "feat: render canvas buttons in editor toolbar"
```

### Task 5: Regression verification

**Files:**
- Modify: `src/App.vue`
- Modify: `src/index.scss`
- Test: `tests/settings-app-layout.test.ts`
- Test: `tests/preview-layout.test.ts`
- Test: `tests/runtime-snapshot.test.ts`
- Test: `tests/surface-manager.test.ts`

- [ ] **Step 1: Write the failing regression test**

```ts
it("shows native and config buttons together in the canvas preview", async () => {
  // mount settings app with one native canvas button and one config canvas button
  // assert both labels appear in .workspace-preview__canvas-items
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `npm test -- tests/settings-app-layout.test.ts`
Expected: FAIL until preview canvas is fully wired for mixed ordering and drop behavior.

- [ ] **Step 3: Write minimal implementation**

Keep the existing mixed preview layout, update canvas dropzones, and adjust helper text/CSS only where needed for new behavior.

- [ ] **Step 4: Run test to verify it passes**

Run: `npm test -- tests/settings-app-layout.test.ts`
Expected: PASS

- [ ] **Step 5: Run targeted regression suite**

Run: `npm test -- tests/preview-layout.test.ts tests/runtime-snapshot.test.ts tests/settings-app-layout.test.ts tests/surface-manager.test.ts`
Expected: PASS

- [ ] **Step 6: Commit**

```bash
git add src/App.vue src/index.scss tests/preview-layout.test.ts tests/runtime-snapshot.test.ts tests/settings-app-layout.test.ts tests/surface-manager.test.ts
git commit -m "test: cover canvas placement regressions"
```
