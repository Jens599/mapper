import { copyFile, mkdir } from "node:fs/promises";
import { dirname, resolve } from "node:path";
import { fileURLToPath } from "node:url";

const root = resolve(dirname(fileURLToPath(import.meta.url)), "..");
const source = resolve(root, "node_modules/maplibre-gl/dist");
const target = resolve(root, "public");

await mkdir(target, { recursive: true });
await Promise.all([
  copyFile(
    resolve(source, "maplibre-gl-worker.mjs"),
    resolve(target, "maplibre-gl-worker.mjs"),
  ),
  copyFile(
    resolve(source, "maplibre-gl-shared.mjs"),
    resolve(target, "maplibre-gl-shared.mjs"),
  ),
]);
