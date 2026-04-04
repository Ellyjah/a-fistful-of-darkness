/**
 * clock-sheet.js — Hoja de Reloj para A Fistful of Darkness (V2)
 */
import { AfodSheet } from "./afod-sheet.js";

export class ClockSheet extends AfodSheet {

  static DEFAULT_OPTIONS = {
    classes: ["a-fistful-of-darkness", "sheet", "actor", "clock"],
    position: { width: 350, height: 540 },
    window: { resizable: true }
  };

  static PARTS = {
    form: { template: "systems/a-fistful-of-darkness/templates/actor/clock-sheet.html" }
  };

  /** @override */
  async _prepareContext(options) {
    const context = await super._prepareContext(options);
    context.clockSizes = game.system.afodClocks?.sizes ?? [4, 6, 8, 10, 12];
    return context;
  }

  /** @override */
  _onRender(context, options) {
    super._onRender(context, options);
    if (!this.isEditable) return;

    const html = $(this.element);

    // Clic en segmento de reloj → actualizar system.value directamente
    html.find(".afod-clock .radio-toggle").on("click", ev => {
      ev.preventDefault();
      const forId = ev.currentTarget.getAttribute("for");
      const input = document.getElementById(forId);
      if (!input) return;
      const clicked  = parseInt(input.value);
      const current  = parseInt(this.actor.system.value) || 0;
      const newVal   = clicked === current ? Math.max(0, clicked - 1) : clicked;
      this.actor.update({ "system.value": String(newVal) });
    });

    // Label de cero (reset)
    html.find(".clock-zero-label").on("click", ev => {
      ev.preventDefault();
      this.actor.update({ "system.value": "0" });
    });

    // Select de tamaño: actualizar system.type y recortar value si excede
    html.find("select[name='system.type']").on("change", ev => {
      const newType  = parseInt(ev.currentTarget.value);
      const curVal   = parseInt(this.actor.system.value) || 0;
      this.actor.update({
        "system.type":  newType,
        "system.value": String(Math.min(curVal, newType))
      });
    });
  }
}
