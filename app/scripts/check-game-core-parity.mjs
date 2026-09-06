#!/usr/bin/env node
import { readFileSync } from "node:fs";

const pairs = ["bots.ts", "data.ts", "engine.ts", "plan.ts", "types.ts"];
const normalize = (text) => text
  .replaceAll('from "@/lib/format"', 'from "./format"')
  .replaceAll('from "../format"', 'from "./format"')
  .replaceAll("from '@/lib/format'", "from './format'")
  .replaceAll("from '../format'", "from './format'");

const mismatches = pairs.filter((file) => {
  const worker = readFileSync(`workers/src/game/${file}`, "utf8");
  const frontend = readFileSync(`src/lib/game/${file}`, "utf8");
  return !frontend.trim() || !normalize(worker).includes(`export * from "../../../src/lib/game/${file.replace('.ts', '')}";`);
});

if (mismatches.length) {
  console.error(`Game-core drift detected: ${mismatches.join(", ")}`);
  process.exit(1);
}
console.log(`Game-core parity OK (${pairs.length} files)`);
