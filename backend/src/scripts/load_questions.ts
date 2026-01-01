/**
 * load_questions.ts — schema-adaptive with correct placeholder mapping
 * Usage:
 *   npx ts-node -P ./tsconfig.tsnode.json ./src/scripts/load_questions.ts ./data/exam1_rw1_with_tables_flat_v2.json --reset-section --verbose
 *
 * Env (.env): DB_HOST, DB_USER, DB_PASSWORD, DB_NAME, DB_PORT
 */

import * as fs from "fs";
import * as path from "path";
import * as crypto from "crypto";
import * as dotenv from "dotenv";
import mysql from "mysql2/promise";

dotenv.config();

function log(...args: any[]) { console.log(...args); }
function vlog(v: boolean, ...args: any[]) { if (v) console.log(...args); }

function normalizeWhitespace(s: any): string {
  return String(s ?? "").replace(/\s+/g, " ").trim();
}

function computeContentHash(item: any): string {
  const passage = normalizeWhitespace(item?.question_data?.passage);
  const qtext   = normalizeWhitespace(item?.question_text);
  const options = JSON.stringify(item?.options ?? []);
  const answer  = String(item?.correct_answer ?? "");
  const skill   = normalizeWhitespace(item?.skill_category);
  const payload = [qtext, passage, options, answer, skill].join("\n");
  return crypto.createHash("sha256").update(payload, "utf8").digest("hex");
}

function extractSectionRoot(json: any): any {
  if (json && Array.isArray(json.items)) return json;
  const blob = json?.data?.blob;
  if (blob && typeof blob === "object") {
    const ks = Object.keys(blob);
    if (ks.length === 1 && blob[ks[0]] && Array.isArray(blob[ks[0]].items)) {
      return blob[ks[0]];
    }
  }
  throw new Error("Missing items[] in JSON (looked at root and data.blob.*)");
}

type Cols = Record<string, boolean>;

async function readSchema(conn: mysql.Connection, dbName: string): Promise<Cols> {
  const [rows] = await conn.execute(
    "SELECT COLUMN_NAME FROM information_schema.COLUMNS WHERE TABLE_SCHEMA=? AND TABLE_NAME='questions'",
    [dbName]
  );
  const cols: Cols = {};
  for (const r of rows as any[]) cols[String(r.COLUMN_NAME)] = true;
  return cols;
}

type InsertPlan = {
  sql: string;
  paramOrder: string[]; // columns that have a ? placeholder in order
  hasLevel: boolean;
  hasQuestionMeta: boolean;
};

function buildInsertSQL(cols: Cols): InsertPlan {
  // Candidate columns in sane order. Attach an expression if no placeholder is needed.
  const candidates: Array<{ name: string; expr?: string }> = [
    { name: "exam_id" },
    { name: "module" },
    { name: "section_label" },
    { name: "level" },                 // optional
    { name: "difficulty" },
    { name: "skill_category" },
    { name: "question_text" },
    { name: "question_data" },         // JSON as text
    { name: "question_meta" },         // optional JSON
    { name: "options" },               // JSON as text
    { name: "correct_answer" },
    { name: "explanation" },
    { name: "content_hash" },
    { name: "created_at", expr: "NOW()" },  // optional, SQL expr
    { name: "updated_at", expr: "NOW()" },  // optional, SQL expr
  ];

  // Keep only columns that actually exist
  const present = candidates.filter(c => cols[c.name]);

  // Build lists
  const colNames: string[] = [];
  const placeholders: string[] = [];
  const paramOrder: string[] = []; // only for '?' placeholders

  for (const c of present) {
    colNames.push(c.name);
    if (c.expr) {
      placeholders.push(c.expr);
    } else {
      placeholders.push("?");
      paramOrder.push(c.name);
    }
  }

  // Pick a safe column to no-op update in the UPSERT
  let dupNoop = "module";
  if (cols["updated_at"]) dupNoop = "updated_at";
  else if (cols["content_hash"]) dupNoop = "content_hash";
  else if (cols["question_text"]) dupNoop = "question_text";

  const sql = `
    INSERT INTO questions
      (${colNames.join(", ")})
    VALUES
      (${placeholders.join(", ")})
    ON DUPLICATE KEY UPDATE
      ${dupNoop} = ${dupNoop}
  `;

  return {
    sql,
    paramOrder,
    hasLevel: !!cols["level"],
    hasQuestionMeta: !!cols["question_meta"],
  };
}

async function main() {
  const argv = process.argv.slice(2);
  const inputPath = argv[0];
  const verbose = argv.includes("--verbose");
  const resetSection = argv.includes("--reset-section");

  if (!inputPath) throw new Error("Usage: ts-node load_questions.ts <input.json> [--reset-section] [--verbose]");

  log("[loader] Parsing file:", path.resolve(inputPath));
  const raw = JSON.parse(fs.readFileSync(inputPath, "utf8"));
  const section = extractSectionRoot(raw);

  const examId = Number(section.exam_id);
  const moduleName = String(section.module);
  const sectionLabel = String(section.section_label);
  const items: any[] = section.items;

  log(`[loader] Exam ${examId}, module ${moduleName}, section ${sectionLabel}, items ${items.length}`);

  // DB connect
  const host = process.env.DB_HOST || "127.0.0.1";
  const port = Number(process.env.DB_PORT || 3306);
  const user = process.env.DB_USER || "root";
  const password = process.env.DB_PASSWORD || "";
  const database = process.env.DB_NAME || "sat_platform";

  log(`[loader] Connecting to MySQL ${user}@${host}/${database} ...`);
  const conn = await mysql.createConnection({ host, port, user, password, database });
  log("[loader] DB connection OK.");

  // Introspect schema and build plan
  const cols = await readSchema(conn, database);
  log("[loader] Schema columns:", Object.keys(cols).join(", ") || "(none?)");
  const plan = buildInsertSQL(cols);

  // Optional section reset
  if (resetSection) {
    const [res] = await conn.execute(
      "DELETE FROM questions WHERE exam_id=? AND module=? AND section_label=?",
      [examId, moduleName, sectionLabel]
    );
    log("[loader] Deleted existing rows:", (res as any)?.affectedRows ?? 0);
  }

  // In-file dedupe by content_hash
  const seenInFile = new Set<string>();
  let inserted = 0, skipped = 0;

  for (let i = 0; i < items.length; i++) {
    const it = items[i];

    // Basic validation
    if (!it?.question_text || !it?.question_data?.passage || !Array.isArray(it?.options) || it.options.length !== 4) {
      throw new Error(`Item ${i} missing required fields (question_text, passage, 4 options).`);
    }

    const levelVal = Number(it.level ?? it.difficulty ?? 1);
    const difficultyVal = Number(it.difficulty ?? it.level ?? 1);
    const contentHash = cols["content_hash"] ? computeContentHash(it) : "";

    if (contentHash && seenInFile.has(contentHash)) {
      skipped++;
      vlog(verbose, `[loader:skip-dup-in-file] idx=${i} hash=${contentHash}`);
      continue;
    }
    if (contentHash) seenInFile.add(contentHash);

    // Build params strictly in placeholder order
    const params: any[] = [];
    for (const col of plan.paramOrder) {
      switch (col) {
        case "exam_id":         params.push(examId); break;
        case "module":          params.push(moduleName); break;
        case "section_label":   params.push(sectionLabel); break;
        case "level":           params.push(levelVal); break;
        case "difficulty":      params.push(difficultyVal); break;
        case "skill_category":  params.push(String(it.skill_category ?? "")); break;
        case "question_text":   params.push(String(it.question_text ?? "")); break;
        case "question_data":   params.push(JSON.stringify(it.question_data ?? {})); break;
        case "question_meta":   params.push(JSON.stringify(it?.question_data?.meta ?? {})); break;
        case "options":         params.push(JSON.stringify(it.options ?? [])); break;
        case "correct_answer":  params.push(String(it.correct_answer ?? "")); break;
        case "explanation":     params.push(String(it.explanation ?? "")); break;
        case "content_hash":    params.push(contentHash); break;
        // created_at / updated_at use NOW() directly; no param pushed
        default:
          // If your table has something weird, shove an empty string
          params.push("");
      }
    }

    try {
      const [res] = await conn.execute(plan.sql, params);
      const ok = res as mysql.OkPacket;
      if (ok.affectedRows === 1) inserted++;
      else vlog(verbose, `[loader:dup-upsert-noop] idx=${i} hash=${contentHash}`);
    } catch (e: any) {
      if (e?.code === "ER_DUP_ENTRY") {
        skipped++;
        vlog(verbose, `[loader:dup-db-skip] idx=${i} hash=${contentHash}`);
        continue;
      }
      throw e;
    }
  }

  log(`[loader] Done. Inserted: ${inserted}, skipped (in-file/db duplicates): ${skipped}`);
  await conn.end();
}

main().catch(err => {
  console.error("[loader:FATAL]", err?.message || err);
  process.exit(1);
});
