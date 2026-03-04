import { BILL_STATUS_OPTIONS } from "../config/constants.js";

export function parseAmount(input) {
  const value = Number(input);
  if (!Number.isFinite(value) || value <= 0) {
    return null;
  }
  return Number(value.toFixed(2));
}

export function isValidStatus(status) {
  return BILL_STATUS_OPTIONS.includes(status);
}

export function getYearFromBill(bill) {
  if (typeof bill?.billingMonth === "string" && /^\d{4}-\d{2}$/.test(bill.billingMonth)) {
    return bill.billingMonth.slice(0, 4);
  }
  if (typeof bill?.billDate === "string" && /^\d{4}-\d{2}-\d{2}$/.test(bill.billDate)) {
    return bill.billDate.slice(0, 4);
  }
  return "";
}

export function getMonthFromBill(bill) {
  if (typeof bill?.billingMonth === "string" && /^\d{4}-\d{2}$/.test(bill.billingMonth)) {
    return bill.billingMonth;
  }
  if (typeof bill?.billDate === "string" && /^\d{4}-\d{2}-\d{2}$/.test(bill.billDate)) {
    return bill.billDate.slice(0, 7);
  }
  return "";
}
