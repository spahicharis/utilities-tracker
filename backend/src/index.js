import express from "express";
import cors from "cors";
import dotenv from "dotenv";
import billsRoutes from "./routes/bills.js";
import dashboardRoutes from "./routes/dashboard.js";
import providersRoutes from "./routes/providers.js";

dotenv.config();

const app = express();
const port = Number(process.env.BACKEND_PORT || process.env.PORT || 5000);

app.use(cors());
app.use(express.json());

app.get("/api/health", (_req, res) => {
  res.json({ status: "ok", service: "utilities-tracker-backend" });
});

app.use("/api/providers", providersRoutes);
app.use("/api/bills", billsRoutes);
app.use("/api/dashboard", dashboardRoutes);

app.listen(port, () => {
  console.log(`Backend running on http://localhost:${port}`);
});
