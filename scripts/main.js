import { MobileMovementApp } from "./apps/MobileMovementApp.js";

Hooks.once("init", () => {
  Handlebars.registerHelper("eq", (a, b) => a === b);
  Handlebars.registerHelper("gt", (a, b) => a > b);
  Handlebars.registerHelper("sub", (a, b) => a - b);
});

Hooks.once("setup", () => {
  if (game.user.isGM) return;

  const original = game.settings.get("core", "noCanvas");
  if (!original) {
    game.settings.set("core", "noCanvas", true);
  }
});

Hooks.once("ready", () => {
  if (game.user.isGM) {
    if (game.settings.get("core", "noCanvas")) {
      game.settings.set("core", "noCanvas", false);
    }
    return;
  }

  document.body.classList.add("mobile-mode");
  const mobileApp = new MobileMovementApp();
  globalThis.mobileApp = mobileApp;
  mobileApp.render(true);
});

window.addEventListener("beforeunload", () => {
  if (game.user.isGM) return;
  try {
    if (game.settings.get("core", "noCanvas")) {
      game.settings.set("core", "noCanvas", false);
    }
  } catch(e) {}
});
