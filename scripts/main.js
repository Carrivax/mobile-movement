import { MODULE_ID } from "./lib/constants.js";
import { MobileMovementApp } from "./apps/MobileMovementApp.js";
import { MobileUserForm } from "./apps/MobileUserForm.js";

let _originalNoCanvas = false;

Hooks.once("init", () => {
  Handlebars.registerHelper("eq", (a, b) => a === b);
  Handlebars.registerHelper("gt", (a, b) => a > b);
  Handlebars.registerHelper("sub", (a, b) => a - b);

  game.settings.register(MODULE_ID, "enabledUsers", {
    scope: "world",
    config: false,
    type: Object,
    default: [],
  });

  game.settings.registerMenu(MODULE_ID, "userSettings", {
    name: "Usuarios habilitados",
    label: "Configurar usuarios...",
    hint: "Selecciona qué jugadores usarán el control móvil en lugar del mapa.",
    icon: "fa-solid fa-mobile-screen-button",
    type: MobileUserForm,
    restricted: true,
  });
});

Hooks.once("setup", () => {
  const enabled = game.settings.get(MODULE_ID, "enabledUsers") || [];
  const isMobileUser = !game.user.isGM && enabled.includes(game.user.id);
  if (!isMobileUser) return;

  _originalNoCanvas = game.settings.get("core", "noCanvas");
  game.settings.set("core", "noCanvas", true);
});

Hooks.once("ready", () => {
  const enabled = game.settings.get(MODULE_ID, "enabledUsers") || [];
  const isMobileUser = !game.user.isGM && enabled.includes(game.user.id);

  if (!isMobileUser) {
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

Hooks.on("updateSetting", setting => {
  if (setting.key !== `${MODULE_ID}.enabledUsers`) return;
  const enabled = game.settings.get(MODULE_ID, "enabledUsers") || [];
  const isMobileUser = !game.user.isGM && enabled.includes(game.user.id);
  if (!isMobileUser && game.settings.get("core", "noCanvas")) {
    game.settings.set("core", "noCanvas", false);
  }
});

window.addEventListener("beforeunload", () => {
  try { game.settings.set("core", "noCanvas", _originalNoCanvas); } catch(e) {}
});
