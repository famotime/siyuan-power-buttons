# Fixed Settings Entry Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Keep `打开快捷按钮设置` as a permanent plugin-management menu entry while removing the prebuilt settings button from default surface config.

**Architecture:** Preserve the existing split between runtime-registered plugin commands and config-driven surface buttons. Only change default config generation and the tests that describe its behavior, leaving manual `plugin-command/open-settings` buttons fully supported.

**Tech Stack:** TypeScript, Vitest, Vue plugin runtime

---

### Task 1: Lock in the new default-config behavior

**Files:**
- Modify: `tests/config-store.test.ts`
- Modify: `src/core/config/defaults.ts`
- Test: `tests/config-store.test.ts`

- [ ] **Step 1: Write the failing test**

```ts
it("creates a desktop-only default config without a prebuilt settings button", () => {
  const config = createDefaultConfig();

  expect(config.items.map(item => item.title)).toEqual(["全局搜索", "大纲"]);
  expect(config.items.some(item => item.actionType === "plugin-command" && item.actionId === "open-settings")).toBe(false);
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `npm test -- tests/config-store.test.ts`
Expected: FAIL because the current default config still contains `插件设置`.

- [ ] **Step 3: Write minimal implementation**

```ts
export function createDefaultConfig(): PowerButtonsConfig {
  const items = normalizeItemOrder([
    createButtonItem({
      title: "全局搜索",
      iconValue: "iconSearch",
      surface: "topbar",
      actionType: "builtin-global-command",
      actionId: "globalSearch",
      tooltip: "打开全局搜索",
    }),
    createButtonItem({
      title: "大纲",
      iconValue: "iconList",
      surface: "statusbar-left",
      actionType: "builtin-global-command",
      actionId: "outline",
      tooltip: "显示大纲",
    }),
  ]);
```

- [ ] **Step 4: Run test to verify it passes**

Run: `npm test -- tests/config-store.test.ts`
Expected: PASS with the updated default-config expectations.

- [ ] **Step 5: Commit**

```bash
git add tests/config-store.test.ts src/core/config/defaults.ts
git commit -m "Remove default settings surface button"
```

### Task 2: Prove the fixed plugin-management entry still works

**Files:**
- Modify: `tests/plugin-runtime.test.ts`
- Test: `tests/plugin-runtime.test.ts`

- [ ] **Step 1: Write the failing test**

```ts
it("registers the fixed open-settings plugin command independently from config items", async () => {
  const state = createRuntime();
  state.config.items = state.config.items.filter(item => !(item.actionType === "plugin-command" && item.actionId === "open-settings"));

  await state.runtime.onload();

  const openSettingsCommand = state.addCommand.mock.calls.find(call => call[0].langKey === "power-buttons-open-settings")?.[0];
  await openSettingsCommand?.callback();

  expect(openSettingsCommand?.langText).toBe("打开快捷按钮设置");
  expect(state.settingsDialog.open).toHaveBeenCalledTimes(1);
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `npm test -- tests/plugin-runtime.test.ts`
Expected: Either FAIL from the new assertion or reveal that the existing test setup does not yet prove the command is independent from config items.

- [ ] **Step 3: Write minimal implementation**

```ts
// No runtime implementation change expected.
// Keep `registerPluginCommands()` untouched if the new test proves current behavior.
```

- [ ] **Step 4: Run test to verify it passes**

Run: `npm test -- tests/plugin-runtime.test.ts`
Expected: PASS, confirming the fixed plugin-management entry remains available even without a default surface button.

- [ ] **Step 5: Commit**

```bash
git add tests/plugin-runtime.test.ts
git commit -m "Test fixed settings command registration"
```

### Task 3: Run focused verification for the full change

**Files:**
- Modify: `docs/superpowers/plans/2026-04-09-fixed-settings-entry.md`
- Test: `tests/config-store.test.ts`
- Test: `tests/plugin-runtime.test.ts`

- [ ] **Step 1: Run focused tests**

Run: `npm test -- tests/config-store.test.ts tests/plugin-runtime.test.ts`
Expected: PASS for all tests covering default config and fixed command registration.

- [ ] **Step 2: Run production build**

Run: `npm run build`
Expected: PASS with Vite build success and package generation.

- [ ] **Step 3: Commit implementation**

```bash
git add src/core/config/defaults.ts tests/config-store.test.ts tests/plugin-runtime.test.ts
git commit -m "Separate fixed settings entry from defaults"
```
