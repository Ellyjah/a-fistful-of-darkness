/**
 * afod.js — Entry Point del sistema A Fistful of Darkness para Foundry VTT
 * Fork de Blades in the Dark (Dez384). Adaptado para el hack Weird West de Stefan Struck.
 * Licencia: Forged in the Dark (CC BY 3.0)
 */

// Datos compartidos
import { CREW_DEFAULT_ACHIEVEMENTS } from "./data/crew-achievements.js";

// Módulos core
import { registerSystemSettings } from "./settings.js";
import { preloadHandlebarsTemplates } from "./afod-templates.js";
import { afodRoll, simpleRollPopup, actionRollDialog } from "./afod-roll.js";
import { AfodHelpers } from "./afod-helpers.js";
import { AfodActor } from "./afod-actor.js";
import { AfodItem } from "./afod-item.js";
import { AfodActiveEffect } from "./afod-active-effect.js";
import { syncCompendiumLocalization } from "./compendium-localization.js";

// Hojas de actor
import { CharacterSheet } from "./actor/character-sheet.js";
import { RevenantSheet } from "./actor/revenant-sheet.js";
import { PosseSheet } from "./actor/posse-sheet.js";
import { FactionSheet } from "./actor/faction-sheet.js";
import { LocationSheet } from "./actor/location-sheet.js";
import { ClockSheet } from "./actor/clock-sheet.js";
import { NpcSheet } from "./actor/npc-sheet.js";
import { GroupSheet } from "./actor/group-sheet.js";

// Hoja de item
import { AfodItemSheet } from "./item/afod-item-sheet.js";

// Capa de compatibilidad
import {
  getActorSheetClass,
  getItemSheetClass,
  registerActorSheet,
  unregisterActorSheet,
  registerItemSheet,
  unregisterItemSheet
} from "./compat.js";

const _COMPENDIUM_LABEL_KEYS = {
  playbooks: "AFOD.Compendium.Playbooks",
  "crew-types": "AFOD.Compendium.CrewTypes",
  items: "AFOD.Compendium.StandardItems",
  vices: "AFOD.Compendium.Vices",
  factions: "AFOD.Compendium.Factions",
  abilities: "AFOD.Compendium.Abilities",
  "crew-abilities": "AFOD.Compendium.CrewAbilities",
  heritages: "AFOD.Compendium.Heritages",
  rolltables: "AFOD.Compendium.Rolltables"
};
const _CHAT_LOCALIZATION_RULES = [
  {
    patterns: [
      /^Draws a result from the (.+) table$/i,
      /^Saca un resultado de la tabla (.+)$/i,
      /^Treu un resultat de la taula (.+)$/i
    ],
    format: match => game.i18n.format("AFOD.Chat.DrawsResultFromTable", {
      table: match[1]
    })
  },
  {
    patterns: [
      /^(.+?) equips (.+?)\.$/i,
      /^(.+?) se equipa (.+?)\.$/i,
      /^(.+?) s'equipa amb (.+?)\.$/i
    ],
    format: match => game.i18n.format("AFOD.ArmorEquipped", {
      name: match[1],
      armor: match[2]
    })
  },
  {
    patterns: [
      /^(.+?) removes (.+?)\.$/i,
      /^(.+?) retira (.+?)\.$/i,
      /^(.+?) es treu (.+?)\.$/i
    ],
    format: match => game.i18n.format("AFOD.ArmorUnequipped", {
      name: match[1],
      armor: match[2]
    })
  },
  {
    patterns: [
      /^(.+?) for (.+?) has been used\.$/i,
      /^(.+?) de (.+?) ha sido utilizada\.$/i,
      /^S'ha utilitzat (.+?) de (.+?)\.$/i
    ],
    format: match => game.i18n.format("AFOD.ArmorWorn", {
      armor: match[1],
      name: match[2]
    })
  }
];

function _localizeCompendiumLabels() {
  for (const [packName, i18nKey] of Object.entries(_COMPENDIUM_LABEL_KEYS)) {
    const pack = game.packs.get(`a-fistful-of-darkness.${packName}`);
    if (!pack) continue;
    pack.metadata.label = game.i18n.localize(i18nKey);
  }

  const compendiumSidebar = ui.sidebar?.tabs?.compendium ?? ui.compendium;
  compendiumSidebar?.render?.(true);

  for (const app of Object.values(ui.windows)) {
    const collectionId = app.collection?.collection;
    if (typeof collectionId === "string" && collectionId.startsWith("a-fistful-of-darkness.")) {
      app.render?.(true);
    }
  }
}

function _localizeKnownChatText(text) {
  for (const rule of _CHAT_LOCALIZATION_RULES) {
    for (const pattern of rule.patterns) {
      const match = text.match(pattern);
      if (match) return rule.format(match);
    }
  }
  return null;
}

function _localizeChatMessage(html) {
  const root = html?.[0];
  if (!root) return;

  const textNodes = root.querySelectorAll(".flavor-text, .message-content *, .message-content");
  for (const node of textNodes) {
    if (node.children.length) continue;
    const text = node.textContent?.replace(/\s+/g, " ").trim();
    if (!text) continue;
    const localized = _localizeKnownChatText(text);
    if (localized && localized !== text) node.textContent = localized;
  }
}

/* -------------------------------------------- */
/*  Inicialización del sistema                   */
/* -------------------------------------------- */

Hooks.once("init", async function() {
  console.log("A Fistful of Darkness | Inicializando sistema...");

  // Namespace global del sistema
  game.afod = {
    dice: afodRoll,
    roller: simpleRollPopup,
    actionDialog: actionRollDialog,
    helpers: AfodHelpers
  };

  // Tamaños de relojes disponibles
  game.system.afodClocks = {
    sizes: [4, 6, 8, 10, 12]
  };

  // Estigmas del personaje (para el helper traumacounter adaptado)
  game.system.stigmas = [
    "loco", "marcado", "corrupto", "visiones", "busca_gloria",
    "voces", "maldito", "perseguido", "avergonzado", "insensible"
  ];

  // Decadencias del Aparecido
  game.system.decays = [
    "frio", "obsesionado", "decapitado", "caotico",
    "inestable", "vicioso", "apestoso"
  ];

  // Registrar clases de documento
  CONFIG.Actor.documentClass = AfodActor;
  CONFIG.Item.documentClass = AfodItem;
  CONFIG.ActiveEffect.documentClass = AfodActiveEffect;

  // Registrar configuración del sistema
  registerSystemSettings();

  // Relojes públicos (si está habilitado)
  if (game.settings.get("a-fistful-of-darkness", "PublicClocks")) {
    Hooks.on("preCreateActor", (actor, createData, options, userId) => {
      if (actor.type === "\uD83D\uDD5B clock") {
        actor.updateSource({ "ownership.default": CONST.DOCUMENT_OWNERSHIP_LEVELS.OBSERVER });
      }
    });
  }

  /* -------------------------------------------- */
  /*  Helpers de Handlebars                        */
  /* -------------------------------------------- */

  // Multiboxes: marca checkboxes según valores seleccionados
  Handlebars.registerHelper("multiboxes", function(selected, options) {
    let html = options.fn(this);
    if (!Array.isArray(selected)) selected = [selected];
    if (typeof selected !== "undefined") {
      selected.forEach(val => {
        if (val !== false) {
          let escaped = RegExp.escape(Handlebars.escapeExpression(val));
          let rgx = new RegExp(` value="${escaped}"`);
          let oldHtml = html;
          html = html.replace(rgx, "$& checked");
          while (oldHtml === html && escaped >= 0) {
            escaped--;
            rgx = new RegExp(` value="${escaped}"`);
            html = html.replace(rgx, "$& checked");
          }
        }
      });
    }
    return html;
  });

  // Stigma/Decay counter: cuenta cuántos están marcados como true
  Handlebars.registerHelper("stigmacounter", function(selected, options) {
    let html = options.fn(this);
    let count = 0;
    for (const key in selected) {
      if (selected[key] === true) count++;
    }
    const rgx = new RegExp(` value="${count}"`);
    return html.replace(rgx, "$& checked");
  });

  // Comparaciones
  Handlebars.registerHelper("noteq",  (a, b, options) => a !== b ? options.fn(this) : "");
  Handlebars.registerHelper("lteq",   (a, b) => a <= b);
  Handlebars.registerHelper("gteq",   (a, b) => a >= b);
  Handlebars.registerHelper("oneless",(a) => a - 1);

  // Loops numéricos
  Handlebars.registerHelper("times_from", function(start, n, block) {
    let accum = "";
    for (let i = start; i <= n; i++) accum += block.fn(i);
    return accum;
  });
  Handlebars.registerHelper("times_from_1", function(n, block) {
    let accum = "";
    for (let i = 1; i <= n; i++) accum += block.fn(i);
    return accum;
  });
  Handlebars.registerHelper("times_from_0", function(n, block) {
    let accum = "";
    for (let i = 0; i <= n; i++) accum += block.fn(i);
    return accum;
  });

  // Utilidades
  Handlebars.registerHelper("concat", function() {
    let out = "";
    for (const arg in arguments) {
      if (typeof arguments[arg] !== "object") out += arguments[arg];
    }
    return out;
  });

  Handlebars.registerHelper("html", (options) => {
    const text = options.hash["text"].replace(/\n/g, "<br />");
    return new Handlebars.SafeString(text);
  });

  Handlebars.registerHelper("pc", (string) => AfodHelpers.getProperCase(string));

  Handlebars.registerHelper("getSetting", (string) =>
    game.settings.get("a-fistful-of-darkness", string)
  );

  // Comparación de igualdad con coerción de tipo (útil para number vs string en selects)
  Handlebars.registerHelper("eqStr", (a, b) => String(a) === String(b));

  // Select con labels localizados
  Handlebars.registerHelper("selectOptionsWithLabel", function(choices, options) {
    const localize = options.hash["localize"] ?? false;
    let selected = options.hash["selected"] ?? null;
    let blank = options.hash["blank"] || null;
    selected = selected instanceof Array ? selected.map(String) : [String(selected)];

    let html = "";
    const option = (key, object) => {
      if (localize) object.label = game.i18n.localize(object.label);
      html += `<option value="${key}" ${selected.includes(key) ? "selected" : ""}>${object.label}</option>`;
    };

    if (blank) option("", blank);
    Object.entries(choices).forEach(e => option(...e));
    return new Handlebars.SafeString(html);
  });

  // Reloj (negro, para sheets)
  Handlebars.registerHelper("afod-clock", function(paramName, type, currentValue, uniqId) {
    let html = "";
    if (currentValue === null || currentValue === "null") currentValue = 0;
    if (parseInt(currentValue) > parseInt(type)) currentValue = type;

    html += `<label class="clock-zero-label" for="clock-0-${uniqId}"><i class="fab fa-creative-commons-zero nullifier"></i></label>`;
    html += `<div id="afod-clock-${uniqId}" class="afod-clock clock-${type} clock-${type}-${currentValue}" style="background-image:url('systems/a-fistful-of-darkness/themes/black/${type}clock_${currentValue}-afod.svg');">`;

    const zeroChecked = parseInt(currentValue) === 0 ? "checked" : "";
    html += `<input type="radio" value="0" id="clock-0-${uniqId}" data-dType="String" name="${paramName}" ${zeroChecked}>`;

    for (let i = 1; i <= parseInt(type); i++) {
      const checked = parseInt(currentValue) === i ? "checked" : "";
      html += `
        <input type="radio" value="${i}" id="clock-${i}-${uniqId}" data-dType="String" name="${paramName}" ${checked}>
        <label class="radio-toggle" for="clock-${i}-${uniqId}"></label>
      `;
    }
    html += "</div>";
    return html;
  });

  // Reloj con color (para actores tipo reloj)
  Handlebars.registerHelper("afod-clock-color", function(paramName, type, color, currentValue, uniqId) {
    let html = "";
    if (currentValue === null || currentValue === "null") currentValue = 0;
    if (color === undefined) color = "black";
    if (parseInt(currentValue) > parseInt(type)) currentValue = type;

    html += `<label class="clock-zero-label" for="clock-0-${uniqId}"><i class="fab fa-creative-commons-zero nullifier"></i></label>`;
    html += `<div id="afod-clock-${uniqId}" class="afod-clock clock-${type} clock-${type}-${currentValue}" style="background-image:url('systems/a-fistful-of-darkness/themes/${color}/${type}clock_${currentValue}-afod.svg');">`;

    const zeroChecked = parseInt(currentValue) === 0 ? "checked" : "";
    html += `<input type="radio" value="0" id="clock-0-${uniqId}" data-dType="String" name="${paramName}" ${zeroChecked}>`;

    for (let i = 1; i <= parseInt(type); i++) {
      const checked = parseInt(currentValue) === i ? "checked" : "";
      html += `
        <input type="radio" value="${i}" id="clock-${i}-${uniqId}" data-dType="String" name="${paramName}" ${checked}>
        <label class="radio-toggle" for="clock-${i}-${uniqId}"></label>
      `;
    }
    html += "</div>";
    return html;
  });
});

/* -------------------------------------------- */
/*  Registro de hojas (ready hook)               */
/* -------------------------------------------- */

Hooks.once("ready", async function() {
  const actorSheetClass = getActorSheetClass();
  const itemSheetClass  = getItemSheetClass();

  // Desregistrar sheets por defecto del core
  unregisterActorSheet("core", actorSheetClass);
  unregisterItemSheet("core", itemSheetClass);

  // Registrar hojas del sistema
  registerActorSheet("afod", CharacterSheet, { types: ["character"],  makeDefault: true });
  registerActorSheet("afod", RevenantSheet,  { types: ["revenant"],   makeDefault: true });
  registerActorSheet("afod", PosseSheet,     { types: ["posse"],      makeDefault: true });
  registerActorSheet("afod", FactionSheet,   { types: ["faction"],    makeDefault: true });
  registerActorSheet("afod", LocationSheet,  { types: ["location"],   makeDefault: true });
  registerActorSheet("afod", ClockSheet,     { types: ["\uD83D\uDD5B clock"], makeDefault: true });
  registerActorSheet("afod", NpcSheet,       { types: ["npc"],        makeDefault: true });
  registerActorSheet("afod", GroupSheet,     { types: ["group"],      makeDefault: true });

  registerItemSheet("afod",  AfodItemSheet,  { makeDefault: true });

  // Precargar plantillas Handlebars
  await preloadHandlebarsTemplates();
  _localizeCompendiumLabels();

  console.log("A Fistful of Darkness | Sistema cargado correctamente.");
});

Hooks.on("renderChatMessageHTML", (_message, html) => {
  _localizeChatMessage(html);
});

/* -------------------------------------------- */
/*  Actualización en tiempo real: Hoja de Grupo  */
/* -------------------------------------------- */

// Acumula IDs de actores modificados y re-renderiza todas las hojas de grupo
// abiertas que los contengan, con un debounce de 80 ms para agrupar ráfagas
// de cambios (p.ej. equipar varios items a la vez).
{
  const _pending = new Set();
  let   _timer   = null;

  function _scheduleGroupRefresh(actorId) {
    if (!actorId) return;
    _pending.add(actorId);
    clearTimeout(_timer);
    _timer = setTimeout(() => {
      const ids = new Set(_pending);
      _pending.clear();
      for (const app of Object.values(ui.windows)) {
        if (app.actor?.type !== "group") continue;
        const members = app.actor.system.members ?? [];
        if (members.some(m => ids.has(m.id))) app.render({ force: false });
      }
    }, 80);
  }

  // Cambios directos en el actor (stats, habilidades, carga máx., etc.)
  Hooks.on("updateActor", actor => _scheduleGroupRefresh(actor.id));

  // Cambios en items embebidos (equipar/desequipar, comprar habilidad, etc.)
  Hooks.on("createItem",  item => _scheduleGroupRefresh(item.parent?.id));
  Hooks.on("updateItem",  item => _scheduleGroupRefresh(item.parent?.id));
  Hooks.on("deleteItem",  item => _scheduleGroupRefresh(item.parent?.id));
}

/* -------------------------------------------- */
/*  Botón de Tirada Rápida en controles          */
/* -------------------------------------------- */

Hooks.on("getSceneControlButtons", controls => {
  controls.tokens.tools.DiceRoller = {
    name: "DiceRoller",
    title: "AFOD.DiceRoller",
    icon: "fas fa-dice",
    onChange: (event, active) => simpleRollPopup(),
    button: true
  };
});

/* -------------------------------------------- */
/*  Migración de compendios (iconos, logros,     */
/*  contactos). Se ejecuta una vez por versión.  */
/* -------------------------------------------- */

const _MIGRATION_VERSION = "1.3";   // incrementar al cambiar la lógica

const _ICON_DEFAULTS = {
  // Tipos de item
  crew_type:    "icons/svg/castle.svg",
  crew_ability: "icons/svg/shield.svg",
  crew_upgrade: "icons/svg/upgrade.svg",
  ability:      "icons/svg/book.svg",
  achievement:  "icons/svg/chest.svg",
  artifact:     "icons/svg/aura.svg",
  playbook:     "icons/svg/mystery-man.svg",
  vice:         "icons/svg/tankard.svg",
  item:         "icons/svg/item-bag.svg",
  cohort:       "icons/svg/mystery-man.svg",
  class:        "icons/svg/mystery-man.svg",
  background:   "icons/svg/book.svg",
  heritage:     "icons/svg/mystery-man.svg",
  // Tipos de actor
  character:    "icons/svg/mystery-man.svg",
  revenant:     "icons/svg/skull.svg",
  posse:        "icons/svg/castle.svg",
  faction:      "icons/svg/tower-flag.svg",
  location:     "icons/svg/city.svg",
  npc:          "icons/svg/mystery-man-black.svg",
  group:        "icons/svg/mystery-man.svg",
  clock:        "icons/svg/clockwork.svg",
};

// Contactos reales de las páginas 41-44 del manual (en inglés), traducidos
const _CREW_CONTACTS = {
  "Carroñeros de Hellstone": `<ul>
    <li><strong>Bill 'Scar' Morgan</strong>, juez</li>
    <li><strong>'Railroad' Gilliam</strong>, alguacil</li>
    <li><strong>Sweet Dave</strong>, pianista</li>
    <li><strong>Grover McIntyre</strong>, dueño de la ferretería</li>
    <li><strong>Ling Lee</strong>, coleccionista</li>
    <li><strong>Old Man Bruford</strong>, dueño de la tasca</li>
  </ul>`,
  "Cuadrilla de Forajidos": `<ul>
    <li><strong>Bill 'Scar' Morgan</strong>, juez</li>
    <li><strong>'the Cheat' Murray</strong>, traficante de armas</li>
    <li><strong>'Silent' Bob</strong>, herrero</li>
    <li><strong>Moe</strong>, dueño del saloon</li>
    <li><strong>Sam Malone</strong>, contrabandista</li>
    <li><strong>Old Man Bruford</strong>, dueño de la tasca</li>
  </ul>`,
  "Cazarrecompensas": `<ul>
    <li><strong>Bill 'Scar' Morgan</strong>, juez</li>
    <li><strong>'Railroad' Gilliam</strong>, alguacil</li>
    <li><strong>'Silent' Bob</strong>, herrero</li>
    <li><strong>Moe</strong>, dueño del saloon</li>
    <li><strong>Madam Zona</strong>, vidente</li>
    <li><strong>Xiang</strong>, ocultista</li>
  </ul>`,
  "Tribu": `<ul>
    <li><strong>'the Cheat' Murray</strong>, traficante de armas</li>
    <li><strong>Hawk</strong>, espíritu salvaje</li>
    <li><strong>Kills Many</strong>, guardián del umbral</li>
    <li><strong>Free Cloud Raining</strong>, curandero</li>
    <li><strong>Seeker</strong>, guía</li>
    <li><strong>'Coin' Slate</strong>, mercader</li>
  </ul>`,
};

// Directorios de iconos conocidos en esta versión de Foundry
const _VALID_ICON_PREFIXES = [
  "icons/svg/", "icons/skills/", "icons/equipment/", "icons/weapons/",
  "icons/magic/", "icons/sundries/", "icons/creatures/", "icons/commodities/",
  "icons/tools/", "icons/environment/", "icons/consumables/", "icons/containers/",
  "icons/pings/", "icons/dice/",
  "systems/a-fistful-of-darkness/", "modules/", "worlds/",
];

function _isValidIcon(path) {
  if (!path || path.trim() === "") return false;
  return _VALID_ICON_PREFIXES.some(p => path.startsWith(p));
}

async function _migrateCompendiums() {
  if (!game.user.isGM) return;
  const stored = game.settings.get("a-fistful-of-darkness", "migrationVersion") ?? "0";
  if (stored >= _MIGRATION_VERSION) return;

  console.log("A Fistful of Darkness | Ejecutando migración de compendios...");

  const packIds = [
    "a-fistful-of-darkness.crew-types",
    "a-fistful-of-darkness.crew-abilities",
    "a-fistful-of-darkness.abilities",
    "a-fistful-of-darkness.items",
    "a-fistful-of-darkness.vices",
    "a-fistful-of-darkness.playbooks",
    "a-fistful-of-darkness.factions",
    "a-fistful-of-darkness.rolltables",
  ];

  for (const packId of packIds) {
    const pack = game.packs.get(packId);
    if (!pack) continue;
    const wasLocked = pack.locked;
    if (wasLocked) await pack.configure({ locked: false });
    let docs;
    try { docs = await pack.getDocuments(); }
    catch { if (wasLocked) await pack.configure({ locked: true }); continue; }

    for (const doc of docs) {
      const upd = {};

      // Corregir icono si la ruta no es válida
      if (!_isValidIcon(doc.img)) {
        upd.img = _ICON_DEFAULTS[doc.type] ?? "icons/svg/item-bag.svg";
      }

      if (doc.type === "crew_type") {
        // Poblar logros si están vacíos
        const achs = doc.system?.achievements ?? [];
        if (!achs.some(a => a.name)) {
          const defaults = CREW_DEFAULT_ACHIEVEMENTS[doc.name];
          if (defaults) upd["system.achievements"] = defaults.map(a => ({ name: a.name }));
        }
        // Insertar contactos reales (sobrescribe siempre en esta versión)
        const contacts = _CREW_CONTACTS[doc.name];
        if (contacts) upd["system.contacts"] = contacts;
      }

      if (Object.keys(upd).length) await doc.update(upd);
    }

    if (wasLocked) await pack.configure({ locked: true });
  }

  await game.settings.set("a-fistful-of-darkness", "migrationVersion", _MIGRATION_VERSION);
  console.log("A Fistful of Darkness | Migración completada.");
}

Hooks.once("ready", () => {
  if (game.user.isGM) {
    _migrateCompendiums()
      .then(() => syncCompendiumLocalization())
      .catch(error => console.error("A Fistful of Darkness | Error sincronizando compendios:", error));
  }
});
