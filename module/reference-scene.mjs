/**
 * reference-scene.mjs — Interactividad nativa para la Escena Mesa de Referencias.
 *
 * Sustituye la dependencia de Monk's Active Tile Triggers (MATT) para la escena
 * "Mesa de Referencias". Al cargar la escena, detecta los tiles marcados con
 * flags["a-fistful-of-darkness"].referenceScene = true y les añade:
 *
 *   - hover: muestra/oculta la etiqueta de texto (PIXI, sin sync al servidor)
 *   - click: abre la página del journal correspondiente (compendio del sistema
 *            o world journal si ya está importado)
 *
 * Los flags necesarios en cada tile:
 *   flags["a-fistful-of-darkness"] = {
 *     referenceScene: true,
 *     journalId:     "AfodJrnlAmbie03",   // _id del journal en el compendio
 *     journalPageId: "AfodJrnlPg03p001",  // _id de la página
 *     labelText:     "La Ambientación",   // texto de la etiqueta hover (opcional)
 *     labelX:        601,                 // posición canvas X de la etiqueta
 *     labelY:        320,                 // posición canvas Y de la etiqueta
 *   }
 */

const SYSTEM_ID = "a-fistful-of-darkness";
const SCENE_FLAG = "referenceScene";
const JOURNALS_PACK = `${SYSTEM_ID}.journals`;

// Almacena las etiquetas PIXI activas (por tileId) para limpiarlas al abandonar
const _activeLabels = new Map();

// ─────────────────────────────────────────────────────────────────────────────
//  Hook principal
// ─────────────────────────────────────────────────────────────────────────────

export function registerReferenceSceneHooks() {
  Hooks.on("canvasReady", _onCanvasReady);
}

function _onCanvasReady(canvas) {
  // Limpiar etiquetas de escenas anteriores
  _cleanupLabels();

  // Comprobar si la escena tiene tiles de referencia
  if (!canvas.tiles?.placeables?.length) return;
  const hasTiles = canvas.tiles.placeables.some(
    t => t.document.flags?.[SYSTEM_ID]?.[SCENE_FLAG]
  );
  if (!hasTiles) return;

  _setupTiles(canvas);
}

// ─────────────────────────────────────────────────────────────────────────────
//  Configuración de tiles
// ─────────────────────────────────────────────────────────────────────────────

function _setupTiles(canvas) {
  for (const tile of canvas.tiles.placeables) {
    const data = tile.document.flags?.[SYSTEM_ID];
    if (!data?.[SCENE_FLAG]) continue;

    const mesh = tile.mesh;
    if (!mesh) continue;

    // Hacer el tile interactivo para todos los usuarios (GM y jugadores)
    mesh.eventMode = "static";
    mesh.cursor = "pointer";

    // Registrar listeners (usando referencias nombradas para poder quitarlos)
    const hoverIn  = () => _onTileHoverIn(canvas, tile, data);
    const hoverOut = () => _onTileHoverOut(canvas, tile, data);
    const click    = (event) => {
      event.stopPropagation?.();
      _onTileClick(tile, data);
    };

    mesh.on("pointerover", hoverIn);
    mesh.on("pointerout",  hoverOut);
    mesh.on("pointerup",   click);

    // Guardar referencias para limpieza futura (aunque en práctica canvasReady recrea todo)
    tile._afodRefListeners = { mesh, hoverIn, hoverOut, click };
  }
}

// ─────────────────────────────────────────────────────────────────────────────
//  Handlers hover
// ─────────────────────────────────────────────────────────────────────────────

function _onTileHoverIn(canvas, tile, data) {
  if (!data.labelText) return;

  // Crear texto PIXI (client-side, sin sync al servidor)
  const style = new PIXI.TextStyle({
    fontFamily: "Docktrin",
    fontSize: 28,
    fill: "#d4a55a",
    stroke: "#000000",
    strokeThickness: 3,
    dropShadow: false,
  });

  const label = new PIXI.Text(data.labelText, style);
  label.anchor.set(0.5, 0.5);

  // Posición: usar la almacenada en flags o calcular encima del tile
  const lx = data.labelX ?? (tile.document.x + tile.document.width  / 2);
  const ly = data.labelY ?? (tile.document.y - 30);
  label.position.set(lx, ly);

  // Añadir al primary layer (por encima de los tiles)
  canvas.interface.addChild(label);
  _activeLabels.set(tile.id, label);
}

function _onTileHoverOut(canvas, tile, data) {
  const label = _activeLabels.get(tile.id);
  if (!label) return;
  if (label.parent) label.parent.removeChild(label);
  label.destroy();
  _activeLabels.delete(tile.id);
}

// ─────────────────────────────────────────────────────────────────────────────
//  Handler click — abrir journal
// ─────────────────────────────────────────────────────────────────────────────

async function _onTileClick(tile, data) {
  const { journalId, journalPageId } = data;
  if (!journalId) return;

  // 1. Buscar en el world (si ya está importado)
  let journal = game.journal.get(journalId);

  // 2. Si no está en el world, buscar en el compendio del sistema
  if (!journal) {
    const pack = game.packs.get(JOURNALS_PACK);
    if (pack) {
      journal = await pack.getDocument(journalId);
    }
  }

  if (!journal) {
    console.warn(`[AFoD] Reference scene: no se encontró el journal "${journalId}"`);
    return;
  }

  // Abrir la hoja del journal en la página indicada
  journal.sheet.render(true, { pageId: journalPageId ?? undefined });
}

// ─────────────────────────────────────────────────────────────────────────────
//  Limpieza
// ─────────────────────────────────────────────────────────────────────────────

function _cleanupLabels() {
  for (const [id, label] of _activeLabels) {
    if (label.parent) label.parent.removeChild(label);
    label.destroy();
  }
  _activeLabels.clear();
}
