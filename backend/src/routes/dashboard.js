import { Router } from "express";
import { TRACKING_START_YEAR } from "../config/constants.js";
import { getYearFromBill } from "../lib/bills.js";
import { isPropertyOwnedByUser, listBills, listVehicleRegistrations } from "../lib/db.js";

const router = Router();

router.get("/", async (req, res) => {
  const userId = String(req.authUser?.id || "").trim();
  const currentYear = new Date().getFullYear();
  const selectedYear = String(req.query.year || currentYear);
  const propertyId = String(req.query.propertyId || "").trim();
  if (!propertyId) {
    res.status(400).json({ error: "propertyId is required." });
    return;
  }

  let bills = [];
  let registrations = [];
  try {
    const isOwned = await isPropertyOwnedByUser(propertyId, userId);
    if (!isOwned) {
      res.status(403).json({ error: "You do not have access to this property." });
      return;
    }
    bills = await listBills({ userId, propertyId });
    registrations = await listVehicleRegistrations({ userId, propertyId });
  } catch (error) {
    res.status(500).json({ error: "Failed to load dashboard data." });
    return;
  }

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
  const unpaidBills = selectedYearBills
    .filter((bill) => bill.status === "Pending" || bill.status === "Overdue")
    .sort((a, b) => String(b.billDate || "").localeCompare(String(a.billDate || "")))
    .map((bill) => ({
      id: bill.id,
      provider: bill.provider,
      amount: Number(bill.amount || 0),
      currency: bill.currency || "KM",
      billDate: bill.billDate,
      billingMonth: bill.billingMonth,
      status: bill.status
    }));

  const registrationSummary = registrations.reduce(
    (accumulator, registration) => {
      accumulator.total += 1;
      if (registration.status === "Paid") {
        accumulator.paid += 1;
      }
      if (registration.status === "Due Soon") {
        accumulator.dueSoon += 1;
      }
      if (registration.status === "Overdue") {
        accumulator.overdue += 1;
      }
      return accumulator;
    },
    { total: 0, paid: 0, dueSoon: 0, overdue: 0 }
  );

  const upcomingRegistrations = registrations
    .filter((registration) => registration.status === "Due Soon" || registration.status === "Overdue")
    .slice(0, 6)
    .map((registration) => ({
      id: registration.id,
      vehicleName: registration.vehicleName,
      licencePlate: registration.licencePlate,
      amount: Number(registration.amount || 0),
      currency: registration.currency || "KM",
      dueDate: registration.dueDate,
      status: registration.status
    }));

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
    topProviders,
    unpaidBills,
    vehicleRegistrations: {
      summary: registrationSummary,
      upcoming: upcomingRegistrations
    }
  });
});

export default router;
