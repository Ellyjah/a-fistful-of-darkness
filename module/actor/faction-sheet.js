/**
 * faction-sheet.js — Hoja de Facción para A Fistful of Darkness (V2)
 */
import { AfodSheet } from "./afod-sheet.js";

export class FactionSheet extends AfodSheet {
  static USES_ENRICHED_DESCRIPTION = true;

  static DEFAULT_OPTIONS = {
    classes: ["a-fistful-of-darkness", "sheet", "actor", "faction"],
    position: { width: 700, height: 490 },
    window: { resizable: true }
  };

  static PARTS = {
    form: { template: "systems/a-fistful-of-darkness/templates/actor/faction-sheet.html" }
  };
}
