// src/models/Activity.js - Activity logging model
const mongoose = require("mongoose");

const activitySchema = new mongoose.Schema(
  {
    licenseKey: {
      type: String,
      required: true,
      index: true,
    },
    email: {
      type: String,
      required: true,
      index: true,
    },
    action: {
      type: String,
      required: true,
      enum: [
        "license_activated",
        "license_checked",
        "license_deactivated",
        "threads_extracted",
        "posting_started",
        "posting_completed",
        "posting_stopped",
        "settings_updated",
        "error_occurred",
      ],
    },
    data: {
      type: mongoose.Schema.Types.Mixed,
      default: {},
    },
    metadata: {
      ip: String,
      userAgent: String,
      extensionVersion: String,
      timestamp: {
        type: Date,
        default: Date.now,
      },
    },
    success: {
      type: Boolean,
      default: true,
    },
    errorMessage: String,
  },
  {
    timestamps: true,
  }
);

// Indexes for better query performance
activitySchema.index({ email: 1, createdAt: -1 });
activitySchema.index({ action: 1, createdAt: -1 });
activitySchema.index({ createdAt: -1 });

// Static method to log activity
activitySchema.statics.logActivity = async function (
  licenseKey,
  email,
  action,
  data = {},
  metadata = {}
) {
  const activity = new this({
    licenseKey,
    email,
    action,
    data,
    metadata: {
      ...metadata,
      timestamp: new Date(),
    },
  });

  return await activity.save();
};

// Static method to get user statistics
activitySchema.statics.getUserStats = async function (
  email,
  startDate,
  endDate
) {
  const match = { email };

  if (startDate || endDate) {
    match.createdAt = {};
    if (startDate) match.createdAt.$gte = new Date(startDate);
    if (endDate) match.createdAt.$lte = new Date(endDate);
  }

  const stats = await this.aggregate([
    { $match: match },
    {
      $group: {
        _id: "$action",
        count: { $sum: 1 },
        lastOccurrence: { $max: "$createdAt" },
      },
    },
    {
      $group: {
        _id: null,
        totalActivities: { $sum: "$count" },
        activities: {
          $push: {
            action: "$_id",
            count: "$count",
            lastOccurrence: "$lastOccurrence",
          },
        },
      },
    },
  ]);

  // Get posting statistics
  const postingStats = await this.aggregate([
    {
      $match: {
        email,
        action: "posting_completed",
      },
    },
    {
      $group: {
        _id: null,
        totalSessions: { $sum: 1 },
        totalThreadsPosted: { $sum: "$data.posted" },
        totalThreadsFailed: { $sum: "$data.failed" },
        avgThreadsPerSession: { $avg: "$data.posted" },
      },
    },
  ]);

  return {
    general: stats[0] || { totalActivities: 0, activities: [] },
    posting: postingStats[0] || {
      totalSessions: 0,
      totalThreadsPosted: 0,
      totalThreadsFailed: 0,
      avgThreadsPerSession: 0,
    },
  };
};

module.exports = mongoose.model("Activity", activitySchema);
