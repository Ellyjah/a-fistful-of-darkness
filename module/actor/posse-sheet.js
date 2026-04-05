/**
 * posse-sheet.js — Hoja de Cuadrilla para A Fistful of Darkness (V2)
 */
import { AfodSheet } from "./afod-sheet.js";
import { CREW_DEFAULT_ACHIEVEMENTS } from "../data/crew-achievements.js";

function xpCluesToHtml(text) {
  if (!text) return "";
  const lines = text.split("\n");
  const parts = [];
  const bullets = [];
  for (const line of lines) {
    if (line.startsWith("- ")) {
      bullets.push(`<li>${line.slice(2)}</li>`);
    } else {
      if (bullets.length) parts.push(`<ul>${bullets.splice(0).join("")}</ul>`);
      if (line.trim()) parts.push(`<p>${line}</p>`);
    }
  }
  if (bullets.length) parts.push(`<ul>${bullets.join("")}</ul>`);
  return parts.join("");
}

export class PosseSheet extends AfodSheet {

  static DEFAULT_OPTIONS = {
    classes: ["a-fistful-of-darkness", "sheet", "actor", "posse"],
    position: { width: 820, height: 900 },
    window: { resizable: true }
  };

  static PARTS = {
    form: { template: "systems/a-fistful-of-darkness/templates/actor/posse-sheet.html" }
  };

  /** @override */
  async _prepareContext(options) {
    const context = await super._prepareContext(options);

    context.items = this.actor.items;

    const [crewTypesLoc, crewAbilitiesLoc] = await Promise.all([
      AfodSheet._localizeOwnedItems(this.actor.items.filter(i => i.type === "crew_type"),    "crew-types"),
      AfodSheet._localizeOwnedItems(this.actor.items.filter(i => i.type === "crew_ability"), "crew-abilities"),
    ]);
    for (const ct of crewTypesLoc) {
      if (ct.system) ct.system.experience_clues_html = xpCluesToHtml(ct.system.experience_clues ?? "");
    }
    context.crewTypes     = crewTypesLoc;
    context.crewAbilities = crewAbilitiesLoc;

    context.doomValue = parseInt(this.actor.system.doom.value) || 0;
    context.tierValue = parseInt(this.actor.system.tier) || 0;
    context.repValue  = parseInt(this.actor.system.rep)  || 0;

    context.crewUpgrades  = this.actor.items.filter(i => i.type === "crew_upgrade");
    context.cohorts       = this.actor.items.filter(i => i.type === "cohort");
    context.expValue      = parseInt(this.actor.system.experience) || 0;

    // ── Grid fijo de 15 logros ──────────────────────────────────────────
    const typeLabel = {
      dark:    game.i18n.localize("AFOD.AchievementDark"),
      neutral: game.i18n.localize("AFOD.AchievementNeutral"),
      light:   game.i18n.localize("AFOD.AchievementLight"),
    };
    const GRID_DEF = [
      // Fila 1: D N N L L
      { index: 0,  type: "dark",    gridCol: 1, gridRow: 2 },
      { index: 1,  type: "neutral", gridCol: 3, gridRow: 2 },
      { index: 2,  type: "neutral", gridCol: 5, gridRow: 2 },
      { index: 3,  type: "light",   gridCol: 7, gridRow: 2 },
      { index: 4,  type: "light",   gridCol: 9, gridRow: 2 },
      // Fila 2: D D N(EQUILIBRIO) L L
      { index: 5,  type: "dark",    gridCol: 1, gridRow: 4 },
      { index: 6,  type: "dark",    gridCol: 3, gridRow: 4 },
      { index: 7,  type: "neutral", gridCol: 5, gridRow: 4, fixed: true },
      { index: 8,  type: "light",   gridCol: 7, gridRow: 4 },
      { index: 9,  type: "light",   gridCol: 9, gridRow: 4 },
      // Fila 3: D D N N L
      { index: 10, type: "dark",    gridCol: 1, gridRow: 6 },
      { index: 11, type: "dark",    gridCol: 3, gridRow: 6 },
      { index: 12, type: "neutral", gridCol: 5, gridRow: 6 },
      { index: 13, type: "neutral", gridCol: 7, gridRow: 6 },
      { index: 14, type: "light",   gridCol: 9, gridRow: 6 },
    ];
    const CROSS_DEF = [
      // Horizontales fila 1: N+N y L+L
      { gridCol: 4, gridRow: 2, dir: "h" }, { gridCol: 8, gridRow: 2, dir: "h" },
      // Horizontales fila 2: todas
      { gridCol: 2, gridRow: 4, dir: "h" }, { gridCol: 4, gridRow: 4, dir: "h" },
      { gridCol: 6, gridRow: 4, dir: "h" }, { gridCol: 8, gridRow: 4, dir: "h" },
      // Horizontales fila 3: D+D y N+N
      { gridCol: 2, gridRow: 6, dir: "h" }, { gridCol: 6, gridRow: 6, dir: "h" },
      // Verticales fila1→fila2: col1, col3, col4
      { gridCol: 1, gridRow: 3, dir: "v" }, { gridCol: 5, gridRow: 3, dir: "v" }, { gridCol: 7, gridRow: 3, dir: "v" },
      // Verticales fila2→fila3: col2, col3, col5
      { gridCol: 3, gridRow: 5, dir: "v" }, { gridCol: 5, gridRow: 5, dir: "v" }, { gridCol: 9, gridRow: 5, dir: "v" },
    ];
    const rawAch = this.actor.system.achievements ?? [];
    context.achievementCells = GRID_DEF.map(def => {
      const slot = rawAch[def.index] ?? { name: "", claimed: false };
      return {
        index:       def.index,
        achType:     def.type,
        typeLabel:   typeLabel[def.type] ?? "",
        gridCol:     def.gridCol,
        gridRow:     def.gridRow,
        fixed:       def.fixed ?? false,
        name:        def.fixed ? "EQUILIBRIO" : (slot.name || ""),
        displayName: def.fixed ? "EQUILIBRIO" : (slot.name || "—"),
        claimed:     slot.claimed ?? false,
      };
    });
    context.achievementCrosses = CROSS_DEF;

    context.totalHellstoneProduction = this._calculateClaimsProduction();

    return context;
  }

  /** @override */
  _onRender(context, options) {
    super._onRender(context, options);
    if (!this.isEditable) return;

    const html = $(this.element);

    html.find(".tier-dot").click(ev => {
      const clicked = parseInt(ev.currentTarget.dataset.value);
      const current = parseInt(this.actor.system.tier) || 0;
      const newVal  = current === clicked ? Math.max(0, clicked - 1) : clicked;
      this.actor.update({ "system.tier": String(newVal) });
    });

    html.find(".rep-segment").click(ev => {
      const clicked = parseInt(ev.currentTarget.dataset.value);
      const current = parseInt(this.actor.system.rep) || 0;
      const newVal  = current === clicked ? Math.max(0, clicked - 1) : clicked;
      this.actor.update({ "system.rep": String(newVal) });
    });

    html.find(".hold-btn").click(ev => {
      ev.preventDefault();
      this.actor.update({ "system.hold": ev.currentTarget.dataset.hold });
    });

    html.find(".doom-segment").click(ev => {
      const clicked = parseInt(ev.currentTarget.dataset.value);
      const current = parseInt(this.actor.system.doom.value) || 0;
      const newVal  = current === clicked ? Math.max(0, clicked - 1) : clicked;
      this.actor.update({ "system.doom.value": String(newVal) });
    });

    html.find(".xp-segment").click(ev => {
      const clicked = parseInt(ev.currentTarget.dataset.value);
      const current = parseInt(this.actor.system.experience) || 0;
      const newVal  = current === clicked ? Math.max(0, clicked - 1) : clicked;
      this.actor.update({ "system.experience": String(newVal) });
    });

    html.find(".ability-purchased").change(ev => {
      const itemId = ev.currentTarget.closest("[data-item-id]")?.dataset.itemId;
      const item   = this.actor.items.get(itemId);
      item?.update({ "system.purchased": ev.currentTarget.checked });
    });

    // ── Logros: click = toggle claimed, dblclick = editar nombre ─────────
    html.find(".ach-map-cell").click(ev => {
      if (ev.target.matches("input.ach-edit-input")) return;
      const idx  = parseInt(ev.currentTarget.dataset.achIndex);
      const achs = foundry.utils.deepClone(this.actor.system.achievements ?? []);
      while (achs.length <= idx) achs.push({ name: "", claimed: false });
      achs[idx].claimed = !achs[idx].claimed;
      this.actor.update({ "system.achievements": achs });
    });

    html.find(".ach-map-cell:not(.fixed)").on("dblclick", ev => {
      ev.stopPropagation();
      const cell = ev.currentTarget;
      if (cell.querySelector("input.ach-edit-input")) return;
      const nameEl = cell.querySelector(".ach-map-name");
      const idx    = parseInt(cell.dataset.achIndex);
      const cur    = (this.actor.system.achievements?.[idx]?.name) ?? "";

      const input = document.createElement("input");
      input.type      = "text";
      input.value     = cur;
      input.className = "ach-edit-input";
      nameEl.replaceWith(input);
      input.focus();
      input.select();

      const save = () => {
        const newName = input.value.trim();
        const achs = foundry.utils.deepClone(this.actor.system.achievements ?? []);
        while (achs.length <= idx) achs.push({ name: "", claimed: false });
        achs[idx].name = newName;
        this.actor.update({ "system.achievements": achs });
      };
      input.addEventListener("blur", save, { once: true });
      input.addEventListener("keydown", e => {
        if (e.key === "Enter")  { e.preventDefault(); input.blur(); }
        if (e.key === "Escape") { e.preventDefault(); input.removeEventListener("blur", save); this.render(); }
      });
    });

    html.find(".claim-add").click(ev => {
      ev.preventDefault();
      this._addClaim();
    });

    html.find(".claim-delete").click(ev => {
      ev.preventDefault();
      const idx = parseInt(ev.currentTarget.closest("[data-claim-index]").dataset.claimIndex);
      this._deleteClaim(idx);
    });

    html.find(".claim-name, .claim-level, .claim-crew").on("change", ev => {
      const row   = ev.currentTarget.closest("[data-claim-index]");
      const idx   = parseInt(row.dataset.claimIndex);
      const field = ev.currentTarget.classList.contains("claim-level") ? "level"
                  : ev.currentTarget.classList.contains("claim-crew")  ? "crew" : "name";
      const value = field === "level"
        ? Math.max(0, parseInt(ev.currentTarget.value) || 0)
        : ev.currentTarget.value;
      this._updateClaim(idx, field, value);
    });

    html.find(".claim-equipment").change(ev => {
      const idx = parseInt(ev.currentTarget.closest("[data-claim-index]").dataset.claimIndex);
      this._updateClaim(idx, "equipment", ev.currentTarget.checked);
    });

    html.find(".riders-block input[type='checkbox']").change(ev => {
      const name = ev.currentTarget.name; // "system.riders.white" etc.
      this.actor.update({ [name]: ev.currentTarget.checked });
    });
  }

  /* -------------------------------------------- */
  /*  Gestión de Hellstone Claims                  */
  /* -------------------------------------------- */

  _addClaim() {
    const claims = foundry.utils.deepClone(this.actor.system.hellstone_claims ?? []);
    claims.push({ name: "Nueva Concesión", level: 1, crew: "", equipment: false });
    this.actor.update({ "system.hellstone_claims": claims });
  }

  _deleteClaim(index) {
    const claims = foundry.utils.deepClone(this.actor.system.hellstone_claims ?? []);
    claims.splice(index, 1);
    this.actor.update({ "system.hellstone_claims": claims });
  }

  _updateClaim(index, field, value) {
    const claims = foundry.utils.deepClone(this.actor.system.hellstone_claims ?? []);
    if (!claims[index]) return;
    claims[index][field] = value;
    this.actor.update({ "system.hellstone_claims": claims });
  }

  _calculateClaimsProduction() {
    const claims = this.actor.system.hellstone_claims || [];
    return claims.reduce((total, claim) => total + (parseInt(claim.level) || 0), 0);
  }

  async _handleItemDeleteClick(itemId, _ev) {
    const item = this.actor.items.get(itemId);
    if (!item) return;

    if (item.type === "crew_type") {
      await this._removeCrewTypeLinkedItems(item.name);
    }

    return this.actor.deleteEmbeddedDocuments("Item", [itemId]);
  }

  /* -------------------------------------------- */
  /*  Drop handlers                                */
  /* -------------------------------------------- */

  /** @override */
  async _onDropItem(event, item) {
    if (!item) return super._onDropItem(event, item);

    if (item.type === "crew_type") {
      const existing = this.actor.items.filter(i => i.type === "crew_type");
      if (existing.length) {
        for (const ex of existing) {
          await this._removeCrewTypeLinkedItems(ex.name);
        }
        await this.actor.deleteEmbeddedDocuments("Item", existing.map(i => i.id));
      }
    }

    const result = await super._onDropItem(event, item);

    if (item.type === "crew_type") {
      await this._offerCrewAbilitiesDialog(item.name);
      await this._applyDefaultAchievements(item);
    }

    return result;
  }

  async _applyDefaultAchievements(item) {
    // Preferir los logros del propio item; si no tiene, usar los estáticos
    const itemAchs   = item.system?.achievements ?? [];
    const hasItemData = itemAchs.some(a => a.name);
    let defaults;
    if (hasItemData) {
      defaults = itemAchs.map((a, i) => ({ name: i === 7 ? "EQUILIBRIO" : (a.name ?? ""), claimed: false }));
    } else {
      defaults = CREW_DEFAULT_ACHIEVEMENTS[item.name] ?? null;
    }
    if (!defaults) return;

    const existing = this.actor.system.achievements ?? [];
    const hasData  = existing.some(a => a.name);
    if (hasData) {
      const confirmed = await Dialog.confirm({
        title: "Reiniciar logros",
        content: `<p>Esta cuadrilla ya tiene logros definidos. ¿Reemplazarlos con los de <strong>${item.name}</strong>?</p>`,
      });
      if (!confirmed) return;
    }

    await this.actor.update({ "system.achievements": foundry.utils.deepClone(defaults) });
  }

  async _offerCrewAbilitiesDialog(crewTypeName) {
    const pack = game.packs.get("a-fistful-of-darkness.crew-abilities");
    if (!pack) return;

    await pack.getIndex();
    const allDocs   = await pack.getDocuments();
    const abilities = allDocs.filter(a => a.system?.class === crewTypeName);
    if (!abilities.length) return;

    const defaults     = abilities.filter(a => a.system.class_default);
    const optional     = abilities.filter(a => !a.system.class_default);
    const allAbilities = [...defaults, ...optional];

    const { getLocalizedPackDocumentData } = await import("../compendium-localization.js");
    const allDisplay = await Promise.all(allAbilities.map(a => getLocalizedPackDocumentData(a)));

    const checkboxesHtml = (displayList, checked, offset) => displayList.map((a, i) => `
      <div class="ability-option">
        <label>
          <input type="checkbox" name="ability" value="${offset + i}" ${checked ? "checked" : ""}/>
          <strong>${a.name}</strong>
          <span class="ability-desc">${a.system.description ?? ""}</span>
        </label>
      </div>`).join("");

    const content = `
      <style>
        .ability-option { margin: 4px 0; }
        .ability-desc   { display: block; font-size: 0.85em; color: #666; margin-left: 22px; }
        .ability-group  { margin-top: 10px; font-weight: bold; border-bottom: 1px solid #aaa; }
      </style>
      ${defaults.length ? `<div class="ability-group">Habilidades iniciales</div>${checkboxesHtml(allDisplay.slice(0, defaults.length), true, 0)}`  : ""}
      ${optional.length ? `<div class="ability-group">Habilidades adicionales</div>${checkboxesHtml(allDisplay.slice(defaults.length), false, defaults.length)}` : ""}`;

    const selected = await new Promise(resolve => {
      let resolved = false;
      new Dialog({
        title: `Habilidades de Cuadrilla — ${crewTypeName}`,
        content,
        buttons: {
          add: {
            icon: "<i class='fas fa-check'></i>",
            label: "Añadir seleccionadas",
            callback: html => {
              resolved = true;
              resolve([...html.find("input[name='ability']:checked")].map(el => parseInt(el.value)));
            }
          },
          skip: {
            label: "Omitir",
            callback: () => {
              resolved = true;
              resolve([]);
            }
          }
        },
        default: "add",
        close:   () => { if (!resolved) resolve([]); }
      }).render(true);
    });

    if (!selected.length) return;

    const toCreate = selected.map(idx => {
      const data = foundry.utils.deepClone(allDisplay[idx]);
      if (!data) return null;
      delete data._id;
      data.system = data.system ?? {};
      data.system.purchased = true;
      return data;
    }).filter(Boolean);

    if (toCreate.length) await this.actor.createEmbeddedDocuments("Item", toCreate);
  }

  async _removeCrewTypeLinkedItems(crewTypeName) {
    if (!crewTypeName) return;

    const linkedIds = this.actor.items
      .filter(item =>
        ["crew_ability", "crew_upgrade"].includes(item.type)
        && (item.system?.class ?? "") === crewTypeName
      )
      .map(item => item.id);

    if (linkedIds.length) {
      await this.actor.deleteEmbeddedDocuments("Item", linkedIds);
    }

    const achievements = this.actor.system.achievements ?? [];
    if (achievements.length) {
      await this.actor.update({ "system.achievements": [] });
    }
  }
}
