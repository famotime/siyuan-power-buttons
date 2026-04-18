# Default Config From Doc Sample Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Replace the built-in new-user default configuration with the documented sample config so first load and reset both restore that richer preset.

**Architecture:** Keep the runtime default in `src/core/config/defaults.ts` and update only the hardcoded data returned by `createDefaultConfig()`. Cover the behavior with regression tests in `tests/config-store.test.ts` so default item titles, action-type mix, native suppression defaults, and reset behavior are locked down.

**Tech Stack:** TypeScript, Vitest, Vite, Vue 3 plugin runtime

---

### Task 1: Replace the hardcoded starter config

**Files:**
- Modify: `tests/config-store.test.ts`
- Modify: `src/core/config/defaults.ts`

- [ ] **Step 1: Write the failing test**

Add assertions to `tests/config-store.test.ts` so the default config is expected to include the documented sample titles and native suppression defaults:

```ts
expect(config.items.map(item => item.title)).toEqual([
  '今日日记',
  '最近文档',
  '数据历史',
  '集市',
  '重启所有插件',
  '切换到英文',
  '切换到中文',
  '仅导出当前文档',
  '随心按设置',
]);
expect(config.items.some(item => item.actionType === 'plugin-command')).toBe(true);
expect(config.items.some(item => item.actionType === 'experimental-shortcut')).toBe(true);
expect(config.items.some(item => item.actionType === 'experimental-click-sequence')).toBe(true);
expect(config.disabledNativeButtons.map(item => item.id)).toEqual([
  'native:statusbar-right:barDock',
  'native:statusbar-right:statusHelp',
]);
```

- [ ] **Step 2: Run test to verify it fails**

Run: `npm test -- tests/config-store.test.ts`
Expected: FAIL because `createDefaultConfig()` still returns the old two-button starter config.

- [ ] **Step 3: Write minimal implementation**

Update `src/core/config/defaults.ts` so `createDefaultConfig()` returns the documented preset, including:

```ts
version: 2,
desktopOnly: true,
items: normalizeItemOrder([
  createButtonItem({ title: '今日日记', ... }),
  createButtonItem({ title: '最近文档', actionType: 'experimental-shortcut', ... }),
  // ...
]),
disabledNativeButtons: [
  { id: 'native:statusbar-right:barDock', ... },
  { id: 'native:statusbar-right:statusHelp', ... },
],
experimental: {
  nativeToolbarControl: false,
  internalCommandAdapter: false,
  shortcutAdapter: true,
  clickSequenceAdapter: true,
},
```

Keep the helper-based construction and preserve the documented order after `normalizeItemOrder(...)`.

- [ ] **Step 4: Run targeted tests to verify they pass**

Run: `npm test -- tests/config-store.test.ts tests/import-export.test.ts`
Expected: PASS with 0 failures.

- [ ] **Step 5: Run the full test suite**

Run: `npm test`
Expected: PASS with 0 failures.
