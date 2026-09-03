#!/usr/bin/env node
import { readFileSync } from "node:fs";

const pairs = ["bots.ts", "data.ts", "engine.ts", "plan.ts", "types.ts"];
const normalize = (text) => text
  .replaceAll('from "@/lib/format"', 'from "./format"')
  .replaceAll('from "../format"', 'from "./format"')
  .replaceAll("from '@/lib/format'", "from './format'")
  .replaceAll("from '../format'", "from './format'");

const mismatches = pairs.filter((file) => {
  const frontend = readFileSync(`src/lib/game/${file}`, "utf8");
  const worker = readFileSync(`workers/src/game/${file}`, "utf8");
  return normalize(frontend) !== normalize(worker);
});

if (mismatches.length) {
  console.error(`Game-core drift detected: ${mismatches.join(", ")}`);
  process.exit(1);
}
console.log(`Game-core parity OK (${pairs.length} files)`);
