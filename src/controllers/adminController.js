// src/controllers/adminController.js - Admin functionality
const License = require("../models/License");
const Activity = require("../models/Activity");
const logger = require("../utils/logger");

// Create a new license
exports.createLicense = async (req, res) => {
  try {
    const { email, type = "basic", days, notes } = req.body;

    // Check if license already exists for this email
    const existingLicense = await License.findOne({
      email,
      status: { $in: ["active", "trial"] },
    });

    if (existingLicense) {
      return res.status(400).json({
        success: false,
        message: "Active license already exists for this email",
      });
    }

    // Determine days based on type if not specified
    let daysValid = days;
    if (!daysValid) {
      switch (type) {
        case "trial":
          daysValid = parseInt(process.env.LICENSE_TRIAL_DAYS) || 7;
          break;
        case "basic":
          daysValid = parseInt(process.env.LICENSE_DEFAULT_DAYS) || 30;
          break;
        case "pro":
          daysValid = 365;
          break;
        case "enterprise":
          daysValid = 365;
          break;
        default:
          daysValid = 30;
      }
    }

    // Create the license
    const license = await License.createLicense(email, type, daysValid, {
      notes,
    });

    logger.info(
      `License created for ${email} - Type: ${type}, Days: ${daysValid}`
    );

    res.status(201).json({
      success: true,
      license: {
        key: license.key,
        email: license.email,
        type: license.type,
        expiresAt: license.expiresAt,
        features: license.features,
      },
    });
  } catch (error) {
    logger.error("Create license error:", error);
    res.status(500).json({
      success: false,
      message: "Failed to create license",
    });
  }
};

// List all licenses
exports.listLicenses = async (req, res) => {
  try {
    const { status, type, page = 1, limit = 20 } = req.query;

    // Build query
    const query = {};
    if (status) query.status = status;
    if (type) query.type = type;

    // Get licenses with pagination
    const licenses = await License.find(query)
      .sort({ createdAt: -1 })
      .limit(limit * 1)
      .skip((page - 1) * limit)
      .select("-__v");

    // Get total count
    const total = await License.countDocuments(query);

    res.json({
      success: true,
      licenses,
      pagination: {
        page: parseInt(page),
        limit: parseInt(limit),
        total,
        pages: Math.ceil(total / limit),
      },
    });
  } catch (error) {
    logger.error("List licenses error:", error);
    res.status(500).json({
      success: false,
      message: "Failed to retrieve licenses",
    });
  }
};

// Revoke a license
exports.revokeLicense = async (req, res) => {
  try {
    const { key } = req.params;
    const { reason } = req.body;

    const license = await License.findOne({ key });

    if (!license) {
      return res.status(404).json({
        success: false,
        message: "License not found",
      });
    }

    // Revoke the license
    license.status = "revoked";
    license.revoked = {
      status: true,
      reason: reason || "Revoked by admin",
      date: new Date(),
    };

    await license.save();

    logger.info(`License revoked: ${key} - Reason: ${reason}`);

    res.json({
      success: true,
      message: "License revoked successfully",
    });
  } catch (error) {
    logger.error("Revoke license error:", error);
    res.status(500).json({
      success: false,
      message: "Failed to revoke license",
    });
  }
};

// Extend a license
exports.extendLicense = async (req, res) => {
  try {
    const { key } = req.params;
    const { days } = req.body;

    const license = await License.findOne({ key });

    if (!license) {
      return res.status(404).json({
        success: false,
        message: "License not found",
      });
    }

    // Extend from current expiry or today, whichever is later
    const baseDate =
      license.expiresAt > new Date() ? license.expiresAt : new Date();
    const newExpiryDate = new Date(baseDate);
    newExpiryDate.setDate(newExpiryDate.getDate() + days);

    license.expiresAt = newExpiryDate;

    // Update status if it was expired
    if (license.status === "expired") {
      license.status = "active";
    }

    await license.save();

    logger.info(`License extended: ${key} - Days: ${days}`);

    res.json({
      success: true,
      message: "License extended successfully",
      newExpiryDate,
    });
  } catch (error) {
    logger.error("Extend license error:", error);
    res.status(500).json({
      success: false,
      message: "Failed to extend license",
    });
  }
};

// Get dashboard statistics
exports.getDashboardStats = async (req, res) => {
  try {
    // Get license statistics
    const licenseStats = await License.aggregate([
      {
        $group: {
          _id: "$status",
          count: { $sum: 1 },
        },
      },
    ]);

    // Get activity statistics for the last 30 days
    const thirtyDaysAgo = new Date();
    thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);

    const activityStats = await Activity.aggregate([
      {
        $match: {
          createdAt: { $gte: thirtyDaysAgo },
        },
      },
      {
        $group: {
          _id: "$action",
          count: { $sum: 1 },
        },
      },
    ]);

    // Get daily active users for the last 7 days
    const sevenDaysAgo = new Date();
    sevenDaysAgo.setDate(sevenDaysAgo.getDate() - 7);

    const dailyActiveUsers = await Activity.aggregate([
      {
        $match: {
          createdAt: { $gte: sevenDaysAgo },
        },
      },
      {
        $group: {
          _id: {
            date: { $dateToString: { format: "%Y-%m-%d", date: "$createdAt" } },
            email: "$email",
          },
        },
      },
      {
        $group: {
          _id: "$_id.date",
          activeUsers: { $sum: 1 },
        },
      },
      {
        $sort: { _id: 1 },
      },
    ]);

    res.json({
      success: true,
      stats: {
        licenses: licenseStats,
        activities: activityStats,
        dailyActiveUsers,
      },
    });
  } catch (error) {
    logger.error("Get dashboard stats error:", error);
    res.status(500).json({
      success: false,
      message: "Failed to retrieve statistics",
    });
  }
};
