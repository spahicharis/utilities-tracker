import { Router } from "express";
import { addProvider, listProviders, removeProvider } from "../lib/db.js";

const router = Router();

router.get("/", async (_req, res) => {
  try {
    const providers = await listProviders();
    res.json({ providers });
  } catch (error) {
    res.status(500).json({ error: "Failed to load providers." });
  }
});

router.post("/", async (req, res) => {
  const name = String(req.body?.name || "").trim();
  if (!name) {
    res.status(400).json({ error: "Provider name is required." });
    return;
  }

  try {
    const created = await addProvider(name);
    if (!created) {
      res.status(409).json({ error: "Provider already exists." });
      return;
    }
    const providers = await listProviders();
    res.status(201).json({ providers });
  } catch (error) {
    res.status(500).json({ error: "Failed to add provider." });
  }
});

router.delete("/:name", async (req, res) => {
  const name = String(req.params.name || "").trim();
  if (!name) {
    res.status(400).json({ error: "Provider name is required." });
    return;
  }

  const decoded = decodeURIComponent(name);
  try {
    const deleted = await removeProvider(decoded);
    if (!deleted) {
      res.status(404).json({ error: "Provider not found." });
      return;
    }
    const providers = await listProviders();
    res.json({ providers });
  } catch (error) {
    res.status(500).json({ error: "Failed to delete provider." });
  }
});

export default router;
