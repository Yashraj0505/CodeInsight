import dotenv from "dotenv";
dotenv.config();

// ── Environment validation ────────────────────────────────
const REQUIRED_ENV = ["MONGO_URI", "GROQ_API_KEY", "PORT", "CLOUDINARY_CLOUD_NAME", "CLOUDINARY_API_KEY", "CLOUDINARY_API_SECRET"];
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

const ALLOWED_ORIGINS = [
  "http://localhost:5173",
  "https://codeinsight01.vercel.app",
];

app.use(cors({
  origin: (origin, callback) => {
    // Allow requests with no origin (e.g. curl, Postman, server-to-server)
    if (!origin || ALLOWED_ORIGINS.includes(origin)) return callback(null, true);
    callback(new Error(`CORS: origin ${origin} not allowed`));
  },
  methods: ["GET", "POST", "PUT", "DELETE", "OPTIONS"],
  credentials: true,
}));
app.use(express.json());

app.get("/", (req, res) => res.send("🚀 CodeInsight API is running..."));
app.get("/health", (req, res) => res.json({ status: "ok", db: "connected" }));

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
