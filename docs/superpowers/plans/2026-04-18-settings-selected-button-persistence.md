# Settings Selected Button Persistence Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Persist the selected button in the settings page across dialog reopenings without polluting the main exported button config.

**Architecture:** Introduce a dedicated settings UI state store backed by a separate plugin data file, thread the persisted selected id through runtime props, and let the settings controller restore and normalize the selection. Keep the feature isolated from the main config schema and import/export path.

**Tech Stack:** TypeScript, Vue 3 composition API, Vitest, existing plugin data storage APIs

---

### Task 1: Write failing tests for restore and runtime wiring

**Files:**
- Modify: `tests/settings-controller.test.ts`
- Modify: `tests/plugin-runtime.test.ts`

- [ ] **Step 1: Add a restore-selection controller test**

```ts
it('restores the previously selected button when the id still exists', () => {
  const initialConfig = createDefaultConfig();
  initialConfig.items = [
    createButtonItem({ id: 'first', title: '第一个', order: 0 }),
    createButtonItem({ id: 'second', title: '第二个', order: 1 }),
  ];

  const controller = useSettingsController(createProps({
    initialConfig,
    initialSelectedButtonId: 'second',
  }));

  expect(controller.selectedId.value).toBe('second');
  expect(controller.selectedItem.value?.title).toBe('第二个');
});
```

- [ ] **Step 2: Add a fallback-normalization controller test**

```ts
it('falls back to the first button and persists that fallback when the stored id is stale', async () => {
  const onSelectedIdChange = vi.fn().mockResolvedValue(undefined);
  const initialConfig = createDefaultConfig();
  initialConfig.items = [
    createButtonItem({ id: 'first', title: '第一个', order: 0 }),
    createButtonItem({ id: 'second', title: '第二个', order: 1 }),
  ];

  const controller = useSettingsController(createProps({
    initialConfig,
    initialSelectedButtonId: 'missing',
    onSelectedIdChange,
  }));

  expect(controller.selectedId.value).toBe('first');
  await Promise.resolve();
  expect(onSelectedIdChange).toHaveBeenCalledWith('first');
});
```

- [ ] **Step 3: Add a runtime-props test**

```ts
it('passes the last selected button id into the settings app props', async () => {
  const state = createRuntime({ lastSelectedButtonId: 'daily-note-button' });

  await state.runtime.onload();
  await state.runtime.openSetting();

  expect(state.settingsDialog.open).toHaveBeenCalledWith(expect.objectContaining({
    initialSelectedButtonId: 'daily-note-button',
    onSelectedIdChange: expect.any(Function),
  }));
});
```

- [ ] **Step 4: Run targeted tests to verify they fail**

Run: `npm test -- tests/settings-controller.test.ts tests/plugin-runtime.test.ts`
Expected: FAIL because the new props and restore behavior do not exist yet.

### Task 2: Write failing tests for the dedicated UI state store

**Files:**
- Create: `tests/settings-ui-state-store.test.ts`
- Modify: `src/core/config/index.ts`

- [ ] **Step 1: Add a default-load test**

```ts
it('loads an empty selected-button state when no UI state file exists', async () => {
  const plugin = {
    loadData: vi.fn().mockResolvedValue(null),
    saveData: vi.fn().mockResolvedValue(undefined),
  } as never;

  const store = new SettingsUiStateStore(plugin);
  const state = await store.load();

  expect(state).toEqual({ lastSelectedButtonId: '' });
});
```

- [ ] **Step 2: Add an update-persistence test**

```ts
it('persists lastSelectedButtonId independently of the main config store', async () => {
  const plugin = {
    loadData: vi.fn().mockResolvedValue(null),
    saveData: vi.fn().mockResolvedValue(undefined),
  } as never;

  const store = new SettingsUiStateStore(plugin);
  await store.load();
  await store.setLastSelectedButtonId('daily-note-button');

  expect(plugin.saveData).toHaveBeenLastCalledWith('settings-ui.json', {
    lastSelectedButtonId: 'daily-note-button',
  });
});
```

- [ ] **Step 3: Run the new store tests to verify they fail**

Run: `npm test -- tests/settings-ui-state-store.test.ts`
Expected: FAIL because the store does not exist yet.

### Task 3: Implement the minimal UI state store and runtime wiring

**Files:**
- Modify: `src/shared/constants.ts`
- Create: `src/core/config/settings-ui-state.ts`
- Modify: `src/core/config/index.ts`
- Modify: `src/features/settings/types.ts`
- Modify: `src/core/runtime/plugin-runtime.ts`
- Modify: `src/index.ts`

- [ ] **Step 1: Add the dedicated storage filename constant**

```ts
export const SETTINGS_UI_STORAGE_NAME = 'settings-ui.json';
```

- [ ] **Step 2: Implement the UI state store**

```ts
export interface SettingsUiState {
  lastSelectedButtonId: string;
}

export class SettingsUiStateStore {
  private state: SettingsUiState = { lastSelectedButtonId: '' };

  constructor(private readonly plugin: Plugin) {}

  async load(): Promise<SettingsUiState> {
    const stored = await this.plugin.loadData(SETTINGS_UI_STORAGE_NAME);
    this.state = {
      lastSelectedButtonId: typeof stored?.lastSelectedButtonId === 'string'
        ? stored.lastSelectedButtonId
        : '',
    };
    return { ...this.state };
  }

  snapshot(): SettingsUiState {
    return { ...this.state };
  }

  async setLastSelectedButtonId(lastSelectedButtonId: string): Promise<void> {
    this.state = { lastSelectedButtonId };
    await this.plugin.saveData(SETTINGS_UI_STORAGE_NAME, this.state);
  }
}
```

- [ ] **Step 3: Thread the state through runtime props**

```ts
initialSelectedButtonId: this.options.settingsUiStateStore.snapshot().lastSelectedButtonId,
onSelectedIdChange: (itemId) => this.options.settingsUiStateStore.setLastSelectedButtonId(itemId),
```

- [ ] **Step 4: Load the UI state store during plugin startup**

```ts
await this.options.configStore.load();
await this.options.settingsUiStateStore.load();
await this.refreshExternalCommandProviders();
```

- [ ] **Step 5: Run targeted tests to verify they pass**

Run: `npm test -- tests/settings-ui-state-store.test.ts tests/settings-controller.test.ts tests/plugin-runtime.test.ts`
Expected: controller and runtime tests may still fail until the controller restore logic is added, but the new store tests should pass.

### Task 4: Implement controller restore and normalization

**Files:**
- Modify: `src/features/settings/use-settings-controller.ts`
- Modify: `tests/settings-controller.test.ts`

- [ ] **Step 1: Resolve the initial selection from props**

```ts
function resolveInitialSelectedId(config: PowerButtonsConfig, initialSelectedButtonId?: string): string {
  if (initialSelectedButtonId && config.items.some(item => item.id === initialSelectedButtonId)) {
    return initialSelectedButtonId;
  }

  return config.items[0]?.id || '';
}
```

- [ ] **Step 2: Initialize `selectedId` with the resolver**

```ts
const selectedId = ref(resolveInitialSelectedId(config, props.initialSelectedButtonId));
```

- [ ] **Step 3: Persist effective selection changes through a watch**

```ts
watch(selectedId, (value) => {
  void props.onSelectedIdChange?.(value);
}, { immediate: true, flush: 'sync' });
```

- [ ] **Step 4: Run focused tests to verify they pass**

Run: `npm test -- tests/settings-controller.test.ts tests/plugin-runtime.test.ts tests/settings-ui-state-store.test.ts`
Expected: PASS

### Task 5: Final verification

**Files:**
- Modify: `src/shared/constants.ts`
- Create: `src/core/config/settings-ui-state.ts`
- Modify: `src/core/config/index.ts`
- Modify: `src/features/settings/types.ts`
- Modify: `src/features/settings/use-settings-controller.ts`
- Modify: `src/core/runtime/plugin-runtime.ts`
- Modify: `src/index.ts`
- Modify: `tests/settings-controller.test.ts`
- Modify: `tests/plugin-runtime.test.ts`
- Create: `tests/settings-ui-state-store.test.ts`

- [ ] **Step 1: Run the focused suite**

Run: `npm test -- tests/settings-ui-state-store.test.ts tests/settings-controller.test.ts tests/plugin-runtime.test.ts`
Expected: PASS

- [ ] **Step 2: Run one broader regression check around settings flows**

Run: `npm test -- tests/settings-app-layout.test.ts tests/settings-components.test.ts tests/config-store.test.ts`
Expected: PASS

- [ ] **Step 3: Review the diff for accidental config-schema churn**

Run: `git diff -- src/shared/constants.ts src/core/config/settings-ui-state.ts src/core/config/index.ts src/features/settings/types.ts src/features/settings/use-settings-controller.ts src/core/runtime/plugin-runtime.ts src/index.ts tests/settings-ui-state-store.test.ts tests/settings-controller.test.ts tests/plugin-runtime.test.ts`
Expected: Only the new UI state store, runtime wiring, controller restore logic, and related tests appear.
