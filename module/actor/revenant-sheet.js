/**
 * revenant-sheet.js — Hoja del Aparecido para A Fistful of Darkness (V2)
 * Variante de la hoja de personaje con Pasión/Decadencia en lugar de Aguante/Estigma.
 */
import { AfodSheet } from "./afod-sheet.js";

export class RevenantSheet extends AfodSheet {
  static USES_ENRICHED_DESCRIPTION = true;

  static DEFAULT_OPTIONS = {
    classes: ["a-fistful-of-darkness", "sheet", "actor", "revenant"],
    position: { width: 800, height: 900 },
    window: { resizable: true }
  };

  static PARTS = {
    form: { template: "systems/a-fistful-of-darkness/templates/actor/revenant-sheet.html" }
  };

  /** @override */
  async _prepareContext(options) {
    const context = await super._prepareContext(options);
    context.items = this.actor.items;
    return context;
  }

  /** @override */
  _onRender(context, options) {
    super._onRender(context, options);
    if (!this.isEditable) return;

    // TODO: Listeners específicos del Aparecido (Fase 4)
    // - Pasión (en lugar de Aguante)
    // - Decadencia (en lugar de Estigma)
    // - Vínculo con el Mundo de los Vivos
  }
}
