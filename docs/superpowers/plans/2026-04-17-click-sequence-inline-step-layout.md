# Click Sequence Inline Step Layout Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Reduce vertical space in the click-sequence settings editor by rendering each step field as an inline label/control row.

**Architecture:** Keep the existing click-sequence data model and only change the editor template plus styles in `src/App.vue` and `src/index.scss`. Use a targeted Vitest layout assertion in `tests/settings-app-layout.test.ts` to lock the new DOM structure.

**Tech Stack:** Vue 3, TypeScript, SCSS, Vitest, Vite

---

## File Structure

**Modify:**
- `tests/settings-app-layout.test.ts`
- `src/App.vue`
- `src/index.scss`

### Task 1: Lock the New Row Structure with a Failing Test

**Files:**
- Modify: `tests/settings-app-layout.test.ts`

- [ ] **Step 1: Add a layout assertion for inline click-sequence fields**

```ts
const selectorRow = target.querySelector(".click-sequence-step__field--selector");
const modeRow = target.querySelector(".click-sequence-step__field--mode");

expect(selectorRow?.classList.contains("click-sequence-step__field")).toBe(true);
expect(modeRow?.classList.contains("click-sequence-step__field")).toBe(true);
```

- [ ] **Step 2: Run the focused test and verify it fails**

Run: `npm test -- tests/settings-app-layout.test.ts`

Expected: FAIL because the click-sequence editor does not yet render those row classes.

### Task 2: Implement the Inline Layout

**Files:**
- Modify: `src/App.vue`
- Modify: `src/index.scss`

- [ ] **Step 1: Add dedicated row classes in the click-sequence template**

```vue
<label class="click-sequence-step__field click-sequence-step__field--selector">
  <span>选择器</span>
  <input ... />
</label>
```

- [ ] **Step 2: Add click-sequence-only row styles**

```scss
.click-sequence-step__field {
  display: grid;
  grid-template-columns: 92px minmax(0, 1fr);
  align-items: center;
}
```

- [ ] **Step 3: Keep mobile fallback single-column**

Run: `npm test -- tests/settings-app-layout.test.ts`

Expected: PASS.

### Task 3: Verify the Change

**Files:**
- Modify: `src/App.vue`
- Modify: `src/index.scss`
- Modify: `tests/settings-app-layout.test.ts`

- [ ] **Step 1: Run the focused settings layout test**

Run: `npm test -- tests/settings-app-layout.test.ts`

Expected: PASS.

- [ ] **Step 2: Run the production build**

Run: `npm run build`

Expected: PASS.
