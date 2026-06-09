# mobile-movement · AGENTS.md

Foundry VTT module (v14+) for D&D 5e mobile movement/HP UI. Pure JS, no build step.

## Entry & Loading

- `module.json` ES module entry → `scripts/main.js`
- Templates: `modules/mobile-movement/templates/...` (see `scripts/lib/constants.js`)
- `main.js` registers Handlebars helpers in `init`, then on `setup` sets `core.noCanvas = true` for non-GMs, then on `ready` renders `MobileMovementApp` for non-GMs and resets `noCanvas` for GMs

## Structure

- `scripts/apps/` — ApplicationV2 (not legacy Application) classes
- `scripts/lib/` — pure utility functions (no state, no instances)
- `templates/*.hbs` — Handlebars templates, Spanish text
- `styles/mobile-movement.css` — single file, no preprocessor

## Key Conventions

- **UI**: Spanish labels/notifications
- **D&D 5e**: reads `actor.system.attributes.movement`, `.hp`, `.abilities`, `.spells.spell1..spell9`
- **Movement**: grid-snapped, wall-aware (segment intersection), respects `grid.diagonal` (1.5x cost when `diagonal === 1`). Out of combat: unlimited.
- **Combat**: movement tracked per-turn, reset on `updateCombat.turn` for selected actor.
- **Pause**: movement/rotation blocked when `game.paused` (Foundry restriction).
- **HP modal**: `document.createElement` appended to `body`, shown/hidden via `.visible` class.
- **canvas**: `core.noCanvas = true` set in `setup` for non-GMs to hide the board; auto-reset on `ready` for GMs and on `beforeunload` for non-GMs.

## CSS z-index Stack

- `#mobile-movement, #hp-control` → 9999
- `.hs-bar-context` → 10000
- `body.mobile-mode .window-app, .dialog, #pause` → 10001
