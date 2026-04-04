/**
 * afod-active-effect.js — Gestión de Efectos Activos para A Fistful of Darkness
 */

export class AfodActiveEffect extends ActiveEffect {

  /**
   * Organiza los efectos activos en categorías para la UI.
   * @param {Collection} effects - Colección de efectos activos del actor
   * @returns {Object} Efectos agrupados por categoría
   */
  static prepareActiveEffectCategories(effects) {
    const categories = {
      temporary: {
        type: "temporary",
        label: game.i18n.localize("AFOD.EffectTemporary"),
        effects: []
      },
      passive: {
        type: "passive",
        label: game.i18n.localize("AFOD.EffectPassive"),
        effects: []
      },
      inactive: {
        type: "inactive",
        label: game.i18n.localize("AFOD.EffectInactive"),
        effects: []
      }
    };

    for (const effect of effects) {
      if (effect.disabled) categories.inactive.effects.push(effect);
      else if (effect.isTemporary) categories.temporary.effects.push(effect);
      else categories.passive.effects.push(effect);
    }

    return categories;
  }

  /**
   * Gestiona la creación, edición y eliminación de efectos activos desde la UI.
   * @param {Event} event - Evento del navegador
   * @param {Actor|Item} owner - Actor o item propietario
   */
  static async onManageActiveEffect(event, owner) {
    event.preventDefault();
    const a = event.currentTarget;
    const li = a.closest("li");
    const effectId = li?.dataset?.effectId;
    const effect = effectId ? owner.effects.get(effectId) : null;
    const action = a.dataset.action;

    switch (action) {
      case "create":
        return owner.createEmbeddedDocuments("ActiveEffect", [{
          name: game.i18n.localize("AFOD.NewEffect"),
          icon: "icons/svg/aura.svg",
          origin: owner.uuid,
          disabled: li.closest("[data-tab]")?.dataset?.tab === "inactive"
        }]);
      case "edit":
        return effect?.sheet?.render(true);
      case "delete":
        return effect?.delete();
      case "toggle":
        return effect?.update({ disabled: !effect.disabled });
    }
  }
}
