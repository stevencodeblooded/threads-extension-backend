// server.js - Main entry point for Threads Pro API
require("dotenv").config();
const mongoose = require("mongoose");
const app = require("./src/app");
const logger = require("./src/utils/logger");

const PORT = process.env.PORT || 3000;

// Connect to MongoDB with updated options
mongoose
  .connect(process.env.MONGODB_URI, {
    maxPoolSize: 10,
    serverSelectionTimeoutMS: 5000,
  })
  .then(() => {
    logger.info("Connected to MongoDB");

    // Start server
    app.listen(PORT, () => {
      logger.info(`Server running on port ${PORT}`);
      logger.info(`Environment: ${process.env.NODE_ENV}`);
      logger.info(`Health check: http://localhost:${PORT}/health`);
    });
  })
  .catch((error) => {
    logger.error("MongoDB connection error:", error);
    process.exit(1);
  });
