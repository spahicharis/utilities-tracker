import { Router } from "express";
import { addProvider, listProviders, removeProvider, updateProvider } from "../lib/db.js";

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
  const address = String(req.body?.address || "").trim();
  const logo = String(req.body?.logo || "").trim();
  const phone = String(req.body?.phone || "").trim();
  if (!name) {
    res.status(400).json({ error: "Provider name is required." });
    return;
  }

  try {
    const created = await addProvider({ name, address, logo, phone });
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

router.patch("/:name", async (req, res) => {
  const name = String(req.params.name || "").trim();
  const decoded = decodeURIComponent(name);
  const nextName = String(req.body?.name || "").trim();
  const address = String(req.body?.address || "").trim();
  const logo = String(req.body?.logo || "").trim();
  const phone = String(req.body?.phone || "").trim();

  if (!decoded || !nextName) {
    res.status(400).json({ error: "Provider name is required." });
    return;
  }

  try {
    const updated = await updateProvider(decoded, { name: nextName, address, logo, phone });
    if (updated.status === "not_found") {
      res.status(404).json({ error: "Provider not found." });
      return;
    }
    if (updated.status === "conflict") {
      res.status(409).json({ error: "Provider already exists." });
      return;
    }

    const providers = await listProviders();
    res.json({ provider: updated.provider, providers });
  } catch (error) {
    res.status(500).json({ error: "Failed to update provider." });
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
