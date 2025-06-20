// src/controllers/adminController.js - Admin functionality
const License = require("../models/License");
const Activity = require("../models/Activity");
const logger = require("../utils/logger");

// Create a new license
exports.createLicense = async (req, res) => {
  try {
    const { email, type = "basic", days, notes, maxThreads } = req.body;

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

    // Create metadata object
    const metadata = { notes };
    
    // If custom maxThreads is provided, use it
    if (maxThreads) {
      metadata.customMaxThreads = maxThreads;
    }

    // Create the license
    const license = await License.createLicense(email, type, daysValid, metadata);
    
    // If custom maxThreads was provided, update the features
    if (maxThreads) {
      license.features.maxThreads = maxThreads;
      await license.save();
    }

    logger.info(
      `License created for ${email} - Type: ${type}, Days: ${daysValid}, MaxThreads: ${license.features.maxThreads}`
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

// Reactivate a revoked license
exports.reactivateLicense = async (req, res) => {
  try {
    const { key } = req.params;

    const license = await License.findOne({ key });

    if (!license) {
      return res.status(404).json({
        success: false,
        message: "License not found",
      });
    }

    // Only reactivate if it was revoked
    if (license.status !== "revoked") {
      return res.status(400).json({
        success: false,
        message: "License is not revoked",
      });
    }

    // Reset revoked status
    license.status = "active";
    license.revoked = {
      status: false,
      reason: null,
      date: null,
    };

    await license.save();

    logger.info(`License reactivated: ${key}`);

    res.json({
      success: true,
      message: "License reactivated successfully",
    });
  } catch (error) {
    logger.error("Reactivate license error:", error);
    res.status(500).json({
      success: false,
      message: "Failed to reactivate license",
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

// Get active licenses with detailed stats
exports.getActiveLicenses = async (req, res) => {
  try {
    const { search, sortBy = 'createdAt', order = 'desc' } = req.query;

    // Build query for active licenses only
    const query = {
      status: { $in: ["active", "trial", "revoked"] },
    };

    // Add search functionality
    if (search) {
      query.$or = [
        { email: new RegExp(search, 'i') },
        { key: new RegExp(search, 'i') }
      ];
    }

    // Get licenses with activity count
    const licenses = await License.aggregate([
      { $match: query },
      {
        $lookup: {
          from: 'activities',
          localField: 'key',
          foreignField: 'licenseKey',
          as: 'activities'
        }
      },
      {
        $addFields: {
          totalActivities: { $size: '$activities' },
          lastActivity: { $max: '$activities.createdAt' },
          daysLeft: {
            $ceil: {
              $divide: [
                { $subtract: ['$expiresAt', new Date()] },
                1000 * 60 * 60 * 24
              ]
            }
          }
        }
      },
      { $project: { activities: 0 } }, // Remove activities array to reduce payload
      { $sort: { [sortBy]: order === 'asc' ? 1 : -1 } }
    ]);

    res.json({
      success: true,
      licenses,
      total: licenses.length
    });
  } catch (error) {
    logger.error("Get active licenses error:", error);
    res.status(500).json({
      success: false,
      message: "Failed to retrieve active licenses",
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

    // Check if license has more than 7 days left
    const daysLeft = Math.ceil(
      (license.expiresAt - new Date()) / (1000 * 60 * 60 * 24)
    );
    if (daysLeft > 7 && license.status === "active") {
      return res.status(400).json({
        success: false,
        message: "Cannot extend license that has more than 7 days remaining",
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
