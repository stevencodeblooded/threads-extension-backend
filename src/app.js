// src/app.js - Express application setup (Updated for Vercel)
const express = require("express");
const cors = require("cors");
const helmet = require("helmet");
const rateLimit = require("express-rate-limit");

// Create logger first
const logger = {
  info: (msg, ...args) => console.log(`[INFO] ${msg}`, ...args),
  error: (msg, ...args) => console.error(`[ERROR] ${msg}`, ...args),
  warn: (msg, ...args) => console.warn(`[WARN] ${msg}`, ...args),
};

// Then import routes with proper error handling
let licenseRoutes, activityRoutes, adminRoutes, publicRoutes, errorHandler;

try {
  licenseRoutes = require("./routes/licenseRoutes");
  activityRoutes = require("./routes/activityRoutes");
  adminRoutes = require("./routes/adminRoutes");
  publicRoutes = require("./routes/publicRoutes");
  errorHandler = require("./middleware/errorHandler");
} catch (error) {
  logger.error("Error importing modules:", error);
  // Create minimal error handler
  errorHandler = (err, req, res, next) => {
    logger.error("Error:", err);
    if (!res.headersSent) {
      res.status(500).json({ error: "Internal server error" });
    }
  };
}

const app = express();

// Trust proxy for Vercel
app.set("trust proxy", 1);

// CORS configuration - IMPORTANT: This must come before other middleware
const corsOptions = {
  origin: function (origin, callback) {
    // Allow requests with no origin (like mobile apps, Postman, or server-to-server)
    if (!origin) return callback(null, true);

    // Always allow chrome extensions and localhost
    const allowedPatterns = [
      /^chrome-extension:\/\//,
      /^moz-extension:\/\//,
      /localhost/,
      /127\.0\.0\.1/,
      /vercel\.app$/,
      /threads\.com$/,
      /threads\.net$/,
    ];

    const isAllowed = allowedPatterns.some((pattern) => pattern.test(origin));

    if (isAllowed) {
      callback(null, true);
    } else {
      // Check environment variable allowed origins
      const envAllowedOrigins = process.env.ALLOWED_ORIGINS?.split(",") || [];
      if (envAllowedOrigins.includes(origin)) {
        callback(null, true);
      } else {
        logger.warn(`CORS blocked origin: ${origin}`);
        callback(null, false); // Change to false in production
      }
    }
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
  exposedHeaders: ["X-Total-Count"],
  optionsSuccessStatus: 200,
  maxAge: 86400, // 24 hours
};

app.use(cors(corsOptions));

// Handle preflight requests explicitly
app.options("*", cors(corsOptions));

// Security middleware with Vercel-friendly settings
app.use(
  helmet({
    contentSecurityPolicy: false, // Disable CSP for API
    crossOriginEmbedderPolicy: false,
    hsts: {
      maxAge: 31536000,
      includeSubDomains: true,
      preload: true,
    },
  })
);

// Body parsing middleware with limits
app.use(
  express.json({
    limit: "10mb",
    verify: (req, res, buf) => {
      req.rawBody = buf.toString("utf8");
    },
  })
);
app.use(express.urlencoded({ extended: true, limit: "10mb" }));

// Request logging middleware (only in development)
if (process.env.NODE_ENV === "development") {
  app.use((req, res, next) => {
    logger.info(`${req.method} ${req.path} - ${req.ip}`);
    next();
  });
}

// Health check endpoint (before rate limiting)
app.get("/health", async (req, res) => {
  try {
    const mongoose = require("mongoose");
    const dbStatus =
      mongoose.connection.readyState === 1 ? "connected" : "disconnected";

    res.json({
      status: "ok",
      timestamp: new Date().toISOString(),
      environment: process.env.NODE_ENV || "development",
      mongodb: dbStatus,
      uptime: process.uptime(),
      memory: process.memoryUsage(),
    });
  } catch (error) {
    res.json({
      status: "ok",
      timestamp: new Date().toISOString(),
      environment: process.env.NODE_ENV || "development",
      mongodb: "unknown",
      error: error.message,
    });
  }
});

// Root endpoint
app.get("/", (req, res) => {
  res.json({
    message: "Threads Pro API",
    status: "running",
    version: "1.0.0",
    documentation: "https://github.com/yourusername/threads-pro-docs",
    endpoints: {
      health: "/health",
      api: {
        license: {
          validate: "POST /api/license/validate",
          check: "POST /api/license/check",
          info: "GET /api/license/info",
        },
        activity: {
          log: "POST /api/activity/log",
          stats: "GET /api/activity/stats",
          summary: "GET /api/activity/summary",
        },
        public: {
          createLicense: "POST /api/public/create-license",
          licenseTypes: "GET /api/public/license-types",
        },
      },
    },
  });
});

// API info endpoint
app.get("/api", (req, res) => {
  res.json({
    version: "1.0.0",
    endpoints: {
      license: "/api/license",
      activity: "/api/activity",
      admin: "/api/admin",
      public: "/api/public",
    },
  });
});

// Rate limiting configuration
const createRateLimiter = (windowMs, max, message) => {
  return rateLimit({
    windowMs,
    max,
    message,
    standardHeaders: true,
    legacyHeaders: false,
    handler: (req, res) => {
      logger.warn(`Rate limit exceeded for IP: ${req.ip}`);
      res.status(429).json({
        success: false,
        error: "Too Many Requests",
        message,
        retryAfter: Math.round(windowMs / 1000),
      });
    },
    skip: (req) => {
      // Skip rate limiting for health checks and root
      return req.path === "/health" || req.path === "/" || req.path === "/api";
    },
  });
};

// Different rate limits for different endpoints
const generalLimiter = createRateLimiter(
  15 * 60 * 1000, // 15 minutes
  100, // limit each IP to 100 requests per windowMs
  "Too many requests, please try again later."
);

const strictLimiter = createRateLimiter(
  15 * 60 * 1000, // 15 minutes
  20, // limit each IP to 20 requests per windowMs
  "Too many license validation attempts, please try again later."
);

// Apply rate limiting
app.use("/api/", generalLimiter);
app.use("/api/license/validate", strictLimiter);
app.use("/api/public/create-license", strictLimiter);

// API routes with error handling
try {
  if (licenseRoutes) {
    app.use("/api/license", licenseRoutes);
    logger.info("License routes loaded");
  }

  if (activityRoutes) {
    app.use("/api/activity", activityRoutes);
    logger.info("Activity routes loaded");
  }

  if (adminRoutes) {
    app.use("/api/admin", adminRoutes);
    logger.info("Admin routes loaded");
  }

  if (publicRoutes) {
    app.use("/api/public", publicRoutes);
    logger.info("Public routes loaded");
  }
} catch (error) {
  logger.error("Error setting up routes:", error);
}

// 404 handler for unmatched routes
app.use((req, res) => {
  res.status(404).json({
    success: false,
    error: "Not Found",
    message: "The requested endpoint does not exist",
    path: req.path,
    method: req.method,
    timestamp: new Date().toISOString(),
  });
});

// Global error handling middleware (must be last)
app.use((err, req, res, next) => {
  // Use the errorHandler if available, otherwise use inline handler
  if (errorHandler && typeof errorHandler === "function") {
    return errorHandler(err, req, res, next);
  }

  // Fallback error handler
  logger.error("Unhandled error:", err);

  // Don't leak error details in production
  const isDevelopment = process.env.NODE_ENV === "development";

  res.status(err.status || 500).json({
    success: false,
    error: err.name || "Internal Server Error",
    message: isDevelopment ? err.message : "An unexpected error occurred",
    ...(isDevelopment && { stack: err.stack }),
    timestamp: new Date().toISOString(),
  });
});

module.exports = app;