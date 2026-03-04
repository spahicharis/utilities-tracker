import { mkdir, readFile, writeFile } from "node:fs/promises";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { DEFAULT_PROVIDERS, TRACKING_START_YEAR } from "../config/constants.js";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const dataDir = path.resolve(__dirname, "../../data");
const dataFilePath = path.join(dataDir, "db.json");

const defaultDb = {
  providers: DEFAULT_PROVIDERS,
  bills: [],
  meta: {
    trackingStartYear: TRACKING_START_YEAR
  }
};

export async function readDb() {
  await mkdir(dataDir, { recursive: true });
  try {
    const raw = await readFile(dataFilePath, "utf-8");
    const parsed = JSON.parse(raw);
    return {
      providers: Array.isArray(parsed.providers) ? parsed.providers : defaultDb.providers,
      bills: Array.isArray(parsed.bills) ? parsed.bills : [],
      meta: parsed.meta ?? defaultDb.meta
    };
  } catch (_error) {
    await writeDb(defaultDb);
    return defaultDb;
  }
}

export async function writeDb(payload) {
  await mkdir(dataDir, { recursive: true });
  await writeFile(dataFilePath, JSON.stringify(payload, null, 2), "utf-8");
}
