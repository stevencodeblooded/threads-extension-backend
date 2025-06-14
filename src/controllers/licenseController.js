// src/controllers/licenseController.js - License validation logic
const License = require("../models/License");
const Activity = require("../models/Activity");
const logger = require("../utils/logger");

// Validate a license
exports.validateLicense = async (req, res) => {
  try {
    const { email, key, version, timestamp } = req.body;

    // Validate input
    if (!email || !key) {
      return res.status(400).json({
        success: false,
        message: "Email and license key are required",
      });
    }

    // Find license
    const license = await License.findOne({ email, key });

    if (!license) {
      // Log failed attempt
      await Activity.logActivity(
        "unknown",
        email,
        "license_activated",
        { success: false, reason: "Invalid license" },
        {
          ip: req.ip,
          userAgent: req.get("user-agent"),
          extensionVersion: version,
        }
      );

      return res.status(401).json({
        success: false,
        message: "Invalid email or license key",
      });
    }

    // Check validity
    // Check validity
    const validity = license.checkValidity();

    if (!validity.valid) {
      // Save the updated status if changed
      await license.save();

      return res.status(401).json({
        success: false,
        message: validity.reason,
      });
    }

    // Update metadata
    license.metadata = {
      ...license.metadata,
      ip: req.ip,
      userAgent: req.get("user-agent"),
      extensionVersion: version,
    };

    // Save once after all updates
    await license.save();

    // Log successful activation
    await Activity.logActivity(
      license.key,
      email,
      "license_activated",
      { success: true, type: license.type },
      {
        ip: req.ip,
        userAgent: req.get("user-agent"),
        extensionVersion: version,
      }
    );

    // Return success response
    res.json({
      success: true,
      expiresAt: license.expiresAt.getTime(), // Send as timestamp in milliseconds
      features: license.features,
      type: license.type,
      message: "License activated successfully",
    });
  } catch (error) {
    logger.error("License validation error:", error);
    res.status(500).json({
      success: false,
      message: "Internal server error",
    });
  }
};

// Check license status
exports.checkLicense = async (req, res) => {
  try {
    const { email, key, version } = req.body;

    if (!email || !key) {
      return res.status(400).json({
        success: false,
        message: "Email and license key are required",
      });
    }

    // Find license
    const license = await License.findOne({ email, key });

    if (!license) {
      return res.status(401).json({
        success: false,
        message: "Invalid license",
      });
    }

    // Check validity
    const validity = license.checkValidity();

    if (!validity.valid) {
      // Log failed check
      await Activity.logActivity(
        license.key,
        email,
        "license_checked",
        { success: false, reason: validity.reason },
        {
          ip: req.ip,
          userAgent: req.get("user-agent"),
          extensionVersion: version,
        }
      );

      return res.status(401).json({
        success: false,
        message: validity.reason,
      });
    }

    // Log successful check
    await Activity.logActivity(
      license.key,
      email,
      "license_checked",
      { success: true },
      {
        ip: req.ip,
        userAgent: req.get("user-agent"),
        extensionVersion: version,
      }
    );

    // Return success response
    res.json({
      success: true,
      expiresAt: license.expiresAt.getTime(), // Send as timestamp in milliseconds
      features: license.features,
      type: license.type,
      daysLeft: Math.max(
        0,
        Math.ceil((license.expiresAt - new Date()) / (1000 * 60 * 60 * 24))
      ),
    });
  } catch (error) {
    logger.error("License check error:", error);
    res.status(500).json({
      success: false,
      message: "Internal server error",
    });
  }
};

// Get license info (for users)
exports.getLicenseInfo = async (req, res) => {
  try {
    const { email, key } = req.query;

    if (!email || !key) {
      return res.status(400).json({
        success: false,
        message: "Email and license key are required",
      });
    }

    // Find license
    const license = await License.findOne({ email, key });

    if (!license) {
      return res.status(404).json({
        success: false,
        message: "License not found",
      });
    }

    // Return license info (without sensitive data)
    res.json({
      success: true,
      license: {
        email: license.email,
        type: license.type,
        status: license.status,
        features: license.features,
        activatedAt: license.activatedAt,
        expiresAt: license.expiresAt,
        daysLeft: Math.max(
          0,
          Math.floor((license.expiresAt - new Date()) / (1000 * 60 * 60 * 24))
        ),
        isValid: license.isValid,
      },
    });
  } catch (error) {
    logger.error("Get license info error:", error);
    res.status(500).json({
      success: false,
      message: "Internal server error",
    });
  }
};
