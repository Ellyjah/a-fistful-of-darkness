/**
 * group-sheet.js — Hoja de Grupo (solo Máster) para A Fistful of Darkness (V2)
 */
import { AfodSheet } from "./afod-sheet.js";

const LOAD_MAX_MAP = {
  "AFOD.LoadLight":  3,
  "AFOD.LoadNormal": 5,
  "AFOD.LoadHeavy":  6
};

const SKILL_ABBR = {
  hunt: "Caz", read: "Lee", survey: "Ote", craft: "Fab",
  sling: "Lan", prowl: "Ace", brawl: "Pel", disable: "Inu",
  attune: "Sin", command: "Com", consort: "Alt", sway: "Per"
};

export class GroupSheet extends AfodSheet {

  static DEFAULT_OPTIONS = {
    classes: ["a-fistful-of-darkness", "sheet", "actor", "group"],
    position: { width: 760, height: 250 },
    window: { resizable: true }
  };

  static PARTS = {
    form: { template: "systems/a-fistful-of-darkness/templates/actor/group-sheet.html" }
  };

  /** Solo el Máster puede ver esta hoja. @override */
  render(options = {}, _options = {}) {
    if (typeof options === "boolean") options = { force: options };
    if (!game.user.isGM) {
      ui.notifications.warn("Esta hoja solo está disponible para el Máster.");
      return this;
    }
    return super.render(options, _options);
  }

  /** @override */
  async _prepareContext(options) {
    const context = await super._prepareContext(options);
    context.isEditable = this.isEditable && game.user.isGM;

    const posseId    = this.actor.system.posse_id;
    const posseActor = posseId ? game.actors.get(posseId) : null;
    context.posseActor   = posseActor ?? null;
    context.crewTypeItem = posseActor?.items.find(i => i.type === "crew_type") ?? null;

    context.members = [];
    for (const { id } of (this.actor.system.members ?? [])) {
      const actor = game.actors.get(id);
      if (!actor) continue;

      const attributeDice = {};
      const skillTooltips = {};
      for (const [attrKey, attr] of Object.entries(actor.system.attributes ?? {})) {
        let total = 0;
        const parts = [];
        for (const [skillKey, skill] of Object.entries(attr.skills ?? {})) {
          const val = parseInt(skill.value) || 0;
          total += val;
          parts.push(`${SKILL_ABBR[skillKey] ?? skillKey}:${val}`);
        }
        attributeDice[attrKey] = total;
        skillTooltips[attrKey] = parts.join("  ");
      }

      const equipped    = actor.items.filter(
        i => (i.type === "item" || i.type === "artifact") && i.system.equipped
      );
      const loadCurrent = equipped.reduce((s, i) => s + (parseInt(i.system.load) || 0), 0);
      const loadMax     = LOAD_MAX_MAP[actor.system.selected_load_level] ?? 3;

      const abilities   = actor.items
        .filter(i => i.type === "ability" && i.system.purchased)
        .map(i => ({ id: i.id, name: i.name, actorId: actor.id }));

      context.members.push({
        id: actor.id,
        name: actor.name,
        img: actor.img,
        attributeDice,
        skillTooltips,
        loadCurrent,
        loadMax,
        abilities
      });
    }

    return context;
  }

  /** @override */
  _onRender(context, options) {
    super._onRender(context, options);

    // Auto-resize: ajustar altura para mostrar todos los miembros sin scroll
    requestAnimationFrame(() => {
      const content = this.element?.querySelector(".window-content");
      if (!content) return;
      const overflow = content.scrollHeight - content.clientHeight;
      if (overflow > 0) {
        this.setPosition({ height: this.position.height + overflow });
      }
    });

    const html = $(this.element);

    html.find(".posse-link").click(() => {
      const posseId = this.actor.system.posse_id;
      game.actors.get(posseId)?.sheet?.render(true);
    });

    html.find(".crew-type-link").click(() => {
      const posseId = this.actor.system.posse_id;
      const posse   = game.actors.get(posseId);
      posse?.items.find(i => i.type === "crew_type")?.sheet?.render(true);
    });

    html.find(".member-open").click(ev => {
      const actorId = ev.currentTarget.dataset.actorId;
      game.actors.get(actorId)?.sheet?.render(true);
    });

    html.find(".ability-link").click(ev => {
      const actorId = ev.currentTarget.dataset.actorId;
      const itemId  = ev.currentTarget.dataset.itemId;
      game.actors.get(actorId)?.items.get(itemId)?.sheet?.render(true);
    });

    if (!this.isEditable || !game.user.isGM) return;

    html.find(".member-remove").click(async ev => {
      const actorId = ev.currentTarget.dataset.actorId;
      const members = (this.actor.system.members ?? []).filter(m => m.id !== actorId);
      await this.actor.update({ "system.members": members });
    });

    html.find(".posse-unlink").click(async () => {
      await this.actor.update({ "system.posse_id": "" });
    });
  }

  /* -------------------------------------------- */
  /*  Drop handlers                                */
  /* -------------------------------------------- */

  /** @override */
  async _onDropActor(event, actor) {
    if (!game.user.isGM) return;
    if (!actor) return;

    if (actor.type === "character" || actor.type === "revenant") {
      const members = [...(this.actor.system.members ?? [])];
      if (members.some(m => m.id === actor.id)) return;
      members.push({ id: actor.id });
      await this.actor.update({ "system.members": members });
      return;
    }

    if (actor.type === "posse") {
      await this.actor.update({ "system.posse_id": actor.id });
    }
  }
}
