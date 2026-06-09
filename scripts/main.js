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

  game.settings.register(MODULE_ID, SETTINGS.CENTER_BUTTON_ACTION, {
    name: "Acción del botón central",
    hint: "Elige qué abre el botón central de la cruceta para todos los jugadores.",
    scope: "world",
    config: true,
    type: String,
    default: "hp-control",
    choices: {
      "hp-control": "Control de HP",
      "foundry-sheet": "Hoja de Foundry",
      "level20": "Nivel20 (embebido)",
    },
  });

  game.settings.register(MODULE_ID, SETTINGS.LEVEL20_URLS, {
    name: "URLs de Nivel20 por personaje",
    hint: "Asigna una URL de Nivel20 a cada personaje.",
    scope: "world",
    config: true,
    type: String,
    default: "{}",
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

  // enabledUsers: replace text input with inline user checkboxes
  let euInput = $html.find(`input[name="${MODULE_ID}.${SETTINGS.ENABLED_USERS}"]`).first();
  if (!euInput.length) euInput = $html.find(`input[name="${SETTINGS.ENABLED_USERS}"]`).first();
  if (euInput.length) {
    const group = euInput.closest(".form-group");
    if (group.length && !group.find(".user-toggle-list").length) {
      euInput.hide();
      const raw = euInput.val() || "";
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
        euInput.val(checked.length === total ? "" : checked.join(","));
      });
    }
  }

  // level20Urls: replace text input with actor URL list grouped by player
  let l20Input = $html.find(`input[name="${MODULE_ID}.${SETTINGS.LEVEL20_URLS}"]`).first();
  if (!l20Input.length) l20Input = $html.find(`input[name="${SETTINGS.LEVEL20_URLS}"]`).first();
  if (l20Input.length) {
    const group = l20Input.closest(".form-group");
    if (group.length && !group.find(".actor-url-list").length) {
      l20Input.hide();
      const raw = l20Input.val() || "{}";
      let urls = {};
      try { urls = JSON.parse(raw); } catch(e) {}

      const actorsByUser = {};
      for (const user of game.users.filter(u => !u.isGM)) {
        const owned = game.actors.filter(a =>
          a.testUserPermission(user, CONST.DOCUMENT_OWNERSHIP_LEVELS.OWNER)
        );
        if (owned.length) actorsByUser[user.id] = { user, actors: owned };
      }

      const list = $(`<div class="actor-url-list"></div>`);
      const userKeys = Object.keys(actorsByUser);
      if (userKeys.length) {
        for (const userId of userKeys) {
          const { user, actors } = actorsByUser[userId];
          const section = $(`<div class="actor-url-user"></div>`);
          section.append(`
            <div class="actor-url-user-header">
              <img class="user-avatar" src="${user.avatar || "icons/svg/mystery-man.svg"}" alt="${user.name}">
              <span>${user.name}</span>
            </div>
          `);
          const rows = $(`<div class="actor-url-rows"></div>`);
          for (const actor of actors) {
            rows.append(`
              <div class="actor-url-row">
                <img class="actor-thumb" src="${actor.img}" alt="${actor.name}">
                <span class="actor-name">${actor.name}</span>
                <input type="text" class="actor-url-input" data-actor-id="${actor.id}" value="${(urls[actor.id] || "")}" placeholder="https://nivel20.com/...">
              </div>
            `);
          }
          section.append(rows);
          list.append(section);
        }
      } else {
        list.append(`<div class="settings-empty">No hay personajes asignados a jugadores.</div>`);
      }

      group.find(".form-fields").append(list);
      group.on("input", ".actor-url-input", () => {
        const newUrls = {};
        group.find(".actor-url-input").each((i, el) => {
          const val = el.value.trim();
          if (val) newUrls[el.dataset.actorId] = val;
        });
        l20Input.val(JSON.stringify(newUrls));
      });
    }
  }
});
