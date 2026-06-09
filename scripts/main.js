import { MobileMovementApp } from "./apps/MobileMovementApp.js";
import { MODULE_ID, SETTINGS } from "./lib/constants.js";

function _isMobileUser() {
  if (game.user.isGM) return false;
  const raw = game.settings.get(MODULE_ID, SETTINGS.ENABLED_USERS) || "";
  const enabled = raw ? raw.split(",").filter(id => id) : [];
  return enabled.length === 0 || enabled.includes(game.userId);
}

Hooks.once("init", () => {
  Handlebars.registerHelper("eq", (a, b) => a === b);
  Handlebars.registerHelper("gt", (a, b) => a > b);
  Handlebars.registerHelper("sub", (a, b) => a - b);

  game.settings.register(MODULE_ID, SETTINGS.ENABLED_USERS, {
    name: "Usuarios con modo móvil",
    hint: "Selecciona qué jugadores ven el modo móvil. Vacío = todos los no-DM.",
    scope: "world",
    config: true,
    type: String,
    default: "",
  });
});

Hooks.once("setup", () => {
  if (!_isMobileUser()) return;

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

  if (!_isMobileUser()) return;

  document.body.classList.add("mobile-mode");
  const mobileApp = new MobileMovementApp();
  globalThis.mobileApp = mobileApp;
  mobileApp.render(true);
});

window.addEventListener("beforeunload", () => {
  if (game.user.isGM) return;
  try {
    if (!_isMobileUser()) return;
    if (game.settings.get("core", "noCanvas")) {
      game.settings.set("core", "noCanvas", false);
    }
  } catch(e) {}
});

Hooks.on("renderSettingsConfig", (app, html) => {
  const $html = $(html);
  let input = $html.find(`input[name="${MODULE_ID}.${SETTINGS.ENABLED_USERS}"]`).first();
  if (!input.length) input = $html.find(`input[name="${SETTINGS.ENABLED_USERS}"]`).first();
  if (!input.length) return;

  const group = input.closest(".form-group");
  if (!group.length || group.find(".user-toggle-list").length) return;

  input.hide();
  const raw = input.val() || "";
  const enabledUsers = raw ? raw.split(",").filter(id => id) : [];
  const allEnabled = enabledUsers.length === 0;

  const list = $(`<div class="user-toggle-list"></div>`);
  for (const user of game.users.filter(u => !u.isGM)) {
    const checked = allEnabled || enabledUsers.includes(user.id);
    list.append(`
      <label class="user-toggle">
        <img class="user-avatar" src="${user.avatar || "icons/svg/mystery-man.svg"}" alt="${user.name}">
        <span>${user.name}</span>
        <input type="checkbox" class="user-toggle-input" data-user-id="${user.id}" ${checked ? "checked" : ""}>
      </label>
    `);
  }

  group.find(".form-fields").append(list);

  group.on("change", ".user-toggle-input", () => {
    const checked = [];
    group.find(".user-toggle-input:checked").each((i, el) => checked.push(el.dataset.userId));
    const total = group.find(".user-toggle-input").length;
    input.val(checked.length === total ? "" : checked.join(","));
  });
});
