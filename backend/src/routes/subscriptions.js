import { randomUUID } from "node:crypto";
import { Router } from "express";
import {
  SUBSCRIPTION_BILLING_CYCLES,
  SUBSCRIPTION_STATUS_OPTIONS
} from "../config/constants.js";
import {
  insertSubscription,
  isPropertyOwnedByUser,
  listSubscriptions,
  removeSubscription,
  updateSubscription
} from "../lib/db.js";
import { parseAmount } from "../lib/bills.js";

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

function isValidBillingCycle(value) {
  return SUBSCRIPTION_BILLING_CYCLES.includes(value);
}

function isValidSubscriptionStatus(value) {
  return SUBSCRIPTION_STATUS_OPTIONS.includes(value);
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
    const subscriptions = await listSubscriptions({ userId, propertyId });
    res.json({ subscriptions });
  } catch (_error) {
    res.status(500).json({ error: "Failed to load subscriptions." });
  }
});

router.post("/", async (req, res) => {
  const userId = String(req.authUser?.id || "").trim();
  const propertyId = String(req.body?.propertyId || "").trim();
  const name = String(req.body?.name || "").trim();
  const amount = parseAmount(req.body?.amount);
  const currency = normalizeCurrency(req.body?.currency);
  const billingCycle = String(req.body?.billingCycle || "Monthly").trim();
  const nextBillingDate = String(req.body?.nextBillingDate || "").trim();
  const status = String(req.body?.status || "Active").trim();

  if (!propertyId || !name || amount === null || !nextBillingDate) {
    res.status(400).json({ error: "propertyId, name, amount and nextBillingDate are required." });
    return;
  }
  if (!/^\d{4}-\d{2}-\d{2}$/.test(nextBillingDate)) {
    res.status(400).json({ error: "nextBillingDate must be in YYYY-MM-DD format." });
    return;
  }
  if (!isValidBillingCycle(billingCycle)) {
    res.status(400).json({ error: `billingCycle must be one of: ${SUBSCRIPTION_BILLING_CYCLES.join(", ")}` });
    return;
  }
  if (!isValidSubscriptionStatus(status)) {
    res.status(400).json({ error: `status must be one of: ${SUBSCRIPTION_STATUS_OPTIONS.join(", ")}` });
    return;
  }

  try {
    if (!(await ensurePropertyAccess(res, userId, propertyId))) {
      return;
    }

    const subscription = await insertSubscription({
      id: randomUUID(),
      propertyId,
      name,
      amount,
      currency,
      billingCycle,
      nextBillingDate,
      status
    });
    const subscriptions = await listSubscriptions({ userId, propertyId });
    res.status(201).json({ subscription, subscriptions });
  } catch (_error) {
    res.status(500).json({ error: "Failed to create subscription." });
  }
});

router.patch("/:id", async (req, res) => {
  const userId = String(req.authUser?.id || "").trim();
  const id = String(req.params.id || "").trim();
  const propertyId = String(req.body?.propertyId || "").trim();
  const name = String(req.body?.name || "").trim();
  const amount = parseAmount(req.body?.amount);
  const currency = normalizeCurrency(req.body?.currency);
  const billingCycle = String(req.body?.billingCycle || "Monthly").trim();
  const nextBillingDate = String(req.body?.nextBillingDate || "").trim();
  const status = String(req.body?.status || "Active").trim();

  if (!id || !propertyId || !name || amount === null || !nextBillingDate) {
    res.status(400).json({ error: "id, propertyId, name, amount and nextBillingDate are required." });
    return;
  }
  if (!/^\d{4}-\d{2}-\d{2}$/.test(nextBillingDate)) {
    res.status(400).json({ error: "nextBillingDate must be in YYYY-MM-DD format." });
    return;
  }
  if (!isValidBillingCycle(billingCycle)) {
    res.status(400).json({ error: `billingCycle must be one of: ${SUBSCRIPTION_BILLING_CYCLES.join(", ")}` });
    return;
  }
  if (!isValidSubscriptionStatus(status)) {
    res.status(400).json({ error: `status must be one of: ${SUBSCRIPTION_STATUS_OPTIONS.join(", ")}` });
    return;
  }

  try {
    if (!(await ensurePropertyAccess(res, userId, propertyId))) {
      return;
    }

    const subscription = await updateSubscription(
      id,
      { propertyId, name, amount, currency, billingCycle, nextBillingDate, status },
      userId
    );
    if (!subscription) {
      res.status(404).json({ error: "Subscription not found." });
      return;
    }
    const subscriptions = await listSubscriptions({ userId, propertyId });
    res.json({ subscription, subscriptions });
  } catch (_error) {
    res.status(500).json({ error: "Failed to update subscription." });
  }
});

router.delete("/:id", async (req, res) => {
  const userId = String(req.authUser?.id || "").trim();
  const id = String(req.params.id || "").trim();
  const propertyId = String(req.query.propertyId || "").trim();

  if (!id || !propertyId) {
    res.status(400).json({ error: "Subscription id and propertyId are required." });
    return;
  }

  try {
    if (!(await ensurePropertyAccess(res, userId, propertyId))) {
      return;
    }

    const deleted = await removeSubscription(id, propertyId, userId);
    if (!deleted) {
      res.status(404).json({ error: "Subscription not found." });
      return;
    }
    const subscriptions = await listSubscriptions({ userId, propertyId });
    res.json({ subscriptions });
  } catch (_error) {
    res.status(500).json({ error: "Failed to delete subscription." });
  }
});

export default router;
