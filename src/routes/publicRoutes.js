// Update src/routes/publicRoutes.js

const express = require("express");
const router = express.Router();
const License = require("../models/License");
const logger = require("../utils/logger");

// Public endpoint to create licenses with type selection
router.post("/create-license", async (req, res) => {
  try {
    const { email, licenseType, days, maxThreads } = req.body;

    if (!email || !email.includes("@")) {
      return res.status(400).json({
        success: false,
        message: "Valid email required",
      });
    }

    // If custom days is provided, set type to "custom"
    let finalType = days ? "custom" : licenseType || "basic";
    let finalDays = days;
    let finalMaxThreads = maxThreads;

    // Only validate license type if not using custom values
    if (!days) {
      const validTypes = ["trial", "basic", "pro", "enterprise"];
      if (!licenseType || !validTypes.includes(licenseType)) {
        return res.status(400).json({
          success: false,
          message: "Valid license type required",
        });
      }

      // Set defaults based on license type
      switch (licenseType) {
        case "trial":
          finalDays = 7;
          break;
        case "basic":
          finalDays = 30;
          break;
        case "pro":
          finalDays = 365;
          break;
        case "enterprise":
          finalDays = 365;
          break;
      }
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

    // Create metadata
    const metadata = {};
    if (maxThreads) {
      metadata.customMaxThreads = maxThreads;
    }

    // Create license
    const license = await License.createLicense(
      email,
      finalType,
      finalDays,
      metadata
    );

    // Update features if custom values provided
    if (maxThreads) {
      license.features.maxThreads = maxThreads;
      await license.save();
    }

    logger.info(
      `${finalType} license created for ${email} with ${finalDays} days`
    );

    res.json({
      success: true,
      license: {
        key: license.key,
        email: license.email,
        type: finalType,
        validDays: finalDays,
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