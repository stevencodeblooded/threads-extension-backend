// Update src/routes/publicRoutes.js

const express = require("express");
const router = express.Router();
const License = require("../models/License");
const logger = require("../utils/logger");

// Public endpoint to create licenses with type selection
router.post("/create-license", async (req, res) => {
  try {
    const { email, licenseType } = req.body;

    if (!email || !email.includes("@")) {
      return res.status(400).json({
        success: false,
        message: "Valid email required",
      });
    }

    // Validate license type
    const validTypes = ["trial", "basic", "pro", "enterprise"];
    if (!licenseType || !validTypes.includes(licenseType)) {
      return res.status(400).json({
        success: false,
        message: "Valid license type required",
      });
    }

    // Check if email already has an active license
    const existing = await License.findOne({
      email,
      status: { $in: ["active", "trial"] },
    });

    if (existing) {
      return res.status(400).json({
        success: false,
        message:
          "This email already has an active license. Please use a different email or contact support.",
      });
    }

    // Set days based on license type
    let days;
    switch (licenseType) {
      case "trial":
        days = 7;
        break;
      case "basic":
        days = 30;
        break;
      case "pro":
        days = 365;
        break;
      case "enterprise":
        days = 365;
        break;
      default:
        days = 30;
    }

    // Create license
    const license = await License.createLicense(email, licenseType, days);

    logger.info(`${licenseType} license created for ${email}`);

    // Send email if configured (optional)
    // await emailService.sendLicenseActivation(email, license);

    res.json({
      success: true,
      license: {
        key: license.key,
        email: license.email,
        type: licenseType,
        validDays: days,
        expiresAt: license.expiresAt,
        features: license.features,
      },
    });
  } catch (error) {
    logger.error("Create license error:", error);
    res.status(500).json({
      success: false,
      message: "Failed to create license. Please try again.",
    });
  }
});

// Optional: Add endpoint to check available license types
router.get("/license-types", (req, res) => {
  res.json({
    success: true,
    types: [
      {
        id: "trial",
        name: "Trial",
        days: 7,
        maxThreads: 20,
        description: "Perfect for testing the extension",
      },
      {
        id: "basic",
        name: "Basic",
        days: 30,
        maxThreads: 100,
        description: "Great for personal use",
      },
      {
        id: "pro",
        name: "Pro",
        days: 365,
        maxThreads: 500,
        description: "For power users and small businesses",
      },
      {
        id: "enterprise",
        name: "Enterprise",
        days: 365,
        maxThreads: 1000,
        description: "For agencies and large teams",
      },
    ],
  });
});

module.exports = router;