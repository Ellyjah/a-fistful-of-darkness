/**
 * build-journals.mjs
 * Compila los JournalEntry de packs/_source/journals/ en el pack LevelDB packs/journals.
 * Uso: node tools/build-journals.mjs
 */

import { readdir, readFile, mkdir } from "node:fs/promises";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { ClassicLevel } from "classic-level";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const systemRoot = path.resolve(__dirname, "..");
const sourceDir = path.join(systemRoot, "packs", "_source", "journals");
const packDir = path.join(systemRoot, "packs", "journals");

async function loadJson(filePath) {
  return JSON.parse(await readFile(filePath, "utf8"));
}

async function main() {
  // Leer todos los archivos JSON de la carpeta fuente
  let files;
  try {
    files = (await readdir(sourceDir, { withFileTypes: true }))
      .filter(e => e.isFile() && e.name.endsWith(".json"))
      .map(e => e.name);
  } catch {
    console.error(`No se encontró el directorio fuente: ${sourceDir}`);
    process.exitCode = 1;
    return;
  }

  if (files.length === 0) {
    console.log("No hay archivos JSON en el directorio fuente.");
    return;
  }

  // Crear el directorio del pack si no existe
  await mkdir(packDir, { recursive: true });

  // Abrir la base de datos LevelDB
  const db = new ClassicLevel(packDir, { valueEncoding: "utf8" });
  await db.open();

  let journalsWritten = 0;
  let pagesWritten = 0;

  try {
    for (const fileName of files) {
      const doc = await loadJson(path.join(sourceDir, fileName));

      if (!doc._id || !doc._key) {
        console.warn(`  SKIP ${fileName}: falta _id o _key`);
        continue;
      }

      // Carpetas: ficheros que empiezan por "_"
      if (fileName.startsWith("_")) {
        if (doc._key.startsWith("!folders!")) {
          await db.put(doc._key, JSON.stringify(doc));
          console.log(`  OK  ${fileName} (folder)`);
        }
        continue;
      }

      // Extraer las páginas del journal antes de escribir el documento raíz
      const pages = doc.pages ?? [];
      // El root guarda solo los IDs de las páginas (como hace Foundry internamente)
      const pageIds = pages.map(p => p._id).filter(Boolean);
      const docWithPageIds = { ...doc, pages: pageIds };

      // Escribir el journal raíz con array de IDs
      await db.put(doc._key, JSON.stringify(docWithPageIds));
      journalsWritten++;

      // Escribir cada página como entrada separada en el sublevel
      for (const page of pages) {
        if (!page._key) {
          console.warn(`  SKIP página sin _key en ${fileName}`);
          continue;
        }
        await db.put(page._key, JSON.stringify(page));
        pagesWritten++;
      }

      console.log(`  OK  ${fileName} (${pages.length} páginas)`);
    }
  } finally {
    await db.close();
  }

  console.log(`\nDone: ${journalsWritten} journals, ${pagesWritten} páginas escritas en ${packDir}`);
}

main().catch(error => {
  console.error(error);
  process.exitCode = 1;
});
