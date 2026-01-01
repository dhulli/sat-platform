// flatten_sections.ts
import * as fs from "fs";

function extract(json: any): any {
  if (json && Array.isArray(json.items)) return json;
  const blob = json?.data?.blob;
  if (blob && typeof blob === "object") {
    const k = Object.keys(blob)[0];
    if (k && blob[k] && Array.isArray(blob[k].items)) return blob[k];
  }
  throw new Error("Missing items[] in JSON");
}

const inPath = process.argv[2];
const outPath = process.argv[3] || inPath.replace(/\.json$/i, "_flat.json");

if (!inPath) {
  console.error("Usage: npx ts-node flatten_sections.ts <input.json> [output.json]");
  process.exit(1);
}

const raw = JSON.parse(fs.readFileSync(inPath, "utf8"));
const flat = extract(raw);
fs.writeFileSync(outPath, JSON.stringify(flat, null, 2), "utf8");
console.log(`Wrote ${outPath} with ${flat.items.length} items`);
