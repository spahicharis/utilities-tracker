import { Router } from "express";
import { readDb, writeDb } from "../lib/store.js";

const router = Router();

router.get("/", async (_req, res) => {
  const db = await readDb();
  res.json({ providers: db.providers });
});

router.post("/", async (req, res) => {
  const name = String(req.body?.name || "").trim();
  if (!name) {
    res.status(400).json({ error: "Provider name is required." });
    return;
  }

  const db = await readDb();
  const exists = db.providers.some((provider) => provider.toLowerCase() === name.toLowerCase());
  if (exists) {
    res.status(409).json({ error: "Provider already exists." });
    return;
  }

  const next = [...db.providers, name];
  await writeDb({ ...db, providers: next });
  res.status(201).json({ providers: next });
});

router.delete("/:name", async (req, res) => {
  const name = String(req.params.name || "").trim();
  if (!name) {
    res.status(400).json({ error: "Provider name is required." });
    return;
  }

  const decoded = decodeURIComponent(name);
  const db = await readDb();
  const next = db.providers.filter((provider) => provider !== decoded);
  if (next.length === db.providers.length) {
    res.status(404).json({ error: "Provider not found." });
    return;
  }

  await writeDb({ ...db, providers: next });
  res.json({ providers: next });
});

export default router;
