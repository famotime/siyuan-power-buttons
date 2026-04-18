# Restart Plugins Builtin Command Design

## Goal

Add a stable built-in command that restarts all SiYuan plugins by toggling the global plugin switch off and back on through `/api/setting/setBazaar`, so updated plugin settings can take effect without relying on DOM click simulation.

## Scope

- Add a new built-in command entry exposed in the existing built-in command catalog.
- Execute the command through the stable built-in command runner.
- Call `/api/setting/setBazaar` twice in sequence:
  - first with `petalDisabled: true`
  - then with `petalDisabled: false`
- If the second call fails after the first succeeded, report overall failure and leave plugins disabled.

## Non-Goals

- No retry logic.
- No experimental click-sequence or shortcut fallback.
- No new settings UI beyond the command becoming selectable as a built-in command.

## Design

### Command Definition

The built-in command catalog will gain a stable command:

- `id`: `restartPlugins`
- `title`: `重启所有插件`
- `category`: `系统`

This keeps the feature aligned with existing built-in command selection flows.

### Execution Path

`executeBuiltinCommandStable(...)` will gain a dedicated API branch for `restartPlugins`.

That branch will:

1. Require `fetchPost`.
2. Send `/api/setting/setBazaar` with `{ petalDisabled: true }`.
3. Stop and return `false` if the first call fails.
4. Send `/api/setting/setBazaar` with `{ petalDisabled: false }`.
5. Return `true` only if both responses are successful.

This command will bypass the DOM runner because the target is the global plugin switch itself and DOM-triggered self-disable behavior is unreliable for the current plugin.

### Error Handling

- Any rejected request returns `false`.
- Any non-`code === 0` response returns `false`.
- If disable succeeds and enable fails, the command returns `false` and does not attempt recovery, matching the approved failure semantics.

## Testing

Add test coverage for:

- the built-in catalog exposing `restartPlugins`
- the stable runner calling `/api/setting/setBazaar` twice in the correct order
- the stable runner returning `false` when the second call fails after a successful first call

## Risks

- The API may expect additional bazaar fields in future SiYuan versions. This design intentionally starts with the minimal payload required by the current use case.
- A failed second call intentionally leaves plugins disabled. This is the requested behavior, but it is user-visible and should remain covered by tests.
