import { readdir, readFile } from "node:fs/promises";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { ClassicLevel } from "classic-level";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const systemRoot = path.resolve(__dirname, "..");
const sourceRoot = path.join(systemRoot, "packs", "_source");
const dataRoot = path.join(systemRoot, "module", "data");
const systemJsonPath = path.join(systemRoot, "system.json");

const DEFAULT_PACKS_ROOT = "Z:/home/joselu/SSD/foundryvttdata/Data/systems/a-fistful-of-darkness/packs";
const DOC_PATHS = {
  abilities: ["name", "system.description"],
  "crew-abilities": ["name", "system.description"],
  "crew-types": ["name", "system.description", "system.experience_clues", "system.modus_options", "system.contacts", "system.achievements"],
  factions: ["name", "system.description", "system.goal_1", "system.goal_2", "system.assets", "system.quirks", "system.notables", "system.allies", "system.enemies", "system.situation", "system.notes"],
  heritages: ["name", "system.description"],
  items: ["name", "system.description", "system.additional_info"],
  playbooks: ["name", "system.description", "system.subtitle", "system.experience_clues", "system.contacts"],
  "rolltables": ["name", "description", "results"],
  vices: ["name", "system.description"]
};
const FOLDER_PATHS = ["name", "description"];
const TYPE_PREFIX = {
  Item: "!items!",
  Actor: "!actors!",
  RollTable: "!tables!"
};

function isPlainObject(value) {
  return value && typeof value === "object" && !Array.isArray(value);
}

function deepClone(value) {
  return value === undefined ? undefined : JSON.parse(JSON.stringify(value));
}

function deepMergeLocalized(baseValue, overlayValue) {
  if (overlayValue === undefined) return deepClone(baseValue);
  if (Array.isArray(baseValue) || Array.isArray(overlayValue)) {
    return deepClone(overlayValue);
  }
  if (isPlainObject(baseValue) && isPlainObject(overlayValue)) {
    const merged = {};
    const keys = new Set([...Object.keys(baseValue), ...Object.keys(overlayValue)]);
    for (const key of keys) {
      merged[key] = deepMergeLocalized(baseValue[key], overlayValue[key]);
    }
    return merged;
  }
  return deepClone(overlayValue);
}

function getProperty(object, pathExpression) {
  return pathExpression.split(".").reduce((value, key) => value?.[key], object);
}

function setProperty(object, pathExpression, value) {
  const keys = pathExpression.split(".");
  let target = object;
  for (let i = 0; i < keys.length - 1; i += 1) {
    const key = keys[i];
    if (!isPlainObject(target[key])) target[key] = {};
    target = target[key];
  }
  target[keys.at(-1)] = value;
}

function applyPaths(target, source, paths) {
  for (const pathExpression of paths) {
    const value = getProperty(source, pathExpression);
    if (value !== undefined) {
      setProperty(target, pathExpression, deepClone(value));
    }
  }
}

async function loadJson(filePath) {
  return JSON.parse(await readFile(filePath, "utf8"));
}

async function buildSourceCatalog() {
  const catalog = { packs: {}, folders: {} };
  const packDirs = (await readdir(sourceRoot, { withFileTypes: true }))
    .filter(entry => entry.isDirectory())
    .map(entry => entry.name);

  for (const packName of packDirs) {
    const packPath = path.join(sourceRoot, packName);
    const files = (await readdir(packPath, { withFileTypes: true }))
      .filter(entry => entry.isFile() && entry.name.endsWith(".json"))
      .map(entry => entry.name);

    catalog.packs[packName] = {};
    catalog.folders[packName] = {};

    for (const fileName of files) {
      const doc = await loadJson(path.join(packPath, fileName));
      if (typeof doc._key === "string" && doc._key.startsWith("!folders!")) {
        catalog.folders[packName][doc._id] = doc;
        continue;
      }
      if (fileName.startsWith("_")) continue;
      catalog.packs[packName][doc._id] = doc;
    }
  }

  return catalog;
}

function getLocalizedDoc(baseDoc, overlayDoc, lang) {
  return lang === "ca" ? deepMergeLocalized(baseDoc, overlayDoc) : deepClone(baseDoc);
}

async function syncPack({ packName, packType, packsRoot, lang, sourceCatalog, overlayCatalog }) {
  const prefix = TYPE_PREFIX[packType];
  if (!prefix) return { packName, docsUpdated: 0, foldersUpdated: 0 };

  const dbPath = path.join(packsRoot, packName);
  const db = new ClassicLevel(dbPath, { valueEncoding: "utf8" });
  await db.open();

  let docsUpdated = 0;
  let foldersUpdated = 0;

  try {
    const folderDocs = sourceCatalog.folders[packName] ?? {};
    const folderOverlay = overlayCatalog.folders?.[packName] ?? {};

    for (const [id, baseFolder] of Object.entries(folderDocs)) {
      const key = `!folders!${id}`;
      let current;
      try {
        current = JSON.parse(await db.get(key));
      } catch {
        continue;
      }

      const desired = getLocalizedDoc(baseFolder, folderOverlay[id], lang);
      const next = deepClone(current);
      applyPaths(next, desired, FOLDER_PATHS);

      if (JSON.stringify(next) !== JSON.stringify(current)) {
        await db.put(key, JSON.stringify(next));
        foldersUpdated += 1;
      }
    }

    const docs = sourceCatalog.packs[packName] ?? {};
    const overlays = overlayCatalog.packs?.[packName] ?? {};
    const paths = DOC_PATHS[packName] ?? ["name", "system.description"];

    for (const [id, baseDoc] of Object.entries(docs)) {
      const key = `${prefix}${id}`;
      let current;
      try {
        current = JSON.parse(await db.get(key));
      } catch {
        continue;
      }

      const desired = getLocalizedDoc(baseDoc, overlays[id], lang);
      const next = deepClone(current);

      if (packName === "rolltables") {
        applyPaths(next, desired, paths.filter(pathExpression => pathExpression !== "results"));
        if (Array.isArray(desired.results)) {
          next.results = deepClone(desired.results);
        }
      } else {
        applyPaths(next, desired, paths);
      }

      if (JSON.stringify(next) !== JSON.stringify(current)) {
        await db.put(key, JSON.stringify(next));
        docsUpdated += 1;
      }
    }
  } finally {
    await db.close();
  }

  return { packName, docsUpdated, foldersUpdated };
}

async function main() {
  const lang = (process.argv[2] ?? "ca").toLowerCase();
  const packsRoot = process.argv[3] ?? DEFAULT_PACKS_ROOT;
  if (!["es", "ca"].includes(lang)) {
    throw new Error(`Unsupported language: ${lang}`);
  }

  const systemJson = await loadJson(systemJsonPath);
  const packTypes = Object.fromEntries(systemJson.packs.map(pack => [pack.name, pack.type]));
  const sourceCatalog = await buildSourceCatalog();
  const overlayCatalog = lang === "ca"
    ? await loadJson(path.join(dataRoot, "compendium-overlay.ca.json"))
    : { packs: {}, folders: {} };

  const results = [];
  for (const packName of Object.keys(sourceCatalog.packs)) {
    const packType = packTypes[packName];
    if (!packType) continue;
    try {
      const result = await syncPack({ packName, packType, packsRoot, lang, sourceCatalog, overlayCatalog });
      results.push(result);
    } catch (error) {
      results.push({ packName, docsUpdated: 0, foldersUpdated: 0, error: error.message });
    }
  }

  for (const result of results) {
    if (result.error) {
      console.log(`${result.packName}: ERROR ${result.error}`);
      continue;
    }
    console.log(`${result.packName}: docs=${result.docsUpdated}, folders=${result.foldersUpdated}`);
  }
}

main().catch(error => {
  console.error(error);
  process.exitCode = 1;
});
