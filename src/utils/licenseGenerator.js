// src/utils/licenseGenerator.js - License key generation utilities
const crypto = require("crypto");

/**
 * Generate a random license key in format XXXX-XXXX-XXXX-XXXX
 * @returns {string} License key
 */
function generateLicenseKey() {
  const segments = [];
  const chars = "ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789";

  for (let i = 0; i < 4; i++) {
    let segment = "";
    for (let j = 0; j < 4; j++) {
      segment += chars.charAt(Math.floor(Math.random() * chars.length));
    }
    segments.push(segment);
  }

  return segments.join("-");
}

/**
 * Generate a cryptographically secure license key
 * @returns {string} Secure license key
 */
function generateSecureLicenseKey() {
  const buffer = crypto.randomBytes(8);
  const hex = buffer.toString("hex").toUpperCase();

  // Format as XXXX-XXXX-XXXX-XXXX
  return `${hex.slice(0, 4)}-${hex.slice(4, 8)}-${hex.slice(8, 12)}-${hex.slice(
    12,
    16
  )}`;
}

/**
 * Validate license key format
 * @param {string} key - License key to validate
 * @returns {boolean} Is valid format
 */
function validateKeyFormat(key) {
  const pattern = /^[A-Z0-9]{4}-[A-Z0-9]{4}-[A-Z0-9]{4}-[A-Z0-9]{4}$/;
  return pattern.test(key);
}

/**
 * Generate a time-based license key that includes encoded expiry
 * @param {number} daysValid - Number of days the license is valid
 * @returns {object} License key and metadata
 */
function generateTimeBasedKey(daysValid = 30) {
  const now = Date.now();
  const expiry = now + daysValid * 24 * 60 * 60 * 1000;

  // Create a hash of expiry time
  const hash = crypto
    .createHash("sha256")
    .update(`${expiry}-${process.env.JWT_SECRET}`)
    .digest("hex");

  // Take first 16 chars and format as license key
  const keyBase = hash.substring(0, 16).toUpperCase();
  const key = `${keyBase.slice(0, 4)}-${keyBase.slice(4, 8)}-${keyBase.slice(
    8,
    12
  )}-${keyBase.slice(12, 16)}`;

  return {
    key,
    expiry,
    daysValid,
  };
}

/**
 * Generate a batch of unique license keys
 * @param {number} count - Number of keys to generate
 * @returns {string[]} Array of license keys
 */
function generateBatch(count = 10) {
  const keys = new Set();

  while (keys.size < count) {
    keys.add(generateSecureLicenseKey());
  }

  return Array.from(keys);
}

module.exports = {
  generateLicenseKey,
  generateSecureLicenseKey,
  validateKeyFormat,
  generateTimeBasedKey,
  generateBatch,
};
