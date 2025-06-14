// src/middleware/auth.js - Authentication middleware
const logger = require("../utils/logger");

exports.authenticateAdmin = (req, res, next) => {
  const apiKey = req.headers["x-api-key"];

  if (!apiKey || apiKey !== process.env.API_KEY) {
    logger.warn(`Unauthorized admin access attempt from IP: ${req.ip}`);

    return res.status(401).json({
      success: false,
      message: "Unauthorized - Invalid API key",
    });
  }

  next();
};
