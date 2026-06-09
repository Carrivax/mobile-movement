import { MODULE_ID, TEMPLATES } from "../lib/constants.js";

const { ApplicationV2, HandlebarsApplicationMixin } = foundry.applications.api;
const HandlebarsApp = HandlebarsApplicationMixin(ApplicationV2);

export class MobileUserForm extends HandlebarsApp {
  static DEFAULT_OPTIONS = {
    id: "mobile-user-settings",
    window: {
      title: "Usuarios con control móvil",
    },
    form: {
      handler: "_onSubmit",
      closeOnSubmit: true,
    },
    position: {
      width: 360,
    },
    classes: ["mobile-user-settings"],
  };

  static PARTS = {
    main: {
      template: TEMPLATES.USER_SETTINGS,
    },
  };

  _prepareContext() {
    const enabled = game.settings.get(MODULE_ID, "enabledUsers") || [];
    return {
      users: game.users.filter(u => !u.isGM).map(u => ({
        id: u.id,
        name: u.name,
        avatar: u.avatar,
        enabled: enabled.includes(u.id),
      })),
    };
  }

  async _onSubmit(formData, formElement, event) {
    const ids = Object.keys(formData)
      .filter(k => k.startsWith("user-"))
      .map(k => k.replace("user-", ""));
    await game.settings.set(MODULE_ID, "enabledUsers", ids);
  }
}
