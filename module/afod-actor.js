/**
 * afod-actor.js — Clase base de Actor para A Fistful of Darkness
 * Extiende el documento Actor de Foundry con lógica específica del sistema.
 */

export class AfodActor extends Actor {

  /**
   * Crea un nuevo actor. Sincroniza el token con el nombre del actor.
   */
  static async create(data, options = {}) {
    if (!data.token) data.token = {};
    if (data.type === "character" || data.type === "revenant") {
      data.token.actorLink = true;
    }
    return super.create(data, options);
  }

  /**
   * Prepara datos derivados después de la carga desde la base de datos.
   */
  prepareDerivedData() {
    super.prepareDerivedData();
    const system = this.system;

    if (this.type === "character" || this.type === "revenant") {
      this._prepareCharacterData(system);
    } else if (this.type === "posse") {
      this._preparePosseData(system);
    }
  }

  /**
   * Calcula datos derivados para personajes (y aparecidos).
   */
  _prepareCharacterData(system) {
    // Calcular total de dados por atributo
    for (const [attrKey, attr] of Object.entries(system.attributes || {})) {
      let skillDice = 0;
      for (const skill of Object.values(attr.skills || {})) {
        if (skill.value > 0) skillDice += 1;
      }
      attr.dice = skillDice + (parseInt(attr.bonus) || 0);
    }
  }

  /**
   * Calcula datos derivados para la cuadrilla.
   */
  _preparePosseData(system) {
    // Calcular límite de Hellstone Claims para reducción de REP (max 3)
    const claimsCount = (system.hellstone_claims || []).length;
    system._claimsForRepReduction = Math.min(claimsCount, 3);
  }

  /**
   * Obtiene los dados a tirar para un atributo dado.
   * @param {string} attributeName - Nombre del atributo (wits, prowess, guts)
   * @returns {number} Número de dados a tirar
   */
  getAttributeDiceToThrow(attributeName) {
    const system = this.system;
    const attributes = system.attributes || {};
    const attr = attributes[attributeName];
    if (!attr) return 0;

    let dice = 0;
    for (const skill of Object.values(attr.skills || {})) {
      if (skill.value > 0) dice += 1;
    }
    return Math.max(dice + (parseInt(attr.bonus) || 0), 0);
  }

  /**
   * Prepara datos para rolls (usado por el sistema de dados).
   */
  getRollData() {
    return foundry.utils.deepClone(this.system);
  }
}
