import { Router } from "express";
import { addProperty, listProperties, removeProperty, updateProperty } from "../lib/db.js";

const router = Router();

router.get("/", async (_req, res) => {
  try {
    const properties = await listProperties();
    res.json({ properties });
  } catch (_error) {
    res.status(500).json({ error: "Failed to load properties." });
  }
});

router.post("/", async (req, res) => {
  const name = String(req.body?.name || "").trim();
  if (!name) {
    res.status(400).json({ error: "Property name is required." });
    return;
  }

  try {
    const created = await addProperty(name);
    if (!created) {
      res.status(409).json({ error: "Property already exists." });
      return;
    }
    const properties = await listProperties();
    res.status(201).json({ property: created, properties });
  } catch (_error) {
    res.status(500).json({ error: "Failed to add property." });
  }
});

router.patch("/:id", async (req, res) => {
  const id = String(req.params.id || "").trim();
  const name = String(req.body?.name || "").trim();
  if (!id || !name) {
    res.status(400).json({ error: "Property id and name are required." });
    return;
  }

  try {
    const updated = await updateProperty(id, name);
    if (updated.status === "not_found") {
      res.status(404).json({ error: "Property not found." });
      return;
    }
    if (updated.status === "conflict") {
      res.status(409).json({ error: "Property already exists." });
      return;
    }
    const properties = await listProperties();
    res.json({ property: updated.property, properties });
  } catch (_error) {
    res.status(500).json({ error: "Failed to update property." });
  }
});

router.delete("/:id", async (req, res) => {
  const id = String(req.params.id || "").trim();
  if (!id) {
    res.status(400).json({ error: "Property id is required." });
    return;
  }

  try {
    const deleted = await removeProperty(id);
    if (deleted.status === "not_found") {
      res.status(404).json({ error: "Property not found." });
      return;
    }
    if (deleted.status === "has_bills") {
      res.status(409).json({ error: "Property has bills and cannot be deleted." });
      return;
    }
    const properties = await listProperties();
    res.json({ properties });
  } catch (_error) {
    res.status(500).json({ error: "Failed to delete property." });
  }
});

export default router;

