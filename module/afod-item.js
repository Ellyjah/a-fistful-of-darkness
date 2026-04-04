/**
 * afod-item.js — Clase base de Item para A Fistful of Darkness
 * Extiende el documento Item de Foundry con lógica específica del sistema.
 */

export class AfodItem extends Item {

  /**
   * Tipos de item que no pueden duplicarse en un mismo actor.
   * Solo puede haber uno de cada uno a la vez.
   */
  static UNIQUE_ITEM_TYPES = [
    "class", "crew_type"
  ];

  /**
   * Hook previo a la creación: evita duplicados de tipos únicos.
   */
  async _preCreate(data, options, user) {
    await super._preCreate(data, options, user);

    if (this.parent && AfodItem.UNIQUE_ITEM_TYPES.includes(data.type)) {
      const existing = this.parent.items.find(i => i.type === data.type);
      if (existing) {
        ui.notifications.warn(game.i18n.format("AFOD.ItemDuplicateWarning", { type: data.type }));
        return false;
      }
    }
  }

  /**
   * Prepara datos derivados del item.
   */
  prepareDerivedData() {
    super.prepareDerivedData();

    if (this.type === "cohort" && this.parent?.type === "posse") {
      this._prepareCohortData();
    }
  }

  /**
   * Calcula escala y calidad del cohort basado en el rango de la cuadrilla.
   */
  _prepareCohortData() {
    const posseSystem = this.parent?.system;
    if (!posseSystem) return;

    const tier = parseInt(posseSystem.tier) || 0;
    this.system.quality = tier;
  }

  /**
   * Envía el item al chat como mensaje.
   */
  async sendToChat() {
    const itemData = this.toObject();
    const content = await foundry.applications.handlebars.renderTemplate?.(
      `systems/a-fistful-of-darkness/templates/chat/chat-item.html`,
      { item: itemData, system: itemData.system }
    ) ?? `<h3>${this.name}</h3><p>${this.system.description || ""}</p>`;

    ChatMessage.create({
      user: game.user.id,
      speaker: ChatMessage.getSpeaker(),
      content
    });
  }
}
