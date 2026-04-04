import { mkdir, readdir, readFile, writeFile } from "node:fs/promises";
import path from "node:path";
import { fileURLToPath } from "node:url";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const systemRoot = path.resolve(__dirname, "..");
const sourceRoot = path.join(systemRoot, "packs", "_source");
const outputDir = path.join(systemRoot, "module", "data");
const outputFile = path.join(outputDir, "compendium-base.es.json");

function isPlainObject(value) {
  return value && typeof value === "object" && !Array.isArray(value);
}

function extractLocalizable(value) {
  if (typeof value === "string") {
    return value.trim() ? value : undefined;
  }

  if (Array.isArray(value)) {
    const items = value.map(extractLocalizable).filter(item => item !== undefined);
    return items.length ? items : undefined;
  }

  if (isPlainObject(value)) {
    const out = {};
    for (const [key, nested] of Object.entries(value)) {
      if (key === "_stats" || key === "flags" || key === "ownership") continue;
      const extracted = extractLocalizable(nested);
      if (extracted !== undefined) {
        out[key] = extracted;
      }
    }
    return Object.keys(out).length ? out : undefined;
  }

  return undefined;
}

function extractDocumentCatalog(doc, packName) {
  const entry = {};

  if (typeof doc.name === "string" && doc.name.trim()) {
    entry.name = doc.name;
  }

  const systemData = extractLocalizable(doc.system ?? {});
  if (systemData) {
    entry.system = systemData;
  }

  if (packName === "rolltables") {
    if (typeof doc.description === "string" && doc.description.trim()) {
      entry.description = doc.description;
    }

    if (Array.isArray(doc.results)) {
      const results = doc.results
        .filter(result => result?._id)
        .map(result => ({
          _id: result._id,
          type: result.type,
          text: result.text,
          img: result.img,
          weight: result.weight,
          range: result.range,
          drawn: result.drawn,
          description: result.description,
          flags: result.flags ?? {}
        }));

      if (results.length) {
        entry.results = results;
      }
    }
  }

  return entry;
}

function extractFolderCatalog(doc) {
  const entry = {};

  if (typeof doc.name === "string" && doc.name.trim()) {
    entry.name = doc.name;
  }

  if (typeof doc.description === "string" && doc.description.trim()) {
    entry.description = doc.description;
  }

  return entry;
}

async function main() {
  const catalog = {
    generatedAt: new Date().toISOString(),
    packs: {},
    folders: {}
  };

  const packDirs = (await readdir(sourceRoot, { withFileTypes: true }))
    .filter(entry => entry.isDirectory())
    .map(entry => entry.name)
    .sort((a, b) => a.localeCompare(b, "es"));

  for (const packName of packDirs) {
    const packPath = path.join(sourceRoot, packName);
    const files = (await readdir(packPath, { withFileTypes: true }))
      .filter(entry => entry.isFile() && entry.name.endsWith(".json"))
      .map(entry => entry.name)
      .sort((a, b) => a.localeCompare(b, "es"));

    const packCatalog = {};
    const folderCatalog = {};

    for (const fileName of files) {
      const filePath = path.join(packPath, fileName);
      const raw = await readFile(filePath, "utf8");
      const doc = JSON.parse(raw);
      const docId = doc._id ?? path.basename(fileName, ".json");

      if (typeof doc._key === "string" && doc._key.startsWith("!folders!")) {
        const folderEntry = extractFolderCatalog(doc);
        if (Object.keys(folderEntry).length) {
          folderCatalog[docId] = folderEntry;
        }
        continue;
      }

      if (fileName.startsWith("_")) continue;

      const entry = extractDocumentCatalog(doc, packName);
      if (Object.keys(entry).length) {
        packCatalog[docId] = entry;
      }
    }

    catalog.packs[packName] = packCatalog;
    catalog.folders[packName] = folderCatalog;
  }

  await mkdir(outputDir, { recursive: true });
  await writeFile(outputFile, JSON.stringify(catalog, null, 2) + "\n", "utf8");
  console.log(`Compendium catalog written to ${outputFile}`);
}

main().catch(error => {
  console.error(error);
  process.exitCode = 1;
});
