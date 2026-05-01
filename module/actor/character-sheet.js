/**
 * character-sheet.js — Hoja de Personaje Jugador para A Fistful of Darkness (V2)
 */
import { AfodSheet } from "./afod-sheet.js";

export class CharacterSheet extends AfodSheet {

  static DEFAULT_OPTIONS = {
    classes: ["a-fistful-of-darkness", "sheet", "actor", "character"],
    position: { width: 820, height: 920 },
    window: { resizable: true }
  };

  static PARTS = {
    form: { template: "systems/a-fistful-of-darkness/templates/actor/character-sheet.html" }
  };

  /** @override */
  async _prepareContext(options) {
    const context = await super._prepareContext(options);
    const groupedItems = {
      class: [],
      heritage: [],
      background: [],
      vice: [],
      ability: [],
      item: [],
      artifact: [],
      cohort: []
    };
    let loadout = 0;

    for (const item of this.actor.items) {
      if (groupedItems[item.type]) groupedItems[item.type].push(item);
      if ((item.type === "item" || item.type === "artifact") && item.system?.equipped) {
        loadout += parseInt(item.system.load) || 0;
      }
    }

    const [clasesLoc, heritagesLoc, abilitiesLoc, vicesLoc, equipLoc] = await Promise.all([
      AfodSheet._localizeOwnedItems(groupedItems.class,    "playbooks"),
      AfodSheet._localizeOwnedItems(groupedItems.heritage, "heritages"),
      AfodSheet._localizeOwnedItems(groupedItems.ability,  "abilities"),
      AfodSheet._localizeOwnedItems(groupedItems.vice,     "vices"),
      AfodSheet._localizeOwnedItems(groupedItems.item,     "items"),
    ]);

    context.clases         = clasesLoc;
    context.heritages      = heritagesLoc;
    context.abilities      = abilitiesLoc;
    context.vices          = vicesLoc;
    context.equipmentItems = equipLoc;
    context.backgrounds    = groupedItems.background;
    context.artifacts      = groupedItems.artifact;
    context.cohorts        = groupedItems.cohort;
    context.expValue       = parseInt(this.actor.system.experience) || 0;
    context.playbookDescription = clasesLoc[0]?.system?.description ?? "";
    context.heritageDescription = heritagesLoc[0]?.system?.description ?? "";

    context.posseActor = null;
    const posseList = this.actor.system.posse ?? [];
    if (posseList.length > 0) {
      const posseId = posseList[0]?.id;
      if (posseId) context.posseActor = game.actors.get(posseId) ?? null;
    }

    context.gritValue     = parseInt(this.actor.system.grit.value) || 0;
    context.mutationValue = parseInt(this.actor.system.mutation_clock.value) || 0;

    context.isRevenant = !!this.actor.getFlag("a-fistful-of-darkness", "isRevenant");
    context.vinculo    = this.actor.getFlag("a-fistful-of-darkness", "vinculo") ?? "";

    const toTitleCase = key =>
      key.split("_").map(w => w.charAt(0).toUpperCase() + w.slice(1)).join("");

    context.stigmaList = Object.entries(this.actor.system.stigma?.list ?? {}).map(([key, value]) => ({
      key,
      value,
      label: `AFOD.Stigma${toTitleCase(key)}`
    }));
    context.stigmaCount = context.stigmaList.filter(s => s.value).length;

    const totalSlots = (this.actor.system.coin_max?.hand ?? 4) +
                       (this.actor.system.hellstone_max?.hand ?? 2);
    const rawSlots   = this.actor.system.currency_slots ?? [];
    context.currencySlots = Array.from({ length: totalSlots }, (_, i) => rawSlots[i] ?? "");

    const indulgeVal = parseInt(this.actor.system.indulgence) || 0;
    const indulgeMax = parseInt(this.actor.system.indulgence_max) || 40;
    context.indulgencePercent = Math.round((indulgeVal / indulgeMax) * 100);

    context.attributeDice = {};
    for (const [attrKey, attr] of Object.entries(this.actor.system.attributes)) {
      context.attributeDice[attrKey] = Object.values(attr.skills)
        .filter(s => (parseInt(s.value) || 0) > 0).length;
    }

    context.system.loadout = loadout;

    const normalizeArmor = v =>
      v === true ? "equipped" : (v === false || !v ? "none" : v);
    context.armorState        = normalizeArmor(this.actor.system.armor_uses?.armor);
    context.armorSpecialState = normalizeArmor(this.actor.system.armor_uses?.special);

    const loadMaxMap  = { "AFOD.LoadLight": 3, "AFOD.LoadNormal": 5, "AFOD.LoadHeavy": 6 };
    context.system.base_max_load = loadMaxMap[this.actor.system.selected_load_level] ?? 3;

    return context;
  }

  /** @override */
  _onRender(context, options) {
    super._onRender(context, options);
    if (!this.isEditable) return;
    this._bindCharacterEvents();
  }

  _bindCharacterEvents() {
    this._characterEventsAbortController?.abort();
    this._characterEventsAbortController = new AbortController();
    const { signal } = this._characterEventsAbortController;
    const el = this.element;

    el.addEventListener("click", ev => this._handleCharacterClick(ev), { signal });
    el.addEventListener("change", ev => this._handleCharacterChange(ev), { signal });
  }

  async _handleItemDeleteClick(itemId, _ev) {
    const item = this.actor.items.get(itemId);
    if (!item) return;
    if (item.type === "class") {
      await this._removeClassLinkedItems(item.name);
      await this._revertClassBaseSkills(item);
    }
    return this.actor.deleteEmbeddedDocuments("Item", [itemId]);
  }

  async _handleCharacterClick(ev) {
    const target = ev.target;

    if (target.closest(".posse-name, .posse-portrait")) {
      ev.preventDefault();
      const posseId = (this.actor.system.posse ?? [])[0]?.id;
      if (posseId) game.actors.get(posseId)?.sheet?.render(true);
      return;
    }

    if (target.closest(".posse-unlink")) {
      ev.preventDefault();
      return this.actor.update({ "system.posse": [] });
    }

    const gritSegment = target.closest(".grit-segment");
    if (gritSegment) {
      const clicked  = parseInt(gritSegment.dataset.value);
      const current  = parseInt(this.actor.system.grit.value) || 0;
      const newValue = current === clicked ? Math.max(0, clicked - 1) : clicked;
      return this.actor.update({ "system.grit.value": String(newValue) });
    }

    const mutationSegment = target.closest(".mutation-segment");
    if (mutationSegment) {
      const clicked  = parseInt(mutationSegment.dataset.value);
      const current  = parseInt(this.actor.system.mutation_clock.value) || 0;
      const newValue = current === clicked ? Math.max(0, clicked - 1) : clicked;
      return this.actor.update({ "system.mutation_clock.value": String(newValue) });
    }

    const skillDot = target.closest(".skill-dot");
    if (skillDot) {
      ev.stopPropagation();
      const dot      = parseInt(skillDot.dataset.dot);
      const row      = skillDot.closest(".skill-row");
      const skillKey = row?.dataset.skill;
      const attrKey  = row?.dataset.attribute;
      if (!skillKey || !attrKey) return;
      const current  = parseInt(this.actor.system.attributes[attrKey]?.skills[skillKey]?.value) || 0;
      const newValue = current === dot ? Math.max(0, dot - 1) : dot;
      return this.actor.update({
        [`system.attributes.${attrKey}.skills.${skillKey}.value`]: newValue
      });
    }

    const currencySlot = target.closest(".currency-slot");
    if (currencySlot) {
      const idx   = parseInt(currencySlot.dataset.slotIndex);
      const total = (this.actor.system.coin_max?.hand ?? 4) +
                    (this.actor.system.hellstone_max?.hand ?? 2);
      const slots = Array.from(
        { length: total },
        (_, i) => (this.actor.system.currency_slots ?? [])[i] ?? ""
      );
      const cycle = { "": "coin", coin: "hellstone", hellstone: "" };
      slots[idx] = cycle[slots[idx]] ?? "";
      return this.actor.update({
        "system.currency_slots": slots,
        "system.coin": String(slots.filter(s => s === "coin").length),
        "system.hellstone": String(slots.filter(s => s === "hellstone").length)
      });
    }

    const xpSegment = target.closest(".xp-segment");
    if (xpSegment) {
      const clicked  = parseInt(xpSegment.dataset.value);
      const current  = parseInt(this.actor.system.experience) || 0;
      const newValue = current === clicked ? Math.max(0, clicked - 1) : clicked;
      await this.actor.update({ "system.experience": String(newValue) });
      const max = parseInt(this.actor.system.experience_max) || 8;
      if (newValue >= max) return this._showXpSpendingDialog();
      return;
    }

    const indulgenceInc = target.closest(".indulgence-inc");
    if (indulgenceInc) {
      const cur = parseInt(this.actor.system.indulgence) || 0;
      const max = parseInt(this.actor.system.indulgence_max) || 40;
      if (cur < max) return this.actor.update({ "system.indulgence": String(cur + 1) });
      return;
    }

    const indulgenceDec = target.closest(".indulgence-dec");
    if (indulgenceDec) {
      const cur = parseInt(this.actor.system.indulgence) || 0;
      if (cur > 0) return this.actor.update({ "system.indulgence": String(cur - 1) });
      return;
    }

    const armorCheck = target.closest(".armor-check");
    if (armorCheck) {
      ev.preventDefault();
      const field = armorCheck.dataset.armorField;
      if (!field) return;
      const raw     = foundry.utils.getProperty(this.actor, field);
      const current = raw === true ? "equipped" : (raw === false || !raw ? "none" : raw);
      const cycle   = { none: "equipped", equipped: "used", used: "none" };
      const newVal  = cycle[current] ?? "equipped";
      await this.actor.update({ [field]: newVal });
      const isSpecial  = field.includes("special");
      const armorLabel = isSpecial
        ? game.i18n.localize("AFOD.ArmorSpecial")
        : game.i18n.localize("AFOD.Armor");
      const msgKey = { equipped: "AFOD.ArmorEquipped", used: "AFOD.ArmorWorn", none: "AFOD.ArmorUnequipped" };
      const action = game.i18n.format(msgKey[newVal], { armor: armorLabel, name: this.actor.name });
      return ChatMessage.create({
        content: `<p><strong>${action}</strong></p>`,
        speaker: ChatMessage.getSpeaker({ actor: this.actor }),
      });
    }

    const skillRoll = target.closest(".skill-roll");
    if (skillRoll) {
      ev.preventDefault();
      const skillKey = skillRoll.dataset.skill;
      const attrKey  = skillRoll.dataset.attribute;
      const skillVal = parseInt(this.actor.system.attributes[attrKey]?.skills[skillKey]?.value) || 0;
      const { actionRollDialog } = await import("../afod-roll.js");
      return actionRollDialog(skillVal, skillKey, this.actor);
    }

    const attrRoll = target.closest(".attr-roll");
    if (attrRoll) {
      ev.preventDefault();
      const attrKey = attrRoll.dataset.attribute;
      const diceAmt = Object.values(this.actor.system.attributes[attrKey]?.skills ?? {})
        .filter(s => (parseInt(s.value) || 0) > 0).length;
      const { resistanceRollDialog } = await import("../afod-roll.js");
      return resistanceRollDialog(diceAmt, attrKey, this.actor);
    }
  }

  async _handleCharacterChange(ev) {
    const target = ev.target;

    if (target.matches(".xp-value-input")) {
      const max      = parseInt(this.actor.system.experience_max) || 8;
      const newValue = Math.max(0, Math.min(max, parseInt(target.value) || 0));
      target.value = newValue;
      await this.actor.update({ "system.experience": String(newValue) });
      if (newValue >= max) return this._showXpSpendingDialog();
      return;
    }

    if (target.matches(".ability-purchased")) {
      const itemId = target.closest("[data-item-id]")?.dataset.itemId;
      const item = this.actor.items.get(itemId);
      if (item) return item.update({ "system.purchased": target.checked });
      return;
    }

    if (target.matches(".item-equipped")) {
      return this._handleEquippedChange(target);
    }

    if (target.matches("input[name='system.selected_load_level']")) {
      const level = target.value;
      const loadMaxMap = { "AFOD.LoadLight": 3, "AFOD.LoadNormal": 5, "AFOD.LoadHeavy": 6 };
      return this.actor.update({
        "system.selected_load_level": level,
        "system.base_max_load": loadMaxMap[level] ?? 3
      });
    }

    if (target.matches(".vinculo-input")) {
      return this.actor.setFlag("a-fistful-of-darkness", "vinculo", target.value);
    }
  }

  async _handleEquippedChange(checkbox) {
    const itemId = checkbox.closest("[data-item-id]")?.dataset.itemId;
    const item = this.actor.items.get(itemId);
    if (!item) return;

    if (checkbox.checked) {
      const itemLoad = parseInt(item.system.load) || 0;
      let currentLoad = 0;
      for (const actorItem of this.actor.items) {
        if (actorItem.id === itemId || !actorItem.system?.equipped) continue;
        if (actorItem.type !== "item" && actorItem.type !== "artifact") continue;
        currentLoad += parseInt(actorItem.system.load) || 0;
      }

      const loadMaxMap = { "AFOD.LoadLight": 3, "AFOD.LoadNormal": 5, "AFOD.LoadHeavy": 6 };
      const maxLoad = loadMaxMap[this.actor.system.selected_load_level] ?? 3;

      if (currentLoad + itemLoad > maxLoad) {
        checkbox.checked = false;
        const msg = game.i18n.format("AFOD.OverloadWarning", {
          name: item.name, current: currentLoad + itemLoad, max: maxLoad
        });
        ui.notifications.warn(msg);
        await ChatMessage.create({
          content: `<p><strong>${this.actor.name}</strong> — ${msg}</p>`,
          speaker: ChatMessage.getSpeaker({ actor: this.actor }),
          whisper: []
        });
        return;
      }
    }

    return item.update({ "system.equipped": checkbox.checked });
  }

  /* -------------------------------------------- */
  /*  XP spending dialog                           */
  /* -------------------------------------------- */

  async _showXpSpendingDialog() {
    // Find actor's playbook
    const playbookItem = this.actor.items.find(i => i.type === "class");
    const className    = playbookItem?.name ?? null;

    // Fetch compendium abilities for this playbook, excluding already-purchased ones
    let availableAbilities = [];
    if (className) {
      const pack = game.packs.get("a-fistful-of-darkness.abilities");
      if (pack) {
        const allDocs = await pack.getDocuments();
        const purchasedNames = new Set(
          this.actor.items
            .filter(i => i.type === "ability" && i.system.purchased)
            .map(i => i.name)
        );
        const classAbilities = allDocs.filter(
          a => a.system?.class === className && !purchasedNames.has(a.name)
        );
        const { getLocalizedPackDocumentData } = await import("../compendium-localization.js");
        availableAbilities = await Promise.all(classAbilities.map(a => getLocalizedPackDocumentData(a)));
      }
    }

    // Max dots per skill: 3 without Mastery, 4 with it
    const hasMastery = this.actor.items.some(
      i => i.type === "ability" && /mastery/i.test(i.name)
    );
    const maxDots = hasMastery ? 4 : 3;

    // Build list of skills that can still be improved
    const improvableSkills = [];
    for (const [attrKey, attr] of Object.entries(this.actor.system.attributes ?? {})) {
      for (const [skillKey, skill] of Object.entries(attr.skills ?? {})) {
        const current = parseInt(skill.value) || 0;
        if (current < maxDots) {
          const label = game.i18n.localize(
            `AFOD.Skills${skillKey.charAt(0).toUpperCase()}${skillKey.slice(1)}`
          );
          improvableSkills.push({ attrKey, skillKey, current, label });
        }
      }
    }

    const abilitiesHtml = availableAbilities.map((a, i) => {
      const desc  = (a.system?.description ?? "").replace(/<[^>]*>/g, "");
      const short = desc.length > 130 ? desc.slice(0, 130) + "…" : desc;
      return `
      <label class="xp-choice-option">
        <input type="checkbox" class="xp-choice-cb" value="ability:${i}" />
        <span>
          <strong>${a.name}</strong>
          ${short ? `<span class="xp-desc">${short}</span>` : ""}
        </span>
      </label>`;
    }).join("") || `<p class="xp-no-options">No hay habilidades disponibles para este libreto.</p>`;

    const skillsHtml = improvableSkills.map(s => `
      <label class="xp-choice-option">
        <input type="checkbox" class="xp-choice-cb" value="skill:${s.attrKey}:${s.skillKey}" />
        <span>
          <strong>${s.label}</strong>
          <span class="xp-desc">${s.current} → ${s.current + 1} punto${s.current + 1 !== 1 ? "s" : ""}</span>
        </span>
      </label>`).join("") || `<p class="xp-no-options">Todas las acciones están al máximo permitido.</p>`;

    const content = `
      <style>
        .xp-choice-option { display:flex; align-items:flex-start; gap:8px; margin:5px 0; cursor:pointer; transition:opacity 0.15s; }
        .xp-choice-option input[type="checkbox"] { margin-top:3px; flex-shrink:0; }
        .xp-choice-option span { display:flex; flex-direction:column; }
        .xp-choice-option.xp-locked { opacity:0.3; pointer-events:none; }
        .xp-desc { font-size:0.82em; opacity:0.7; margin-top:2px; }
        .xp-section-title { font-weight:bold; border-bottom:1px solid currentColor; opacity:0.6; margin:12px 0 6px; padding-bottom:3px; font-size:0.9em; letter-spacing:0.03em; }
        .xp-no-options { font-style:italic; opacity:0.6; margin:4px 0 4px 4px; font-size:0.9em; }
      </style>
      <div style="padding:4px 0; max-height:440px; overflow-y:auto;">
        <p style="margin-bottom:12px">Elige <strong>una mejora</strong> con tu XP acumulado:</p>
        ${availableAbilities.length ? `<div class="xp-section-title">Habilidades especiales del libreto</div>${abilitiesHtml}` : ""}
        <div class="xp-section-title">Mejorar acción (+1 punto)</div>${skillsHtml}
      </div>`;

    const choice = await new Promise(resolve => {
      let resolved = false;
      new Dialog({
        title: `Gastar XP — ${this.actor.name}`,
        content,
        buttons: {
          spend: {
            icon:  "<i class='fas fa-check'></i>",
            label: "Confirmar",
            callback: html => {
              resolved = true;
              const checked = html.find("input.xp-choice-cb:checked");
              resolve(checked.length ? checked.val() : null);
            }
          },
          cancel: {
            icon:  "<i class='fas fa-times'></i>",
            label: "Cancelar",
            callback: () => { resolved = true; resolve(null); }
          }
        },
        default: "spend",
        close: () => { if (!resolved) resolve(null); },
        render: html => {
          html.find("input.xp-choice-cb").on("change", function () {
            const all = html.find("input.xp-choice-cb");
            if (this.checked) {
              all.not(this).closest(".xp-choice-option").addClass("xp-locked");
            } else {
              all.closest(".xp-choice-option").removeClass("xp-locked");
            }
          });
        }
      }).render(true);
    });

    if (!choice) return;

    if (choice.startsWith("ability:")) {
      const idx         = parseInt(choice.slice("ability:".length));
      const abilityData = availableAbilities[idx];
      if (!abilityData) return;
      const toCreate = foundry.utils.deepClone(abilityData);
      delete toCreate._id;
      toCreate.system             = toCreate.system ?? {};
      toCreate.system.purchased   = true;
      await this.actor.createEmbeddedDocuments("Item", [toCreate]);
    } else if (choice.startsWith("skill:")) {
      const [, attrKey, skillKey] = choice.split(":");
      const current = parseInt(this.actor.system.attributes[attrKey]?.skills[skillKey]?.value) || 0;
      await this.actor.update({
        [`system.attributes.${attrKey}.skills.${skillKey}.value`]: current + 1
      });
    }

    // Reset XP counter after spending
    await this.actor.update({ "system.experience": "0" });
  }

  /* -------------------------------------------- */
  /*  Drop handlers                                */
  /* -------------------------------------------- */

  /** @override */
  async _onDropItem(event, item) {
    if (!item) return super._onDropItem(event, item);

    const traitTypes = ["class", "heritage", "background", "vice"];
    if (!traitTypes.includes(item.type)) return super._onDropItem(event, item);

    if (item.type === "class") {
      const isAparecido    = item.name.toLowerCase().includes("aparecido");
      const alreadyRevenant = !!this.actor.getFlag("a-fistful-of-darkness", "isRevenant");

      if (isAparecido) {
        if (alreadyRevenant) { ui.notifications.warn("Este personaje ya es un Aparecido."); return; }

        const confirm = await foundry.applications?.api?.DialogV2?.confirm?.({
          title:   "Convertirse en Aparecido",
          content: `<p><strong>${this.actor.name}</strong> se convertirá en un Aparecido.</p>
            <ul style="margin:8px 0 8px 16px">
              <li>Su <strong>Aguante</strong> pasa a llamarse <strong>Pasión</strong>.</li>
              <li>Ya no tiene <strong>Vicio</strong> ni proveedor.</li>
              <li>Gana un <strong>Vínculo con el Mundo de los Vivos</strong>.</li>
            </ul><p>¿Continuar?</p>`
        }) ?? await Dialog.confirm({
          title:   "Convertirse en Aparecido",
          content: `<p><strong>${this.actor.name}</strong> se convertirá en un Aparecido.</p>
            <ul style="margin:8px 0 8px 16px">
              <li>Su <strong>Aguante</strong> pasa a llamarse <strong>Pasión</strong>.</li>
              <li>Ya no tiene <strong>Vicio</strong> ni proveedor.</li>
              <li>Gana un <strong>Vínculo con el Mundo de los Vivos</strong>.</li>
            </ul><p>¿Continuar?</p>`
        });
        if (!confirm) return;

        const result = await super._onDropItem(event, item);
        await this.actor.setFlag("a-fistful-of-darkness", "isRevenant", true);
        await this._applyClassBaseSkills(item);
        await this._addClassItems(item.name);
        await this._offerAbilitiesDialog(item.name);
        return result;
      }

      if (alreadyRevenant) { ui.notifications.warn("Un Aparecido no puede cambiar su libreto mortal."); return; }

      const existing = this.actor.items.filter(i => i.type === "class");
      if (existing.length) {
        for (const ex of existing) {
          await this._removeClassLinkedItems(ex.name);
          await this._revertClassBaseSkills(ex);
        }
        await this.actor.deleteEmbeddedDocuments("Item", existing.map(i => i.id));
      }

      const result = await super._onDropItem(event, item);
      await this._applyClassBaseSkills(item);
      await this._addClassItems(item.name);
      await this._offerAbilitiesDialog(item.name);
      return result;
    }

    const existing = this.actor.items.filter(i => i.type === item.type);
    if (existing.length) await this.actor.deleteEmbeddedDocuments("Item", existing.map(i => i.id));
    return super._onDropItem(event, item);
  }

  /** @override */
  async _onDropActor(event, actor) {
    if (!actor) return;

    if (actor.type === "posse") {
      await this.actor.update({ "system.posse": [{ id: actor.id, name: actor.name }] });
      return;
    }

    if (actor.type === "npc") {
      const { AfodHelpers } = await import("../afod-helpers.js");
      await AfodHelpers.addAcquaintance(this.actor, actor);
    }
  }

  /* -------------------------------------------- */
  /*  Helpers de clase                             */
  /* -------------------------------------------- */

  async _offerAbilitiesDialog(className) {
    const pack = game.packs.get("a-fistful-of-darkness.abilities");
    if (!pack) return;

    await pack.getIndex();
    const allDocs   = await pack.getDocuments();
    const abilities = allDocs.filter(a => a.system?.class === className);
    if (!abilities.length) return;

    const defaults      = abilities.filter(a => a.system.class_default);
    const optional      = abilities.filter(a => !a.system.class_default);
    const allAbilities  = [...defaults, ...optional];

    const { getLocalizedPackDocumentData } = await import("../compendium-localization.js");
    const allDisplay = await Promise.all(allAbilities.map(a => getLocalizedPackDocumentData(a)));

    const checkboxesHtml = (displayList, checked, offset) => displayList.map((a, i) => {
      const desc = (a.system.description ?? "").replace(/<[^>]*>/g, "");
      return `
      <div class="ability-option">
        <label>
          <input type="checkbox" name="ability" value="${offset + i}" ${checked ? "checked" : ""}/>
          <strong>${a.name}</strong>
          <span class="ability-desc">${desc}</span>
        </label>
      </div>`;
    }).join("");

    const content = `
      <style>
        .ability-option { margin: 4px 0; }
        .ability-desc   { display: block; font-size: 0.85em; color: #666; margin-left: 22px; }
        .ability-group  { margin-top: 10px; font-weight: bold; border-bottom: 1px solid #aaa; }
      </style>
      ${defaults.length ? `<div class="ability-group">Habilidades iniciales</div>${checkboxesHtml(allDisplay.slice(0, defaults.length), true, 0)}` : ""}
      ${optional.length ? `<div class="ability-group">Habilidades adicionales</div>${checkboxesHtml(allDisplay.slice(defaults.length), false, defaults.length)}` : ""}`;

    const selected = await new Promise(resolve => {
      let resolved = false;
      new Dialog({
        title: `Habilidades — ${className}`,
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
          skip: { label: "Omitir", callback: () => { resolved = true; resolve([]); } }
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

  async _addClassItems(className) {
    const { getLocalizedPackDocumentData } = await import("../compendium-localization.js");
    const toCreate = [];
    const pack = game.packs.get("a-fistful-of-darkness.items");
    if (pack) {
      const docs = await pack.getDocuments();
      for (const doc of docs) {
        if (doc.system?.class === className) {
          const data = await getLocalizedPackDocumentData(doc);
          delete data._id;
          toCreate.push(data);
        }
      }
    }
    if (!toCreate.length) {
      for (const item of game.items) {
        if (item.type === "item" && item.system?.class === className) {
          const data = item.toObject(); delete data._id; toCreate.push(data);
        }
      }
    }
    if (toCreate.length) await this.actor.createEmbeddedDocuments("Item", toCreate);
  }

  async _removeClassLinkedItems(className) {
    if (!className) return;

    const linkedIds = this.actor.items
      .filter(item =>
        ["ability", "item", "artifact"].includes(item.type)
        && (item.system?.class ?? "") === className
      )
      .map(item => item.id);

    if (linkedIds.length) {
      await this.actor.deleteEmbeddedDocuments("Item", linkedIds);
    }
  }

  async _applyClassBaseSkills(classItem) {
    const skillAttrMap = {
      hunt: "wits",  read: "wits",    survey: "wits",   craft: "wits",
      sling: "prowess", prowl: "prowess", brawl: "prowess", disable: "prowess",
      attune: "guts",  command: "guts",  consort: "guts",  sway: "guts"
    };
    const updates = {};
    for (const [skillKey, arr] of Object.entries(classItem.system.base_skills ?? {})) {
      const dots = arr[0] ?? 0;
      if (dots <= 0) continue;
      const attrKey = skillAttrMap[skillKey];
      if (!attrKey) continue;
      const current  = parseInt(this.actor.system.attributes[attrKey]?.skills[skillKey]?.value) || 0;
      const newValue = Math.min(4, current + dots);
      if (newValue !== current) updates[`system.attributes.${attrKey}.skills.${skillKey}.value`] = newValue;
    }
    if (Object.keys(updates).length) await this.actor.update(updates);
  }

  async _revertClassBaseSkills(classItem) {
    const skillAttrMap = {
      hunt: "wits",  read: "wits",    survey: "wits",   craft: "wits",
      sling: "prowess", prowl: "prowess", brawl: "prowess", disable: "prowess",
      attune: "guts",  command: "guts",  consort: "guts",  sway: "guts"
    };
    const updates = {};
    for (const [skillKey, arr] of Object.entries(classItem.system.base_skills ?? {})) {
      const dots = arr[0] ?? 0;
      if (dots <= 0) continue;
      const attrKey = skillAttrMap[skillKey];
      if (!attrKey) continue;
      const current  = parseInt(this.actor.system.attributes[attrKey]?.skills[skillKey]?.value) || 0;
      const newValue = Math.max(0, current - dots);
      if (newValue !== current) updates[`system.attributes.${attrKey}.skills.${skillKey}.value`] = newValue;
    }
    if (Object.keys(updates).length) await this.actor.update(updates);
  }
}
