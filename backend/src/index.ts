import express from "express";
import path from "path";
import cors from "cors";
import helmet from "helmet";
import morgan from "morgan";
import dotenv from "dotenv";

import { initializeDatabase } from "./models/initDatabase";
import authRoutes from "./routes/auth";
import examRoutes from "./routes/exams";
import analyticsRoutes from "./routes/analytics";
import reviewRoutes from "./routes/review";

dotenv.config();

const app = express();

// --------------------
// Middleware
// --------------------
app.use(helmet());
app.use(cors());
app.use(morgan("combined"));
app.use(express.json());

// --------------------
// API ROUTES (FIRST)
// --------------------
app.use("/api/auth", authRoutes);
app.use("/api/exams", examRoutes);
app.use("/api/analytics", analyticsRoutes);
app.use("/api/review", reviewRoutes);

// Health check
app.get("/health", (_, res) => {
  res.json({
    status: "OK",
    timestamp: new Date().toISOString(),
    service: "SAT Platform API"
  });
});

// --------------------
// FRONTEND (AFTER APIs)
// --------------------
const frontendPath = path.join(process.cwd(), "frontend", "build");
app.use(express.static(frontendPath));

app.get(/.*/, (_, res) => {
  res.sendFile(path.join(frontendPath, "index.html"));
});


// --------------------
// Error handling
// --------------------
app.use((req, res) => {
  res.status(404).json({
    success: false,
    message: `Route ${req.method} ${req.path} not found`
  });
});

app.use((error: any, _req: express.Request, res: express.Response, _next: express.NextFunction) => {
  console.error("Unhandled error:", error);
  res.status(500).json({
    success: false,
    message: "Internal server error"
  });
});

// --------------------
// Startup
// --------------------
async function startServer() {
  try {
    await initializeDatabase();
    console.log("Database initialized successfully");

    const PORT = process.env.PORT || 3000;
    app.listen(PORT, () => {
      console.log(`🚀 Server running on port ${PORT}`);
    });
  } catch (error) {
    console.error("Failed to start server:", error);
    process.exit(1);
  }
}

startServer();
