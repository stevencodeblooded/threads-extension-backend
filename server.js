// server.js - Main entry point for Threads Pro API
const mongoose = require("mongoose");

// Simple logger for serverless
const logger = {
  info: (msg, ...args) => console.log(`[INFO] ${msg}`, ...args),
  error: (msg, ...args) => console.error(`[ERROR] ${msg}`, ...args),
  warn: (msg, ...args) => console.warn(`[WARN] ${msg}`, ...args),
};

// MongoDB connection for serverless
let isConnected = false;

const connectToDatabase = async () => {
  if (isConnected && mongoose.connection.readyState === 1) {
    return;
  }

  try {
    await mongoose.connect(process.env.MONGODB_URI, {
      maxPoolSize: 5,
      serverSelectionTimeoutMS: 5000,
      socketTimeoutMS: 45000,
      bufferCommands: false,
      bufferMaxEntries: 0,
    });

    isConnected = true;
    logger.info("Connected to MongoDB");
  } catch (error) {
    logger.error("MongoDB connection error:", error);
    throw error;
  }
};

// Import app after setting up logger
const app = require("./src/app");

// Connect to database and handle requests
const handler = async (req, res) => {
  try {
    await connectToDatabase();
    return app(req, res);
  } catch (error) {
    logger.error("Request handler error:", error);
    return res.status(500).json({ error: "Database connection failed" });
  }
};

// For local development
const PORT = process.env.PORT || 3000;
if (process.env.NODE_ENV !== "production") {
  connectToDatabase().then(() => {
    app.listen(PORT, () => {
      logger.info(`Server running on port ${PORT}`);
    });
  });
}

// Export for Vercel
module.exports = handler;
