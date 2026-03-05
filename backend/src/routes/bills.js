import { randomUUID } from "node:crypto";
import { Router } from "express";
import { BILL_STATUS_OPTIONS } from "../config/constants.js";
import { isValidStatus, parseAmount } from "../lib/bills.js";
import { insertBill, insertBillsBulk, listBills, removeBill, updateBillStatus } from "../lib/db.js";

const router = Router();

function parseCurrencyAmountToken(raw) {
  const cleaned = String(raw || "").trim().replace(/[^0-9.,-]/g, "");
  if (!cleaned) {
    return null;
  }
  const normalized = cleaned.includes(",") && !cleaned.includes(".") ? cleaned.replace(",", ".") : cleaned;
  return parseAmount(normalized);
}

function normalizeCurrency(input) {
  const value = String(input || "KM").trim().toUpperCase();
  return value || "KM";
}

router.get("/", async (req, res) => {
  const month = typeof req.query.month === "string" ? req.query.month : "";
  const year = typeof req.query.year === "string" ? req.query.year : "";
  const propertyId = typeof req.query.propertyId === "string" ? req.query.propertyId.trim() : "";

  if (!propertyId) {
    res.status(400).json({ error: "propertyId is required." });
    return;
  }

  try {
    const bills = await listBills({ propertyId, month, year });
    res.json({ bills });
  } catch (error) {
    res.status(500).json({ error: "Failed to load bills." });
  }
});

router.post("/", async (req, res) => {
  const propertyId = String(req.body?.propertyId || "").trim();
  const provider = String(req.body?.provider || "").trim();
  const billDate = String(req.body?.billDate || "").trim();
  const billingMonth = String(req.body?.billingMonth || "").trim();
  const status = String(req.body?.status || "Pending");
  const currency = normalizeCurrency(req.body?.currency);
  const amount = parseAmount(req.body?.amount);

  if (!propertyId || !provider || !billDate || !billingMonth || amount === null) {
    res.status(400).json({ error: "propertyId, provider, amount, billDate and billingMonth are required." });
    return;
  }
  if (!/^\d{4}-\d{2}-\d{2}$/.test(billDate)) {
    res.status(400).json({ error: "billDate must be in YYYY-MM-DD format." });
    return;
  }
  if (!/^\d{4}-\d{2}$/.test(billingMonth)) {
    res.status(400).json({ error: "billingMonth must be in YYYY-MM format." });
    return;
  }
  if (!isValidStatus(status)) {
    res.status(400).json({ error: `status must be one of: ${BILL_STATUS_OPTIONS.join(", ")}` });
    return;
  }

  try {
    const nextBill = await insertBill({
      id: randomUUID(),
      propertyId,
      provider,
      amount,
      currency,
      billDate,
      billingMonth,
      status
    });
    const bills = await listBills({ propertyId });
    res.status(201).json({ bill: nextBill, bills });
  } catch (error) {
    res.status(500).json({ error: "Failed to create bill." });
  }
});

router.post("/import", async (req, res) => {
  const propertyId = String(req.body?.propertyId || "").trim();
  const provider = String(req.body?.provider || "").trim();
  const year = String(req.body?.year || "").trim();
  const status = String(req.body?.status || "Pending").trim();
  const currency = normalizeCurrency(req.body?.currency);
  const csv = String(req.body?.csv || "").trim();

  if (!propertyId || !provider || !csv || !year) {
    res.status(400).json({ error: "propertyId, provider, year and csv are required." });
    return;
  }
  if (!/^\d{4}$/.test(year)) {
    res.status(400).json({ error: "year must be in YYYY format." });
    return;
  }
  if (!isValidStatus(status)) {
    res.status(400).json({ error: `status must be one of: ${BILL_STATUS_OPTIONS.join(", ")}` });
    return;
  }

  const tokens = csv.split(/\r?\n/).map((token) => token.trim()).filter(Boolean);
  if (tokens.length === 0) {
    res.status(400).json({ error: "csv must contain at least one newline-delimited amount." });
    return;
  }
  if (tokens.length > 12) {
    res.status(400).json({ error: "csv can contain at most 12 values for one selected year." });
    return;
  }

  const parsedAmounts = tokens.map(parseCurrencyAmountToken);
  if (parsedAmounts.some((amount) => amount === null)) {
    res.status(400).json({ error: "Each line must be a valid positive amount, e.g. 100 KM." });
    return;
  }

  const nextBills = parsedAmounts.map((amount, index) => {
    const month = String(index + 1).padStart(2, "0");
    return {
      id: randomUUID(),
      propertyId,
      provider,
      amount,
      currency,
      billDate: `${year}-${month}-01`,
      billingMonth: `${year}-${month}`,
      status
    };
  });

  try {
    const inserted = await insertBillsBulk(nextBills);
    const bills = await listBills({ propertyId });
    res.status(201).json({ insertedCount: inserted.length, bills });
  } catch (error) {
    res.status(500).json({ error: "Failed to import bills from CSV." });
  }
});

router.patch("/:id/status", async (req, res) => {
  const id = String(req.params.id || "").trim();
  const propertyId = String(req.body?.propertyId || "").trim();
  const status = String(req.body?.status || "").trim();
  if (!id || !propertyId || !isValidStatus(status)) {
    res.status(400).json({ error: `propertyId and status are required. status must be one of: ${BILL_STATUS_OPTIONS.join(", ")}` });
    return;
  }

  try {
    const bill = await updateBillStatus(id, status, propertyId);
    if (!bill) {
      res.status(404).json({ error: "Bill not found." });
      return;
    }
    const bills = await listBills({ propertyId });
    res.json({ bill, bills });
  } catch (error) {
    res.status(500).json({ error: "Failed to update bill status." });
  }
});

router.delete("/:id", async (req, res) => {
  const id = String(req.params.id || "").trim();
  const propertyId = String(req.query.propertyId || "").trim();
  if (!id || !propertyId) {
    res.status(400).json({ error: "Bill id and propertyId are required." });
    return;
  }

  try {
    const deleted = await removeBill(id, propertyId);
    if (!deleted) {
      res.status(404).json({ error: "Bill not found." });
      return;
    }
    const bills = await listBills({ propertyId });
    res.json({ bills });
  } catch (error) {
    res.status(500).json({ error: "Failed to delete bill." });
  }
});

export default router;
