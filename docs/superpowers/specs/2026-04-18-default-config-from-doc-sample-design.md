# Default Config From Doc Sample Design

## Goal

Replace the built-in new-user default configuration with the configuration currently documented in `docs/siyuan-power-buttons-config.json`.

## Scope

- Update `createDefaultConfig()` to return the same effective configuration as the documented sample.
- Make the same configuration apply to first load with no saved data and to config reset.
- Preserve current sanitization and cloning behavior around the default config.
- Add regression tests for the new default button set and native-button suppression defaults.

## Non-Goals

- No runtime import of `docs/siyuan-power-buttons-config.json`.
- No change to config import/export behavior.
- No migration that overwrites existing saved user configuration.
- No config schema version bump.

## Design

### Source Of Truth

Use `docs/siyuan-power-buttons-config.json` as the approved reference when updating the hardcoded default config in `src/core/config/defaults.ts`.

Implementation stays on option 1:

- copy the documented sample into code
- keep the runtime default defined in TypeScript
- do not add a runtime dependency on files under `docs/`

This keeps the runtime path simple and avoids changing bundling behavior, at the cost of manual synchronization when the doc sample changes later.

### Default Config Construction

Refactor `createDefaultConfig()` so it returns a config equivalent to the documented sample, including:

- the full `items` list
- `disabledNativeButtons`
- existing experimental adapter flags
- `desktopOnly: true`
- `version: 2`

`items` should still flow through the existing helper-based construction where practical so the returned structure remains consistent with runtime expectations. `normalizeItemOrder(...)` should remain the final ordering step.

### Runtime Behavior

No store changes are required.

`ConfigStore` already uses `createDefaultConfig()` for both:

- initial in-memory state before load
- `reset()`

`load()` will continue to sanitize stored data and persist normalized output when needed. Existing users with saved config remain unchanged because saved data still wins over defaults.

## Error Handling

- The built-in default remains valid even if future stored data is malformed because `sanitizeConfig(...)` still guards load and replace paths.
- If a future code edit causes the hardcoded default to drift from allowed values, tests should fail before release.

## Testing

Add or update tests to verify:

- `createDefaultConfig()` returns the documented default titles in the expected order.
- the default config includes documented action types such as builtin global commands, plugin commands, experimental shortcuts, and experimental click sequences.
- the default config includes the documented `disabledNativeButtons`.
- `ConfigStore.reset()` restores the new documented defaults instead of the old two-button starter config.

## Risks

- The doc sample and hardcoded default can drift because the file is not imported at runtime; this is an accepted tradeoff for the chosen approach.
- The larger default button set increases the amount of behavior covered by defaults, so test coverage needs to assert representative items rather than only item count.
