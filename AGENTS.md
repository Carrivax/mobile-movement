# mobile-movement · AGENTS.md

Foundry VTT module (v14+). D&D 5e mobile movement/HP UI. Pure JS, no build step.

## Structure

- `scripts/main.js` — entry point. Registers settings, checks if current user is an enabled non-GM, sets `core.noCanvas = true` to hide the board, renders `MobileMovementApp`.
- `scripts/apps/` — ApplicationV2 (not legacy Application) classes.
- `scripts/lib/` — pure utility functions (no class instances, no state).
- `templates/*.hbs` — Handlebars templates, Spanish text.
- `styles/mobile-movement.css` — all styles in one file, no CSS preprocessor.

## Entry & Loading

`module.json` ES module entry: `scripts/main.js`.  
Templates referenced as `modules/mobile-movement/templates/...` (see `scripts/lib/constants.js`).

## Key Conventions

- **UI language**: Spanish (all labels, buttons, notifications in Spanish).
- **D&D 5e specific**: reads `actor.system.attributes.movement`, `actor.system.attributes.hp`, `actor.system.abilities`, spell slots from `actor.system.spells.spell1..spell9`.
- **Movement**: grid-snapped, wall-aware (segment intersection), respects `grid.diagonal` setting (1.5x cost when `diagonal === 1`). Supports Foundry v14 elevation thresholds and Levels module wall elevation flags. Out of combat: unlimited movement (no speed cap).
- **Combat**: movement is tracked per-turn, reset when `updateCombat.turn` changes for the selected actor.
- **Pause**: movement/rotation blocked with a warning when `game.paused` is true (Foundry server-side restriction for non-GM users).
- **HP modal**: modal roll/detail elements are created manually (`document.createElement`), appended to `document.body`, shown/hidden via `.visible` class. No Handlebars partial for them.

## Module Settings

- `mobile-movement.enabledUsers` — `world` scope, `Object` type, array of user IDs. Set via the settings menu (`MobileUserForm`).

## CSS z-index Stack

- `#mobile-movement, #hp-control` — `z-index: 9999` (mobile UI base)
- `#mobile-movement .hs-bar-context` — `z-index: 10000`
- `body.mobile-mode .window-app, body.mobile-mode .application.dialog` — `z-index: 10001` (native dialogs above mobile UI)
- `body.mobile-mode #pause` — `z-index: 10001` (pause overlay above mobile UI)

## HP Control App

`MobileMovementApp` opens `HPControlApp` on center-token click. When open, `MobileMovementApp.element` is hidden (`display: none`). Return closes HPControlApp and re-renders the parent.
