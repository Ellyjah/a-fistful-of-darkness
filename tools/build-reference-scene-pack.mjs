/**
 * build-reference-scene-pack.mjs
 *
 * Construye el pack LevelDB "packs/scenes" del sistema AFoD con la escena
 * "Mesa de Referencias". Las tiles usan flags["a-fistful-of-darkness"] para
 * que el módulo reference-scene.mjs gestione las interacciones sin MATT.
 *
 * Uso: node tools/build-reference-scene-pack.mjs
 */

import { ClassicLevel } from "classic-level";
import path from "path";
import { fileURLToPath } from "url";
import fs from "fs";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const SYSTEM_DIR = path.join(__dirname, "..");
const PACK_DIR   = path.join(SYSTEM_DIR, "packs", "scenes");

// ─── IDs (fijos, para compatibilidad con referencias cruzadas) ───────────────
const SCENE_ID = "AfodSceneRefTable";

// Datos de las tiles: transcritos del world original, con rutas de sistema
const SYSTEM_PREFIX = "systems/a-fistful-of-darkness/styles/assets/scenes";

const TILE_DEFS = [
  // ── MUDWATER (mapa de Mudwater) → página 1: La Ambientación ─────────────
  {
    _id: "AfodTile03p001A",
    texture: `${SYSTEM_PREFIX}/tiles/mudwater.png`,
    x: 505, y: 378, width: 472, height: 437, rotation: 342, hidden: false,
    flags: { "a-fistful-of-darkness": {
      referenceScene: true,
      journalId: "AfodJrnlAmbie03", journalPageId: "AfodJrnlPg03p001",
      labelText: "La Ambientación", labelX: 601, labelY: 320
    }}
  },
  {
    _id: "AfodTile03p001B",
    texture: `${SYSTEM_PREFIX}/tiles/mudwater.png`,
    x: 118, y: 82, width: 286, height: 288, rotation: 342, hidden: false,
    flags: { "a-fistful-of-darkness": {
      referenceScene: true,
      journalId: "AfodJrnlAmbie03", journalPageId: "AfodJrnlPg03p001",
    }}
  },
  {
    _id: "AfodTile03p001C",
    texture: `${SYSTEM_PREFIX}/tiles/mudwater.png`,
    x: 575, y: 349, width: 286, height: 288, rotation: 342, hidden: false,
    flags: { "a-fistful-of-darkness": {
      referenceScene: true,
      journalId: "AfodJrnlAmbie03", journalPageId: "AfodJrnlPg03p001",
    }}
  },
  // ── SE BUSCA (cartel de buscado) → página 2: Los Libretos ───────────────
  {
    _id: "AfodTile03p002A",
    texture: `${SYSTEM_PREFIX}/tiles/se-busca.png`,
    x: 1436, y: 357, width: 351, height: 508, rotation: 13, hidden: false,
    flags: { "a-fistful-of-darkness": {
      referenceScene: true,
      journalId: "AfodJrnlAmbie03", journalPageId: "AfodJrnlPg03p002",
      labelText: "Los Libretos", labelX: 1472, labelY: 318
    }}
  },
  {
    _id: "AfodTile03p002B",
    texture: `${SYSTEM_PREFIX}/tiles/se-busca.png`,
    x: 1118, y: 110, width: 232, height: 308, rotation: 13, hidden: false,
    flags: { "a-fistful-of-darkness": {
      referenceScene: true,
      journalId: "AfodJrnlAmbie03", journalPageId: "AfodJrnlPg03p002",
    }}
  },
  {
    _id: "AfodTile03p002C",
    texture: `${SYSTEM_PREFIX}/tiles/se-busca.png`,
    x: 1575, y: 377, width: 232, height: 308, rotation: 13, hidden: false,
    flags: { "a-fistful-of-darkness": {
      referenceScene: true,
      journalId: "AfodJrnlAmbie03", journalPageId: "AfodJrnlPg03p002",
    }}
  },
  // ── FOTOS (fotos antiguas) → página 3: Las Cuadrillas ───────────────────
  {
    _id: "AfodTile03p003A",
    texture: `${SYSTEM_PREFIX}/tiles/fotos.png`,
    x: 557, y: 898, width: 467, height: 337, rotation: 11, hidden: false,
    flags: { "a-fistful-of-darkness": {
      referenceScene: true,
      journalId: "AfodJrnlAmbie03", journalPageId: "AfodJrnlPg03p003",
      labelText: "Las Cuadrillas", labelX: 650, labelY: 852
    }}
  },
  {
    _id: "AfodTile03p003B",
    texture: `${SYSTEM_PREFIX}/tiles/fotos.png`,
    x: 545, y: 959, width: 334, height: 258, rotation: 11, hidden: false,
    flags: { "a-fistful-of-darkness": {
      referenceScene: true,
      journalId: "AfodJrnlAmbie03", journalPageId: "AfodJrnlPg03p003",
    }}
  },
  {
    _id: "AfodTile03p003C",
    texture: `${SYSTEM_PREFIX}/tiles/fotos.png`,
    x: 88, y: 692, width: 334, height: 258, rotation: 11, hidden: false,
    flags: { "a-fistful-of-darkness": {
      referenceScene: true,
      journalId: "AfodJrnlAmbie03", journalPageId: "AfodJrnlPg03p003",
    }}
  },
  // ── BILLETE (billete de barco) → página 4: Las Herencias ────────────────
  {
    _id: "AfodTile03p004A",
    texture: `${SYSTEM_PREFIX}/tiles/billete-barco.png`,
    x: 1435, y: 989, width: 306, height: 188, rotation: 351, hidden: false,
    flags: { "a-fistful-of-darkness": {
      referenceScene: true,
      journalId: "AfodJrnlAmbie03", journalPageId: "AfodJrnlPg03p004",
      labelText: "Las Herencias", labelX: 1448, labelY: 931
    }}
  },
  {
    _id: "AfodTile03p004B",
    texture: `${SYSTEM_PREFIX}/tiles/billete-barco.png`,
    x: 984, y: 706, width: 410, height: 273, rotation: 351, hidden: false,
    flags: { "a-fistful-of-darkness": {
      referenceScene: true,
      journalId: "AfodJrnlAmbie03", journalPageId: "AfodJrnlPg03p004",
    }}
  },
  {
    _id: "AfodTile03p004C",
    texture: `${SYSTEM_PREFIX}/tiles/billete-barco.png`,
    x: 1441, y: 973, width: 410, height: 273, rotation: 351, hidden: false,
    flags: { "a-fistful-of-darkness": {
      referenceScene: true,
      journalId: "AfodJrnlAmbie03", journalPageId: "AfodJrnlPg03p004",
    }}
  },
  // ── ENCICLOPEDIA → página 5: Consejos para Jugadores ────────────────────
  {
    _id: "AfodTile03p005A",
    texture: `${SYSTEM_PREFIX}/tiles/enciclopedia.png`,
    x: 978, y: 457, width: 432, height: 608, rotation: 6, hidden: false,
    flags: { "a-fistful-of-darkness": {
      referenceScene: true,
      journalId: "AfodJrnlAmbie03", journalPageId: "AfodJrnlPg03p005",
      labelText: "Consejos para Jugadores", labelX: 1054, labelY: 422
    }}
  },
  {
    _id: "AfodTile03p005B",
    texture: `${SYSTEM_PREFIX}/tiles/enciclopedia.png`,
    x: 624, y: 285, width: 296, height: 455, rotation: 6, hidden: false,
    flags: { "a-fistful-of-darkness": {
      referenceScene: true,
      journalId: "AfodJrnlAmbie03", journalPageId: "AfodJrnlPg03p005",
    }}
  },
  {
    _id: "AfodTile03p005C",
    texture: `${SYSTEM_PREFIX}/tiles/enciclopedia.png`,
    x: 1081, y: 552, width: 296, height: 455, rotation: 6, hidden: false,
    flags: { "a-fistful-of-darkness": {
      referenceScene: true,
      journalId: "AfodJrnlAmbie03", journalPageId: "AfodJrnlPg03p005",
    }}
  },
];

function buildTileDoc(def) {
  return {
    _id: def._id,
    texture: {
      src: def.texture,
      scaleX: 1, scaleY: 1,
      offsetX: 0, offsetY: 0,
      fit: "contain",
      anchorX: 0.5, anchorY: 0.5,
      rotation: 0, tint: "#ffffff",
      alphaThreshold: 0
    },
    x: def.x, y: def.y,
    width: def.width, height: def.height,
    rotation: def.rotation ?? 0,
    sort: 0, overhead: false, underfoot: false,
    occlusion: { mode: 0, alpha: 0, radius: null },
    video: { loop: true, autoplay: true, volume: 0 },
    hidden: def.hidden ?? false,
    locked: false, alpha: 1,
    elevation: 0, restrictions: { light: false, weather: false },
    flags: def.flags ?? {},
    _stats: {
      compendiumSource: null, duplicateSource: null, exportSource: null,
      coreVersion: "13.351",
      systemId: "a-fistful-of-darkness", systemVersion: "0.7.0",
      createdTime: null, modifiedTime: null, lastModifiedBy: null
    }
  };
}

const SCENE_DOC = {
  _id: SCENE_ID,
  name: "Mesa de Referencias",
  navigation: true, navOrder: 0, navName: "",
  active: false,
  background: {
    src: `${SYSTEM_PREFIX}/mesa.png`,
    anchorX: 0, anchorY: 0, offsetX: 0, offsetY: 0,
    fit: "fill", scaleX: 1, scaleY: 1,
    rotation: 0, tint: "#ffffff", alphaThreshold: 0
  },
  foreground: null, foregroundElevation: null,
  width: 1536, height: 1024, padding: 0.25,
  initial: { x: 1265, y: 799, scale: 0.7336177412164453 },
  backgroundColor: "#000000",
  tokenVision: false,
  grid: {
    type: 0, size: 100, style: "solidLines",
    thickness: 1, color: "#000000", alpha: 0.2,
    distance: 1, units: ""
  },
  environment: {
    darknessLevel: 0, darknessLock: false,
    globalLight: {
      enabled: false, alpha: 0.5, bright: false, color: null,
      coloration: 1, luminosity: 0, saturation: 0, contrast: 0, shadows: 0,
      darkness: { min: 0, max: 1 }
    },
    cycle: true,
    base: { hue: 0, intensity: 0, luminosity: 0, saturation: 0, shadows: 0 },
    dark: { hue: 0.7138888888888889, intensity: 0, luminosity: -0.25, saturation: 0, shadows: 0 }
  },
  fog: {
    exploration: false, overlay: null,
    colors: { explored: null, unexplored: null }
  },
  thumb: `${SYSTEM_PREFIX}/mesa.png`,
  playlist: null, playlistSound: null,
  journal: null, journalEntryPage: null,
  weather: "", folder: null, sort: 0,
  ownership: { default: 2 },
  regions: [], templates: [],
  walls: [], lights: [], sounds: [], notes: [], tokens: [],
  // drawings y tiles se almacenan como embedded docs
  drawings: [],
  tiles: TILE_DEFS.map(d => d._id),
  flags: {},
  _stats: {
    compendiumSource: null, duplicateSource: null, exportSource: null,
    coreVersion: "13.351",
    systemId: "a-fistful-of-darkness", systemVersion: "0.7.0",
    createdTime: null, modifiedTime: null, lastModifiedBy: null
  },
  _key: `!scenes!${SCENE_ID}`
};

// ─── Construir el LevelDB ────────────────────────────────────────────────────

async function build() {
  // Borrar pack existente si existe
  if (fs.existsSync(PACK_DIR)) {
    fs.rmSync(PACK_DIR, { recursive: true, force: true });
    console.log("Pack anterior eliminado.");
  }
  fs.mkdirSync(PACK_DIR, { recursive: true });

  const db = new ClassicLevel(PACK_DIR, { valueEncoding: "json" });
  await db.open();

  // Escena principal
  await db.put(`!scenes!${SCENE_ID}`, SCENE_DOC);
  console.log(`Escena: !scenes!${SCENE_ID}`);

  // Tiles como embedded documents
  for (const def of TILE_DEFS) {
    const doc = buildTileDoc(def);
    const key = `!scenes.tiles!${SCENE_ID}.${def._id}`;
    doc._key = key;
    await db.put(key, doc);
    console.log(`  Tile: ${def._id}`);
  }

  await db.close();
  console.log(`\nPack construido en: ${PACK_DIR}`);
  console.log(`Total tiles: ${TILE_DEFS.length}`);
}

build().catch(err => { console.error(err); process.exit(1); });
