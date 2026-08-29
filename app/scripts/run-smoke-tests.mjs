#!/usr/bin/env node
/**
 * Barcha smoke testlarni ishga tushiruvchi yordamchi.
 * Har bir testni esbuild API orqali .mjs ga bog'lab, node orqali bajaradi.
 * Windows / Git Bash / Linux / macOS barchasida ishlaydi.
 */
import { readdirSync, mkdtempSync, rmSync } from "node:fs";
import { tmpdir } from "node:os";
import { join, basename } from "node:path";
import { fileURLToPath } from "node:url";
import { spawnSync } from "node:child_process";
import { build } from "esbuild";

const scriptsDir = fileURLToPath(new URL(".", import.meta.url));
const rootDir = fileURLToPath(new URL("../", import.meta.url));

const files = readdirSync(scriptsDir)
  .filter((f) => f.startsWith("smoke-") && f.endsWith(".ts"))
  .sort();

if (files.length === 0) {
  console.log("Smoke testlar topilmadi.");
  process.exit(0);
}

const tmpDir = mkdtempSync(join(tmpdir(), "smoke-"));
let failed = 0;

for (const file of files) {
  const src = join(scriptsDir, file);
  const out = join(tmpDir, `${basename(file, ".ts")}.mjs`);

  try {
    await build({
      entryPoints: [src],
      bundle: true,
      platform: "node",
      format: "esm",
      alias: { "@": "./src" },
      outfile: out,
      absWorkingDir: rootDir,
    });
  } catch (err) {
    console.error(`\n❌ ${file} — bundle failed`);
    console.error(err.message || err);
    failed++;
    continue;
  }

  const run = spawnSync("node", [out], { cwd: rootDir, stdio: "pipe" });
  const stdout = run.stdout.toString();
  const stderr = run.stderr.toString();

  if (run.status !== 0) {
    console.error(`\n❌ ${file} — RUN FAILED`);
    console.error(stdout);
    console.error(stderr);
    failed++;
  } else {
    // Faqat oxirgi qatorni chiqarish (ALL OK / ALL PASS kabi)
    const lines = stdout.trim().split("\n");
    const last = lines[lines.length - 1] || stdout.trim();
    console.log(`✅ ${file}: ${last}`);
  }
}

rmSync(tmpDir, { recursive: true, force: true });

if (failed > 0) {
  console.error(`\n${failed} ta smoke test yiqildi.`);
  process.exit(1);
} else {
  console.log(`\nBarcha ${files.length} ta smoke test o'tdi ✅`);
}
