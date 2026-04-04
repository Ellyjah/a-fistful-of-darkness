/**
 * location-sheet.js — Hoja de Localización para A Fistful of Darkness (V2)
 */
import { AfodSheet } from "./afod-sheet.js";

const QUALITY_DEFS = [
  { key: "wealth",       label: "AFOD.QualityWealth"      },
  { key: "law_order",    label: "AFOD.QualityLawOrder"     },
  { key: "outlaw_chaos", label: "AFOD.QualityOutlawChaos"  },
  { key: "supernatural", label: "AFOD.QualitySupernatural" }
];

export class LocationSheet extends AfodSheet {
  static USES_ENRICHED_DESCRIPTION = true;

  static DEFAULT_OPTIONS = {
    classes: ["a-fistful-of-darkness", "sheet", "actor", "location"],
    position: { width: 520, height: 640 },
    window: { resizable: true }
  };

  static PARTS = {
    form: { template: "systems/a-fistful-of-darkness/templates/actor/location-sheet.html" }
  };

  /** @override */
  async _prepareContext(options) {
    const context = await super._prepareContext(options);

    context.qualities = QUALITY_DEFS.map(q => ({
      key:   q.key,
      label: q.label,
      value: parseInt(this.actor.system.qualities?.[q.key]) || 0
    }));

    context.clocks = this.actor.system.clocks ?? [];

    return context;
  }

  /** @override */
  _onRender(context, options) {
    super._onRender(context, options);
    if (!this.isEditable) return;

    const html = $(this.element);

    html.find(".quality-seg").click(ev => {
      const seg      = ev.currentTarget;
      const qualKey  = seg.dataset.quality;
      const clicked  = parseInt(seg.dataset.value);
      const current  = parseInt(this.actor.system.qualities?.[qualKey]) || 0;
      const newValue = current === clicked ? Math.max(0, clicked - 1) : clicked;
      this.actor.update({ [`system.qualities.${qualKey}`]: newValue });
    });

    html.find(".clock-pip").click(ev => {
      const pip      = ev.currentTarget;
      const clockId  = pip.dataset.clockId;
      const pipNum   = parseInt(pip.dataset.pip);
      const clocks   = foundry.utils.deepClone(this.actor.system.clocks ?? []);
      const clock    = clocks.find(c => c.id === clockId);
      if (!clock) return;
      clock.value = clock.value === pipNum ? Math.max(0, pipNum - 1) : pipNum;
      this.actor.update({ "system.clocks": clocks });
    });

    html.find(".clock-add").click(() => this._addClockDialog());

    html.find(".clock-delete").click(ev => {
      const clockId = ev.currentTarget.dataset.clockId;
      const clocks  = (this.actor.system.clocks ?? []).filter(c => c.id !== clockId);
      this.actor.update({ "system.clocks": clocks });
    });
  }

  /* -------------------------------------------- */
  /*  Drop handlers                                */
  /* -------------------------------------------- */

  /** @override */
  async _onDrop(event) {
    let data;
    try { data = JSON.parse(event.dataTransfer.getData("text/plain")); }
    catch { return super._onDrop(event); }

    if (data.type === "Actor") {
      const actor = data.uuid ? await fromUuid(data.uuid) : game.actors.get(data.id);
      if (actor?.type === "🕛 clock") {
        await this._addClockFromActor(actor);
        return;
      }
    }

    return super._onDrop(event);
  }

  /* -------------------------------------------- */
  /*  Helpers                                      */
  /* -------------------------------------------- */

  async _addClockDialog() {
    const content = `
      <form class="afod-roll-dialog" style="display:grid;gap:8px">
        <div class="form-group">
          <label>${game.i18n.localize("AFOD.ClockName")}</label>
          <input type="text" name="name" value="" placeholder="${game.i18n.localize("AFOD.ClockNameHint")}" />
        </div>
        <div class="form-group">
          <label>${game.i18n.localize("AFOD.ClockType")}</label>
          <select name="segments">
            <option value="4">4</option>
            <option value="6" selected>6</option>
            <option value="8">8</option>
            <option value="10">10</option>
            <option value="12">12</option>
          </select>
        </div>
      </form>`;

    const result = await Dialog.prompt({
      title:   game.i18n.localize("AFOD.AddClock"),
      content,
      label:   game.i18n.localize("AFOD.AddClock"),
      callback: html => ({
        name:     html.find("[name='name']").val().trim() || game.i18n.localize("AFOD.Clock"),
        segments: parseInt(html.find("[name='segments']").val()) || 6
      }),
      rejectClose: false
    });

    if (!result) return;

    const clocks = foundry.utils.deepClone(this.actor.system.clocks ?? []);
    clocks.push({
      id:       foundry.utils.randomID(8),
      name:     result.name,
      segments: result.segments,
      value:    0
    });
    await this.actor.update({ "system.clocks": clocks });
  }

  async _addClockFromActor(clockActor) {
    const clocks = foundry.utils.deepClone(this.actor.system.clocks ?? []);
    clocks.push({
      id:       foundry.utils.randomID(8),
      name:     clockActor.name,
      segments: parseInt(clockActor.system.type) || 4,
      value:    parseInt(clockActor.system.value) || 0
    });
    await this.actor.update({ "system.clocks": clocks });
  }
}
