/**
 * reference-scene.mjs — Interactividad nativa para la Escena Mesa de Referencias.
 *
 * Usa listeners DOM sobre el canvas HTML para que funcione para GM y jugadores.
 * Detecta tiles con flags["a-fistful-of-darkness"].referenceScene = true
 * O bien la escena cuyo nombre sea "Mesa de Referencias".
 */

const SYSTEM_ID  = "a-fistful-of-darkness";
const SCENE_FLAG = "referenceScene";
const PACK_ID    = `${SYSTEM_ID}.journals`;
const LOG        = (...a) => console.log("[AFoD|RefScene]", ...a);

// ─────────────────────────────────────────────────────────────────────────────
//  Registro — llamar desde init (no ready) para no perder el primer canvasReady
// ─────────────────────────────────────────────────────────────────────────────

export function registerReferenceSceneHooks() {
  Hooks.on("canvasReady", _onCanvasReady);
  LOG("Hook canvasReady registrado.");
}

// ─────────────────────────────────────────────────────────────────────────────
//  canvasReady
// ─────────────────────────────────────────────────────────────────────────────

function _onCanvasReady() {
  _cleanup(); // restaura clases hide-player-ui si las había guardado

  if (!canvas.tiles?.placeables) return;

  LOG("canvasReady — escena:", canvas.scene?.name);

  // Detectar si es la escena de referencias (por flag o por nombre)
  const isRefScene = canvas.scene?.getFlag?.(SYSTEM_ID, SCENE_FLAG)
    || canvas.scene?.name === "Mesa de Referencias";

  if (isRefScene) {
    // Restaurar UI después de que ready haya disparado (hide-player-ui añade clases en ready)
    if (game.ready) {
      _restoreUI();
    } else {
      Hooks.once("ready", _restoreUI);
    }
  }

  // Buscar tiles con flag referenceScene
  let tiles = canvas.tiles.placeables.filter(
    t => t.document.flags?.[SYSTEM_ID]?.[SCENE_FLAG]
  );
  LOG(`Tiles con flag referenceScene: ${tiles.length}`);

  // Fallback: si la escena se llama "Mesa de Referencias", mapear por orden
  if (!tiles.length && canvas.scene?.name === "Mesa de Referencias") {
    LOG("Fallback: escena por nombre, intentando mapear tiles por índice.");
    tiles = canvas.tiles.placeables.slice(0, 5); // los 5 primeros
    // Datos hardcoded cuando los flags no se importaron
    _setupFallback(tiles);
    return;
  }

  if (!tiles.length) return;

  _attachDOMListeners(tiles.map(t => ({
    tile: t,
    data: t.document.flags[SYSTEM_ID]
  })));
}

// ─────────────────────────────────────────────────────────────────────────────
//  Fallback por nombre de escena (tiles sin flags)
// ─────────────────────────────────────────────────────────────────────────────

// Asocia tiles por textura al journal y etiqueta correspondiente
const TEXTURE_MAP = {
  "mudwater.png":      { journalId: "AfodJrnlAmbie03", journalPageId: "AfodJrnlPg03p001", labelText: "La Ambientación" },
  "se-busca.png":      { journalId: "AfodJrnlAmbie03", journalPageId: "AfodJrnlPg03p002", labelText: "Los Libretos"    },
  "fotos.png":         { journalId: "AfodJrnlAmbie03", journalPageId: "AfodJrnlPg03p003", labelText: "Las Cuadrillas"  },
  "billete-barco.png": { journalId: "AfodJrnlAmbie03", journalPageId: "AfodJrnlPg03p004", labelText: "Las Herencias"   },
  "enciclopedia.png":  { journalId: "AfodJrnlAmbie03", journalPageId: "AfodJrnlPg03p005", labelText: "Consejos para Jugadores" },
};

function _setupFallback(tiles) {
  const interactables = [];
  for (const tile of tiles) {
    const src  = tile.document.texture?.src ?? "";
    const file = src.split("/").pop();
    const meta = TEXTURE_MAP[file];
    if (!meta) {
      LOG(`Tile sin meta: ${file}`);
      continue;
    }
    const data = {
      ...meta,
      referenceScene: true,
      labelX: tile.document.x + tile.document.width  / 2,
      labelY: tile.document.y - 30,
    };
    LOG(`Tile mapeado: ${file} → ${meta.journalPageId}`);
    interactables.push({ tile, data });
  }
  if (interactables.length) _attachDOMListeners(interactables);
}

// ─────────────────────────────────────────────────────────────────────────────
//  DOM listeners
// ─────────────────────────────────────────────────────────────────────────────

function _attachDOMListeners(interactables) {
  // Usar canvas.app.canvas (PIXI v8) o canvas.app.view (PIXI v7)
  const view = canvas.app?.canvas ?? canvas.app?.view;
  if (!view) { LOG("ERROR: no se encontró el elemento canvas"); return; }
  LOG(`Adjuntando listeners a ${interactables.length} tiles. Canvas:`, view.tagName);

  // Usar pointerdown en fase de burbuja (PIXI usa capture, así que va primero).
  // "click" puede ser cancelado por Foundry/PIXI; pointerdown siempre llega.
  const clickCb = (ev) => {
    if (ev.button !== 0) return;
    const wp = _screenToWorld(ev, view);
    LOG(`Pointerdown en mundo: (${Math.round(wp.x)}, ${Math.round(wp.y)})`);
    for (const { tile, data } of interactables) {
      if (_hitTest(tile, wp)) {
        LOG("Hit en tile →", data.journalPageId);
        _handleClick(data);
        return;
      }
    }
    LOG("Sin hit en ninguna tile.");
  };

  let hoveredItem = null;
  const moveCb = _throttle((ev) => {
    const wp = _screenToWorld(ev, view);
    let hit = null;
    for (const item of interactables) {
      if (_hitTest(item.tile, wp)) { hit = item; break; }
    }
    if (hit?.tile !== hoveredItem?.tile) {
      LOG(`Hover: ${hoveredItem?.tile?.id ?? "—"} → ${hit?.tile?.id ?? "—"} en (${Math.round(wp.x)}, ${Math.round(wp.y)})`);
      if (hoveredItem) { _handleHoverOut(hoveredItem.tile); view.style.cursor = ""; }
      if (hit)         { _handleHoverIn(hit.tile, hit.data); view.style.cursor = "pointer"; }
      hoveredItem = hit;
    }
  }, 40);

  view.addEventListener("pointerdown", clickCb);
  view.addEventListener("mousemove",   moveCb);

  canvas._afodRefListeners = { view, clickCb, moveCb };
  LOG("Listeners adjuntados correctamente.");
}

// ─────────────────────────────────────────────────────────────────────────────
//  Coordenadas y hit-testing
// ─────────────────────────────────────────────────────────────────────────────

function _screenToWorld(ev, view) {
  // Usar el método de PIXI para garantizar coherencia con su sistema de coordenadas
  // independientemente del DPR del dispositivo (evita el doble escalado en pantallas retina)
  const point = { x: 0, y: 0 };
  if (canvas.app.renderer?.events?.mapPositionToPoint) {
    canvas.app.renderer.events.mapPositionToPoint(point, ev.clientX, ev.clientY);
  } else {
    // Fallback PIXI v7 / sin EventSystem: usar coordenadas CSS directas
    const rect = view.getBoundingClientRect();
    point.x = ev.clientX - rect.left;
    point.y = ev.clientY - rect.top;
  }
  return canvas.stage.toLocal(point);
}

function _hitTest(tile, wp) {
  const { x, y, width, height, rotation } = tile.document;
  const cx  = x + width  / 2;
  const cy  = y + height / 2;
  const rad = -(rotation ?? 0) * (Math.PI / 180);
  const dx  = wp.x - cx;
  const dy  = wp.y - cy;
  const rx  =  dx * Math.cos(rad) - dy * Math.sin(rad);
  const ry  =  dx * Math.sin(rad) + dy * Math.cos(rad);
  return Math.abs(rx) <= width / 2 && Math.abs(ry) <= height / 2;
}

// ─────────────────────────────────────────────────────────────────────────────
//  Handlers hover/click
// ─────────────────────────────────────────────────────────────────────────────

function _restoreUI() {
  // Solo actuar si seguimos en la escena de referencias
  const isRef = canvas.scene?.getFlag?.(SYSTEM_ID, SCENE_FLAG)
    || canvas.scene?.name === "Mesa de Referencias";
  if (!isRef) return;

  const hidden = Array.from(document.body.classList)
    .filter(c => c.startsWith("hide-player-ui-") && c !== "hide-player-ui-dynamic-sized-sidebar");
  if (!hidden.length) { LOG("No hay clases hide-player-ui que eliminar."); return; }

  hidden.forEach(c => document.body.classList.remove(c));
  canvas._afodHiddenUIClasses = hidden;
  LOG(`UI restaurada. Clases eliminadas: ${hidden.join(", ")}`);
}

function _handleHoverIn(tile, data) {
  if (!data.labelText) return;
  try {
    const style = new PIXI.TextStyle({
      fontFamily: "Docktrin",
      fontSize: 28, fill: "#d4a55a",
      stroke: "#000000", strokeThickness: 3,
    });
    const lx  = data.labelX ?? (tile.document.x + tile.document.width  / 2);
    const ly  = data.labelY ?? (tile.document.y - 30);
    const txt = new PIXI.Text(data.labelText, style);
    txt.anchor.set(0.5, 0.5);
    txt.position.set(lx, ly);
    canvas.stage.addChild(txt);
    if (!canvas._afodLabels) canvas._afodLabels = new Map();
    canvas._afodLabels.set(tile.id, txt);
  } catch (e) {
    LOG("Error en _handleHoverIn:", e.message);
  }
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
  if (!journalId) { LOG("ERROR: no hay journalId en data"); return; }

  LOG(`Buscando journal ${journalId} en world...`);
  let journal = game.journal.get(journalId);
  LOG(`  → en world: ${journal ? "ENCONTRADO" : "no encontrado"}`);

  if (!journal) {
    const pack = game.packs.get(PACK_ID);
    LOG(`  → pack ${PACK_ID}: ${pack ? "existe" : "NO EXISTE"}`);
    if (pack) {
      journal = await pack.getDocument(journalId);
      LOG(`  → en pack: ${journal ? "ENCONTRADO" : "no encontrado"}`);
    }
  }

  if (!journal) { LOG(`ERROR: journal ${journalId} no encontrado en ningún lugar`); return; }

  LOG(`Abriendo journal ${journalId}, página ${journalPageId}`);
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
  // Restaurar clases de hide-player-ui al salir de la escena de referencias
  if (canvas._afodHiddenUIClasses?.length) {
    canvas._afodHiddenUIClasses.forEach(c => document.body.classList.add(c));
    LOG(`UI restaurada al salir. Clases restauradas: ${canvas._afodHiddenUIClasses.join(", ")}`);
    delete canvas._afodHiddenUIClasses;
  }

  if (canvas._afodRefListeners) {
    const { view, clickCb, moveCb } = canvas._afodRefListeners;
    view.removeEventListener("pointerdown", clickCb);
    view.removeEventListener("mousemove", moveCb);
    view.style.cursor = "";
    delete canvas._afodRefListeners;
  }
  if (canvas._afodLabels) {
    for (const lbl of canvas._afodLabels.values()) {
      lbl.parent?.removeChild(lbl);
      lbl.destroy();
    }
    delete canvas._afodLabels;
  }
}
