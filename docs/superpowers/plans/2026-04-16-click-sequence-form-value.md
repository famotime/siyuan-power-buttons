# Click Sequence Form Value Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Extend experimental click sequence steps so a single sequence can either click elements or set values on `select`, `input`, and `textarea` controls.

**Architecture:** Keep the existing click-sequence step model and add optional `value` plus `valueMode` fields. Configuration normalization stays in `src/core/config/item-defaults.ts` and `src/core/config/sanitize.ts`, runtime behavior stays in `src/core/commands/click-sequence.ts`, and the settings editor exposes the new fields without introducing a second action type.

**Tech Stack:** TypeScript, Vue 3, Vitest, JSDOM, Vite

---

## File Structure

**Create:**
- `docs/superpowers/plans/2026-04-16-click-sequence-form-value.md`

**Modify:**
- `src/shared/types.ts`
- `src/core/config/item-defaults.ts`
- `src/core/config/sanitize.ts`
- `src/core/commands/click-sequence.ts`
- `src/features/settings/action-config.ts`
- `src/features/settings/use-settings-controller.ts`
- `src/App.vue`
- `tests/click-sequence.test.ts`
- `tests/config-item-defaults.test.ts`
- `tests/config-store.test.ts`
- `tests/import-export.test.ts`
- `tests/settings-app-layout.test.ts`

**Responsibilities:**
- `src/shared/types.ts`: extend the click-sequence step schema with form-value fields.
- `src/core/config/item-defaults.ts`: define default step creation and sanitization rules for `value` and `valueMode`.
- `src/core/config/sanitize.ts`: ensure imported config preserves the new fields.
- `src/core/commands/click-sequence.ts`: branch step execution into click mode or set-value mode.
- `src/features/settings/action-config.ts`: hydrate click-sequence steps in the editor with the new optional fields.
- `src/features/settings/use-settings-controller.ts`: keep the existing summarize/persist flow working after the UI starts editing `value` and `valueMode`.
- `src/App.vue`: render `设值` and `设值模式` controls for experimental click sequence steps.
- Tests: lock behavior at schema, persistence, runtime, and settings UI layers.

### Task 1: Extend Click Sequence Step Schema and Config Normalization

**Files:**
- Modify: `src/shared/types.ts`
- Modify: `src/core/config/item-defaults.ts`
- Modify: `src/core/config/sanitize.ts`
- Test: `tests/config-item-defaults.test.ts`
- Test: `tests/config-store.test.ts`
- Test: `tests/import-export.test.ts`

- [ ] **Step 1: Write the failing defaults test for `value` and `valueMode`**

```ts
it("builds reusable click-sequence configs with form-value defaults", () => {
  expect(createExperimentalClickSequenceConfig({
    steps: [
      {
        selector: "lang",
        value: "en_US",
      },
    ],
  }, "lang")).toEqual({
    steps: [
      {
        selector: "lang",
        value: "en_US",
        valueMode: "value",
        timeoutMs: 5000,
        retryCount: 2,
        retryDelayMs: 300,
        delayAfterMs: 200,
      },
    ],
    stopOnFailure: true,
  });
});
```

- [ ] **Step 2: Run the focused defaults test and verify it fails because the new fields do not exist yet**

Run: `npm test -- tests/config-item-defaults.test.ts`

Expected: FAIL with an `expected ... toEqual` diff showing missing `value` and `valueMode` on the click-sequence step.

- [ ] **Step 3: Add the new step fields to the shared types**

```ts
export interface ClickSequenceStep {
  selector: string;
  value?: string;
  valueMode?: "value" | "text";
  timeoutMs: number;
  retryCount: number;
  retryDelayMs: number;
  delayAfterMs: number;
}
```

- [ ] **Step 4: Normalize `value` and `valueMode` in the config helpers**

```ts
export function createClickSequenceStep(
  overrides: Partial<ClickSequenceStep> = {},
  fallbackSelector = DEFAULT_CLICK_SEQUENCE_SELECTOR,
): ClickSequenceStep {
  return {
    selector: overrides.selector || fallbackSelector,
    value: typeof overrides.value === "string" ? overrides.value : undefined,
    valueMode: overrides.valueMode === "text" ? "text" : "value",
    timeoutMs: Number.isFinite(overrides.timeoutMs) && Number(overrides.timeoutMs) >= 0 ? Number(overrides.timeoutMs) : 5000,
    retryCount: Number.isFinite(overrides.retryCount) && Number(overrides.retryCount) >= 0 ? Number(overrides.retryCount) : 2,
    retryDelayMs: Number.isFinite(overrides.retryDelayMs) && Number(overrides.retryDelayMs) >= 0 ? Number(overrides.retryDelayMs) : 300,
    delayAfterMs: Number.isFinite(overrides.delayAfterMs) && Number(overrides.delayAfterMs) >= 0 ? Number(overrides.delayAfterMs) : 200,
  };
}

export function sanitizeExperimentalClickSequenceConfig(
  input: Partial<ExperimentalClickSequenceConfig> = {},
  actionId = DEFAULT_CLICK_SEQUENCE_SELECTOR,
): ExperimentalClickSequenceConfig {
  const fallbackSelector = getClickSequenceFallbackSelector(actionId);

  return createExperimentalClickSequenceConfig({
    steps: Array.isArray(input.steps)
      ? input.steps.map(step => createClickSequenceStep({
        selector: typeof step?.selector === "string" && step.selector.trim() ? step.selector.trim() : undefined,
        value: typeof step?.value === "string" ? step.value : undefined,
        valueMode: step?.valueMode === "text" ? "text" : step?.valueMode === "value" ? "value" : undefined,
        timeoutMs: Number.isFinite(step?.timeoutMs) && Number(step.timeoutMs) >= 0 ? Number(step.timeoutMs) : undefined,
        retryCount: Number.isFinite(step?.retryCount) && Number(step.retryCount) >= 0 ? Number(step.retryCount) : undefined,
        retryDelayMs: Number.isFinite(step?.retryDelayMs) && Number(step.retryDelayMs) >= 0 ? Number(step.retryDelayMs) : undefined,
        delayAfterMs: Number.isFinite(step?.delayAfterMs) && Number(step.delayAfterMs) >= 0 ? Number(step.delayAfterMs) : undefined,
      }, fallbackSelector))
      : undefined,
    stopOnFailure: typeof input.stopOnFailure === "boolean" ? input.stopOnFailure : undefined,
  }, actionId);
}
```

- [ ] **Step 5: Add persistence tests for sanitize and import/export round-tripping**

```ts
it("preserves experimental click sequence form-value fields", () => {
  const config = sanitizeConfig({
    version: 2,
    desktopOnly: true,
    items: [
      {
        id: "exp-sequence",
        title: "切换语言",
        visible: true,
        iconType: "iconpark",
        iconValue: "iconpark:Setting",
        surface: "topbar",
        order: 0,
        actionType: "experimental-click-sequence",
        actionId: "lang",
        experimentalClickSequence: {
          stopOnFailure: true,
          steps: [
            {
              selector: "lang",
              value: "en_US",
              valueMode: "value",
              timeoutMs: 1000,
              retryCount: 0,
              retryDelayMs: 0,
              delayAfterMs: 0,
            },
          ],
        },
      },
    ],
    experimental: {
      nativeToolbarControl: false,
      internalCommandAdapter: false,
      shortcutAdapter: false,
      clickSequenceAdapter: true,
    },
  });

  expect(config.items[0].experimentalClickSequence?.steps[0]).toEqual({
    selector: "lang",
    value: "en_US",
    valueMode: "value",
    timeoutMs: 1000,
    retryCount: 0,
    retryDelayMs: 0,
    delayAfterMs: 0,
  });
});
```

```ts
it("round-trips experimental click sequence form-value settings through import/export", () => {
  const config = importConfigFromJson(JSON.stringify({
    version: 2,
    desktopOnly: true,
    items: [
      {
        id: "exp-sequence",
        title: "切换语言",
        visible: true,
        iconType: "iconpark",
        iconValue: "iconpark:Setting",
        surface: "topbar",
        order: 0,
        actionType: "experimental-click-sequence",
        actionId: "lang",
        experimentalClickSequence: {
          stopOnFailure: true,
          steps: [
            {
              selector: "lang",
              value: "English (en_US)",
              valueMode: "text",
              timeoutMs: 1000,
              retryCount: 0,
              retryDelayMs: 0,
              delayAfterMs: 0,
            },
          ],
        },
      },
    ],
    experimental: {
      nativeToolbarControl: false,
      internalCommandAdapter: false,
      shortcutAdapter: false,
      clickSequenceAdapter: true,
    },
  }));

  expect(importConfigFromJson(exportConfigAsJson(config))).toEqual(config);
});
```

- [ ] **Step 6: Run the config-layer tests and verify they pass**

Run: `npm test -- tests/config-item-defaults.test.ts tests/config-store.test.ts tests/import-export.test.ts`

Expected: PASS with all config normalization and round-trip assertions green.

- [ ] **Step 7: Commit the schema and config normalization slice**

```bash
git add src/shared/types.ts src/core/config/item-defaults.ts src/core/config/sanitize.ts tests/config-item-defaults.test.ts tests/config-store.test.ts tests/import-export.test.ts
git commit -m "Add click sequence form value config fields"
```

### Task 2: Implement Runtime Form-Value Execution for Click Sequence Steps

**Files:**
- Modify: `src/core/commands/click-sequence.ts`
- Test: `tests/click-sequence.test.ts`

- [ ] **Step 1: Write the failing runtime tests for `select`, `input`, and `textarea` set-value steps**

```ts
it("sets select values by option value and dispatches input plus change", async () => {
  const dom = new JSDOM(`
    <select id="lang">
      <option value="en_US">English (en_US)</option>
      <option value="zh_CN" selected>简体中文 (zh_CN)</option>
    </select>
  `);
  const select = dom.window.document.getElementById("lang") as HTMLSelectElement;
  const events: string[] = [];

  select.addEventListener("input", () => events.push("input"));
  select.addEventListener("change", () => events.push("change"));

  const result = await executeExperimentalClickSequence({
    actionId: "lang",
    experimentalClickSequence: {
      stopOnFailure: true,
      steps: [
        {
          selector: "lang",
          value: "en_US",
          valueMode: "value",
          timeoutMs: 100,
          retryCount: 0,
          retryDelayMs: 0,
          delayAfterMs: 0,
        },
      ],
    },
  }, {
    document: dom.window.document,
    root: dom.window.document,
    windowTarget: dom.window,
  });

  expect(result).toBe(true);
  expect(select.value).toBe("en_US");
  expect(events).toEqual(["input", "change"]);
});
```

```ts
it("sets select values by option text", async () => {
  const dom = new JSDOM(`
    <select id="lang">
      <option value="en_US">English (en_US)</option>
      <option value="zh_CN" selected>简体中文 (zh_CN)</option>
    </select>
  `);

  const result = await executeExperimentalClickSequence({
    actionId: "lang",
    experimentalClickSequence: {
      stopOnFailure: true,
      steps: [
        {
          selector: "lang",
          value: "English (en_US)",
          valueMode: "text",
          timeoutMs: 100,
          retryCount: 0,
          retryDelayMs: 0,
          delayAfterMs: 0,
        },
      ],
    },
  }, {
    document: dom.window.document,
    root: dom.window.document,
    windowTarget: dom.window,
  });

  expect(result).toBe(true);
  expect((dom.window.document.getElementById("lang") as HTMLSelectElement).value).toBe("en_US");
});
```

```ts
it("sets input and textarea values through the same step model", async () => {
  const dom = new JSDOM(`
    <input id="keyword" value="" />
    <textarea id="note"></textarea>
  `);

  const result = await executeExperimentalClickSequence({
    actionId: "keyword",
    experimentalClickSequence: {
      stopOnFailure: true,
      steps: [
        {
          selector: "keyword",
          value: "english",
          valueMode: "value",
          timeoutMs: 100,
          retryCount: 0,
          retryDelayMs: 0,
          delayAfterMs: 0,
        },
        {
          selector: "note",
          value: "Line 1",
          valueMode: "text",
          timeoutMs: 100,
          retryCount: 0,
          retryDelayMs: 0,
          delayAfterMs: 0,
        },
      ],
    },
  }, {
    document: dom.window.document,
    root: dom.window.document,
    windowTarget: dom.window,
  });

  expect(result).toBe(true);
  expect((dom.window.document.getElementById("keyword") as HTMLInputElement).value).toBe("english");
  expect((dom.window.document.getElementById("note") as HTMLTextAreaElement).value).toBe("Line 1");
});
```

```ts
it("fails when a value step cannot match a select option", async () => {
  const dom = new JSDOM(`
    <select id="lang">
      <option value="zh_CN" selected>简体中文 (zh_CN)</option>
    </select>
  `);
  const onStepError = vi.fn();

  const result = await executeExperimentalClickSequence({
    actionId: "lang",
    experimentalClickSequence: {
      stopOnFailure: true,
      steps: [
        {
          selector: "lang",
          value: "en_US",
          valueMode: "value",
          timeoutMs: 100,
          retryCount: 0,
          retryDelayMs: 0,
          delayAfterMs: 0,
        },
      ],
    },
  }, {
    document: dom.window.document,
    root: dom.window.document,
    windowTarget: dom.window,
    onStepError,
  });

  expect(result).toBe(false);
  expect(onStepError).toHaveBeenCalledWith({
    index: 0,
    selector: "lang",
  });
});
```

- [ ] **Step 2: Run the click-sequence test file and verify it fails for the new set-value cases**

Run: `npm test -- tests/click-sequence.test.ts`

Expected: FAIL showing that value-setting tests do not update the control values or do not dispatch the expected events.

- [ ] **Step 3: Add a dedicated form-value execution branch before the existing click branch**

```ts
function dispatchFormEvents(element: HTMLElement, windowTarget: Window): void {
  element.dispatchEvent(new windowTarget.Event("input", { bubbles: true }));
  element.dispatchEvent(new windowTarget.Event("change", { bubbles: true }));
}

function setFormControlValue(step: ClickSequenceStep, element: HTMLElement, windowTarget: Window): boolean {
  if (element instanceof windowTarget.HTMLSelectElement) {
    const options = Array.from(element.options);
    const match = step.valueMode === "text"
      ? options.find(option => option.textContent?.replace(/\s+/g, " ").trim() === step.value)
      : options.find(option => option.value === step.value);

    if (!match) {
      return false;
    }

    element.value = match.value;
    dispatchFormEvents(element, windowTarget);
    return true;
  }

  if (element instanceof windowTarget.HTMLTextAreaElement) {
    element.value = step.value || "";
    dispatchFormEvents(element, windowTarget);
    return true;
  }

  if (element instanceof windowTarget.HTMLInputElement) {
    const unsupportedTypes = new Set(["checkbox", "radio"]);
    if (unsupportedTypes.has((element.type || "text").toLowerCase())) {
      return false;
    }

    element.value = step.value || "";
    dispatchFormEvents(element, windowTarget);
    return true;
  }

  return false;
}
```

```ts
const isValueStep = typeof step.value === "string";

if (!element || !(isValueStep ? setFormControlValue(step, element, windowTarget) : clickElement(element, windowTarget))) {
  allStepsSucceeded = false;
  await options.onStepError?.({
    index,
    selector: step.selector,
  });
  if (clickSequence.stopOnFailure) {
    return false;
  }
  continue;
}
```

- [ ] **Step 4: Keep the existing click behavior intact and add only the minimal helpers needed for value steps**

```ts
function normalizeOptionText(value: string | null | undefined): string {
  return (value || "").replace(/\s+/g, " ").trim();
}
```

Use that helper only for the `valueMode: "text"` branch. Do not restructure unrelated click-sequence logic.

- [ ] **Step 5: Run the click-sequence test file again and verify it passes**

Run: `npm test -- tests/click-sequence.test.ts`

Expected: PASS with the legacy click tests and all new value-step tests green.

- [ ] **Step 6: Commit the runtime behavior slice**

```bash
git add src/core/commands/click-sequence.ts tests/click-sequence.test.ts
git commit -m "Support form value steps in click sequences"
```

### Task 3: Expose Form-Value Step Editing in the Settings UI

**Files:**
- Modify: `src/features/settings/action-config.ts`
- Modify: `src/features/settings/use-settings-controller.ts`
- Modify: `src/App.vue`
- Test: `tests/settings-app-layout.test.ts`

- [ ] **Step 1: Write the failing settings UI test for editing `设值` and `设值模式`**

```ts
it("edits click-sequence form-value fields in the settings panel", async () => {
  const target = document.createElement("div");
  document.body.appendChild(target);

  const onChange = vi.fn().mockResolvedValue(undefined);
  const initialConfig = createDefaultConfig();
  initialConfig.items = [
    createButtonItem({
      id: "lang-step",
      title: "切换语言",
      actionType: "experimental-click-sequence",
      actionId: "lang",
      experimentalClickSequence: {
        stopOnFailure: true,
        steps: [
          {
            selector: "lang",
            value: "",
            valueMode: "value",
            timeoutMs: 1000,
            retryCount: 0,
            retryDelayMs: 0,
            delayAfterMs: 0,
          },
        ],
      },
    }),
  ];

  const unmount = mountSettingsApp(target, {
    initialConfig,
    builtinCommands: [],
    pluginCommands: [],
    onChange,
    onNotify: vi.fn(),
    onReadCurrentLayout: vi.fn().mockResolvedValue([]),
  });

  await nextTick();

  const valueInput = Array.from(target.querySelectorAll<HTMLInputElement>(".click-sequence-step input.b3-text-field"))
    .find(input => input.placeholder.includes("例如：en_US"));
  const modeSelect = Array.from(target.querySelectorAll<HTMLSelectElement>(".click-sequence-step select.b3-select"))
    .find(select => Array.from(select.options).some(option => option.value === "text"));

  valueInput!.value = "English (en_US)";
  valueInput!.dispatchEvent(new Event("input"));
  valueInput!.dispatchEvent(new Event("change"));
  await new Promise(resolve => window.setTimeout(resolve, 20));
  await nextTick();

  modeSelect!.value = "text";
  modeSelect!.dispatchEvent(new Event("change"));
  await new Promise(resolve => window.setTimeout(resolve, 20));
  await nextTick();

  const latestConfig = onChange.mock.calls.at(-1)?.[0];
  expect(latestConfig.items[0].experimentalClickSequence.steps[0].value).toBe("English (en_US)");
  expect(latestConfig.items[0].experimentalClickSequence.steps[0].valueMode).toBe("text");

  unmount();
});
```

- [ ] **Step 2: Run the settings layout test and verify it fails because the form-value controls are missing**

Run: `npm test -- tests/settings-app-layout.test.ts`

Expected: FAIL because no matching `设值` input or `设值模式` select exists in the click-sequence editor.

- [ ] **Step 3: Ensure click-sequence hydration creates stable step objects with the new fields**

```ts
export function ensureExperimentalClickSequenceConfig(item: PowerButtonItem): ExperimentalClickSequenceConfig {
  item.experimentalClickSequence = createExperimentalClickSequenceConfig(item.experimentalClickSequence, item.actionId);
  return item.experimentalClickSequence;
}
```

That call will only work correctly after Task 1 because `createExperimentalClickSequenceConfig()` now injects `value` and `valueMode` defaults into each step.

- [ ] **Step 4: Add `设值` and `设值模式` controls to the click-sequence editor in `src/App.vue`**

```vue
<label class="form-grid__full">
  <span>设值</span>
  <input
    v-model="step.value"
    class="b3-text-field"
    placeholder="例如：en_US / English (en_US) / 关键词"
    @change="syncExperimentalClickSequence"
  />
</label>
<label>
  <span>设值模式</span>
  <select
    v-model="step.valueMode"
    class="b3-select"
    :disabled="!step.value"
    @change="syncExperimentalClickSequence"
  >
    <option value="value">按 value 匹配</option>
    <option value="text">按文本匹配</option>
  </select>
</label>
```

- [ ] **Step 5: Keep the existing settings persistence flow unchanged**

```ts
async function syncExperimentalClickSequence(): Promise<void> {
  if (!selectedItem.value) {
    return;
  }
  const clickSequence = ensureExperimentalClickSequenceConfig(selectedItem.value);
  selectedItem.value.actionId = summarizeClickSequence(clickSequence);
  await persist();
}
```

No new controller method is required unless the template needs one. Reuse the existing `syncExperimentalClickSequence()` path.

- [ ] **Step 6: Run the settings layout test again and verify it passes**

Run: `npm test -- tests/settings-app-layout.test.ts`

Expected: PASS with the new click-sequence editor test and no regressions in existing settings-panel coverage.

- [ ] **Step 7: Commit the UI slice**

```bash
git add src/features/settings/action-config.ts src/features/settings/use-settings-controller.ts src/App.vue tests/settings-app-layout.test.ts
git commit -m "Add click sequence form value controls to settings"
```

### Task 4: Run Full Verification and Update User-Facing Examples

**Files:**
- Modify: `docs/随心按插件-动作类型使用指南.md`
- Modify: `docs/随心按插件-配置样例大全.md`
- Test: `tests/click-sequence.test.ts`
- Test: `tests/config-item-defaults.test.ts`
- Test: `tests/config-store.test.ts`
- Test: `tests/import-export.test.ts`
- Test: `tests/settings-app-layout.test.ts`

- [ ] **Step 1: Add one concise user-facing example to the action guide**

````md
### 点击序列设值示例：切换语言到 English

```json
{
  "actionType": "experimental-click-sequence",
  "actionId": "lang",
  "experimentalClickSequence": {
    "stopOnFailure": true,
    "steps": [
      {
        "selector": "lang",
        "value": "en_US",
        "valueMode": "value",
        "timeoutMs": 1000,
        "retryCount": 0,
        "retryDelayMs": 0,
        "delayAfterMs": 0
      }
    ]
  }
}
```

- `select` 推荐优先按 `value` 匹配
- `input` 和 `textarea` 会直接写入 `value`
- 设值成功后会派发 `input` 和 `change`
````

- [ ] **Step 2: Add one JSON sample to the config examples document**

````md
### 8.x 表单设值：把语言切到 English

```json
{
  "id": "exp-switch-language",
  "title": "English",
  "visible": true,
  "iconType": "iconpark",
  "iconValue": "iconpark:Translate",
  "surface": "topbar",
  "order": 30,
  "actionType": "experimental-click-sequence",
  "actionId": "lang",
  "tooltip": "切换语言到 English",
  "experimentalClickSequence": {
    "stopOnFailure": true,
    "steps": [
      {
        "selector": "lang",
        "value": "en_US",
        "valueMode": "value",
        "timeoutMs": 1000,
        "retryCount": 0,
        "retryDelayMs": 0,
        "delayAfterMs": 0
      }
    ]
  }
}
```
````

- [ ] **Step 3: Run the targeted regression suite**

Run: `npm test -- tests/click-sequence.test.ts tests/config-item-defaults.test.ts tests/config-store.test.ts tests/import-export.test.ts tests/settings-app-layout.test.ts`

Expected: PASS with all click-sequence, config, import/export, and settings UI tests green.

- [ ] **Step 4: Run the full test suite**

Run: `npm test`

Expected: PASS with all repository tests green.

- [ ] **Step 5: Run the production build**

Run: `npm run build`

Expected: PASS with Vite production build completing successfully and `dist` output refreshed.

- [ ] **Step 6: Commit docs and verified implementation**

```bash
git add docs/随心按插件-动作类型使用指南.md docs/随心按插件-配置样例大全.md src/shared/types.ts src/core/config/item-defaults.ts src/core/config/sanitize.ts src/core/commands/click-sequence.ts src/features/settings/action-config.ts src/features/settings/use-settings-controller.ts src/App.vue tests/click-sequence.test.ts tests/config-item-defaults.test.ts tests/config-store.test.ts tests/import-export.test.ts tests/settings-app-layout.test.ts
git commit -m "Add form value steps to experimental click sequences"
```

## Self-Review Checklist

- Spec coverage:
  - Step fields and defaults: Task 1
  - Runtime `select` / `input` / `textarea` behavior: Task 2
  - Settings editor exposure: Task 3
  - User-facing examples and final verification: Task 4
- Placeholder scan:
  - No unfinished placeholders or unresolved references remain.
- Type consistency:
  - The plan uses `value` and `valueMode` consistently across types, config helpers, runtime execution, and UI tests.
