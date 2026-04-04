/**
 * settings.js — Configuración del sistema A Fistful of Darkness
 * Registra los ajustes configurables por el DJ en los settings de Foundry.
 */

export const registerSystemSettings = function() {

  // Versión de migración numérica (uso interno, legacy)
  game.settings.register("a-fistful-of-darkness", "systemMigrationVersion", {
    name: "System Migration Version",
    scope: "world",
    config: false,
    type: Number,
    default: 0
  });

  // Versión de migración de compendios (uso interno)
  game.settings.register("a-fistful-of-darkness", "migrationVersion", {
    name: "Compendium Migration Version",
    scope: "world",
    config: false,
    type: String,
    default: "0"
  });

  game.settings.register("a-fistful-of-darkness", "compendiumLocalizationVersion", {
    name: "Compendium Localization Version",
    scope: "world",
    config: false,
    type: String,
    default: "0"
  });

  game.settings.register("a-fistful-of-darkness", "compendiumLocalizedLanguage", {
    name: "Compendium Localized Language",
    scope: "world",
    config: false,
    type: String,
    default: ""
  });

  const registerBool = (key, nameKey, defaultValue = false) => {
    game.settings.register('a-fistful-of-darkness', key, {
      name: game.i18n.localize(`AFOD.Settings.${nameKey}.Name`),
      hint: game.i18n.localize(`AFOD.Settings.${nameKey}.Hint`),
      config: true,
      default: defaultValue,
      scope: 'world',
      type: new foundry.data.fields.BooleanField(),
      requiresReload: true
    });
  };

  registerBool('ActionRoll',   'Action',       true);
  registerBool('DeepCutLoad',  'Load',         false);
  registerBool('ClockXP',      'ClockXP',      false);
  registerBool('PublicClocks', 'PublicClocks', false);
};
