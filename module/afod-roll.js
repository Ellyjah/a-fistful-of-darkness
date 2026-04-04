/**
 * afod-roll.js — Sistema de tiradas para A Fistful of Darkness
 * Adaptado de Blades in the Dark (Dez384). Mecánica core idéntica al original FitD.
 */

import { renderHandlebarsTemplate as renderTemplate } from "./compat.js";
import { openFormDialog } from "./lib/dialog-compat.js";
import { AfodHelpers } from "./afod-helpers.js";

// Global listener para botones de tiradas de dados en diálogos (Evita limpieza DOMPurify en V12+)
document.addEventListener("click", ev => {
  if (ev.target.closest(".dice-minus")) {
    ev.preventDefault();
    const btn = ev.target.closest(".dice-minus");
    const container = btn.closest(".dice-row") || btn.parentElement;
    const inp = container.querySelector("input[type='number']");
    if (inp && inp.value > 0) inp.stepDown();
  } else if (ev.target.closest(".dice-plus")) {
    ev.preventDefault();
    const btn = ev.target.closest(".dice-plus");
    const container = btn.closest(".dice-row") || btn.parentElement;
    const inp = container.querySelector("input[type='number']");
    const max = inp.max ? Number(inp.max) : 10;
    if (inp && inp.value < max) inp.stepUp();
  }
});

/* -------------------------------------------- */
/*  Tirada principal                             */
/* -------------------------------------------- */

/**
 * Realiza una tirada y la muestra en el chat.
 * @param {number} dice_amount       - Número de dados a tirar (0 = modo cero)
 * @param {string} attribute_name    - Nombre de la acción/atributo (clave interna AFoD)
 * @param {string} position          - "controlled" | "risky" | "desperate"
 * @param {string} effect            - "great" | "standard" | "limited"
 * @param {string} [note]            - Nota opcional que aparece en el chat
 * @param {number} [current_grit]    - Aguante actual del personaje (para tiradas de resistencia/vicio)
 * @param {number} [current_tier]    - Rango de cuadrilla actual (para Conseguir Activo)
 */
export async function afodRoll(
  dice_amount,
  attribute_name = "",
  position = "risky",
  effect = "standard",
  note = "",
  current_grit,
  current_tier
) {
  let zeromode = false;

  if (dice_amount < 0) dice_amount = 0;
  if (dice_amount === 0) { zeromode = true; dice_amount = 2; }

  const r = new Roll(`${dice_amount}d6`, {});
  await r.evaluate();
  await showChatRollMessage(r, zeromode, attribute_name, position, effect, note, current_grit, current_tier);
}

/* -------------------------------------------- */
/*  Mensaje de chat                              */
/* -------------------------------------------- */

async function showChatRollMessage(
  r, zeromode,
  attribute_name = "",
  position = "",
  effect = "",
  note = "",
  current_grit,
  current_tier
) {
  const speaker = ChatMessage.getSpeaker();
  const rolls = r.terms[0].results;
  const attribute_label = AfodHelpers.getRollLabel(attribute_name);

  let roll_status = getAfodRollStatus(rolls, zeromode);

  let method = {};
  method.type = r.terms[0].method;
  if (method.type) {
    method.icon  = CONFIG.Dice.fulfillment.methods[method.type]?.icon;
    method.label = CONFIG.Dice.fulfillment.methods[method.type]?.label;
  }

  let result;

  // ── Tirada de Acción ──────────────────────────────────────────────────────
  if (AfodHelpers.isAttributeAction(attribute_name)) {
    const position_localize = {
      controlled: "AFOD.PositionControlled",
      risky:      "AFOD.PositionRisky",
      desperate:  "AFOD.PositionDesperate"
    }[position] ?? "AFOD.PositionRisky";

    const effect_localize = {
      great:    "AFOD.EffectGreat",
      standard: "AFOD.EffectStandard",
      limited:  "AFOD.EffectLimited"
    }[effect] ?? "AFOD.EffectStandard";

    result = await renderTemplate(
      "systems/a-fistful-of-darkness/templates/chat/action-roll.html",
      { rolls, zeromode, method, roll_status, attribute_label, position, position_localize, effect, effect_localize, note }
    );
  }

  // ── Tirada de Resistencia ─────────────────────────────────────────────────
  else if (AfodHelpers.isAttributeAttribute(attribute_name)) {
    const grit_cost = getAfodRollGrit(rolls, zeromode);
    result = await renderTemplate(
      "systems/a-fistful-of-darkness/templates/chat/resistance-roll.html",
      { rolls, zeromode, method, roll_status, attribute_label, grit_cost, note }
    );
  }

  // ── Indulgar Vicio ────────────────────────────────────────────────────────
  else if (attribute_name === "AFOD.IndulgeVice") {
    const clear_grit = getAfodRollVice(rolls, zeromode);
    const actual_clear = (current_grit - clear_grit >= 0) ? clear_grit : current_grit;
    roll_status = (current_grit - clear_grit >= 0) ? "success" : "failure";
    result = await renderTemplate(
      "systems/a-fistful-of-darkness/templates/chat/vice-roll.html",
      { rolls, zeromode, method, roll_status, attribute_label, clear_grit: actual_clear, note }
    );
  }

  // ── Reunir Información ────────────────────────────────────────────────────
  else if (attribute_name === "AFOD.GatherInformation") {
    result = await renderTemplate(
      "systems/a-fistful-of-darkness/templates/chat/fortune-roll.html",
      { rolls, zeromode, method, roll_status, attribute_label, note }
    );
  }

  // ── Arranque de Misión ────────────────────────────────────────────────────
  else if (attribute_name === "AFOD.Engagement") {
    result = await renderTemplate(
      "systems/a-fistful-of-darkness/templates/chat/fortune-roll.html",
      { rolls, zeromode, method, roll_status, attribute_label, note }
    );
  }

  // ── Conseguir Activo ──────────────────────────────────────────────────────
  else if (attribute_name === "AFOD.AcquireAsset") {
    let tier_quality = Number(current_tier);
    switch (roll_status) {
      case "critical-success": tier_quality += 2; break;
      case "success":          tier_quality += 1; break;
      case "failure":          if (tier_quality > 0) tier_quality -= 1; break;
    }
    result = await renderTemplate(
      "systems/a-fistful-of-darkness/templates/chat/fortune-roll.html",
      { rolls, zeromode, method, roll_status, attribute_label, tier_quality, note }
    );
  }

  // ── Tirada de Fortuna (por defecto) ───────────────────────────────────────
  else {
    result = await renderTemplate(
      "systems/a-fistful-of-darkness/templates/chat/fortune-roll.html",
      { rolls, zeromode, method, roll_status, attribute_label: "AFOD.Fortune", note }
    );
  }

  // Crear mensaje de chat
  const messageData = {
    speaker,
    content: result,
    rolls: [r]
  };

  ChatMessage.create(messageData);
}

/* -------------------------------------------- */
/*  Diálogo de Tirada de Acción                 */
/* -------------------------------------------- */

/**
 * Muestra el diálogo de Posición y Efecto antes de realizar una tirada de acción.
 * Llamado desde la hoja de personaje al clicar en una acción.
 * @param {number} dice_amount    - Dados calculados por la hoja
 * @param {string} attribute_name - Clave interna de la acción (ej: "hunt")
 * @param {Actor}  actor          - Actor que realiza la tirada
 */
export async function actionRollDialog(dice_amount, attribute_name, actor) {
  const attribute_label = game.i18n.localize(AfodHelpers.getRollLabel(attribute_name));

  const content = `
    <h2 class="afod-roll-dialog-title">${attribute_label}</h2>
    <form class="afod-roll-dialog" style="min-width: 320px; padding: 0 15px;">

      <div class="form-group afod-dice-count">
        <label>${game.i18n.localize("AFOD.RollNumberOfDice")}</label>
        <div class="dice-row">
          <button type="button" class="dice-minus">−</button>
          <input type="number" id="dice-qty" name="qty" value="${Math.max(dice_amount, 0)}" min="0" max="10" />
          <button type="button" class="dice-plus">+</button>
        </div>
        ${dice_amount === 0 ? `<span class="zeromode-note">${game.i18n.localize("AFOD.ZeroModeNote")}</span>` : ""}
      </div>

      <div class="form-group">
        <label>${game.i18n.localize("AFOD.Position")}</label>
        <select name="position" style="background-color: #faf5ec; color: #1a1410; width: 100%; border: 1px solid #6a3a14; padding: 4px;">
          <option value="controlled">${game.i18n.localize("AFOD.PositionControlled")}</option>
          <option value="risky" selected>${game.i18n.localize("AFOD.PositionRisky")}</option>
          <option value="desperate">${game.i18n.localize("AFOD.PositionDesperate")}</option>
        </select>
      </div>

      <div class="form-group">
        <label>${game.i18n.localize("AFOD.Effect")}</label>
        <select name="effect" style="background-color: #faf5ec; color: #1a1410; width: 100%; border: 1px solid #6a3a14; padding: 4px;">
          <option value="limited">${game.i18n.localize("AFOD.EffectLimited")}</option>
          <option value="standard" selected>${game.i18n.localize("AFOD.EffectStandard")}</option>
          <option value="great">${game.i18n.localize("AFOD.EffectGreat")}</option>
        </select>
      </div>

      <div class="form-group">
        <label>${game.i18n.localize("AFOD.Notes")}</label>
        <input type="text" name="note" value="" placeholder="${game.i18n.localize("AFOD.RollNoteHint")}" />
      </div>

    </form>
  `;

  const formResult = await openFormDialog({
    title: `${game.i18n.localize("AFOD.ActionRoll")}: ${attribute_label}`,
    content,
    okLabel: game.i18n.localize("AFOD.Roll"),
    cancelLabel: game.i18n.localize("Cancel"),
    window: { width: 360 },
    dialog: { width: 360 }
  });

  if (!formResult) return;

  const qty      = Number(formResult.qty ?? dice_amount);
  const position = formResult.position ?? "risky";
  const effect   = formResult.effect   ?? "standard";
  const note     = formResult.note     ?? "";

  await afodRoll(qty, attribute_name, position, effect, note);
}

/* -------------------------------------------- */
/*  Diálogo de Tirada de Resistencia            */
/* -------------------------------------------- */

/**
 * Muestra el diálogo de Tirada de Resistencia para un atributo (Ingenio/Destreza/Agallas).
 * Mecánica BitD p.32: el jugador resiste una consecuencia; el coste en Aguante es 6 - dado más alto.
 * Crítico (6,6): se recupera 1 punto de Aguante.
 * @param {number} dice_amount    - Dados del atributo (suma de habilidades)
 * @param {string} attribute_name - Clave interna ("wits" | "prowess" | "guts")
 * @param {Actor}  actor          - Actor que realiza la tirada
 */
export async function resistanceRollDialog(dice_amount, attribute_name, actor) {
  const attribute_label = game.i18n.localize(AfodHelpers.getRollLabel(attribute_name));
  const gritLabel = game.i18n.localize("AFOD.Grit");

  const content = `
    <h2 class="afod-roll-dialog-title">${attribute_label} — ${game.i18n.localize("AFOD.ResistanceRoll")}</h2>
    <form class="afod-roll-dialog" style="min-width: 320px; padding: 0 15px;">

      <div class="form-group afod-dice-count">
        <label>${game.i18n.localize("AFOD.RollNumberOfDice")}</label>
        <div class="dice-row">
          <button type="button" class="dice-minus">−</button>
          <input type="number" id="dice-qty" name="qty" value="${Math.max(dice_amount, 0)}" min="0" max="10" />
          <button type="button" class="dice-plus">+</button>
        </div>
        ${dice_amount === 0 ? `<span class="zeromode-note">${game.i18n.localize("AFOD.ZeroModeNote")}</span>` : ""}
      </div>

      <div class="form-group">
        <label>${game.i18n.localize("AFOD.Notes")}</label>
        <input type="text" name="note" value="" placeholder="${game.i18n.localize("AFOD.RollNoteHint")}" />
      </div>

      <p class="afod-resistance-hint" style="font-size:0.82em;color:#888;margin-top:6px;border-top:1px solid #ccc;padding-top:6px">
        <strong>${gritLabel}:</strong> 6 − dado más alto &nbsp;|&nbsp; <strong>Crítico (6,6):</strong> recuperas 1 ${gritLabel}
      </p>

    </form>
  `;

  const formResult = await openFormDialog({
    title: `${game.i18n.localize("AFOD.ResistanceRoll")}: ${attribute_label}`,
    content,
    okLabel: game.i18n.localize("AFOD.Roll"),
    cancelLabel: game.i18n.localize("Cancel"),
    window: { width: 360 },
    dialog: { width: 360 }
  });

  if (!formResult) return;

  const qty  = Number(formResult.qty ?? dice_amount);
  const note = formResult.note ?? "";

  await afodRoll(qty, attribute_name, "", "", note);
}

/* -------------------------------------------- */
/*  Diálogo de Tirada Rápida (controles escena) */
/* -------------------------------------------- */

/**
 * Diálogo de tirada rápida accesible desde el botón de controles de escena.
 * Lee aguante y rango de cuadrilla del token seleccionado si lo hay.
 */
export async function simpleRollPopup() {
  // Leer Aguante y Rango del token seleccionado (si existe)
  let current_grit = 0;
  let current_tier = 0;
  const selected_tokens = canvas?.tokens?.controlled ?? [];

  if (selected_tokens.length > 0) {
    const target_actor = game.actors.get(selected_tokens[0].document.actorId);
    if (target_actor?.type === "character" || target_actor?.type === "revenant") {
      const gritField = target_actor.type === "revenant" ? "passion" : "grit";
      current_grit = parseInt(target_actor.system[gritField]?.value) || 0;
      try {
        const posse = game.actors.get(target_actor.system.posse?.[0]?.id);
        if (posse) current_tier = parseInt(posse.system.tier) || 0;
      } catch (err) {
        console.warn("A Fistful of Darkness | No hay cuadrilla asociada al token seleccionado.");
      }
    }
    if (target_actor?.type === "posse") {
      current_tier = parseInt(target_actor.system.tier) || 0;
    }
  }

  const i18n = (key) => game.i18n.localize(key);

  const content = `
    <h2>${i18n("AFOD.RollSomeDice")}</h2>
    <form class="afod-simple-roll-dialog" style="min-width: 340px; padding: 0 15px;">

      <div class="form-group">
        <label>${i18n("AFOD.RollNumberOfDice")}:</label>
        <select id="qty" name="qty">
          ${Array(11).fill().map((_, i) => `<option value="${i}">${i}d</option>`).join("")}
        </select>
      </div>

      <fieldset class="form-group">
        <legend>${i18n("AFOD.RollType")}</legend>
        <div style="display:grid; grid-template-columns:auto auto; gap:1em;">
          <div style="display:grid; gap:0.4em;">
            <label><input type="radio" name="rollSelection" value="fortune" checked /> ${i18n("AFOD.Fortune")}</label>
            <label><input type="radio" name="rollSelection" value="gatherInfo" /> ${i18n("AFOD.GatherInformation")}</label>
            <label><input type="radio" name="rollSelection" value="engagement" /> ${i18n("AFOD.Engagement")}</label>
            <label><input type="radio" name="rollSelection" value="indulgeVice" /> ${i18n("AFOD.IndulgeViceLabel")}</label>
            <label><input type="radio" name="rollSelection" value="acquireAsset" /> ${i18n("AFOD.AcquireAsset")}</label>
          </div>
          <div style="display:grid; gap:0.4em; align-content:end;">
            <span>
              <label>${i18n("AFOD.Grit")}:</label>
              <select id="grit" name="grit">
                <option value="${current_grit}" selected disabled hidden>${current_grit}</option>
                ${Array(10).fill().map((_, i) => `<option value="${i}">${i}</option>`).join("")}
              </select>
            </span>
            <span>
              <label>${i18n("AFOD.CrewTier")}:</label>
              <select id="tier" name="tier">
                <option value="${current_tier}" selected disabled hidden>${current_tier}</option>
                ${Array(5).fill().map((_, i) => `<option value="${i}">${i}</option>`).join("")}
              </select>
            </span>
          </div>
        </div>
      </fieldset>

      <div class="form-group">
        <label>${i18n("AFOD.Notes")}:</label>
        <input id="note" name="note" type="text" value="" />
      </div>

    </form>
  `;

  const formResult = await openFormDialog({
    title: i18n("AFOD.DiceRoller"),
    content,
    okLabel: i18n("AFOD.Roll"),
    cancelLabel: i18n("Cancel"),
    window: { width: 380 },
    dialog: { width: 380 }
  });

  if (!formResult) return;

  let diceQty = Number(formResult.qty ?? 0) || 0;
  const grit      = Number(formResult.grit  ?? current_grit) || 0;
  const tier      = Number(formResult.tier  ?? current_tier) || 0;
  const note      = formResult.note         ?? "";
  const selection = formResult.rollSelection ?? "fortune";

  switch (selection) {
    case "gatherInfo":
      await afodRoll(diceQty, "AFOD.GatherInformation", "", "", note);
      break;
    case "engagement":
      await afodRoll(diceQty, "AFOD.Engagement", "", "", note);
      break;
    case "indulgeVice":
      await afodRoll(diceQty, "AFOD.IndulgeVice", "", "", note, grit);
      break;
    case "acquireAsset":
      diceQty = diceQty + tier;
      await afodRoll(diceQty, "AFOD.AcquireAsset", "", "", note, "", tier);
      break;
    default:
      await afodRoll(diceQty, "", "", "", note);
  }
}

/* -------------------------------------------- */
/*  Funciones de cálculo de resultado           */
/* -------------------------------------------- */

/**
 * Determina el resultado de una tirada.
 * @param {Array}   rolls    - Array de objetos { result: number }
 * @param {boolean} zeromode - Si true, usa el dado más bajo de 2d
 * @returns {"failure"|"partial-success"|"success"|"critical-success"}
 */
export function getAfodRollStatus(rolls, zeromode = false) {
  const sorted = rolls.map(i => i.result).sort((a, b) => a - b);
  let roll_status = "failure";

  if (sorted[0] === 6 && zeromode) {
    return "success";
  }

  const use_die      = zeromode ? sorted[0] : sorted[sorted.length - 1];
  const prev_use_die = !zeromode && sorted.length >= 2 ? sorted[sorted.length - 2] : false;

  if (use_die <= 3) {
    roll_status = "failure";
  } else if (use_die === 6) {
    roll_status = (prev_use_die && prev_use_die === 6) ? "critical-success" : "success";
  } else {
    roll_status = "partial-success";
  }

  return roll_status;
}

/**
 * Calcula el coste en Aguante de una tirada de resistencia.
 * Fórmula: 6 − dado_más_alto. Crítico (6,6) = −1 (recuperas 1 Aguante).
 * @param {Array}   rolls
 * @param {boolean} zeromode
 * @returns {number} Coste en puntos de Aguante (negativo = recuperar)
 */
export function getAfodRollGrit(rolls, zeromode = false) {
  const sorted = rolls.map(i => i.result).sort((a, b) => a - b);
  const use_die      = zeromode ? sorted[0] : sorted[sorted.length - 1];
  const prev_use_die = !zeromode && sorted.length >= 2 ? sorted[sorted.length - 2] : false;

  if (sorted[0] === 6 && zeromode) return -1;
  if (use_die === 6 && prev_use_die && prev_use_die === 6) return -1;
  return 6 - use_die;
}

/**
 * Calcula cuánto Aguante se limpia con una tirada de Vicio (Indulgencia).
 * El valor del dado más alto es la cantidad de Aguante que se recupera.
 *
 * @param {Array}   rolls
 * @param {boolean} zeromode
 * @returns {number}
 */
export function getAfodRollVice(rolls, zeromode = false) {
  const sorted = rolls.map(i => i.result).sort((a, b) => a - b);
  return zeromode ? sorted[0] : sorted[sorted.length - 1];
}
