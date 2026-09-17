import { readdir } from "node:fs/promises";
import { join } from "node:path";
import { pathToFileURL } from "node:url";

// Discover nested feature folders once, importing each module as native ESM.
export async function loadModules(directory) {
  const typeDefs = [];
  const resolvers = [];

  async function visit(folder) {
    const entries = await readdir(folder, { withFileTypes: true });
    entries.sort((a, b) => a.name.localeCompare(b.name));
    for (const entry of entries) {
      const filename = join(folder, entry.name);
      if (entry.isDirectory()) {
        await visit(filename);
      } else if (entry.isFile() && ["typeDefs.js", "resolvers.js"].includes(entry.name)) {
        try {
          const module = await import(pathToFileURL(filename).href);
          if (module.default == null) throw new Error("A default export is required.");
          (entry.name === "typeDefs.js" ? typeDefs : resolvers).push(module.default);
        } catch (cause) {
          throw new Error(`Failed to load schema module: ${filename}`, { cause });
        }
      }
    }
  }

  await visit(directory);
  return { typeDefs, resolvers };
}
