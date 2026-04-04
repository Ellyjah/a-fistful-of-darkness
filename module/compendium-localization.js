const SYSTEM_ID = "a-fistful-of-darkness";
const CATALOG_VERSION = "14";
const SUPPORTED_LANGS = new Set(["es", "ca"]);
const PACK_NAMES = [
  "playbooks",
  "crew-types",
  "items",
  "vices",
  "factions",
  "abilities",
  "crew-abilities",
  "heritages",
  "rolltables"
];
const LOCALIZED_DOC_PATHS = {
  abilities: ["name", "system.description"],
  "crew-abilities": ["name", "system.description"],
  "crew-types": ["name", "system.description", "system.experience_clues", "system.modus_options", "system.contacts", "system.achievements"],
  factions: ["name", "system.description", "system.goal_1", "system.goal_2", "system.assets", "system.quirks", "system.notables", "system.allies", "system.enemies", "system.situation", "system.notes"],
  heritages: ["name", "system.description"],
  items: ["name", "system.description", "system.additional_info"],
  playbooks: ["name", "system.description", "system.subtitle", "system.experience_clues", "system.contacts"],
  rolltables: ["name", "description", "results"],
  vices: ["name", "system.description"]
};
const LOCALIZED_FOLDER_PATHS = ["name", "description"];
const _state = {
  baseCatalog: null,
  caOverlay: null,
  patched: false
};

function getTargetLanguage() {
  const lang = game.i18n?.lang ?? "es";
  return SUPPORTED_LANGS.has(lang) ? lang : "es";
}

async function fetchJsonAsset(path) {
  const response = await fetch(path);
  if (!response.ok) {
    throw new Error(`Failed to load ${path}: ${response.status}`);
  }
  return response.json();
}

function isPlainObject(value) {
  return value && typeof value === "object" && !Array.isArray(value);
}

function deepMergeLocalized(baseValue, overlayValue) {
  if (overlayValue === undefined) return foundry.utils.deepClone(baseValue);
  if (Array.isArray(baseValue) || Array.isArray(overlayValue)) {
    return foundry.utils.deepClone(overlayValue);
  }
  if (isPlainObject(baseValue) && isPlainObject(overlayValue)) {
    const merged = {};
    const keys = new Set([...Object.keys(baseValue), ...Object.keys(overlayValue)]);
    for (const key of keys) {
      merged[key] = deepMergeLocalized(baseValue[key], overlayValue[key]);
    }
    return merged;
  }
  return foundry.utils.deepClone(overlayValue);
}

function mergeObjects(baseObject = {}, overlayObject = {}) {
  const merged = foundry.utils.deepClone(baseObject);
  for (const [key, value] of Object.entries(overlayObject)) {
    merged[key] = foundry.utils.deepClone(value);
  }
  return merged;
}

function mergeRollTableResults(baseResults = [], overlayResults = []) {
  const overlayById = new Map(overlayResults.filter(result => result?._id).map(result => [result._id, result]));
  return baseResults.map(result => {
    const overlay = overlayById.get(result._id);
    return overlay ? mergeObjects(result, overlay) : foundry.utils.deepClone(result);
  });
}

function pickLocalizedSubset(source, paths) {
  const subset = {};
  for (const path of paths) {
    const value = foundry.utils.getProperty(source, path);
    if (value !== undefined) {
      foundry.utils.setProperty(subset, path, foundry.utils.deepClone(value));
    }
  }
  return subset;
}

function getLocalizedSubset(source, packName, { isFolder = false } = {}) {
  const paths = isFolder ? LOCALIZED_FOLDER_PATHS : (LOCALIZED_DOC_PATHS[packName] ?? ["name", "system.description"]);
  return pickLocalizedSubset(source, paths);
}

function getPackName(packOrCollection) {
  const candidates = [];
  if (typeof packOrCollection === "string") candidates.push(packOrCollection);
  else {
    candidates.push(
      packOrCollection?.collection,
      packOrCollection?.metadata?.id,
      packOrCollection?.metadata?.name,
      packOrCollection?.pack,
      packOrCollection?.documentName
    );
  }

  for (const candidate of candidates) {
    if (typeof candidate !== "string" || !candidate) continue;
    const normalized = candidate.startsWith("Compendium.") ? candidate.slice("Compendium.".length) : candidate;
    if (normalized.startsWith(`${SYSTEM_ID}.`)) {
      return normalized.split(".").at(-1);
    }
  }

  return null;
}

function getOverlayCatalog(targetLanguage) {
  return targetLanguage === "ca" ? (_state.caOverlay ?? { packs: {}, folders: {} }) : { packs: {}, folders: {} };
}

function getDesiredSubset(baseEntry, overlayEntry, targetLanguage) {
  return targetLanguage === "ca"
    ? deepMergeLocalized(baseEntry, overlayEntry)
    : foundry.utils.deepClone(baseEntry);
}

function getLocalizedRollTableSubset(baseEntry, overlayEntry, targetLanguage) {
  const desired = getLocalizedSubset(
    getDesiredSubset(baseEntry, overlayEntry, targetLanguage),
    "rolltables"
  );
  if (Array.isArray(baseEntry?.results)) {
    desired.results = targetLanguage === "ca"
      ? mergeRollTableResults(baseEntry.results, overlayEntry?.results ?? [])
      : foundry.utils.deepClone(baseEntry.results);
  }
  return desired;
}

function getLocalizedDocSubset(packName, docId, targetLanguage, { isFolder = false } = {}) {
  const baseEntries = isFolder ? (_state.baseCatalog?.folders?.[packName] ?? {}) : (_state.baseCatalog?.packs?.[packName] ?? {});
  const overlayEntries = isFolder ? (getOverlayCatalog(targetLanguage)?.folders?.[packName] ?? {}) : (getOverlayCatalog(targetLanguage)?.packs?.[packName] ?? {});
  const baseEntry = baseEntries[docId];
  if (!baseEntry) return null;

  if (!isFolder && packName === "rolltables") {
    return getLocalizedRollTableSubset(baseEntry, overlayEntries[docId], targetLanguage);
  }

  return getLocalizedSubset(
    getDesiredSubset(baseEntry, overlayEntries[docId], targetLanguage),
    packName,
    { isFolder }
  );
}

function resolvePackNameByDocumentId(docId, { isFolder = false } = {}) {
  const source = isFolder ? (_state.baseCatalog?.folders ?? {}) : (_state.baseCatalog?.packs ?? {});
  for (const [packName, entries] of Object.entries(source)) {
    if (entries?.[docId]) return packName;
  }
  return null;
}

function resolveDocIdByName(packName, name) {
  if (!name || !packName) return null;
  // Primero buscar por nombre en castellano (catálogo base)
  const baseEntries = _state.baseCatalog?.packs?.[packName] ?? {};
  for (const [id, entry] of Object.entries(baseEntries)) {
    if (entry.name === name) return id;
  }
  // Si no se encuentra, buscar por nombre en el overlay (catalán u otros idiomas)
  const caEntries = _state.caOverlay?.packs?.[packName] ?? {};
  for (const [id, entry] of Object.entries(caEntries)) {
    if (entry.name === name) return id;
  }
  return null;
}

function applyLocalizedSubsetToSource(target, subset) {
  if (!target || !subset || !Object.keys(subset).length) return;
  if (typeof target.updateSource === "function") {
    target.updateSource(foundry.utils.deepClone(subset));
    return;
  }

  const source = target._source ?? target;
  foundry.utils.mergeObject(source, foundry.utils.deepClone(subset), { inplace: true, overwrite: true });
}

function localizeIndexResult(pack, index) {
  const packName = getPackName(pack);
  const targetLanguage = getTargetLanguage();
  if (!packName || !index) return index;

  const entries = Array.isArray(index)
    ? index
    : typeof index.values === "function"
      ? [...index.values()]
      : Object.values(index);

  for (const entry of entries) {
    const docId = entry?._id ?? entry?.id;
    if (!docId) continue;
    const subset = getLocalizedDocSubset(packName, docId, targetLanguage);
    if (!subset?.name) continue;
    entry.name = subset.name;
  }

  return index;
}

function localizeFolderCollection(pack) {
  const packName = getPackName(pack);
  const targetLanguage = getTargetLanguage();
  if (!packName) return;

  for (const folder of pack.folders?.contents ?? []) {
    const subset = getLocalizedDocSubset(packName, folder.id, targetLanguage, { isFolder: true });
    applyLocalizedSubsetToSource(folder, subset);
  }
}

function localizeDocumentInstance(pack, doc) {
  const packName = getPackName(pack);
  const targetLanguage = getTargetLanguage();
  const docId = doc?.id ?? doc?._id ?? doc?._source?._id ?? resolveDocIdByName(packName, doc?.name);
  if (!packName || !docId) return doc;

  const subset = getLocalizedDocSubset(packName, docId, targetLanguage);
  applyLocalizedSubsetToSource(doc, subset);
  return doc;
}

export async function localizePackDocument(document) {
  const collection = document?.pack
    ?? document?.compendium?.collection
    ?? document?.collection?.collection
    ?? document?.metadata?.id;
  if (!collection) return document;
  await ensureCatalogsLoaded();
  return localizeDocumentInstance({ collection }, document);
}

export async function getLocalizedPackDocumentData(document) {
  const collection = document?.pack
    ?? document?.compendium?.collection
    ?? document?.collection?.collection
    ?? document?.metadata?.id;
  if (!collection) return document?.toObject?.() ?? document;

  await ensureCatalogsLoaded();
  let docId = document?.id ?? document?._id ?? document?._source?._id;
  const packName = getPackName({ collection }) ?? resolvePackNameByDocumentId(docId);
  if (!packName) return document?.toObject?.() ?? document;
  if (!docId) docId = resolveDocIdByName(packName, document?.name);
  if (!docId) return document?.toObject?.() ?? document;

  const targetLanguage = getTargetLanguage();
  const localizedData = document.toObject ? document.toObject() : foundry.utils.deepClone(document);
  const subset = getLocalizedDocSubset(packName, docId, targetLanguage);
  console.log(`AFoD | getLocalizedPackDocumentData | pack=${packName} lang=${targetLanguage} id=${docId} name=${document.name} subset=`, subset ? Object.keys(subset) : null);
  if (subset && Object.keys(subset).length) {
    foundry.utils.mergeObject(localizedData, foundry.utils.deepClone(subset), { inplace: true, overwrite: true });
  }
  return localizedData;
}

async function ensureCatalogsLoaded() {
  if (!_state.baseCatalog) {
    _state.baseCatalog = await fetchJsonAsset(`systems/${SYSTEM_ID}/module/data/compendium-base.es.json`);
  }
  if (!_state.caOverlay) {
    _state.caOverlay = await fetchJsonAsset(`systems/${SYSTEM_ID}/module/data/compendium-overlay.ca.json`);
  }
}

function installCompendiumPatches() {
  if (_state.patched) return;
  const proto = CONFIG?.Compendium?.collectionClass?.prototype
    ?? foundry?.documents?.collections?.CompendiumCollection?.prototype
    ?? globalThis.CompendiumCollection?.prototype;
  if (!proto) {
    console.warn("A Fistful of Darkness | No se pudo parchear la localización de compendios.");
    return;
  }

  const originalGetIndex = proto.getIndex;
  const originalGetDocument = proto.getDocument;
  const originalGetDocuments = proto.getDocuments;

  proto.getIndex = async function(...args) {
    const index = await originalGetIndex.apply(this, args);
    localizeFolderCollection(this);
    return localizeIndexResult(this, index);
  };

  proto.getDocument = async function(...args) {
    const doc = await originalGetDocument.apply(this, args);
    localizeFolderCollection(this);
    return doc;
  };

  proto.getDocuments = async function(...args) {
    const docs = await originalGetDocuments.apply(this, args);
    localizeFolderCollection(this);
    return docs;
  };

  _state.patched = true;
}

function localizeLoadedPacks() {
  for (const packName of PACK_NAMES) {
    const pack = game.packs.get(`${SYSTEM_ID}.${packName}`);
    if (!pack) continue;
    localizeFolderCollection(pack);

    const index = pack.index;
    if (index) localizeIndexResult(pack, index);
  }
}

export async function syncCompendiumLocalization() {
  if (!game.user.isGM) return;

  await ensureCatalogsLoaded();
  installCompendiumPatches();
  localizeLoadedPacks();
  Hooks.on("renderCompendiumDirectory", () => localizeLoadedPacks());

  const targetLanguage = getTargetLanguage();
  await game.settings.set(SYSTEM_ID, "compendiumLocalizationVersion", CATALOG_VERSION);
  await game.settings.set(SYSTEM_ID, "compendiumLocalizedLanguage", targetLanguage);
  console.log(`A Fistful of Darkness | Localización de compendios preparada para idioma: ${targetLanguage}`);
}
