import "dotenv/config";
import { randomUUID } from "node:crypto";
import { Pool } from "pg";
import { DEFAULT_PROVIDERS } from "../config/constants.js";

const LEGACY_PROPERTY_OWNER_ID = "legacy-unassigned";

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

function mapSubscriptionRow(row) {
  return {
    id: row.id,
    propertyId: row.property_id,
    name: row.name,
    amount: Number(row.amount),
    currency: row.currency ?? "KM",
    billingCycle: row.billing_cycle,
    nextBillingDate: row.next_billing_date,
    status: row.status
  };
}

function mapVehicleRegistrationRow(row) {
  return {
    id: row.id,
    propertyId: row.property_id,
    vehicleName: row.vehicle_name,
    licencePlate: row.licence_plate,
    registrationNumber: row.registration_number ?? "",
    amount: Number(row.amount),
    currency: row.currency ?? "KM",
    dueDate: row.due_date,
    paidDate: row.paid_date,
    status: row.status,
    notes: row.notes ?? ""
  };
}

export async function initializeDatabase() {
  const client = await getPool().connect();
  try {
    await client.query("BEGIN");

    await client.query(`
      CREATE TABLE IF NOT EXISTS properties (
        id UUID PRIMARY KEY,
        name TEXT NOT NULL,
        user_id TEXT
      );
    `);

    await client.query("ALTER TABLE properties ADD COLUMN IF NOT EXISTS user_id TEXT");
    await client.query("UPDATE properties SET user_id = $1 WHERE user_id IS NULL OR TRIM(user_id) = ''", [LEGACY_PROPERTY_OWNER_ID]);
    await client.query("ALTER TABLE properties ALTER COLUMN user_id SET NOT NULL");
    await client.query("ALTER TABLE properties DROP CONSTRAINT IF EXISTS properties_name_key");
    await client.query("CREATE INDEX IF NOT EXISTS idx_properties_user_id ON properties(user_id)");
    await client.query(
      "CREATE UNIQUE INDEX IF NOT EXISTS properties_user_name_unique_idx ON properties(user_id, LOWER(name))"
    );

    const existingProperties = await client.query("SELECT COUNT(*)::INT AS count FROM properties");
    if (existingProperties.rows[0].count === 0) {
      await client.query("INSERT INTO properties(id, name, user_id) VALUES ($1, $2, $3)", [
        randomUUID(),
        "Primary Home",
        LEGACY_PROPERTY_OWNER_ID
      ]);
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

    await client.query(`
      CREATE TABLE IF NOT EXISTS subscriptions (
        id UUID PRIMARY KEY,
        property_id UUID,
        name TEXT NOT NULL,
        amount NUMERIC(12,2) NOT NULL CHECK (amount > 0),
        currency TEXT NOT NULL DEFAULT 'KM',
        billing_cycle TEXT NOT NULL CHECK (billing_cycle IN ('Monthly', 'Quarterly', 'Yearly')),
        next_billing_date DATE NOT NULL,
        status TEXT NOT NULL CHECK (status IN ('Active', 'Paused', 'Canceled'))
      );
    `);

    await client.query("ALTER TABLE subscriptions ADD COLUMN IF NOT EXISTS property_id UUID");
    await client.query("ALTER TABLE subscriptions ADD COLUMN IF NOT EXISTS currency TEXT NOT NULL DEFAULT 'KM'");
    await client.query(
      "ALTER TABLE subscriptions ADD COLUMN IF NOT EXISTS billing_cycle TEXT NOT NULL DEFAULT 'Monthly'"
    );

    await client.query(`
      CREATE TABLE IF NOT EXISTS vehicle_registrations (
        id UUID PRIMARY KEY,
        property_id UUID,
        vehicle_name TEXT NOT NULL,
        licence_plate TEXT NOT NULL,
        registration_number TEXT NOT NULL DEFAULT '',
        amount NUMERIC(12,2) NOT NULL CHECK (amount > 0),
        currency TEXT NOT NULL DEFAULT 'KM',
        due_date DATE NOT NULL,
        paid_date DATE,
        status TEXT NOT NULL CHECK (status IN ('Active', 'Due Soon', 'Overdue', 'Paid')),
        notes TEXT NOT NULL DEFAULT ''
      );
    `);

    await client.query("ALTER TABLE vehicle_registrations ADD COLUMN IF NOT EXISTS property_id UUID");
    await client.query("ALTER TABLE vehicle_registrations ADD COLUMN IF NOT EXISTS registration_number TEXT NOT NULL DEFAULT ''");
    await client.query("ALTER TABLE vehicle_registrations ADD COLUMN IF NOT EXISTS currency TEXT NOT NULL DEFAULT 'KM'");
    await client.query("ALTER TABLE vehicle_registrations ADD COLUMN IF NOT EXISTS paid_date DATE");
    await client.query("ALTER TABLE vehicle_registrations ADD COLUMN IF NOT EXISTS notes TEXT NOT NULL DEFAULT ''");

    const defaultPropertyResult = await client.query("SELECT id FROM properties ORDER BY name ASC LIMIT 1");
    const defaultPropertyId = defaultPropertyResult.rows[0]?.id;
    if (defaultPropertyId) {
      await client.query("UPDATE bills SET property_id = $1 WHERE property_id IS NULL", [defaultPropertyId]);
      await client.query("UPDATE subscriptions SET property_id = $1 WHERE property_id IS NULL", [defaultPropertyId]);
      await client.query("UPDATE vehicle_registrations SET property_id = $1 WHERE property_id IS NULL", [defaultPropertyId]);
    }

    await client.query("ALTER TABLE bills ALTER COLUMN property_id SET NOT NULL");
    await client.query("ALTER TABLE subscriptions ALTER COLUMN property_id SET NOT NULL");
    await client.query("ALTER TABLE vehicle_registrations ALTER COLUMN property_id SET NOT NULL");

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

    await client.query(`
      DO $$
      BEGIN
        IF NOT EXISTS (
          SELECT 1 FROM pg_constraint WHERE conname = 'vehicle_registrations_property_id_fkey'
        ) THEN
          ALTER TABLE vehicle_registrations
            ADD CONSTRAINT vehicle_registrations_property_id_fkey
            FOREIGN KEY (property_id) REFERENCES properties(id) ON DELETE RESTRICT;
        END IF;
      END $$;
    `);

    await client.query(`
      DO $$
      BEGIN
        IF NOT EXISTS (
          SELECT 1 FROM pg_constraint WHERE conname = 'subscriptions_property_id_fkey'
        ) THEN
          ALTER TABLE subscriptions
            ADD CONSTRAINT subscriptions_property_id_fkey
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

export async function listProperties(userId) {
  const result = await getPool().query(
    "SELECT id, name FROM properties WHERE user_id = $1 ORDER BY LOWER(name) ASC",
    [userId]
  );
  return result.rows.map(mapPropertyRow);
}

export async function addProperty(name, userId) {
  const result = await getPool().query(
    `INSERT INTO properties(id, name, user_id)
     SELECT $1, $2, $3
     WHERE NOT EXISTS (
       SELECT 1 FROM properties WHERE user_id = $3 AND LOWER(name) = LOWER($2)
     )
     RETURNING id, name`,
    [randomUUID(), name, userId]
  );
  return result.rows[0] ? mapPropertyRow(result.rows[0]) : null;
}

export async function updateProperty(id, name, userId) {
  const existing = await getPool().query("SELECT id FROM properties WHERE id = $1 AND user_id = $2", [id, userId]);
  if (!existing.rowCount) {
    return { status: "not_found", property: null };
  }

  const conflict = await getPool().query(
    `SELECT 1 FROM properties WHERE user_id = $1 AND LOWER(name) = LOWER($2) AND id <> $3 LIMIT 1`,
    [userId, name, id]
  );
  if (conflict.rowCount) {
    return { status: "conflict", property: null };
  }

  const updated = await getPool().query(
    "UPDATE properties SET name = $3 WHERE id = $1 AND user_id = $2 RETURNING id, name",
    [id, userId, name]
  );
  return { status: "ok", property: mapPropertyRow(updated.rows[0]) };
}

export async function removeProperty(id, userId) {
  const inUse = await getPool().query(
    "SELECT 1 FROM bills b JOIN properties p ON p.id = b.property_id WHERE p.id = $1 AND p.user_id = $2 LIMIT 1",
    [id, userId]
  );
  if (inUse.rowCount) {
    return { status: "has_bills" };
  }

  const result = await getPool().query("DELETE FROM properties WHERE id = $1 AND user_id = $2 RETURNING id", [id, userId]);
  if (!result.rowCount) {
    return { status: "not_found" };
  }
  return { status: "ok" };
}

export async function isPropertyOwnedByUser(propertyId, userId) {
  const result = await getPool().query("SELECT 1 FROM properties WHERE id = $1 AND user_id = $2 LIMIT 1", [propertyId, userId]);
  return Boolean(result.rowCount);
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

export async function listSubscriptions(filters = {}) {
  const values = [];
  const where = [];

  values.push(filters.userId);
  where.push(
    `EXISTS (SELECT 1 FROM properties p WHERE p.id = subscriptions.property_id AND p.user_id = $${values.length})`
  );

  if (filters.propertyId) {
    values.push(filters.propertyId);
    where.push(`property_id = $${values.length}`);
  }

  const whereClause = where.length > 0 ? `WHERE ${where.join(" AND ")}` : "";
  const result = await getPool().query(
    `
      SELECT id, property_id, name, amount, currency, billing_cycle, next_billing_date, status
      FROM subscriptions
      ${whereClause}
      ORDER BY LOWER(name) ASC, next_billing_date ASC
    `,
    values
  );

  return result.rows.map(mapSubscriptionRow);
}

export async function insertSubscription(subscription) {
  const result = await getPool().query(
    `
      INSERT INTO subscriptions(id, property_id, name, amount, currency, billing_cycle, next_billing_date, status)
      VALUES ($1, $2, $3, $4, $5, $6, $7, $8)
      RETURNING id, property_id, name, amount, currency, billing_cycle, next_billing_date, status
    `,
    [
      subscription.id,
      subscription.propertyId,
      subscription.name,
      subscription.amount,
      subscription.currency,
      subscription.billingCycle,
      subscription.nextBillingDate,
      subscription.status
    ]
  );
  return mapSubscriptionRow(result.rows[0]);
}

export async function updateSubscription(id, subscription, userId) {
  const result = await getPool().query(
    `
      UPDATE subscriptions s
      SET name = $3,
          amount = $4,
          currency = $5,
          billing_cycle = $6,
          next_billing_date = $7,
          status = $8
      FROM properties p
      WHERE s.id = $1
        AND s.property_id = $2
        AND p.id = s.property_id
        AND p.user_id = $9
      RETURNING s.id, s.property_id, s.name, s.amount, s.currency, s.billing_cycle, s.next_billing_date, s.status
    `,
    [
      id,
      subscription.propertyId,
      subscription.name,
      subscription.amount,
      subscription.currency,
      subscription.billingCycle,
      subscription.nextBillingDate,
      subscription.status,
      userId
    ]
  );
  return result.rows[0] ? mapSubscriptionRow(result.rows[0]) : null;
}

export async function removeSubscription(id, propertyId, userId) {
  const result = await getPool().query(
    `
      DELETE FROM subscriptions s
      USING properties p
      WHERE s.id = $1
        AND s.property_id = $2
        AND p.id = s.property_id
        AND p.user_id = $3
    `,
    [id, propertyId, userId]
  );
  return Boolean(result.rowCount);
}

export async function listVehicleRegistrations(filters = {}) {
  const values = [];
  const where = [];

  values.push(filters.userId);
  where.push(
    `EXISTS (SELECT 1 FROM properties p WHERE p.id = vehicle_registrations.property_id AND p.user_id = $${values.length})`
  );

  if (filters.propertyId) {
    values.push(filters.propertyId);
    where.push(`property_id = $${values.length}`);
  }

  const whereClause = where.length > 0 ? `WHERE ${where.join(" AND ")}` : "";
  const result = await getPool().query(
    `
      SELECT id, property_id, vehicle_name, licence_plate, registration_number, amount, currency, due_date, paid_date, status, notes
      FROM vehicle_registrations
      ${whereClause}
      ORDER BY due_date ASC, LOWER(vehicle_name) ASC, LOWER(licence_plate) ASC
    `,
    values
  );

  return result.rows.map(mapVehicleRegistrationRow);
}

export async function insertVehicleRegistration(registration) {
  const result = await getPool().query(
    `
      INSERT INTO vehicle_registrations(
        id,
        property_id,
        vehicle_name,
        licence_plate,
        registration_number,
        amount,
        currency,
        due_date,
        paid_date,
        status,
        notes
      )
      VALUES ($1, $2, $3, $4, $5, $6, $7, $8, NULLIF($9, '')::date, $10, $11)
      RETURNING id, property_id, vehicle_name, licence_plate, registration_number, amount, currency, due_date, paid_date, status, notes
    `,
    [
      registration.id,
      registration.propertyId,
      registration.vehicleName,
      registration.licencePlate,
      registration.registrationNumber,
      registration.amount,
      registration.currency,
      registration.dueDate,
      registration.paidDate,
      registration.status,
      registration.notes
    ]
  );
  return mapVehicleRegistrationRow(result.rows[0]);
}

export async function updateVehicleRegistration(id, registration, userId) {
  const result = await getPool().query(
    `
      UPDATE vehicle_registrations vr
      SET vehicle_name = $3,
          licence_plate = $4,
          registration_number = $5,
          amount = $6,
          currency = $7,
          due_date = $8,
          paid_date = NULLIF($9, '')::date,
          status = $10,
          notes = $11
      FROM properties p
      WHERE vr.id = $1
        AND vr.property_id = $2
        AND p.id = vr.property_id
        AND p.user_id = $12
      RETURNING vr.id, vr.property_id, vr.vehicle_name, vr.licence_plate, vr.registration_number, vr.amount, vr.currency, vr.due_date, vr.paid_date, vr.status, vr.notes
    `,
    [
      id,
      registration.propertyId,
      registration.vehicleName,
      registration.licencePlate,
      registration.registrationNumber,
      registration.amount,
      registration.currency,
      registration.dueDate,
      registration.paidDate,
      registration.status,
      registration.notes,
      userId
    ]
  );
  return result.rows[0] ? mapVehicleRegistrationRow(result.rows[0]) : null;
}

export async function removeVehicleRegistration(id, propertyId, userId) {
  const result = await getPool().query(
    `
      DELETE FROM vehicle_registrations vr
      USING properties p
      WHERE vr.id = $1
        AND vr.property_id = $2
        AND p.id = vr.property_id
        AND p.user_id = $3
    `,
    [id, propertyId, userId]
  );
  return Boolean(result.rowCount);
}

export async function listBills(filters = {}) {
  const values = [];
  const where = [];

  values.push(filters.userId);
  where.push(`EXISTS (SELECT 1 FROM properties p WHERE p.id = bills.property_id AND p.user_id = $${values.length})`);

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

export async function updateBillStatus(id, status, propertyId, userId) {
  const result = await getPool().query(
    `
      UPDATE bills b
      SET status = $2
      FROM properties p
      WHERE b.id = $1
        AND b.property_id = $3
        AND p.id = b.property_id
        AND p.user_id = $4
      RETURNING b.id, b.property_id, b.provider, b.amount, b.currency, b.bill_date, b.billing_month, b.status
    `,
    [id, status, propertyId, userId]
  );
  return result.rows[0] ? mapBillRow(result.rows[0]) : null;
}

export async function removeBill(id, propertyId, userId) {
  const result = await getPool().query(
    `
      DELETE FROM bills b
      USING properties p
      WHERE b.id = $1
        AND b.property_id = $2
        AND p.id = b.property_id
        AND p.user_id = $3
    `,
    [id, propertyId, userId]
  );
  return Boolean(result.rowCount);
}
