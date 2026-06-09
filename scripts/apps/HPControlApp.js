import { TEMPLATES } from "../lib/constants.js";
import { getSaves, getSkills, getActionsByType, getItemsByType, getCurrency, getSpellDetails, getSpellData } from "../lib/actor-data.js";

const { ApplicationV2, HandlebarsApplicationMixin } = foundry.applications.api;
const HandlebarsApp = HandlebarsApplicationMixin(ApplicationV2);

export class HPControlApp extends HandlebarsApp {
  constructor(actorId, parentApp) {
    super();
    this.actorId = actorId;
    this._parentApp = parentApp;
    this._hooks = [];
    this._rollModalEl = null;
    this._descModalEl = null;
    this._pendingRoll = null;
    this._pendingCast = null;
  }

  static DEFAULT_OPTIONS = {
    id: "mobile-movement-hp",
    window: {
      title: "Puntos de Vida",
      frame: false,
      minimizable: false,
      resizable: false,
    },
    position: {
      width: 280,
      height: 260,
    },
    classes: ["mobile-movement", "hp-control"],
  };

  static PARTS = {
    main: {
      template: TEMPLATES.HP_CONTROL,
    },
  };

  _prepareContext(options) {
    const actor = game.actors.get(this.actorId);
    if (!actor) return {};
    const { action, bonus, reaction } = getActionsByType(actor);
    return {
      name: actor.name,
      img: actor.img,
      saves: getSaves(actor),
      skills: getSkills(actor),
      actions: action,
      bonusActions: bonus,
      reactions: reaction,
      equipment: getItemsByType(actor, ["weapon", "equipment", "armor", "shield", "tool"]),
      consumables: getItemsByType(actor, ["consumable", "ammunition", "backpack"]),
      loot: getItemsByType(actor, ["loot"]),
      currency: getCurrency(actor),
      spells: getSpellData(actor),
    };
  }

  _onRender(context, options) {
    const html = $(this.element);
    html.off(".mm");
    html.on("click.mm", ".hp-close-btn", this.close.bind(this));
    html.on("click.mm", ".hp-tab", this._onTabChange.bind(this));
    html.on("click.mm", ".save-item", this._onSaveClick.bind(this));
    html.on("click.mm", ".skill-item", this._onSkillClick.bind(this));
    html.on("click.mm", ".hp-tab-content[data-tab='actions'] .item-row", this._onActionItemClick.bind(this));
    html.on("click.mm", ".hp-tab-content[data-tab='spells'] .item-row", this._onSpellClick.bind(this));
  }

  _onTabChange(event) {
    const tab = event.currentTarget.dataset.tab;
    const el = $(this.element);
    el.find(".hp-tab").removeClass("active");
    el.find(`.hp-tab[data-tab="${tab}"]`).addClass("active");
    el.find(".hp-tab-content").removeClass("active");
    el.find(`.hp-tab-content[data-tab="${tab}"]`).addClass("active");
  }

  _getRollModal() {
    if (!this._rollModalEl) this._rollModalEl = this._createRollModal();
    return this._rollModalEl;
  }

  _createRollModal() {
    const el = document.createElement("div");
    el.className = "roll-modal";
    el.innerHTML = `
      <div class="roll-modal-backdrop"></div>
      <div class="roll-modal-box">
        <div class="roll-modal-title">Tirada</div>
        <div class="roll-modal-buttons">
          <button class="roll-option-btn" data-roll="normal">Normal</button>
          <button class="roll-option-btn" data-roll="advantage">Ventaja</button>
          <button class="roll-option-btn" data-roll="disadvantage">Desventaja</button>
        </div>
        <button class="roll-modal-cancel">Cancelar</button>
      </div>`;
    for (const btn of el.querySelectorAll(".roll-option-btn"))
      btn.addEventListener("click", this._onRollSelect.bind(this));
    el.querySelector(".roll-modal-cancel").addEventListener("click", () => {
      this._pendingRoll = null;
      this._getRollModal().classList.remove("visible");
    });
    el.querySelector(".roll-modal-backdrop").addEventListener("click", () => {
      this._pendingRoll = null;
      this._getRollModal().classList.remove("visible");
    });
    document.body.appendChild(el);
    return el;
  }

  _onSaveClick(event) {
    this._pendingRoll = { type: "save", id: event.currentTarget.dataset.ability };
    const label = event.currentTarget.querySelector(".save-label")?.textContent || "";
    this._showRollModal(`TS ${label}`);
  }

  _onSkillClick(event) {
    this._pendingRoll = { type: "skill", id: event.currentTarget.dataset.skill };
    const label = event.currentTarget.querySelector(".skill-label")?.textContent || "";
    this._showRollModal(label);
  }

  _showRollModal(title) {
    const el = this._getRollModal();
    el.querySelector(".roll-modal-title").textContent = title;
    el.classList.add("visible");
  }

  async _onRollSelect(event) {
    const mode = event.currentTarget.dataset.roll;
    const pr = this._pendingRoll;
    this._getRollModal().classList.remove("visible");
    this._pendingRoll = null;
    if (!pr) return;

    const actor = game.actors.get(this.actorId);
    if (!actor) return;

    try {
      const options = {};
      if (mode === "advantage") options.advantage = true;
      if (mode === "disadvantage") options.disadvantage = true;

      if (pr.type === "save") {
        await actor.rollSavingThrow(pr.id, options);
      } else {
        await actor.rollSkill(pr.id, options);
      }
    } catch (e) {
      try {
        const adv = mode === "normal" ? {} : { [mode]: true };
        if (pr.type === "save") {
          await actor.rollSavingThrow({ ability: pr.id, rolls: [{ options: adv }] }, { configure: false });
        } else {
          await actor.rollSkill({ skill: pr.id, rolls: [{ options: adv }] }, { configure: false });
        }
      } catch (e2) {
        console.warn(e2);
        ui.notifications.warn("No se pudo realizar la tirada.");
      }
    }
  }

  _getDescModal() {
    if (!this._descModalEl) this._descModalEl = this._createDescModal();
    return this._descModalEl;
  }

  _createDescModal() {
    const el = document.createElement("div");
    el.className = "desc-modal";
    el.innerHTML = `
      <div class="desc-modal-backdrop"></div>
      <div class="desc-modal-box">
        <div class="desc-modal-header">
          <img src="" alt="">
          <h3></h3>
        </div>
        <div class="desc-modal-details"></div>
        <div class="desc-modal-content"></div>
        <button class="desc-modal-cast-btn" style="display:none">Lanzar Conjuro</button>
        <button class="desc-modal-close">Cerrar</button>
      </div>`;
    el.querySelector(".desc-modal-close").addEventListener("click", () => this._onDescModalClose());
    el.querySelector(".desc-modal-backdrop").addEventListener("click", () => this._onDescModalClose());
    el.querySelector(".desc-modal-cast-btn").addEventListener("click", () => this._onCastSpell());
    document.body.appendChild(el);
    return el;
  }

  _onActionItemClick(event) {
    const itemId = event.currentTarget.dataset.itemId;
    if (!itemId) return;
    const actor = game.actors.get(this.actorId);
    if (!actor) return;
    const item = actor.items.get(itemId);
    if (!item) return;
    this._showItemDescription(item, false);
  }

  _onSpellClick(event) {
    const itemId = event.currentTarget.dataset.itemId;
    if (!itemId) return;
    const actor = game.actors.get(this.actorId);
    if (!actor) return;
    const item = actor.items.get(itemId);
    if (!item) return;
    this._showItemDescription(item, true);
  }

  _showItemDescription(item, showCast) {
    const el = this._getDescModal();
    el.querySelector(".desc-modal-header img").src = item.img;
    el.querySelector(".desc-modal-header h3").textContent = item.name;
    el.querySelector(".desc-modal-details").innerHTML = getSpellDetails(item);
    el.querySelector(".desc-modal-content").innerHTML = item.system.description?.value || "Sin descripción";
    const castBtn = el.querySelector(".desc-modal-cast-btn");
    if (showCast && item.type === "spell") {
      this._pendingCast = item;
      castBtn.style.display = "block";
    } else {
      this._pendingCast = null;
      castBtn.style.display = "none";
    }
    el.classList.add("visible");
  }

  async _onCastSpell() {
    const item = this._pendingCast;
    if (!item) return;
    this._onDescModalClose();
    this._pendingCast = null;
    try {
      await item.useSpell();
    } catch (e) {
      try {
        await item.roll();
      } catch (e2) {
        console.warn(e2);
        ui.notifications.warn("No se pudo lanzar el conjuro.");
      }
    }
  }

  _onDescModalClose() {
    if (this._descModalEl) this._descModalEl.classList.remove("visible");
    this._pendingCast = null;
  }

  _onFirstRender(context, options) {
    super._onFirstRender(context, options);
    this._hooks = [
      Hooks.on("updateActor", doc => { if (doc.id === this.actorId && this.rendered) this.render(); }),
      Hooks.on("createItem", doc => { if (doc.actor?.id === this.actorId && this.rendered) this.render(); }),
      Hooks.on("updateItem", doc => { if (doc.actor?.id === this.actorId && this.rendered) this.render(); }),
      Hooks.on("deleteItem", doc => { if (doc.actor?.id === this.actorId && this.rendered) this.render(); }),
    ];
  }

  async close(options = {}) {
    for (const h of this._hooks) Hooks.off(h);
    this._hooks = [];
    if (this._rollModalEl) {
      this._rollModalEl.remove();
      this._rollModalEl = null;
    }
    if (this._descModalEl) {
      this._descModalEl.remove();
      this._descModalEl = null;
    }
    if (this._parentApp?.element) {
      this._parentApp.element.style.display = "";
      await this._parentApp.render(true);
    }
    return super.close(options);
  }
}
