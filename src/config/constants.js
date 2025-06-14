// src/config/constants.js - Application constants
module.exports = {
  // License types with features
  LICENSE_TYPES: {
    TRIAL: {
      name: "trial",
      duration: 7,
      features: {
        maxThreads: 20,
        customDelays: true,
        advancedMode: false,
        priority: "normal",
      },
    },
    BASIC: {
      name: "basic",
      duration: 30,
      features: {
        maxThreads: 100,
        customDelays: true,
        advancedMode: true,
        priority: "normal",
      },
    },
    PRO: {
      name: "pro",
      duration: 365,
      features: {
        maxThreads: 500,
        customDelays: true,
        advancedMode: true,
        priority: "high",
      },
    },
    ENTERPRISE: {
      name: "enterprise",
      duration: 365,
      features: {
        maxThreads: 1000,
        customDelays: true,
        advancedMode: true,
        priority: "high",
      },
    },
  },

  // Activity types
  ACTIVITY_TYPES: {
    LICENSE_ACTIVATED: "license_activated",
    LICENSE_CHECKED: "license_checked",
    LICENSE_DEACTIVATED: "license_deactivated",
    THREADS_EXTRACTED: "threads_extracted",
    POSTING_STARTED: "posting_started",
    POSTING_COMPLETED: "posting_completed",
    POSTING_STOPPED: "posting_stopped",
    SETTINGS_UPDATED: "settings_updated",
    ERROR_OCCURRED: "error_occurred",
  },

  // HTTP Status codes
  HTTP_STATUS: {
    OK: 200,
    CREATED: 201,
    BAD_REQUEST: 400,
    UNAUTHORIZED: 401,
    FORBIDDEN: 403,
    NOT_FOUND: 404,
    CONFLICT: 409,
    INTERNAL_ERROR: 500,
  },

  // Error messages
  ERROR_MESSAGES: {
    INVALID_LICENSE: "Invalid email or license key",
    LICENSE_EXPIRED: "License has expired",
    LICENSE_REVOKED: "License has been revoked",
    UNAUTHORIZED: "Unauthorized access",
    VALIDATION_ERROR: "Validation error",
    NOT_FOUND: "Resource not found",
    INTERNAL_ERROR: "Internal server error",
  },

  // Success messages
  SUCCESS_MESSAGES: {
    LICENSE_ACTIVATED: "License activated successfully",
    LICENSE_CREATED: "License created successfully",
    LICENSE_EXTENDED: "License extended successfully",
    LICENSE_REVOKED: "License revoked successfully",
    ACTIVITY_LOGGED: "Activity logged successfully",
  },
};
