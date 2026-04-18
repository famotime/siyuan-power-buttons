# Restart Plugins Builtin Command Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Add a stable built-in command that restarts all SiYuan plugins by calling `/api/setting/setBazaar` to disable and then re-enable the global plugin system.

**Architecture:** Extend the existing built-in command catalog with a new `restartPlugins` entry and implement its behavior inside the stable built-in runner. Reuse the existing injected `fetchPost` dependency so the new command stays testable and consistent with the current stable-command architecture.

**Tech Stack:** TypeScript, Vitest, existing Siyuan API adapter pattern

---

### Task 1: Document the command in tests first

**Files:**
- Modify: `tests/builtin-stable.test.ts`
- Modify: `tests/command-executor.test.ts`

- [ ] **Step 1: Write the failing stable-runner test**

```ts
it('restarts plugins by toggling bazaar plugin availability off and on', async () => {
  const fetchPost = vi.fn()
    .mockResolvedValueOnce({ code: 0, data: null })
    .mockResolvedValueOnce({ code: 0, data: null });

  const result = await executeBuiltinCommandStable('restartPlugins', {
    app: { id: 'app' },
    openAppSetting: vi.fn(),
    openTab: vi.fn(),
    fetchPost,
    runBuiltinCommandByDom: vi.fn(() => false),
  });

  expect(result).toBe(true);
  expect(fetchPost).toHaveBeenNthCalledWith(1, '/api/setting/setBazaar', { petalDisabled: true });
  expect(fetchPost).toHaveBeenNthCalledWith(2, '/api/setting/setBazaar', { petalDisabled: false });
});
```

- [ ] **Step 2: Write the failing second-call failure test**

```ts
it('returns false when plugin re-enable fails after a successful disable', async () => {
  const fetchPost = vi.fn()
    .mockResolvedValueOnce({ code: 0, data: null })
    .mockResolvedValueOnce({ code: 1, msg: 'enable failed' });

  const result = await executeBuiltinCommandStable('restartPlugins', {
    app: { id: 'app' },
    openAppSetting: vi.fn(),
    openTab: vi.fn(),
    fetchPost,
    runBuiltinCommandByDom: vi.fn(() => false),
  });

  expect(result).toBe(false);
  expect(fetchPost).toHaveBeenCalledTimes(2);
});
```

- [ ] **Step 3: Extend the built-in catalog expectation**

```ts
expect(BUILTIN_COMMANDS.map(command => command.id)).toEqual([
  'backlinks',
  'config',
  'recentDocs',
  'dailyNote',
  'riffCard',
  'syncNow',
  'restartPlugins',
]);
```

- [ ] **Step 4: Run targeted tests to verify they fail**

Run: `npm test -- tests/builtin-stable.test.ts tests/command-executor.test.ts`
Expected: FAIL because `restartPlugins` is not defined in the catalog or stable runner yet.

### Task 2: Implement the minimal built-in command

**Files:**
- Modify: `src/core/commands/catalog.ts`
- Modify: `src/core/commands/builtin-stable.ts`

- [ ] **Step 1: Add the built-in catalog entry**

```ts
{
  id: 'restartPlugins',
  title: '重启所有插件',
  category: '系统',
  surfaceSuggestion: ['statusbar-right'],
  requiresContext: false,
  stability: 'stable',
},
```

- [ ] **Step 2: Add a minimal helper to toggle plugin availability**

```ts
async function setBazaarPluginAvailability(fetchPost: FetchPost, petalDisabled: boolean): Promise<boolean> {
  const response = await fetchPost('/api/setting/setBazaar', {
    petalDisabled,
  });

  return isOkResponse(response);
}
```

- [ ] **Step 3: Add the `restartPlugins` branch before DOM fallback**

```ts
if (commandId === 'restartPlugins' && options.fetchPost) {
  try {
    if (!await setBazaarPluginAvailability(options.fetchPost, true)) {
      return false;
    }

    return await setBazaarPluginAvailability(options.fetchPost, false);
  } catch {
    return false;
  }
}
```

- [ ] **Step 4: Run targeted tests to verify they pass**

Run: `npm test -- tests/builtin-stable.test.ts tests/command-executor.test.ts`
Expected: PASS

### Task 3: Final verification

**Files:**
- Modify: `tests/builtin-stable.test.ts`
- Modify: `tests/command-executor.test.ts`
- Modify: `src/core/commands/catalog.ts`
- Modify: `src/core/commands/builtin-stable.ts`

- [ ] **Step 1: Run the focused suite again**

Run: `npm test -- tests/builtin-stable.test.ts tests/command-executor.test.ts`
Expected: PASS

- [ ] **Step 2: Run one broader regression check around command behavior**

Run: `npm test -- tests/builtin-dom.test.ts tests/builtin-stable.test.ts tests/command-executor.test.ts`
Expected: PASS

- [ ] **Step 3: Review diff for accidental churn**

Run: `git diff -- src/core/commands/catalog.ts src/core/commands/builtin-stable.ts tests/builtin-stable.test.ts tests/command-executor.test.ts`
Expected: Only the new built-in command behavior and its tests appear.
