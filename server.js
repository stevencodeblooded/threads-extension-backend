// server.js - Updated for Vercel serverless deployment
require("dotenv").config();
const mongoose = require("mongoose");
const app = require("./src/app");

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
    logger.info("Using cached database connection");
    return cachedConnection;
  }

  try {
    if (!process.env.MONGODB_URI) {
      throw new Error("MONGODB_URI is not defined in environment variables");
    }

    const opts = {
      bufferCommands: false,
      serverSelectionTimeoutMS: 10000,
      socketTimeoutMS: 45000,
    };

    cachedConnection = await mongoose.connect(process.env.MONGODB_URI, opts);
    logger.info("Connected to MongoDB");
    return cachedConnection;
  } catch (error) {
    logger.error("MongoDB connection error:", error);
    throw error;
  }
};

// For local development
if (process.env.NODE_ENV !== "production" && require.main === module) {
  const PORT = process.env.PORT || 3000;

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

// Export the Express app for Vercel
module.exports = async (req, res) => {
  try {
    await connectToDatabase();
    return app(req, res);
  } catch (error) {
    logger.error("Request handler error:", error);

    // Send a proper error response
    if (!res.headersSent) {
      res.status(500).json({
        error: "Internal server error",
        message:
          process.env.NODE_ENV === "development"
            ? error.message
            : "Something went wrong",
      });
    }
  }
};
