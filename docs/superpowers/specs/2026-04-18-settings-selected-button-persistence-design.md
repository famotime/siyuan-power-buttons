# Settings Selected Button Persistence Design

## Goal

Persist the currently selected button in the settings page when the dialog closes, and restore that same selection the next time the settings page opens to make repeated debugging easier.

## Scope

- Store the last selected settings button id as local plugin UI state.
- Restore the selection when the settings app mounts.
- Fall back to the first available button when the stored id no longer exists.
- Keep this state out of config import/export and out of the main button config schema.

## Non-Goals

- No cross-device sync.
- No import/export support for the selection state.
- No broader persistence for other settings-page UI controls.

## Design

### Storage Boundary

Add a dedicated lightweight plugin data file for settings UI state, separate from `settings.json`.

That file stores only:

- `lastSelectedButtonId: string`

This keeps runtime button configuration and transient editor state isolated.

### Runtime Flow

`PowerButtonsRuntime` will load the UI state store during plugin startup alongside the config store.

When opening settings, the runtime will pass two extra props into the settings app:

- `initialSelectedButtonId`
- `onSelectedIdChange`

The callback persists selection changes without touching the main config store.

### Settings Controller Flow

`useSettingsController(...)` will initialize `selectedId` using this priority:

1. `initialSelectedButtonId` when it matches an existing config item
2. the first config item id
3. empty string when there are no items

The controller will persist the effective `selectedId` whenever it changes, including:

- user clicks another button in the sidebar
- adding a button
- duplicating a button
- deleting the selected button
- resetting config
- importing config

If the stored id is stale because the target button no longer exists, the controller will immediately normalize it to the fallback selection.

## Error Handling

- Missing or malformed UI state falls back to `{ lastSelectedButtonId: '' }`.
- Persisting selection state is best-effort and must not block main config persistence or settings rendering.

## Testing

Add coverage for:

- restoring a valid persisted selected id
- falling back when the persisted id is missing
- runtime passing the persisted id into settings props
- the UI state store persisting independently from config import/export data

## Risks

- A stale selection id can appear after external config edits; the controller normalization path covers this.
- Extra persistence on every selection change adds a small save frequency increase, but the payload is tiny and isolated.
