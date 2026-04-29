import dotenv from "dotenv";
dotenv.config();

// ── Environment validation ────────────────────────────────
const REQUIRED_ENV = ["MONGO_URI", "GROQ_API_KEY", "PORT"];
const missing = REQUIRED_ENV.filter((k) => !process.env[k]);
if (missing.length) {
  console.error(`❌ Missing required environment variables: ${missing.join(", ")}`);
  process.exit(1);
}

import express from "express";
import cors from "cors";

import { connectDB } from "./config/db.js";
import { reindexUploads } from "./services/reindexer.js";
import { errorHandler } from "./middleware/error.middleware.js";

// Module Routes
import authRoutes from "./modules/auth/auth.routes.js";
import projectRoutes from "./modules/project/project.routes.js";
import chatRoutes from "./modules/chat/chat.routes.js";

// Legacy Routes (fully working)
import legacyApiRoutes from "./routes/api.js";

const app = express();
const PORT = process.env.PORT;

await connectDB();
await reindexUploads();

app.use(cors());
app.use(express.json());

app.get("/", (req, res) => res.send("🚀 CodeInsight API is running..."));

app.use("/api/auth", authRoutes);
app.use("/api/module/projects", projectRoutes);
app.use("/api/chat/module", chatRoutes);
app.use("/api", legacyApiRoutes);

app.use((req, res) => res.status(404).json({ message: "Route not found" }));

// Global error handler — must be last
app.use(errorHandler);

app.listen(PORT, () => {
  console.log(`✅ Server running on http://localhost:${PORT}`);
  console.log("GROQ KEY: set");
});
