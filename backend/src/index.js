import express from "express";
import cors from "cors";
import dotenv from "dotenv";

dotenv.config();

const app = express();
const port = Number(process.env.BACKEND_PORT || process.env.PORT || 5000);

app.use(cors());
app.use(express.json());

app.get("/api/health", (_req, res) => {
  res.json({ status: "ok", service: "utilities-tracker-backend" });
});

app.listen(port, () => {
  console.log(`Backend running on http://localhost:${port}`);
});
