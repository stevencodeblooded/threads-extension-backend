// server.js - Main entry point for Threads Pro API
require("dotenv").config();
const mongoose = require("mongoose");
const app = require("./src/app");
const logger = require("./src/utils/logger");

const PORT = process.env.PORT || 3000;

// MongoDB connection for Vercel (serverless)
let isConnected = false;

const connectToDatabase = async () => {
  if (isConnected) {
    return;
  }

  try {
    await mongoose.connect(process.env.MONGODB_URI, {
      maxPoolSize: 10,
      serverSelectionTimeoutMS: 5000,
      bufferCommands: false, // Disable mongoose buffering for serverless
    });

    isConnected = true;
    logger.info("Connected to MongoDB");
  } catch (error) {
    logger.error("MongoDB connection error:", error);
    throw error;
  }
};

// Connect to database on startup
connectToDatabase().catch(console.error);

// For local development
if (process.env.NODE_ENV !== "production" || process.env.VERCEL !== "1") {
  app.listen(PORT, () => {
    logger.info(`Server running on port ${PORT}`);
    logger.info(`Environment: ${process.env.NODE_ENV}`);
    logger.info(`Health check: http://localhost:${PORT}/health`);
  });
}

// Export for Vercel
module.exports = app;
