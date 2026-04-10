/**
 * reference-scene.mjs — Interactividad nativa para la Escena Mesa de Referencias.
 *
 * Detecta tiles con flags["a-fistful-of-darkness"].referenceScene = true y les añade:
 *   - hover: etiqueta de texto (PIXI, client-side, sin sync al servidor)
 *   - click: abre la página del journal del compendio del sistema
 *
 * Usa eventos DOM sobre el elemento canvas para que funcione tanto para GM
 * como para jugadores (la capa TilesLayer no es interactiva para jugadores por defecto).
 *
 * Flags necesarios en cada tile:
 *   flags["a-fistful-of-darkness"] = {
 *     referenceScene: true,
 *     journalId:     "AfodJrnlAmbie03",
 *     journalPageId: "AfodJrnlPg03p001",
 *     labelText:     "La Ambientación",   // opcional
 *     labelX:        601,                  // coordenada canvas
 *     labelY:        320,
 *   }
 */

const SYSTEM_ID  = "a-fistful-of-darkness";
const SCENE_FLAG = "referenceScene";
const PACK_ID    = `${SYSTEM_ID}.journals`;

// ─────────────────────────────────────────────────────────────────────────────
//  Registro del hook principal
// ─────────────────────────────────────────────────────────────────────────────

export function registerReferenceSceneHooks() {
  Hooks.on("canvasReady", _onCanvasReady);
}

// ─────────────────────────────────────────────────────────────────────────────
//  Setup al cargar escena
// ─────────────────────────────────────────────────────────────────────────────

function _onCanvasReady() {
  _cleanup();

  const tiles = canvas.tiles?.placeables?.filter(
    t => t.document.flags?.[SYSTEM_ID]?.[SCENE_FLAG]
  ) ?? [];

  if (!tiles.length) return;

  const view = canvas.app.canvas;

  // Datos de interacción precalculados
  const interactables = tiles.map(t => ({
    tile: t,
    data: t.document.flags[SYSTEM_ID]
  }));

  // ── Click ────────────────────────────────────────────────────────────────
  const clickCb = (ev) => {
    if (ev.button !== 0) return;
    const wp = _screenToWorld(ev);
    for (const { tile, data } of interactables) {
      if (_hitTest(tile, wp)) {
        _handleClick(data);
        return;
      }
    }
  };

  // ── Hover ────────────────────────────────────────────────────────────────
  let hoveredItem = null;
  const moveCb = _throttle((ev) => {
    const wp = _screenToWorld(ev);
    let hit = null;
    for (const item of interactables) {
      if (_hitTest(item.tile, wp)) { hit = item; break; }
    }

    if (hit?.tile !== hoveredItem?.tile) {
      if (hoveredItem) { _handleHoverOut(hoveredItem.tile); view.style.cursor = ""; }
      if (hit)        { _handleHoverIn(hit.tile, hit.data); view.style.cursor = "pointer"; }
      hoveredItem = hit;
    }
  }, 40);

  view.addEventListener("click",     clickCb);
  view.addEventListener("mousemove", moveCb);

  // Guardar referencias para limpieza
  canvas._afodRefListeners = { view, clickCb, moveCb };
}

// ─────────────────────────────────────────────────────────────────────────────
//  Coordenadas y hit-testing
// ─────────────────────────────────────────────────────────────────────────────

function _screenToWorld(ev) {
  const view = canvas.app.canvas;
  const rect = view.getBoundingClientRect();
  // Corregir si el canvas CSS es de distinto tamaño que el canvas interno
  const scaleX = view.width  / rect.width;
  const scaleY = view.height / rect.height;
  const px = (ev.clientX - rect.left) * scaleX;
  const py = (ev.clientY - rect.top)  * scaleY;
  return canvas.stage.toLocal({ x: px, y: py });
}

function _hitTest(tile, wp) {
  // Hit-test con rotación correcta
  const { x, y, width, height, rotation } = tile.document;
  const cx = x + width  / 2;
  const cy = y + height / 2;
  const rad = -(rotation ?? 0) * (Math.PI / 180);
  const dx = wp.x - cx;
  const dy = wp.y - cy;
  const rx =  dx * Math.cos(rad) - dy * Math.sin(rad);
  const ry =  dx * Math.sin(rad) + dy * Math.cos(rad);
  return Math.abs(rx) <= width / 2 && Math.abs(ry) <= height / 2;
}

// ─────────────────────────────────────────────────────────────────────────────
//  Handlers
// ─────────────────────────────────────────────────────────────────────────────

function _handleHoverIn(tile, data) {
  if (!data.labelText) return;

  const style = new PIXI.TextStyle({
    fontFamily: "Docktrin",
    fontSize:   28,
    fill:       "#d4a55a",
    stroke:     "#000000",
    strokeThickness: 3,
  });

  const lx = data.labelX ?? (tile.document.x + tile.document.width  / 2);
  const ly = data.labelY ?? (tile.document.y - 30);

  const text = new PIXI.Text(data.labelText, style);
  text.anchor.set(0.5, 0.5);
  text.position.set(lx, ly);

  // canvas.primary es el grupo en coordenadas de mundo, siempre visible
  canvas.primary.addChild(text);

  if (!canvas._afodLabels) canvas._afodLabels = new Map();
  canvas._afodLabels.set(tile.id, text);
}

function _handleHoverOut(tile) {
  const lbl = canvas._afodLabels?.get(tile.id);
  if (!lbl) return;
  lbl.parent?.removeChild(lbl);
  lbl.destroy();
  canvas._afodLabels.delete(tile.id);
}

async function _handleClick(data) {
  const { journalId, journalPageId } = data;
  if (!journalId) return;

  // 1. Buscar en journals del world (si ya está importado)
  let journal = game.journal.get(journalId);

  // 2. Fallback: compendio del sistema
  if (!journal) {
    const pack = game.packs.get(PACK_ID);
    if (pack) journal = await pack.getDocument(journalId);
  }

  if (!journal) {
    console.warn(`[AFoD] Mesa de Referencias: journal no encontrado — "${journalId}"`);
    return;
  }

  journal.sheet.render(true, { pageId: journalPageId ?? undefined });
}

// ─────────────────────────────────────────────────────────────────────────────
//  Utilidades
// ─────────────────────────────────────────────────────────────────────────────

function _throttle(fn, ms) {
  let last = 0;
  return function (...args) {
    const now = Date.now();
    if (now - last >= ms) { last = now; fn.apply(this, args); }
  };
}

function _cleanup() {
  // Eliminar listeners anteriores
  if (canvas._afodRefListeners) {
    const { view, clickCb, moveCb } = canvas._afodRefListeners;
    view.removeEventListener("click",     clickCb);
    view.removeEventListener("mousemove", moveCb);
    view.style.cursor = "";
    delete canvas._afodRefListeners;
  }
  // Eliminar etiquetas anteriores
  if (canvas._afodLabels) {
    for (const lbl of canvas._afodLabels.values()) {
      lbl.parent?.removeChild(lbl);
      lbl.destroy();
    }
    delete canvas._afodLabels;
  }
}
