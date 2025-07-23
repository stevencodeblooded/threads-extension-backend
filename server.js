// server.js - Updated for Vercel serverless deployment
require("dotenv").config();
const mongoose = require("mongoose");

// Simple logger for serverless
const logger = {
  info: (msg, ...args) => console.log(`[INFO] ${msg}`, ...args),
  error: (msg, ...args) => console.error(`[ERROR] ${msg}`, ...args),
  warn: (msg, ...args) => console.warn(`[WARN] ${msg}`, ...args),
};

// MongoDB connection for serverless with better error handling
let cachedConnection = null;

const connectToDatabase = async () => {
  if (cachedConnection && mongoose.connection.readyState === 1) {
    return cachedConnection;
  }

  try {
    const opts = {
      maxPoolSize: 5,
      serverSelectionTimeoutMS: 5000,
      socketTimeoutMS: 45000,
      bufferCommands: false,
      bufferMaxEntries: 0,
    };

    cachedConnection = await mongoose.connect(process.env.MONGODB_URI, opts);
    logger.info("Connected to MongoDB");
    return cachedConnection;
  } catch (error) {
    logger.error("MongoDB connection error:", error);
    throw error;
  }
};

// Import app after dotenv config
const app = require("./src/app");

// Main handler function for Vercel
const handler = async (req, res) => {
  try {
    // Connect to database before handling request
    await connectToDatabase();

    // Handle the request with Express app
    return app(req, res);
  } catch (error) {
    logger.error("Handler error:", error);
    return res.status(500).json({
      error: "Internal server error",
      message:
        process.env.NODE_ENV === "development"
          ? error.message
          : "Something went wrong",
    });
  }
};

// For local development
if (process.env.NODE_ENV !== "production") {
  const PORT = process.env.PORT || 3000;

  // Connect to database for local development
  connectToDatabase()
    .then(() => {
      app.listen(PORT, () => {
        logger.info(`Server running on port ${PORT}`);
      });
    })
    .catch((error) => {
      logger.error("Failed to start server:", error);
      process.exit(1);
    });
}

// Export handler for Vercel
module.exports = handler;
