# Fixed Settings Entry Design

## Goal

Keep `随心按` as a permanent plugin-management menu entry while removing the default in-surface settings button from generated default config.

## Scope

This change affects only the relationship between:

- the fixed plugin command entry registered through runtime/plugin lifecycle
- the default button items generated for a new or reset configuration

It does not change:

- how plugin commands are executed
- how users manually create a `plugin-command / open-settings` button
- how existing saved configs are migrated or rewritten

## Behavior

### Fixed entry

The plugin-management dropdown must always expose `随心按`.

This entry remains registered from runtime startup and must not depend on `config.items`.

### Default config

`createDefaultConfig()` must no longer include the prebuilt `插件设置` button.

A fresh config and a reset-to-default action should therefore produce only the remaining default buttons.

### User-created settings buttons

Users can still manually create a button whose action is `plugin-command` with `actionId = open-settings`.

That user-created button is additive. It does not replace, hide, or relocate the fixed plugin-management menu entry.

### Existing saved configs

Existing user configs that already contain a settings button are left unchanged.

This feature only changes future defaults and reset results. No migration removes user data.

## Architecture

The code already separates fixed plugin command registration from config-driven surface rendering:

- runtime command registration lives in `src/core/runtime/plugin-runtime.ts`
- default config generation lives in `src/core/config/defaults.ts`

The implementation should preserve that separation and only remove the default `插件设置` item from config generation.

## Testing

Add or update tests to verify:

1. runtime still registers and executes the fixed `open-settings` plugin command
2. default config no longer contains a prebuilt settings button
3. manually configured `open-settings` buttons continue to execute through plugin command handlers

## Risks

The main user-visible change is that reset/default config no longer shows a settings button on surfaces.

This is intentional and matches the new requirement that the fixed entry lives only in the plugin-management dropdown unless the user explicitly creates an additional button.
