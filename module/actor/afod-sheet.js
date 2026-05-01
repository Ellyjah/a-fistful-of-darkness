/**
 * afod-sheet.js — Clase base de ActorSheet para A Fistful of Darkness (V2)
 * Todas las hojas de actor heredan de esta clase.
 * Provee contexto común, listeners comunes y utilidades.
 */

import { getLocalizedPackDocumentData } from "../compendium-localization.js";

const { HandlebarsApplicationMixin } = foundry.applications.api;
const { ActorSheetV2 }               = foundry.applications.sheets;

export class AfodSheet extends HandlebarsApplicationMixin(ActorSheetV2) {

  static DEFAULT_OPTIONS = {};
  static USES_ENRICHED_DESCRIPTION = false;

  // Cada subhoja define sus propias partes
  static PARTS = {};

  /**
   * Localiza una lista de items embebidos (owned) para visualización,
   * usando el catálogo del compendio por nombre.
   * Devuelve plain objects con los textos en el idioma activo.
   * El campo `id` se restaura al id del item embebido original.
   */
  static async _localizeOwnedItems(items, packName) {
    return Promise.all(items.map(async item => {
      const fakeDoc = {
        pack: `a-fistful-of-darkness.${packName}`,
        id: null, _id: null,
        _source: { _id: null },
        name: item.name,
        toObject: () => (item.toObject ? item.toObject() : foundry.utils.deepClone(item))
      };
      const localized = await getLocalizedPackDocumentData(fakeDoc);
      localized.id = item.id ?? item._id;
      return localized;
    }));
  }

  /* -------------------------------------------- */
  /*  Contexto común                               */
  /* -------------------------------------------- */

  /** @override */
  async _prepareContext(options) {
    const context = await super._prepareContext(options);
    const shouldLocalizeCompendiumView = !!this.actor.pack;
    const docForLocalization = this.document ?? this.actor;
    console.log(`AFoD | actor._prepareContext | pack=${this.actor?.pack} shouldLocalize=${shouldLocalizeCompendiumView} actor.id=${this.actor?.id} doc.id=${this.document?.id} _source._id=${this.document?._source?._id} _id=${this.document?._id}`);
    const localizedActor = shouldLocalizeCompendiumView ? await getLocalizedPackDocumentData(docForLocalization) : this.actor;

    context.actor      = localizedActor;
    context.system     = localizedActor.system;
    const fromPack     = !!this.actor.pack;
    context.isEditable = this.isEditable && !fromPack;
    context.cssClass   = context.isEditable ? "editable" : "locked";

    // Enriquecer descripción si existe (se guarda separada para no corromper el textarea)
    if (this.constructor.USES_ENRICHED_DESCRIPTION && context.system?.description !== undefined) {
      const enricher = foundry.applications?.ux?.TextEditor?.implementation ?? TextEditor;
      context.enrichedDescription = await enricher.enrichHTML(
        context.system.description || "", { async: true }
      );
    }

    return context;
  }

  /* -------------------------------------------- */
  /*  Post-render: listeners comunes               */
  /* -------------------------------------------- */

  /** @override */
  _onRender(context, options) {
    super._onRender(context, options);

    this._styleTabButtons();
    this._activateTabs();

    if (!this.isEditable) return;
    this._bindCommonEditableEvents();
  }

  /* -------------------------------------------- */
  /*  Gestión de pestañas                          */
  /* -------------------------------------------- */

  /**
   * Activa el sistema de pestañas manual.
   * El estado activo se guarda en this.tabGroups y se sincroniza en cada render.
   */
  _activateTabs() {
    const el = this.element;
    const nav = el.querySelector("nav.tabs[data-group]");
    if (!nav) return;

    const group = nav.dataset.group ?? "primary";

    // Inicializar grupo si es la primera vez
    if (!this.tabGroups) this.tabGroups = {};
    if (!this.tabGroups[group]) {
      // Usar el tab marcado como active en el HTML o el primero disponible
      const activeNavItem = nav.querySelector(".item.active[data-tab]");
      this.tabGroups[group] = activeNavItem?.dataset.tab
        ?? nav.querySelector(".item[data-tab]")?.dataset.tab
        ?? "";
    }

    // Sincronizar DOM con el estado almacenado
    this._syncTabState(group);

    if (nav.dataset.afodTabsBound === "true") return;
    nav.dataset.afodTabsBound = "true";

    nav.addEventListener("click", ev => {
      const tabEl = ev.target.closest(".item[data-tab]");
      if (!tabEl || !nav.contains(tabEl)) return;
      const tabId = tabEl.dataset.tab;
      this.tabGroups[group] = tabId;
      this._syncTabState(group);
    });
  }

  /**
   * Aplica la clase "active" a nav items y paneles de contenido según el tab activo.
   * @param {string} group
   */
  _syncTabState(group) {
    const el  = this.element;
    const nav = el.querySelector(`nav.tabs[data-group="${group}"]`);
    if (!nav) return;

    const activeTab = this.tabGroups[group];

    // Nav items
    nav.querySelectorAll(".item[data-tab]").forEach(item => {
      item.classList.toggle("active", item.dataset.tab === activeTab);
    });

    // Paneles de contenido: buscamos .tab[data-tab] dentro de .tab-content
    el.querySelectorAll(".tab-content .tab[data-tab]").forEach(panel => {
      panel.classList.toggle("active", panel.dataset.tab === activeTab);
    });
  }

  /* -------------------------------------------- */
  /*  Estilado de pestañas                         */
  /* -------------------------------------------- */

  /**
   * Aplica inline styles a los botones de pestaña.
   * Se usa JS porque Foundry v13 aplica CSS con especificidad muy alta.
   */
  _styleTabButtons() {
    const nav = this.element.querySelector("nav.tabs");
    if (!nav || nav.dataset.afodStyled === "true") return;
    nav.dataset.afodStyled = "true";

    Object.assign(nav.style, {
      flex: "0 0 26px",
      height: "26px",
      overflow: "visible",
      alignItems: "center",
      display: "flex",
      flexDirection: "row",
      gap: "4px",
      padding: "4px 4px 0",
      position: "relative",
      zIndex: "2"
    });

    for (const item of nav.querySelectorAll(".item")) {
      Object.assign(item.style, {
        height: "30px",
        minHeight: "30px",
        maxHeight: "30px",
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        padding: "0 10px",
        lineHeight: "1",
        boxSizing: "border-box",
        position: "relative",
        zIndex: "3",
        backgroundImage: "url('systems/a-fistful-of-darkness/styles/assets/boton-1.png')",
        backgroundSize: "100% 100%",
        backgroundRepeat: "no-repeat",
        filter: item.classList.contains("active") ? "brightness(1.1)" : "brightness(0.82)",
        color: item.classList.contains("active") ? "#1a0a04" : "#2a1408",
        textShadow: "none",
        border: "none",
        cursor: "pointer",
        fontWeight: item.classList.contains("active") ? "bold" : ""
      });
    }
  }

  _bindCommonEditableEvents() {
    this._commonEventsAbortController?.abort();
    this._commonEventsAbortController = new AbortController();
    const { signal } = this._commonEventsAbortController;
    const el = this.element;

    el.addEventListener("click",       ev => this._handleCommonClick(ev),       { signal });
    el.addEventListener("contextmenu", ev => this._handleCommonContextMenu(ev), { signal });
    el.addEventListener("change",      ev => this._saveFormField(ev),            { signal });
  }

  /**
   * Persiste cualquier campo de formulario con atributo `name` que no tenga
   * ya un handler especializado en una subhoja.
   */
  _saveFormField(ev) {
    const target = ev.target;
    const name   = target.getAttribute("name");
    if (!name) return;

    // Excluir los campos cuyos listeners especializados ya llaman a document.update()
    if (target.matches(
      ".xp-value-input, .ability-purchased, .item-equipped," +
      " input[name='system.selected_load_level']," +
      " .claim-name, .claim-level, .claim-crew, .claim-equipment," +
      " .riders-block input"
    )) return;

    const value = target.type === "checkbox" ? target.checked : target.value;
    console.log(`[AFoD|Sheet] saveFormField → ${name} =`, value);
    this.document.update({ [name]: value });
  }

  _handleCommonClick(ev) {
    const target = ev.target;

    const img = target.closest("img[data-edit]");
    if (img) return this._onEditableImageClick(ev, img);

    const itemName = target.closest(".item-name");
    if (itemName) return this._toggleItemBody(itemName);

    const itemOpen = target.closest(".item-sheet-open");
    if (itemOpen) return this._openEmbeddedItemSheet(itemOpen);

    const itemDelete = target.closest(".item-delete");
    if (itemDelete) return this._deleteEmbeddedItem(ev, itemDelete);

    const itemPost = target.closest(".item-post");
    if (itemPost) return this._postEmbeddedItem(itemPost);
  }

  _handleCommonContextMenu(ev) {
    const toggle = ev.target.closest(".radio-toggle");
    if (!toggle) return;

    ev.preventDefault();
    const inputId = toggle.getAttribute("for");
    if (!inputId) return;

    const input = this.element.querySelector(`#${CSS.escape(inputId)}`);
    if (!input?.checked) return;

    input.checked = false;
    const fieldName = input.getAttribute("name");
    if (fieldName) this.actor.update({ [fieldName]: 0 });
  }

  _onEditableImageClick(ev, img) {
    ev.preventDefault();
    const attr = img.dataset.edit;
    const current = foundry.utils.getProperty(this.document, attr) ?? "";
    const FP = foundry.applications?.apps?.FilePicker ?? FilePicker;
    new FP({
      type: "image",
      current,
      callback: src => this.document.update({ [attr]: src })
    }).browse();
  }

  _toggleItemBody(itemName) {
    const li = itemName.closest(".item");
    if (!li) return;
    $(li).find(".item-body").slideToggle();
  }

  _openEmbeddedItemSheet(itemOpen) {
    const itemId = itemOpen.closest("[data-item-id]")?.dataset.itemId;
    if (!itemId) return;
    this.actor.items.get(itemId)?.sheet?.render(true);
  }

  _deleteEmbeddedItem(ev, itemDelete) {
    const itemId = itemDelete.closest("[data-item-id]")?.dataset.itemId;
    if (!itemId) return;
    return this._handleItemDeleteClick(itemId, ev);
  }

  _handleItemDeleteClick(itemId, _ev) {
    return this.actor.deleteEmbeddedDocuments("Item", [itemId]);
  }

  _postEmbeddedItem(itemPost) {
    const itemId = itemPost.closest("[data-item-id]")?.dataset.itemId;
    if (!itemId) return;
    this.actor.items.get(itemId)?.sendToChat?.();
  }
}
