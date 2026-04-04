/**
 * afod-templates.js — Precarga de plantillas Handlebars para A Fistful of Darkness
 */
import { loadHandlebarsTemplates } from "./compat.js";

export const preloadHandlebarsTemplates = async function() {
  const templatePaths = [
    // Hojas de actor
    "systems/a-fistful-of-darkness/templates/actor/character-sheet.html",
    "systems/a-fistful-of-darkness/templates/actor/revenant-sheet.html",
    "systems/a-fistful-of-darkness/templates/actor/posse-sheet.html",
    "systems/a-fistful-of-darkness/templates/actor/faction-sheet.html",
    "systems/a-fistful-of-darkness/templates/actor/location-sheet.html",
    "systems/a-fistful-of-darkness/templates/actor/clock-sheet.html",
    "systems/a-fistful-of-darkness/templates/actor/npc-sheet.html",
    "systems/a-fistful-of-darkness/templates/actor/group-sheet.html",
    // Templates de items específicos
    "systems/a-fistful-of-darkness/templates/items/ability.html",
    "systems/a-fistful-of-darkness/templates/items/achievement.html",
    "systems/a-fistful-of-darkness/templates/items/artifact.html",
    "systems/a-fistful-of-darkness/templates/items/background.html",
    "systems/a-fistful-of-darkness/templates/items/class.html",
    "systems/a-fistful-of-darkness/templates/items/cohort.html",
    "systems/a-fistful-of-darkness/templates/items/crew_ability.html",
    "systems/a-fistful-of-darkness/templates/items/crew_type.html",
    "systems/a-fistful-of-darkness/templates/items/crew_upgrade.html",
    "systems/a-fistful-of-darkness/templates/items/gang_type.html",
    "systems/a-fistful-of-darkness/templates/items/heritage.html",
    "systems/a-fistful-of-darkness/templates/items/item.html",
    "systems/a-fistful-of-darkness/templates/items/simple.html",
    "systems/a-fistful-of-darkness/templates/items/vice.html",
    // Templates de chat
    "systems/a-fistful-of-darkness/templates/chat/action-roll.html",
    "systems/a-fistful-of-darkness/templates/chat/chat-item.html",
    "systems/a-fistful-of-darkness/templates/chat/fortune-roll.html",
    "systems/a-fistful-of-darkness/templates/chat/resistance-roll.html",
    "systems/a-fistful-of-darkness/templates/chat/vice-roll.html",
    // Partials (fragmentos reutilizables en hojas de actor)
    "systems/a-fistful-of-darkness/templates/parts/cohort-block.html",
    "systems/a-fistful-of-darkness/templates/parts/currency-slots.html",
    "systems/a-fistful-of-darkness/templates/parts/factions.html",
    "systems/a-fistful-of-darkness/templates/parts/claims-list.html",
  ];
  return loadHandlebarsTemplates(templatePaths);
};
