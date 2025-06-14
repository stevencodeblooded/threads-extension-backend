// src/models/License.js - License data model
const mongoose = require("mongoose");
const { v4: uuidv4 } = require("uuid");

const licenseSchema = new mongoose.Schema(
  {
    key: {
      type: String,
      required: true,
      unique: true,
      default: () => {
        // Generate license key in format: XXXX-XXXX-XXXX-XXXX
        const uuid = uuidv4().replace(/-/g, "").toUpperCase();
        return `${uuid.slice(0, 4)}-${uuid.slice(4, 8)}-${uuid.slice(
          8,
          12
        )}-${uuid.slice(12, 16)}`;
      },
    },
    email: {
      type: String,
      required: true,
      lowercase: true,
      trim: true,
      index: true,
    },
    status: {
      type: String,
      enum: ["active", "expired", "revoked", "trial"],
      default: "active",
    },
    type: {
      type: String,
      enum: ["trial", "basic", "pro", "enterprise"],
      default: "basic",
    },
    features: {
      maxThreads: {
        type: Number,
        default: 100,
      },
      customDelays: {
        type: Boolean,
        default: true,
      },
      advancedMode: {
        type: Boolean,
        default: true,
      },
      priority: {
        type: String,
        enum: ["normal", "high"],
        default: "normal",
      },
    },
    activatedAt: {
      type: Date,
      default: Date.now,
    },
    expiresAt: {
      type: Date,
      required: true,
    },
    lastChecked: {
      type: Date,
      default: Date.now,
    },
    checkCount: {
      type: Number,
      default: 0,
    },
    metadata: {
      ip: String,
      userAgent: String,
      extensionVersion: String,
      notes: String,
    },
    revoked: {
      status: {
        type: Boolean,
        default: false,
      },
      reason: String,
      date: Date,
    },
  },
  {
    timestamps: true,
  }
);

// Indexes for better query performance
licenseSchema.index({ email: 1, status: 1 });
licenseSchema.index({ expiresAt: 1 });

// Virtual property to check if license is valid
licenseSchema.virtual("isValid").get(function () {
  if (this.revoked.status) return false;
  if (this.status !== "active" && this.status !== "trial") return false;
  if (new Date() > this.expiresAt) return false;
  return true;
});

// Instance method to check license validity
// Instance method to check license validity
licenseSchema.methods.checkValidity = function () {
  // Update last checked
  this.lastChecked = new Date();
  this.checkCount += 1;

  // Check if expired
  if (new Date() > this.expiresAt) {
    this.status = "expired";
    // REMOVE THIS LINE - Don't save here
    // this.save();
    return { valid: false, reason: "License expired" };
  }

  // Check if revoked
  if (this.revoked.status) {
    return { valid: false, reason: `License revoked: ${this.revoked.reason}` };
  }

  // Check status
  if (this.status !== "active" && this.status !== "trial") {
    return { valid: false, reason: `License status: ${this.status}` };
  }

  // REMOVE THIS LINE TOO - Don't save here
  // this.save();

  return {
    valid: true,
    expiresAt: this.expiresAt,
    features: this.features,
    type: this.type,
  };
};

// Static method to create a new license
licenseSchema.statics.createLicense = async function (
  email,
  type = "basic",
  daysValid = 30,
  metadata = {}
) {
  const expiresAt = new Date();
  expiresAt.setDate(expiresAt.getDate() + daysValid);

  const features = {
    maxThreads: 100,
    customDelays: true,
    advancedMode: true,
    priority: "normal",
  };

  // Adjust features based on license type
  if (type === "trial") {
    features.maxThreads = 20;
    features.priority = "normal";
  } else if (type === "pro") {
    features.maxThreads = 500;
    features.priority = "high";
  } else if (type === "enterprise") {
    features.maxThreads = 1000;
    features.priority = "high";
  }

  const license = new this({
    email,
    type,
    status: type === "trial" ? "trial" : "active",
    features,
    expiresAt,
    metadata,
  });

  return await license.save();
};

module.exports = mongoose.model("License", licenseSchema);
