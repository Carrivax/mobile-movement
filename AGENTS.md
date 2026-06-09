# mobile-movement · AGENTS.md

Foundry VTT module (v14+) for D&D 5e mobile movement/HP UI. Pure JS, no build step.

## Entry & Loading

- `module.json` ES module entry → `scripts/main.js`
- Templates: `modules/${MODULE_ID}/templates/` (see `scripts/lib/constants.js`)
- Hook flow in `main.js`:
  1. `init` — register Handlebars helpers + module settings
  2. `setup` — if non-GM + mobile user, set `core.noCanvas = true`
  3. `ready` — GMs reset `noCanvas`. Non-GM mobile users: add `mobile-mode` class, render `MobileMovementApp`
  4. `beforeunload` — non-GM mobile users restore `noCanvas` if overwritten
  5. `renderSettingsConfig` — replaces the default text input of `mobileMode.enabledUsers` with inline user checkboxes

## Settings

Registered in `init` via `game.settings.register(MODULE_ID, ...)` using `SETTINGS` constants from `constants.js`:

| Key | Type | Default | Scope | Description |
| --- | ---- | ------- | ----- | ----------- |
| `mobileMode.enabledUsers` | String | "" | world | Comma-separated user IDs with mobile mode active. Empty = all non-GMs. `config: true` — the settings panel replaces the default text input with inline checkboxes via the `renderSettingsConfig` hook. |

New settings must be added to both `constants.js` (key constant) and `main.js` (register call).

## Structure

- `scripts/apps/` — `ApplicationV2` (not legacy `Application`) subclasses
- `scripts/lib/` — pure utility functions (no state, no instances)
- `templates/*.hbs` — Handlebars templates, Spanish text
- `styles/mobile-movement.css` — single file, no preprocessor. Contains unused settings-UI classes (`.settings-hint`, `.settings-submit`, `.reset-movement`)

## Key Conventions

- **UI**: Spanish labels/notifications
- **D&D 5e**: reads `actor.system.attributes.movement`, `.hp`, `.abilities`, `.spells.spell1..spell9`
- **Movement**: grid-snapped, wall-aware (segment intersection), respects `grid.diagonal` (1.5x cost when `diagonal === 1`). Out of combat: unlimited.
- **Combat**: movement tracked per-turn, reset on `updateCombat.turn` for selected actor.
- **Pause**: movement/rotation blocked when `game.paused` (Foundry restriction).
- **HP modal**: `document.createElement` appended to `body`, shown/hidden via `.visible` class.

## CSS z-index Stack

- `#mobile-movement, #hp-control` → 9999
- `.hs-bar-context` → 10000
- `body.mobile-mode .window-app, .dialog, #pause` → 10001
