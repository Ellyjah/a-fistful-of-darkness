/**
 * npc-sheet.js — Hoja de PNJ para A Fistful of Darkness (V2)
 */
import { AfodSheet } from "./afod-sheet.js";

export class NpcSheet extends AfodSheet {

  static DEFAULT_OPTIONS = {
    classes: ["a-fistful-of-darkness", "sheet", "actor", "npc"],
    position: { width: 500, height: 518 },
    window: { resizable: true }
  };

  static PARTS = {
    form: { template: "systems/a-fistful-of-darkness/templates/actor/npc-sheet.html" }
  };
}
