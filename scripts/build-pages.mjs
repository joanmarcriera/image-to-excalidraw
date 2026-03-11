import { cp, mkdir, rm, writeFile } from "node:fs/promises";
import path from "node:path";
import { fileURLToPath } from "node:url";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const rootDir = path.resolve(__dirname, "..");
const distDir = path.join(rootDir, "dist");

async function copyIntoDist(sourceRelativePath, targetRelativePath = sourceRelativePath) {
  await cp(
    path.join(rootDir, sourceRelativePath),
    path.join(distDir, targetRelativePath),
    { recursive: true },
  );
}

await rm(distDir, { force: true, recursive: true });
await mkdir(distDir, { recursive: true });

await copyIntoDist("public", ".");
await copyIntoDist("examples");
await copyIntoDist("lib");
await writeFile(path.join(distDir, ".nojekyll"), "");

console.log("Built static site into dist/");
