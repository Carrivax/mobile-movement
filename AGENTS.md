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

Registered in `init` via `game.settings.register(MODULE_ID, ...)` using `SETTINGS` from `constants.js`. New settings must be added in both places.

| Key | Type | Default | Scope | Description |
| --- | ---- | ------- | ----- | ----------- |
| `mobileMode.enabledUsers` | String | `""` | world | Comma-separated user IDs with mobile mode active. Empty = all non-GMs. Config UI replaces text input with inline user checkboxes via `renderSettingsConfig` hook. |
| `mobileMode.centerButtonAction` | String | `"hp-control"` | world | `"hp-control"` (default HP panel), `"foundry-sheet"` (native Foundry sheet), or `"level20"` (embedded Nivel20 page). GM configures for all users. |
| `mobileMode.level20Urls` | String | `"{}"` | world | JSON mapping `actorId → URL`. Config UI displays all player-owned actors with inline URL text inputs, grouped by player. Only used when `centerButtonAction` is `"level20"`. |

## Structure

- `scripts/apps/` — `ApplicationV2` (not legacy `Application`) subclasses
- `scripts/lib/` — pure utility functions (no state, no instances)
- `templates/*.hbs` — Handlebars templates, Spanish text
- `styles/mobile-movement.css` — single file, no preprocessor

## D-Pad Center Button

The d-pad center button (`.center-token`) behavior depends on `mobileMode.centerButtonAction` (user setting):

| Action | Behavior |
| ------ | -------- |
| `hp-control` | Opens `HPControlApp` overlay (saves, skills, actions, items, spells). |
| `foundry-sheet` | Calls `actor.sheet.render(true)` — native Foundry character sheet. |
| `level20` | Opens the configured Nivel20 URL in a new browser tab (`window.open`). |

When `HPControlApp` is closed via "Volver", it returns to `MobileMovementApp`.

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
