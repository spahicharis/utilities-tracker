import { randomUUID } from "node:crypto";
import { Router } from "express";
import { BILL_STATUS_OPTIONS } from "../config/constants.js";
import { getMonthFromBill, getYearFromBill, isValidStatus, parseAmount } from "../lib/bills.js";
import { readDb, writeDb } from "../lib/store.js";

const router = Router();

router.get("/", async (req, res) => {
  const month = typeof req.query.month === "string" ? req.query.month : "";
  const year = typeof req.query.year === "string" ? req.query.year : "";

  const db = await readDb();
  let list = [...db.bills];

  if (month) {
    list = list.filter((bill) => getMonthFromBill(bill) === month);
  }
  if (year) {
    list = list.filter((bill) => getYearFromBill(bill) === year);
  }

  list.sort((a, b) => b.billDate.localeCompare(a.billDate));
  res.json({ bills: list });
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

  const db = await readDb();
  const nextBill = {
    id: randomUUID(),
    provider,
    amount,
    billDate,
    billingMonth,
    status
  };

  const bills = [nextBill, ...db.bills];
  await writeDb({ ...db, bills });
  res.status(201).json({ bill: nextBill, bills });
});

router.patch("/:id/status", async (req, res) => {
  const id = String(req.params.id || "").trim();
  const status = String(req.body?.status || "").trim();
  if (!id || !isValidStatus(status)) {
    res.status(400).json({ error: `status must be one of: ${BILL_STATUS_OPTIONS.join(", ")}` });
    return;
  }

  const db = await readDb();
  const billIndex = db.bills.findIndex((bill) => bill.id === id);
  if (billIndex < 0) {
    res.status(404).json({ error: "Bill not found." });
    return;
  }

  const bills = [...db.bills];
  bills[billIndex] = { ...bills[billIndex], status };
  await writeDb({ ...db, bills });
  res.json({ bill: bills[billIndex], bills });
});

router.delete("/:id", async (req, res) => {
  const id = String(req.params.id || "").trim();
  if (!id) {
    res.status(400).json({ error: "Bill id is required." });
    return;
  }

  const db = await readDb();
  const bills = db.bills.filter((bill) => bill.id !== id);
  if (bills.length === db.bills.length) {
    res.status(404).json({ error: "Bill not found." });
    return;
  }

  await writeDb({ ...db, bills });
  res.json({ bills });
});

export default router;
