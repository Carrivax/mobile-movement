import { TEMPLATES, ROTATION_STEP } from "../lib/constants.js";
import { snapToGrid, getMovementDelta, isMoveBlocked, isDiagonalDirection, isDiagonalAllowed, getMovementDistanceInUnits, gridDistanceBetween } from "../lib/movement.js";
import { getHPData, getInspiration } from "../lib/actor-data.js";
import { HPControlApp } from "./HPControlApp.js";

const { ApplicationV2, HandlebarsApplicationMixin } = foundry.applications.api;
const HandlebarsApp = HandlebarsApplicationMixin(ApplicationV2);

export class MobileMovementApp extends HandlebarsApp {
  constructor() {
    super();
    this.selectedId = game.user.character?.id ?? null;
    this._hooks = [];
    this._lastNotify = 0;
    this._movementUsed = 0;
    this._lastPosition = null;
  }

  static DEFAULT_OPTIONS = {
    id: "mobile-movement",
    window: {
      title: "Control Móvil",
      frame: false,
      minimizable: false,
      resizable: false,
    },
    position: {
      width: 360,
      height: 520,
    },
    classes: ["mobile-movement"],
  };

  static PARTS = {
    main: {
      template: TEMPLATES.MOVEMENT,
    },
  };

  _getWalkSpeed(actor) {
    const mov = actor?.system?.attributes?.movement;
    if (!mov) return 0;
    const walk = Number(mov.walk ?? mov.speed ?? 0);
    if (walk > 0) return walk;
    return Math.max(0, Number(mov.bonus ?? 0));
  }

  _isInCombat() {
    return !!game.combats?.active;
  }

  _isMyTurn() {
    const combat = game.combats?.active;
    if (!combat) return true;
    if (!combat.started) return true;
    return combat.combatant?.actorId === this.selectedId;
  }

  _prepareContext(options) {
    const actors = game.actors.filter(a =>
      a.testUserPermission(game.user, CONST.DOCUMENT_OWNERSHIP_LEVELS.OWNER)
    );
    const token = this._getSelectedTokenDocument();
    const actor = this.selectedId ? game.actors.get(this.selectedId) : null;
    const hp = actor ? getHPData(actor) : null;
    const walkSpeed = this._getWalkSpeed(actor);
    const gridUnits = game.scenes.active?.grid?.units ?? "ft";
    const inCombat = this._isInCombat();
    const combat = game.combats?.active;
    const combatStarted = combat?.started === true;
    const isMyTurn = this._isMyTurn();
    return {
      characters: actors.map(c => ({
        id: c.id,
        name: c.name,
        img: c.img,
      })),
      selectedId: this.selectedId,
      hasToken: !!token,
      selectedActor: actor,
      hp,
      inspiration: actor ? getInspiration(actor) : false,
      inCombat,
      combatStarted,
      isMyTurn,
      movement: combatStarted ? {
        used: this._movementUsed,
        max: walkSpeed,
        remaining: Math.max(walkSpeed - this._movementUsed, 0),
        units: gridUnits,
      } : null,
    };
  }

  _onRender(context, options) {
    const html = $(this.element);
    html.off(".mm");
    html.on("click.mm", ".character-item", this._onCharacterSelect.bind(this));
    html.on("click.mm", ".move-btn", this._onMove.bind(this));
    html.on("click.mm", ".rotate-btn", this._onRotate.bind(this));
    html.on("click.mm", ".hp-mod-btn", this._onHPMod.bind(this));
    html.on("click.mm", ".center-token", this._onOpenHP.bind(this));
    html.on("click.mm", ".hp-current", this._onHPClick.bind(this));
    html.on("blur.mm", ".hp-input", this._onHPInput.bind(this));
    html.on("keydown.mm", ".hp-input", this._onHPInputKeydown.bind(this));
  }

  _onCharacterSelect(event) {
    const id = event.currentTarget.dataset.actorId;
    this.selectedId = id;
    this._movementUsed = 0;
    this.render();
  }

  _warn(msg) {
    const now = Date.now();
    if (now - this._lastNotify < 1000) return;
    this._lastNotify = now;
    ui.notifications.warn(msg);
  }

  async _onMove(event) {
    const direction = event.currentTarget.dataset.direction;
    const tokenDoc = this._getSelectedTokenDocument();
    if (!tokenDoc) {
      return this._warn("No hay token de este personaje en la escena actual.");
    }

    if (this._isInCombat() && !this._isMyTurn()) {
      return this._warn("No puedes moverte: no es tu turno.");
    }

    const scene = game.scenes.active;
    if (isDiagonalDirection(direction) && !isDiagonalAllowed(scene)) {
      return this._warn("Movimiento diagonal no permitido en esta escena.");
    }

    const step = scene?.grid?.size || 100;
    const { dx, dy } = getMovementDelta(direction, step);
    const pos = snapToGrid(tokenDoc.x + dx, tokenDoc.y + dy);
    if (isMoveBlocked(tokenDoc, pos.x, pos.y)) {
      return this._warn("Hay una pared en el camino.");
    }

    const actor = game.actors.get(this.selectedId);
    const walkSpeed = this._getWalkSpeed(actor);
    const distance = getMovementDistanceInUnits(direction, scene);
    if (walkSpeed > 0 && this._movementUsed + distance > walkSpeed) {
      return this._warn(`Movimiento excede la velocidad (${walkSpeed} ${scene?.grid?.units || "ft"}).`);
    }

    try {
      await tokenDoc.update({ x: pos.x, y: pos.y });
      this._movementUsed = Number(this._movementUsed) + Number(distance);
      this._lastPosition = { x: pos.x, y: pos.y };
      this.render();
    } catch (e) {
      console.error(e);
      ui.notifications.error("Error al mover el token.");
    }
  }

  async _onRotate(event) {
    const dir = event.currentTarget.dataset.rotate;
    const tokenDoc = this._getSelectedTokenDocument();
    if (!tokenDoc) {
      return this._warn("No hay token de este personaje en la escena actual.");
    }
    const delta = dir === "cw" ? ROTATION_STEP : -ROTATION_STEP;
    try {
      await tokenDoc.update({ rotation: ((tokenDoc.rotation || 0) + delta) % 360 });
    } catch (e) {
      console.error(e);
      ui.notifications.error("Error al rotar el token.");
    }
  }

  _getSelectedTokenDocument() {
    if (!this.selectedId) return null;
    return game.scenes.active?.tokens?.find(t => t.actorId === this.selectedId) ?? null;
  }

  _onFirstRender(context, options) {
    super._onFirstRender(context, options);
    const tokenDoc = this._getSelectedTokenDocument();
    if (tokenDoc) {
      this._lastPosition = { x: tokenDoc.x, y: tokenDoc.y };
    }
    this._hooks = [
      Hooks.on("updateActor", doc => {
        if (doc.id === this.selectedId && this.rendered) this.render();
      }),
      Hooks.on("updateToken", (doc, update, options, userId) => {
        if (!this.rendered) return;
        if (doc.actorId !== this.selectedId) return;
        if (game.userId !== userId && this._isInCombat()) {
          if (update.x !== undefined || update.y !== undefined) {
            const scene = game.scenes.active;
            if (this._lastPosition) {
              const added = gridDistanceBetween(this._lastPosition, doc, scene);
              this._movementUsed = Number(this._movementUsed) + Number(added);
            }
            this._lastPosition = { x: doc.x, y: doc.y };
          }
        }
        this.render();
      }),
      Hooks.on("createCombat", () => { if (this.rendered) this.render(); }),
      Hooks.on("deleteCombat", () => { if (this.rendered) this.render(); }),
      Hooks.on("updateCombat", (combat, update) => {
        if (!this.rendered) return;
        if (combat.combatant?.actorId === this.selectedId && update.turn !== undefined) {
          this._movementUsed = 0;
          const tokenDoc = this._getSelectedTokenDocument();
          if (tokenDoc) {
            this._lastPosition = { x: tokenDoc.x, y: tokenDoc.y };
          }
        }
        this.render();
      }),
    ];
  }

  async close(options = {}) {
    if (document.body.classList.contains("mobile-mode")) return this;
    for (const h of this._hooks) Hooks.off(h);
    this._hooks = [];
    return super.close(options);
  }

  async _onHPMod(event) {
    const delta = parseInt(event.currentTarget.dataset.delta);
    const actor = game.actors.get(this.selectedId);
    if (!actor) return;
    try {
      if (typeof actor.applyDamage === "function") {
        await actor.applyDamage(-delta);
      } else {
        const hpData = getHPData(actor);
        if (!hpData) return;
        const newValue = Math.min(Math.max(hpData.value + delta, 0), hpData.effectiveMax);
        await actor.update({ "system.attributes.hp.value": newValue });
      }
    } catch (e) {
      console.error(e);
      ui.notifications.error("Error al modificar HP.");
    }
  }

  _onHPClick(event) {
    const span = $(event.currentTarget);
    const input = span.siblings(".hp-input");
    span.hide();
    input.addClass("visible").focus().select();
  }

  async _onHPInput(event) {
    const input = $(event.currentTarget);
    const actor = game.actors.get(this.selectedId);
    if (!actor) return;
    const max = parseInt(input.attr("max")) || Infinity;
    const val = Math.min(Math.max(parseInt(input.val()) || 0, 0), max);
    try {
      await actor.update({ "system.attributes.hp.value": val });
    } catch (e) {
      console.error(e);
      ui.notifications.error("Error al actualizar HP.");
    }
  }

  _onHPInputKeydown(event) {
    if (event.key === "Enter") $(event.currentTarget).blur();
    if (event.key === "Escape") this.render();
  }

  async _onOpenHP(event) {
    if (!this.selectedId) return;
    if (this._hpApp) await this._hpApp.close();
    this._hpApp = new HPControlApp(this.selectedId, this);
    this._hpApp.render(true);
    this.element.style.display = "none";
  }
}
