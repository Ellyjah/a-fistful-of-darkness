/**
 * afod-item-sheet.js — Hoja de Item para A Fistful of Darkness (V2)
 * Una sola clase gestiona todos los tipos; la plantilla se selecciona dinámicamente.
 */

import { getLocalizedPackDocumentData } from "../compendium-localization.js";

const { HandlebarsApplicationMixin } = foundry.applications.api;
const { ItemSheetV2 }                = foundry.applications.sheets;

/**
 * Recopila nombres únicos de items de un tipo dado.
 * @param {string} itemType
 * @returns {{ value: string, label: string }[]}
 */
function _afodCollectItemNames(itemType) {
  const names = new Set();
  for (const item of game.items) {
    if (item.type === itemType) names.add(item.name);
  }
  for (const pack of game.packs) {
    if (pack.metadata.type !== "Item") continue;
    for (const entry of pack.index) {
      if (entry.type === itemType) names.add(entry.name);
    }
  }
  return Array.from(names)
    .sort((a, b) => a.localeCompare(b, "es"))
    .map(name => ({ value: name, label: name }));
}

/** Mapeo de clave de habilidad → atributo padre */
const SKILL_ATTR_MAP = {
  hunt: "wits",  read: "wits",    survey: "wits",   craft: "wits",
  sling: "prowess", prowl: "prowess", brawl: "prowess", disable: "prowess",
  attune: "guts",  command: "guts",  consort: "guts",  sway: "guts"
};

function _afodBaseSkillsList(base_skills) {
  const order = [
    "hunt", "read", "survey", "craft",
    "sling", "prowl", "brawl", "disable",
    "attune", "command", "consort", "sway"
  ];
  return order
    .filter(k => k in base_skills)
    .map(k => ({
      key:   k,
      value: base_skills[k][0] ?? 0,
      label: `AFOD.Skills${k.charAt(0).toUpperCase()}${k.slice(1)}`,
      attr:  SKILL_ATTR_MAP[k] ?? ""
    }));
}

export class AfodItemSheet extends HandlebarsApplicationMixin(ItemSheetV2) {

  static DEFAULT_OPTIONS = {
    classes: ["a-fistful-of-darkness", "sheet", "item"],
    position: { width: 620, height: 560 },
    window: { resizable: true }
  };

  // Plantilla de respaldo; la real se elige dinámicamente en _renderHTML
  static PARTS = {
    form: { template: "systems/a-fistful-of-darkness/templates/items/simple.html" }
  };

  /* -------------------------------------------- */
  /*  Renderizado con plantilla dinámica           */
  /* -------------------------------------------- */

  /**
   * Elige la plantilla según el tipo de item y devuelve { form: HTMLElement }.
   * @override
   */
  async _renderHTML(context, options) {
    const item     = this.document ?? this.item;
    const type     = item?.type ?? "simple";
    const template = `systems/a-fistful-of-darkness/templates/items/${type}.html`;
    const renderFn = foundry.applications?.handlebars?.renderTemplate ?? renderTemplate;
    const html     = await renderFn(template, context);

    const div = document.createElement("div");
    div.innerHTML = html;

    // El elemento raíz del part debe tener data-application-part para los re-renders
    const el = div.children[0] ?? div;
    el.setAttribute("data-application-part", "form");

    return { form: el };
  }

  /* -------------------------------------------- */
  /*  Contexto                                     */
  /* -------------------------------------------- */

  /** @override */
  async _prepareContext(options) {
    const context = await super._prepareContext(options);
    const shouldLocalizeCompendiumView = !!this.item.pack && !this.item.isOwned;
    console.log(`AFoD | item._prepareContext | pack=${this.item?.pack} isOwned=${this.item?.isOwned} isEditable=${this.isEditable} shouldLocalize=${shouldLocalizeCompendiumView} doc=${this.document?.id} item=${this.item?.id}`);
    const localizedItem = shouldLocalizeCompendiumView ? await getLocalizedPackDocumentData(this.item) : (this.document ?? this.item);
    context.item      = localizedItem;
    context.system    = localizedItem.system;
    context.itemType  = localizedItem.type ?? this.item.type;
    // Items del compendio o items embebidos en actores muestran descripción enriquecida
    const fromPack    = !!this.item.pack;
    context.isEditable = this.isEditable && !fromPack && !this.item.isOwned;
    context.cssClass  = context.isEditable ? "editable" : "locked";

    if (context.system?.description !== undefined) {
      const enricher = foundry.applications?.ux?.TextEditor?.implementation ?? TextEditor;
      context.enrichedDescription = await enricher.enrichHTML(
        context.system.description || "", { async: true }
      );
    }

    if ((localizedItem.type ?? this.item.type) === "ability") {
      context.classOptions = _afodCollectItemNames("class");
    }
    if ((localizedItem.type ?? this.item.type) === "crew_ability" || (localizedItem.type ?? this.item.type) === "crew_upgrade") {
      context.crewTypeOptions = _afodCollectItemNames("crew_type");
    }

    if ((localizedItem.type ?? this.item.type) === "class") {
      context.baseSkillsList = _afodBaseSkillsList(localizedItem.system.base_skills ?? {});

      const className     = this.item.name ?? localizedItem.name;
      const playbookItems = [];
      const seen          = new Set();

      const pack = game.packs.get("a-fistful-of-darkness.items");
      if (pack) {
        const docs = await pack.getDocuments();
        for (const doc of docs) {
          if (doc.system?.class === className && !seen.has(doc.name)) {
            const locDoc = await getLocalizedPackDocumentData(doc);
            seen.add(doc.name);
            playbookItems.push({ name: locDoc.name, load: locDoc.system?.load ?? 0 });
          }
        }
      }
      for (const item of game.items) {
        if (item.type === "item" && item.system?.class === className && !seen.has(item.name)) {
          seen.add(item.name);
          playbookItems.push({ name: item.name, load: item.system.load ?? 0 });
        }
      }

      context.playbookItems = playbookItems.sort(
        (a, b) => b.load - a.load || a.name.localeCompare(b.name, "es")
      );
    }

    if ((localizedItem.type ?? this.item.type) === "crew_type") {
      // Cargar habilidades de cuadrilla del compendio
      const abPack = game.packs.get("a-fistful-of-darkness.crew-abilities");
      if (abPack) {
        const allDocs = await abPack.getDocuments();
        const filtered = allDocs
          .filter(a => a.system?.class === this.item.name || a.system?.class === localizedItem.name)
          .sort((a, b) => (b.system?.class_default ? 1 : 0) - (a.system?.class_default ? 1 : 0) || a.name.localeCompare(b.name, "es"));
        context.crewAbilities = await Promise.all(filtered.map(a => getLocalizedPackDocumentData(a)));
      } else {
        context.crewAbilities = [];
      }

      const CREW_GRID_DEF = [
        { index: 0,  type: "dark",    gridCol: 1, gridRow: 2 },
        { index: 1,  type: "neutral", gridCol: 3, gridRow: 2 },
        { index: 2,  type: "neutral", gridCol: 5, gridRow: 2 },
        { index: 3,  type: "light",   gridCol: 7, gridRow: 2 },
        { index: 4,  type: "light",   gridCol: 9, gridRow: 2 },
        { index: 5,  type: "dark",    gridCol: 1, gridRow: 4 },
        { index: 6,  type: "dark",    gridCol: 3, gridRow: 4 },
        { index: 7,  type: "neutral", gridCol: 5, gridRow: 4 },
        { index: 8,  type: "light",   gridCol: 7, gridRow: 4 },
        { index: 9,  type: "light",   gridCol: 9, gridRow: 4 },
        { index: 10, type: "dark",    gridCol: 1, gridRow: 6 },
        { index: 11, type: "dark",    gridCol: 3, gridRow: 6 },
        { index: 12, type: "neutral", gridCol: 5, gridRow: 6 },
        { index: 13, type: "neutral", gridCol: 7, gridRow: 6 },
        { index: 14, type: "light",   gridCol: 9, gridRow: 6 },
      ];
      const typeLabel = { dark: "Oscuridad", neutral: "Neutral", light: "Luz" };
      const rawAch = localizedItem.system.achievements ?? [];
      context.achievementCells = CREW_GRID_DEF.map(def => ({
        index:     def.index,
        achType:   def.type,
        gridCol:   def.gridCol,
        gridRow:   def.gridRow,
        fixed:     def.index === 7,
        name:      def.index === 7 ? "EQUILIBRIO" : (rawAch[def.index]?.name ?? ""),
        typeLabel: typeLabel[def.type] ?? def.type,
        fieldName: `system.achievements.${def.index}.name`,
      }));

      context.achievementCrosses = [
        { gridCol: 4, gridRow: 2, dir: "h" }, { gridCol: 8, gridRow: 2, dir: "h" },
        { gridCol: 2, gridRow: 4, dir: "h" }, { gridCol: 4, gridRow: 4, dir: "h" },
        { gridCol: 6, gridRow: 4, dir: "h" }, { gridCol: 8, gridRow: 4, dir: "h" },
        { gridCol: 2, gridRow: 6, dir: "h" }, { gridCol: 6, gridRow: 6, dir: "h" },
        { gridCol: 1, gridRow: 3, dir: "v" }, { gridCol: 5, gridRow: 3, dir: "v" }, { gridCol: 7, gridRow: 3, dir: "v" },
        { gridCol: 3, gridRow: 5, dir: "v" }, { gridCol: 5, gridRow: 5, dir: "v" }, { gridCol: 9, gridRow: 5, dir: "v" },
      ];
    }

    return context;
  }

  /* -------------------------------------------- */
  /*  Listeners                                    */
  /* -------------------------------------------- */

  /** @override */
  _onRender(context, options) {
    super._onRender(context, options);
    this._styleTabButtons();
    this._activateTabs();

    if (!this.isEditable) return;

    // Editar imagen del item al hacer clic (data-edit="img")
    $(this.element).find("img[data-edit]").css("cursor", "pointer").on("click", ev => {
      ev.preventDefault();
      const attr    = ev.currentTarget.dataset.edit;
      const current = foundry.utils.getProperty(this.document, attr) ?? "";
      const FP      = foundry.applications?.apps?.FilePicker ?? FilePicker;
      new FP({
        type: "image",
        current,
        callback: src => this.document.update({ [attr]: src })
      }).browse();
    });
  }

  _activateTabs() {
    const el  = this.element;
    const nav = el.querySelector("nav.tabs[data-group]");
    if (!nav) return;
    const group = nav.dataset.group ?? "primary";
    if (!this.tabGroups) this.tabGroups = {};
    if (!this.tabGroups[group]) {
      const activeItem = nav.querySelector(".item.active[data-tab]");
      this.tabGroups[group] = activeItem?.dataset.tab
        ?? nav.querySelector(".item[data-tab]")?.dataset.tab ?? "";
    }
    this._syncTabState(group);
    nav.querySelectorAll(".item[data-tab]").forEach(tabEl => {
      tabEl.addEventListener("click", ev => {
        const tabId = ev.currentTarget.dataset.tab;
        this.tabGroups[group] = tabId;
        this._syncTabState(group);
      });
    });
  }

  _syncTabState(group) {
    const el  = this.element;
    const nav = el.querySelector(`nav.tabs[data-group="${group}"]`);
    if (!nav) return;
    const activeTab = this.tabGroups[group];
    nav.querySelectorAll(".item[data-tab]").forEach(item => {
      item.classList.toggle("active", item.dataset.tab === activeTab);
    });
    el.querySelectorAll(".tab-content .tab[data-tab]").forEach(panel => {
      panel.classList.toggle("active", panel.dataset.tab === activeTab);
    });
  }

  _styleTabButtons() {
    const nav = $(this.element).find("nav.tabs");
    if (!nav.length) return;
    nav.css({
      "flex": "0 0 26px", "height": "26px", "overflow": "visible",
      "align-items": "center", "display": "flex", "flex-direction": "row",
      "gap": "4px", "padding": "4px 4px 0", "position": "relative", "z-index": "2"
    });
    nav.find(".item").css({
      "height": "30px", "min-height": "30px", "max-height": "30px",
      "display": "flex", "align-items": "center", "justify-content": "center",
      "padding": "0 10px", "line-height": "1", "box-sizing": "border-box",
      "position": "relative", "z-index": "3",
      "background-image": "url('systems/a-fistful-of-darkness/styles/assets/boton-1.png')",
      "background-size": "100% 100%", "background-repeat": "no-repeat",
      "filter": "brightness(0.82)", "color": "#2a1408",
      "text-shadow": "none", "border": "none", "cursor": "pointer"
    });
    nav.find(".item.active").css({ "filter": "brightness(1.1)", "font-weight": "bold", "color": "#1a0a04" });
  }
}
