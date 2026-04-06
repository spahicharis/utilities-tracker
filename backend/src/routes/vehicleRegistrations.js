import { randomUUID } from "node:crypto";
import { Router } from "express";
import { VEHICLE_REGISTRATION_STATUS_OPTIONS } from "../config/constants.js";
import { parseAmount } from "../lib/bills.js";
import {
  insertVehicleRegistration,
  isPropertyOwnedByUser,
  listVehicleRegistrations,
  removeVehicleRegistration,
  updateVehicleRegistration
} from "../lib/db.js";

const router = Router();

function normalizeCurrency(input) {
  const value = String(input || "KM").trim().toUpperCase();
  return value || "KM";
}

async function ensurePropertyAccess(res, userId, propertyId) {
  const isOwned = await isPropertyOwnedByUser(propertyId, userId);
  if (!isOwned) {
    res.status(403).json({ error: "You do not have access to this property." });
    return false;
  }
  return true;
}

function isValidVehicleStatus(value) {
  return VEHICLE_REGISTRATION_STATUS_OPTIONS.includes(value);
}

function isValidDate(value) {
  return /^\d{4}-\d{2}-\d{2}$/.test(value);
}

router.get("/", async (req, res) => {
  const userId = String(req.authUser?.id || "").trim();
  const propertyId = typeof req.query.propertyId === "string" ? req.query.propertyId.trim() : "";

  if (!propertyId) {
    res.status(400).json({ error: "propertyId is required." });
    return;
  }

  try {
    if (!(await ensurePropertyAccess(res, userId, propertyId))) {
      return;
    }
    const registrations = await listVehicleRegistrations({ userId, propertyId });
    res.json({ registrations });
  } catch (_error) {
    res.status(500).json({ error: "Failed to load vehicle registrations." });
  }
});

router.post("/", async (req, res) => {
  const userId = String(req.authUser?.id || "").trim();
  const propertyId = String(req.body?.propertyId || "").trim();
  const vehicleName = String(req.body?.vehicleName || "").trim();
  const licencePlate = String(req.body?.licencePlate || "").trim().toUpperCase();
  const registrationNumber = String(req.body?.registrationNumber || "").trim();
  const amount = parseAmount(req.body?.amount);
  const currency = normalizeCurrency(req.body?.currency);
  const dueDate = String(req.body?.dueDate || "").trim();
  const paidDate = String(req.body?.paidDate || "").trim();
  const status = String(req.body?.status || "Due Soon").trim();
  const notes = String(req.body?.notes || "").trim();

  if (!propertyId || !vehicleName || !licencePlate || amount === null || !dueDate) {
    res.status(400).json({ error: "propertyId, vehicleName, licencePlate, amount and dueDate are required." });
    return;
  }
  if (!isValidDate(dueDate)) {
    res.status(400).json({ error: "dueDate must be in YYYY-MM-DD format." });
    return;
  }
  if (paidDate && !isValidDate(paidDate)) {
    res.status(400).json({ error: "paidDate must be in YYYY-MM-DD format." });
    return;
  }
  if (!isValidVehicleStatus(status)) {
    res.status(400).json({ error: `status must be one of: ${VEHICLE_REGISTRATION_STATUS_OPTIONS.join(", ")}` });
    return;
  }

  try {
    if (!(await ensurePropertyAccess(res, userId, propertyId))) {
      return;
    }

    const registration = await insertVehicleRegistration({
      id: randomUUID(),
      propertyId,
      vehicleName,
      licencePlate,
      registrationNumber,
      amount,
      currency,
      dueDate,
      paidDate,
      status,
      notes
    });
    const registrations = await listVehicleRegistrations({ userId, propertyId });
    res.status(201).json({ registration, registrations });
  } catch (_error) {
    res.status(500).json({ error: "Failed to create vehicle registration." });
  }
});

router.patch("/:id", async (req, res) => {
  const userId = String(req.authUser?.id || "").trim();
  const id = String(req.params.id || "").trim();
  const propertyId = String(req.body?.propertyId || "").trim();
  const vehicleName = String(req.body?.vehicleName || "").trim();
  const licencePlate = String(req.body?.licencePlate || "").trim().toUpperCase();
  const registrationNumber = String(req.body?.registrationNumber || "").trim();
  const amount = parseAmount(req.body?.amount);
  const currency = normalizeCurrency(req.body?.currency);
  const dueDate = String(req.body?.dueDate || "").trim();
  const paidDate = String(req.body?.paidDate || "").trim();
  const status = String(req.body?.status || "Due Soon").trim();
  const notes = String(req.body?.notes || "").trim();

  if (!id || !propertyId || !vehicleName || !licencePlate || amount === null || !dueDate) {
    res.status(400).json({ error: "id, propertyId, vehicleName, licencePlate, amount and dueDate are required." });
    return;
  }
  if (!isValidDate(dueDate)) {
    res.status(400).json({ error: "dueDate must be in YYYY-MM-DD format." });
    return;
  }
  if (paidDate && !isValidDate(paidDate)) {
    res.status(400).json({ error: "paidDate must be in YYYY-MM-DD format." });
    return;
  }
  if (!isValidVehicleStatus(status)) {
    res.status(400).json({ error: `status must be one of: ${VEHICLE_REGISTRATION_STATUS_OPTIONS.join(", ")}` });
    return;
  }

  try {
    if (!(await ensurePropertyAccess(res, userId, propertyId))) {
      return;
    }

    const registration = await updateVehicleRegistration(
      id,
      { propertyId, vehicleName, licencePlate, registrationNumber, amount, currency, dueDate, paidDate, status, notes },
      userId
    );
    if (!registration) {
      res.status(404).json({ error: "Vehicle registration not found." });
      return;
    }
    const registrations = await listVehicleRegistrations({ userId, propertyId });
    res.json({ registration, registrations });
  } catch (_error) {
    res.status(500).json({ error: "Failed to update vehicle registration." });
  }
});

router.delete("/:id", async (req, res) => {
  const userId = String(req.authUser?.id || "").trim();
  const id = String(req.params.id || "").trim();
  const propertyId = String(req.query.propertyId || "").trim();

  if (!id || !propertyId) {
    res.status(400).json({ error: "Vehicle registration id and propertyId are required." });
    return;
  }

  try {
    if (!(await ensurePropertyAccess(res, userId, propertyId))) {
      return;
    }

    const deleted = await removeVehicleRegistration(id, propertyId, userId);
    if (!deleted) {
      res.status(404).json({ error: "Vehicle registration not found." });
      return;
    }
    const registrations = await listVehicleRegistrations({ userId, propertyId });
    res.json({ registrations });
  } catch (_error) {
    res.status(500).json({ error: "Failed to delete vehicle registration." });
  }
});

export default router;
