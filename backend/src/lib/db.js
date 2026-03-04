import "dotenv/config";
import { Pool } from "pg";
import { DEFAULT_PROVIDERS } from "../config/constants.js";

let pool;

function getPool() {
  if (!pool) {
    const connectionString = process.env.POSTGRES_DB_URL;
    if (!connectionString) {
      throw new Error("POSTGRES_DB_URL is missing. Set it in your .env file.");
    }
    pool = new Pool({ connectionString });
  }
  return pool;
}

function mapBillRow(row) {
  return {
    id: row.id,
    provider: row.provider,
    amount: Number(row.amount),
    billDate: row.bill_date,
    billingMonth: row.billing_month,
    status: row.status
  };
}

function mapProviderRow(row) {
  return {
    name: row.name,
    address: row.address ?? "",
    logo: row.logo ?? "",
    phone: row.phone ?? ""
  };
}

export async function initializeDatabase() {
  const client = await getPool().connect();
  try {
    await client.query("BEGIN");
    await client.query(`
      CREATE TABLE IF NOT EXISTS providers (
        name TEXT PRIMARY KEY,
        address TEXT NOT NULL DEFAULT '',
        logo TEXT NOT NULL DEFAULT '',
        phone TEXT NOT NULL DEFAULT ''
      );
    `);
    await client.query("ALTER TABLE providers ADD COLUMN IF NOT EXISTS address TEXT NOT NULL DEFAULT ''");
    await client.query("ALTER TABLE providers ADD COLUMN IF NOT EXISTS logo TEXT NOT NULL DEFAULT ''");
    await client.query("ALTER TABLE providers ADD COLUMN IF NOT EXISTS phone TEXT NOT NULL DEFAULT ''");
    await client.query(`
      CREATE TABLE IF NOT EXISTS bills (
        id UUID PRIMARY KEY,
        provider TEXT NOT NULL,
        amount NUMERIC(12,2) NOT NULL CHECK (amount > 0),
        bill_date DATE NOT NULL,
        billing_month TEXT NOT NULL,
        status TEXT NOT NULL CHECK (status IN ('Pending', 'Paid', 'Overdue'))
      );
    `);

    const existingProviders = await client.query("SELECT COUNT(*)::INT AS count FROM providers");
    if (existingProviders.rows[0].count === 0) {
      for (const provider of DEFAULT_PROVIDERS) {
        await client.query(
          "INSERT INTO providers(name, address, logo, phone) VALUES ($1, $2, $3, $4) ON CONFLICT DO NOTHING",
          [provider.name, provider.address, provider.logo, provider.phone]
        );
      }
    }
    await client.query("COMMIT");
  } catch (error) {
    await client.query("ROLLBACK");
    throw error;
  } finally {
    client.release();
  }
}

export async function listProviders() {
  const result = await getPool().query(
    "SELECT name, address, logo, phone FROM providers ORDER BY LOWER(name) ASC"
  );
  return result.rows.map(mapProviderRow);
}

export async function addProvider(provider) {
  const result = await getPool().query(
    `INSERT INTO providers(name, address, logo, phone)
     SELECT $1, $2, $3, $4
     WHERE NOT EXISTS (
       SELECT 1 FROM providers WHERE LOWER(name) = LOWER($1)
     )
     RETURNING name, address, logo, phone`,
    [provider.name, provider.address, provider.logo, provider.phone]
  );
  return result.rows[0] ? mapProviderRow(result.rows[0]) : null;
}

export async function updateProvider(originalName, provider) {
  const client = await getPool().connect();
  try {
    await client.query("BEGIN");

    const existing = await client.query("SELECT name FROM providers WHERE name = $1", [originalName]);
    if (!existing.rowCount) {
      await client.query("ROLLBACK");
      return { status: "not_found", provider: null };
    }

    const conflict = await client.query(
      `
        SELECT 1
        FROM providers
        WHERE LOWER(name) = LOWER($1)
          AND LOWER(name) <> LOWER($2)
        LIMIT 1
      `,
      [provider.name, originalName]
    );
    if (conflict.rowCount) {
      await client.query("ROLLBACK");
      return { status: "conflict", provider: null };
    }

    const updated = await client.query(
      `
        UPDATE providers
        SET name = $2, address = $3, logo = $4, phone = $5
        WHERE name = $1
        RETURNING name, address, logo, phone
      `,
      [originalName, provider.name, provider.address, provider.logo, provider.phone]
    );

    if (originalName !== provider.name) {
      await client.query("UPDATE bills SET provider = $2 WHERE provider = $1", [originalName, provider.name]);
    }

    await client.query("COMMIT");
    return { status: "ok", provider: mapProviderRow(updated.rows[0]) };
  } catch (error) {
    await client.query("ROLLBACK");
    throw error;
  } finally {
    client.release();
  }
}

export async function removeProvider(name) {
  const result = await getPool().query("DELETE FROM providers WHERE name = $1 RETURNING name", [name]);
  return Boolean(result.rowCount);
}

export async function listBills(filters = {}) {
  const values = [];
  const where = [];

  if (filters.month) {
    values.push(filters.month);
    where.push(`billing_month = $${values.length}`);
  }
  if (filters.year) {
    values.push(filters.year);
    where.push(`LEFT(billing_month, 4) = $${values.length}`);
  }

  const whereClause = where.length > 0 ? `WHERE ${where.join(" AND ")}` : "";
  const result = await getPool().query(
    `
      SELECT id, provider, amount, bill_date, billing_month, status
      FROM bills
      ${whereClause}
      ORDER BY bill_date DESC
    `,
    values
  );

  return result.rows.map(mapBillRow);
}

export async function insertBill(bill) {
  const result = await getPool().query(
    `
      INSERT INTO bills(id, provider, amount, bill_date, billing_month, status)
      VALUES ($1, $2, $3, $4, $5, $6)
      RETURNING id, provider, amount, bill_date, billing_month, status
    `,
    [bill.id, bill.provider, bill.amount, bill.billDate, bill.billingMonth, bill.status]
  );
  return mapBillRow(result.rows[0]);
}

export async function insertBillsBulk(bills) {
  if (!Array.isArray(bills) || bills.length === 0) {
    return [];
  }

  const client = await getPool().connect();
  try {
    await client.query("BEGIN");
    const inserted = [];
    for (const bill of bills) {
      const result = await client.query(
        `
          INSERT INTO bills(id, provider, amount, bill_date, billing_month, status)
          VALUES ($1, $2, $3, $4, $5, $6)
          RETURNING id, provider, amount, bill_date, billing_month, status
        `,
        [bill.id, bill.provider, bill.amount, bill.billDate, bill.billingMonth, bill.status]
      );
      inserted.push(mapBillRow(result.rows[0]));
    }
    await client.query("COMMIT");
    return inserted;
  } catch (error) {
    await client.query("ROLLBACK");
    throw error;
  } finally {
    client.release();
  }
}

export async function updateBillStatus(id, status) {
  const result = await getPool().query(
    `
      UPDATE bills
      SET status = $2
      WHERE id = $1
      RETURNING id, provider, amount, bill_date, billing_month, status
    `,
    [id, status]
  );
  return result.rows[0] ? mapBillRow(result.rows[0]) : null;
}

export async function removeBill(id) {
  const result = await getPool().query("DELETE FROM bills WHERE id = $1", [id]);
  return Boolean(result.rowCount);
}
