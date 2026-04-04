/**
 * afod-helpers.js — Utilidades estáticas para A Fistful of Darkness
 * Colección de funciones de apoyo usadas en varios módulos del sistema.
 */

export class AfodHelpers {

  /**
   * Convierte un string a Proper Case (primera letra de cada palabra en mayúscula).
   */
  static getProperCase(string) {
    return string.replace(/\w\S*/g, txt =>
      txt.charAt(0).toUpperCase() + txt.substr(1).toLowerCase()
    );
  }

  /**
   * Accede a una propiedad anidada de un objeto mediante notación de puntos.
   * @param {Object} obj - Objeto raíz
   * @param {string} property - Ruta de propiedad (ej: "system.grit.value")
   */
  static getNestedProperty(obj, property) {
    return property.split('.').reduce((o, p) => o?.[p], obj);
  }

  /**
   * Obtiene todos los items de un tipo dado desde el mundo y los compendios.
   * @param {string} itemType - Tipo de item a buscar
   * @returns {Array} Lista de items encontrados
   */
  static async getAllItemsByType(itemType) {
    const worldItems = game.items.filter(i => i.type === itemType);
    const packItems = [];

    for (const pack of game.packs) {
      if (pack.metadata.type !== "Item") continue;
      const index = await pack.getIndex();
      const matchingIds = index.filter(i => i.type === itemType).map(i => i._id);
      for (const id of matchingIds) {
        const item = await pack.getDocument(id);
        if (item) packItems.push(item);
      }
    }

    return [...worldItems, ...packItems];
  }

  /**
   * Crea un item embebido en un actor desde un evento de UI.
   * @param {Event} event
   * @param {Actor} actor
   */
  static async addOwnedItem(event, actor) {
    const itemType = event.currentTarget.dataset.itemType;
    if (!itemType) return;

    const itemData = {
      name: game.i18n.localize(`AFOD.New${AfodHelpers.getProperCase(itemType)}`),
      type: itemType,
      system: {}
    };

    return actor.createEmbeddedDocuments("Item", [itemData]);
  }

  /**
   * Añade un NPC a los conocidos de un actor (cuadrilla o personaje).
   * @param {Actor} actor - Actor que recibe el conocido
   * @param {Actor} npc - Actor de tipo npc que se añade
   */
  static async addAcquaintance(actor, npc) {
    const acquaintances = foundry.utils.deepClone(actor.system.acquaintances || []);
    const exists = acquaintances.find(a => a.id === npc.id);
    if (exists) return;

    acquaintances.push({
      id: npc.id,
      name: npc.name,
      img: npc.img,
      standing: "neutral"
    });

    return actor.update({ "system.acquaintances": acquaintances });
  }

  /**
   * Devuelve la clave de localización del atributo para mostrar en el diálogo de tirada.
   * @param {string} attributeName - Nombre del atributo o acción
   */
  static getRollLabel(attributeName) {
    const skillLabels = {
      // Ingenio
      hunt: "AFOD.SkillsHunt",
      read: "AFOD.SkillsRead",
      survey: "AFOD.SkillsSurvey",
      craft: "AFOD.SkillsCraft",
      // Destreza
      sling: "AFOD.SkillsSling",
      prowl: "AFOD.SkillsProwl",
      brawl: "AFOD.SkillsBrawl",
      disable: "AFOD.SkillsDisable",
      // Agallas
      attune: "AFOD.SkillsAttune",
      command: "AFOD.SkillsCommand",
      consort: "AFOD.SkillsConsort",
      sway: "AFOD.SkillsSway"
    };
    return skillLabels[attributeName] ?? `AFOD.${AfodHelpers.getProperCase(attributeName)}`;
  }

  /**
   * Comprueba si un nombre es una acción válida del sistema.
   */
  static isAttributeAction(attributeName) {
    const actions = [
      "hunt", "read", "survey", "craft",
      "sling", "prowl", "brawl", "disable",
      "attune", "command", "consort", "sway"
    ];
    return actions.includes(attributeName);
  }

  /**
   * Comprueba si un nombre es un atributo (para tiradas de resistencia).
   * En AFoD, los atributos son wits, prowess y guts.
   */
  static isAttributeAttribute(attributeName) {
    return ["wits", "prowess", "guts"].includes(attributeName);
  }
}

// Exponer globalmente por si se necesita desde macros
window.AfodHelpers = AfodHelpers;
