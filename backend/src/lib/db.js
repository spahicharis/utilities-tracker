import "dotenv/config";
import { randomUUID } from "node:crypto";
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
    propertyId: row.property_id,
    provider: row.provider,
    amount: Number(row.amount),
    currency: row.currency ?? "KM",
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

function mapPropertyRow(row) {
  return {
    id: row.id,
    name: row.name
  };
}

export async function initializeDatabase() {
  const client = await getPool().connect();
  try {
    await client.query("BEGIN");

    await client.query(`
      CREATE TABLE IF NOT EXISTS properties (
        id UUID PRIMARY KEY,
        name TEXT NOT NULL UNIQUE
      );
    `);

    const existingProperties = await client.query("SELECT COUNT(*)::INT AS count FROM properties");
    if (existingProperties.rows[0].count === 0) {
      await client.query("INSERT INTO properties(id, name) VALUES ($1, $2)", [randomUUID(), "Primary Home"]);
    }

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
        property_id UUID,
        provider TEXT NOT NULL,
        amount NUMERIC(12,2) NOT NULL CHECK (amount > 0),
        currency TEXT NOT NULL DEFAULT 'KM',
        bill_date DATE NOT NULL,
        billing_month TEXT NOT NULL,
        status TEXT NOT NULL CHECK (status IN ('Pending', 'Paid', 'Overdue'))
      );
    `);

    await client.query("ALTER TABLE bills ADD COLUMN IF NOT EXISTS property_id UUID");
    await client.query("ALTER TABLE bills ADD COLUMN IF NOT EXISTS currency TEXT NOT NULL DEFAULT 'KM'");

    const defaultPropertyResult = await client.query("SELECT id FROM properties ORDER BY name ASC LIMIT 1");
    const defaultPropertyId = defaultPropertyResult.rows[0]?.id;
    if (defaultPropertyId) {
      await client.query("UPDATE bills SET property_id = $1 WHERE property_id IS NULL", [defaultPropertyId]);
    }

    await client.query("ALTER TABLE bills ALTER COLUMN property_id SET NOT NULL");

    await client.query(`
      DO $$
      BEGIN
        IF NOT EXISTS (
          SELECT 1 FROM pg_constraint WHERE conname = 'bills_property_id_fkey'
        ) THEN
          ALTER TABLE bills
            ADD CONSTRAINT bills_property_id_fkey
            FOREIGN KEY (property_id) REFERENCES properties(id) ON DELETE RESTRICT;
        END IF;
      END $$;
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

export async function listProperties() {
  const result = await getPool().query("SELECT id, name FROM properties ORDER BY LOWER(name) ASC");
  return result.rows.map(mapPropertyRow);
}

export async function addProperty(name) {
  const result = await getPool().query(
    `INSERT INTO properties(id, name)
     SELECT $1, $2
     WHERE NOT EXISTS (
       SELECT 1 FROM properties WHERE LOWER(name) = LOWER($2)
     )
     RETURNING id, name`,
    [randomUUID(), name]
  );
  return result.rows[0] ? mapPropertyRow(result.rows[0]) : null;
}

export async function updateProperty(id, name) {
  const existing = await getPool().query("SELECT id FROM properties WHERE id = $1", [id]);
  if (!existing.rowCount) {
    return { status: "not_found", property: null };
  }

  const conflict = await getPool().query(
    `SELECT 1 FROM properties WHERE LOWER(name) = LOWER($1) AND id <> $2 LIMIT 1`,
    [name, id]
  );
  if (conflict.rowCount) {
    return { status: "conflict", property: null };
  }

  const updated = await getPool().query("UPDATE properties SET name = $2 WHERE id = $1 RETURNING id, name", [id, name]);
  return { status: "ok", property: mapPropertyRow(updated.rows[0]) };
}

export async function removeProperty(id) {
  const inUse = await getPool().query("SELECT 1 FROM bills WHERE property_id = $1 LIMIT 1", [id]);
  if (inUse.rowCount) {
    return { status: "has_bills" };
  }

  const result = await getPool().query("DELETE FROM properties WHERE id = $1 RETURNING id", [id]);
  if (!result.rowCount) {
    return { status: "not_found" };
  }
  return { status: "ok" };
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

  if (filters.propertyId) {
    values.push(filters.propertyId);
    where.push(`property_id = $${values.length}`);
  }
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
      SELECT id, property_id, provider, amount, currency, bill_date, billing_month, status
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
      INSERT INTO bills(id, property_id, provider, amount, currency, bill_date, billing_month, status)
      VALUES ($1, $2, $3, $4, $5, $6, $7, $8)
      RETURNING id, property_id, provider, amount, currency, bill_date, billing_month, status
    `,
    [bill.id, bill.propertyId, bill.provider, bill.amount, bill.currency, bill.billDate, bill.billingMonth, bill.status]
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
          INSERT INTO bills(id, property_id, provider, amount, currency, bill_date, billing_month, status)
          VALUES ($1, $2, $3, $4, $5, $6, $7, $8)
          RETURNING id, property_id, provider, amount, currency, bill_date, billing_month, status
        `,
        [bill.id, bill.propertyId, bill.provider, bill.amount, bill.currency, bill.billDate, bill.billingMonth, bill.status]
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

export async function updateBillStatus(id, status, propertyId) {
  const result = await getPool().query(
    `
      UPDATE bills
      SET status = $2
      WHERE id = $1 AND property_id = $3
      RETURNING id, property_id, provider, amount, currency, bill_date, billing_month, status
    `,
    [id, status, propertyId]
  );
  return result.rows[0] ? mapBillRow(result.rows[0]) : null;
}

export async function removeBill(id, propertyId) {
  const result = await getPool().query("DELETE FROM bills WHERE id = $1 AND property_id = $2", [id, propertyId]);
  return Boolean(result.rowCount);
}
