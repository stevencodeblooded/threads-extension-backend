// src/app.js - Express application setup (Updated for Vercel)
const express = require("express");
const cors = require("cors");
const helmet = require("helmet");
const rateLimit = require("express-rate-limit");

// Import routes with error handling
let licenseRoutes, activityRoutes, adminRoutes, publicRoutes, errorHandler;

try {
  licenseRoutes = require("./routes/licenseRoutes");
  activityRoutes = require("./routes/activityRoutes");
  adminRoutes = require("./routes/adminRoutes");
  publicRoutes = require("./routes/publicRoutes");
  errorHandler = require("./middleware/errorHandler");
} catch (error) {
  console.error("Error importing routes or middleware:", error);
  // Create fallback error handler
  errorHandler = (err, req, res, next) => {
    console.error("Error:", err);
    res.status(500).json({ error: "Internal server error" });
  };
}

// Logger
const logger = {
  info: (msg, ...args) => console.log(`[INFO] ${msg}`, ...args),
  error: (msg, ...args) => console.error(`[ERROR] ${msg}`, ...args),
  warn: (msg, ...args) => console.warn(`[WARN] ${msg}`, ...args),
};

const app = express();

// Trust proxy for Vercel
app.set("trust proxy", 1);

// Security middleware with Vercel-friendly settings
app.use(
  helmet({
    contentSecurityPolicy: false, // Disable CSP for API
    crossOriginEmbedderPolicy: false,
  })
);

// CORS configuration
const corsOptions = {
  origin: function (origin, callback) {
    // Allow requests with no origin (like Postman, mobile apps, Vercel functions)
    if (!origin) return callback(null, true);

    // Always allow chrome extensions and localhost
    if (
      origin.startsWith("chrome-extension://") ||
      origin.startsWith("moz-extension://") ||
      origin.includes("localhost") ||
      origin.includes("127.0.0.1") ||
      origin.includes("vercel.app")
    ) {
      return callback(null, true);
    }

    // Check allowed origins from environment
    const allowedOrigins = process.env.ALLOWED_ORIGINS?.split(",") || [];
    if (allowedOrigins.includes(origin)) {
      return callback(null, true);
    }

    // Log blocked origins for debugging (only in development)
    if (process.env.NODE_ENV === "development") {
      console.log("CORS blocked origin:", origin);
    }
    callback(new Error("Not allowed by CORS"));
  },
  credentials: true,
  methods: ["GET", "POST", "PUT", "DELETE", "OPTIONS"],
  allowedHeaders: [
    "Content-Type",
    "Authorization",
    "X-Extension-Version",
    "X-API-Key",
    "Origin",
    "X-Requested-With",
    "Accept",
    "Cache-Control",
  ],
  optionsSuccessStatus: 200,
};

app.use(cors(corsOptions));

// Handle preflight requests explicitly
app.options("*", cors(corsOptions));

// Body parsing middleware with limits
app.use(express.json({ limit: "10mb" }));
app.use(express.urlencoded({ extended: true, limit: "10mb" }));

// Rate limiting (more lenient for serverless)
const limiter = rateLimit({
  windowMs: parseInt(process.env.RATE_LIMIT_WINDOW_MS) || 15 * 60 * 1000,
  max: parseInt(process.env.RATE_LIMIT_MAX_REQUESTS) || 100,
  message: "Too many requests from this IP, please try again later.",
  standardHeaders: true,
  legacyHeaders: false,
  skip: (req) => {
    // Skip rate limiting for health checks
    return req.path === "/health" || req.path === "/api/health";
  },
});

// Apply rate limiting to API routes only
app.use("/api/", limiter);

// Request logging (simplified for serverless)
app.use((req, res, next) => {
  if (process.env.NODE_ENV === "development") {
    logger.info(`${req.method} ${req.path} - ${req.ip}`);
  }
  next();
});

// Health check endpoint
app.get("/health", (req, res) => {
  res.json({
    status: "ok",
    timestamp: new Date().toISOString(),
    environment: process.env.NODE_ENV,
    mongodb:
      require("mongoose").connection.readyState === 1
        ? "connected"
        : "disconnected",
  });
});

// Root endpoint
app.get("/", (req, res) => {
  res.json({
    message: "Threads Pro API",
    status: "running",
    version: "1.0.0",
  });
});

// API routes with error handling
try {
  if (licenseRoutes) app.use("/api/license", licenseRoutes);
  if (activityRoutes) app.use("/api/activity", activityRoutes);
  if (adminRoutes) app.use("/api/admin", adminRoutes);
  if (publicRoutes) app.use("/api/public", publicRoutes);
} catch (error) {
  logger.error("Error setting up routes:", error);
}

// 404 handler
app.use((req, res) => {
  res.status(404).json({
    error: "Not Found",
    message: "The requested resource does not exist",
    path: req.path,
  });
});

// Error handling middleware (must be last)
app.use(errorHandler);

module.exports = app;
