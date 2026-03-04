import { Router } from "express";
import { TRACKING_START_YEAR } from "../config/constants.js";
import { getYearFromBill } from "../lib/bills.js";
import { readDb } from "../lib/store.js";

const router = Router();

router.get("/", async (req, res) => {
  const currentYear = new Date().getFullYear();
  const selectedYear = String(req.query.year || currentYear);
  const db = await readDb();
  const bills = db.bills;

  const years = [];
  for (let year = TRACKING_START_YEAR; year <= currentYear; year += 1) {
    years.push(String(year));
  }

  const yearlyTotals = years.map((year) => {
    const yearBills = bills.filter((bill) => getYearFromBill(bill) === year);
    const total = yearBills.reduce((sum, bill) => sum + Number(bill.amount || 0), 0);
    return { year, total: Number(total.toFixed(2)), count: yearBills.length };
  });

  const selectedYearBills = bills.filter((bill) => getYearFromBill(bill) === selectedYear);
  const total = selectedYearBills.reduce((sum, bill) => sum + Number(bill.amount || 0), 0);
  const paid = selectedYearBills.filter((bill) => bill.status === "Paid").length;
  const pending = selectedYearBills.filter((bill) => bill.status === "Pending").length;
  const overdue = selectedYearBills.filter((bill) => bill.status === "Overdue").length;

  const providerMap = selectedYearBills.reduce((acc, bill) => {
    const key = bill.provider || "Unknown";
    acc[key] = (acc[key] || 0) + Number(bill.amount || 0);
    return acc;
  }, {});

  const topProviders = Object.entries(providerMap)
    .map(([provider, amount]) => ({ provider, amount: Number(amount.toFixed(2)) }))
    .sort((a, b) => b.amount - a.amount)
    .slice(0, 6);

  res.json({
    selectedYear,
    trackingStartYear: TRACKING_START_YEAR,
    years,
    cards: {
      total: Number(total.toFixed(2)),
      count: selectedYearBills.length,
      paid,
      pending,
      overdue,
      paidRate: selectedYearBills.length ? Math.round((paid / selectedYearBills.length) * 100) : 0
    },
    yearlyTotals,
    statusSplit: { paid, pending, overdue },
    topProviders
  });
});

export default router;
