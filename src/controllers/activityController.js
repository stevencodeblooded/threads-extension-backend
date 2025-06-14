// src/controllers/activityController.js - Activity logging controller
const Activity = require("../models/Activity");
const License = require("../models/License");
const logger = require("../utils/logger");

// Log activity from extension
exports.logActivity = async (req, res) => {
  try {
    const { email, action, data, timestamp } = req.body;

    // Get license key from email (you might want to pass this from extension)
    const license = await License.findOne({
      email,
      status: { $in: ["active", "trial"] },
    });

    if (!license) {
      return res.status(401).json({
        success: false,
        message: "No active license found",
      });
    }

    // Log the activity
    await Activity.logActivity(license.key, email, action, data, {
      ip: req.ip,
      userAgent: req.get("user-agent"),
      extensionVersion: req.body.version,
    });

    // Update license last checked time
    license.lastChecked = new Date();
    await license.save();

    res.json({
      success: true,
      message: "Activity logged successfully",
    });
  } catch (error) {
    logger.error("Activity logging error:", error);
    res.status(500).json({
      success: false,
      message: "Failed to log activity",
    });
  }
};

// Get user activity statistics
exports.getUserStats = async (req, res) => {
  try {
    const { email, key } = req.query;
    const { startDate, endDate } = req.query;

    if (!email || !key) {
      return res.status(400).json({
        success: false,
        message: "Email and license key are required",
      });
    }

    // Verify license
    const license = await License.findOne({ email, key });

    if (!license || !license.isValid) {
      return res.status(401).json({
        success: false,
        message: "Invalid or expired license",
      });
    }

    // Get statistics
    const stats = await Activity.getUserStats(email, startDate, endDate);

    // Get recent activities
    const recentActivities = await Activity.find({ email })
      .sort({ createdAt: -1 })
      .limit(20)
      .select("action data createdAt success errorMessage");

    res.json({
      success: true,
      stats,
      recentActivities,
    });
  } catch (error) {
    logger.error("Get user stats error:", error);
    res.status(500).json({
      success: false,
      message: "Failed to retrieve statistics",
    });
  }
};

// Get activity summary for a specific period
exports.getActivitySummary = async (req, res) => {
  try {
    const { email, key, period = "7d" } = req.query;

    if (!email || !key) {
      return res.status(400).json({
        success: false,
        message: "Email and license key are required",
      });
    }

    // Verify license
    const license = await License.findOne({ email, key });

    if (!license || !license.isValid) {
      return res.status(401).json({
        success: false,
        message: "Invalid or expired license",
      });
    }

    // Calculate date range
    const endDate = new Date();
    const startDate = new Date();

    switch (period) {
      case "24h":
        startDate.setHours(startDate.getHours() - 24);
        break;
      case "7d":
        startDate.setDate(startDate.getDate() - 7);
        break;
      case "30d":
        startDate.setDate(startDate.getDate() - 30);
        break;
      default:
        startDate.setDate(startDate.getDate() - 7);
    }

    // Get activity summary
    const summary = await Activity.aggregate([
      {
        $match: {
          email,
          createdAt: { $gte: startDate, $lte: endDate },
        },
      },
      {
        $group: {
          _id: {
            date: { $dateToString: { format: "%Y-%m-%d", date: "$createdAt" } },
            action: "$action",
          },
          count: { $sum: 1 },
        },
      },
      {
        $group: {
          _id: "$_id.date",
          activities: {
            $push: {
              action: "$_id.action",
              count: "$count",
            },
          },
          totalActivities: { $sum: "$count" },
        },
      },
      {
        $sort: { _id: 1 },
      },
    ]);

    res.json({
      success: true,
      period,
      startDate,
      endDate,
      summary,
    });
  } catch (error) {
    logger.error("Get activity summary error:", error);
    res.status(500).json({
      success: false,
      message: "Failed to retrieve activity summary",
    });
  }
};
