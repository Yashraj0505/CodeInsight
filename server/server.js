import dotenv from "dotenv";
dotenv.config();

import express from "express";
import cors from "cors";

import { connectDB } from "./config/db.js";
import { reindexUploads } from "./services/reindexer.js";

// Module Routes
import authRoutes from "./modules/auth/auth.routes.js";
import projectRoutes from "./modules/project/project.routes.js";
import chatRoutes from "./modules/chat/chat.routes.js";

// Legacy Routes (for backward compatibility)
import legacyApiRoutes from "./routes/api.js";

const app = express();
const PORT = process.env.PORT || 5000;

// Connect Database
await connectDB();

// Restore any uploads not yet in MongoDB
await reindexUploads();

// 🧩 Middleware
app.use(cors());
app.use(express.json());

// 🛣️ Routes
app.get("/", (req, res) => {
  res.send("🚀 CodeInsight API is running...");
});

// Module Routes (stubbed, not yet functional)
app.use("/api/auth", authRoutes);
app.use("/api/module/projects", projectRoutes);
app.use("/api/chat/module", chatRoutes);

// Legacy Routes (fully working)
app.use("/api", legacyApiRoutes);

// ❌ Handle unknown routes
app.use((req, res) => {
  res.status(404).json({ message: "Route not found" });
});

// 🔥 Global Error Handler
app.use((err, req, res, next) => {
  console.error(err.stack);
  res.status(500).json({
    message: err.message || "Internal Server Error",
  });
});

// Start Server
app.listen(PORT, () => {
  console.log(`✅ Server running on http://localhost:${PORT}`);
  console.log("GROQ KEY:", process.env.GROQ_API_KEY ? "set" : "undefined");
});