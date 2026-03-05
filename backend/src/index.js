import "dotenv/config";
import express from "express";
import cors from "cors";
import billsRoutes from "./routes/bills.js";
import dashboardRoutes from "./routes/dashboard.js";
import providersRoutes from "./routes/providers.js";
import propertiesRoutes from "./routes/properties.js";
import { requireAuth } from "./middleware/requireAuth.js";
import { initializeDatabase } from "./lib/db.js";

const app = express();
const port = Number(process.env.BACKEND_PORT || process.env.PORT || 5000);

app.use(cors());
app.use(express.json());

app.get("/api/health", (_req, res) => {
  res.json({ status: "ok", service: "utilities-tracker-backend" });
});

app.use("/api/properties", requireAuth, propertiesRoutes);
app.use("/api/providers", requireAuth, providersRoutes);
app.use("/api/bills", requireAuth, billsRoutes);
app.use("/api/dashboard", requireAuth, dashboardRoutes);

try {
  await initializeDatabase();
  app.listen(port, () => {
    console.log(`Backend running on http://localhost:${port}`);
  });
} catch (error) {
  console.error("Failed to initialize database:", error);
  process.exit(1);
}
