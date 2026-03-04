import { randomUUID } from "node:crypto";
import { Router } from "express";
import { BILL_STATUS_OPTIONS } from "../config/constants.js";
import { isValidStatus, parseAmount } from "../lib/bills.js";
import { insertBill, listBills, removeBill, updateBillStatus } from "../lib/db.js";

const router = Router();

router.get("/", async (req, res) => {
  const month = typeof req.query.month === "string" ? req.query.month : "";
  const year = typeof req.query.year === "string" ? req.query.year : "";

  try {
    const bills = await listBills({ month, year });
    res.json({ bills });
  } catch (error) {
    res.status(500).json({ error: "Failed to load bills." });
  }
});

router.post("/", async (req, res) => {
  const provider = String(req.body?.provider || "").trim();
  const billDate = String(req.body?.billDate || "").trim();
  const billingMonth = String(req.body?.billingMonth || "").trim();
  const status = String(req.body?.status || "Pending");
  const amount = parseAmount(req.body?.amount);

  if (!provider || !billDate || !billingMonth || amount === null) {
    res.status(400).json({ error: "provider, amount, billDate and billingMonth are required." });
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
      provider,
      amount,
      billDate,
      billingMonth,
      status
    });
    const bills = await listBills();
    res.status(201).json({ bill: nextBill, bills });
  } catch (error) {
    res.status(500).json({ error: "Failed to create bill." });
  }
});

router.patch("/:id/status", async (req, res) => {
  const id = String(req.params.id || "").trim();
  const status = String(req.body?.status || "").trim();
  if (!id || !isValidStatus(status)) {
    res.status(400).json({ error: `status must be one of: ${BILL_STATUS_OPTIONS.join(", ")}` });
    return;
  }

  try {
    const bill = await updateBillStatus(id, status);
    if (!bill) {
      res.status(404).json({ error: "Bill not found." });
      return;
    }
    const bills = await listBills();
    res.json({ bill, bills });
  } catch (error) {
    res.status(500).json({ error: "Failed to update bill status." });
  }
});

router.delete("/:id", async (req, res) => {
  const id = String(req.params.id || "").trim();
  if (!id) {
    res.status(400).json({ error: "Bill id is required." });
    return;
  }

  try {
    const deleted = await removeBill(id);
    if (!deleted) {
      res.status(404).json({ error: "Bill not found." });
      return;
    }
    const bills = await listBills();
    res.json({ bills });
  } catch (error) {
    res.status(500).json({ error: "Failed to delete bill." });
  }
});

export default router;
