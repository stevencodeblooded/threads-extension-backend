// src/routes/activityRoutes.js - Activity logging endpoints
const express = require("express");
const router = express.Router();
const activityController = require("../controllers/activityController");
const { validateRequest } = require("../middleware/validation");
const Joi = require("joi");

// Validation schemas
const logActivitySchema = Joi.object({
  email: Joi.string().email().required(),
  action: Joi.string()
    .valid(
      "license_activated",
      "license_checked",
      "license_deactivated",
      "threads_extracted",
      "posting_started",
      "posting_completed",
      "posting_stopped",
      "settings_updated",
      "error_occurred"
    )
    .required(),
  data: Joi.object().optional(),
  timestamp: Joi.number().optional(),
  version: Joi.string().optional(),
});

// Routes
router.post(
  "/log",
  validateRequest(logActivitySchema),
  activityController.logActivity
);

router.get("/stats", activityController.getUserStats);
router.get("/summary", activityController.getActivitySummary);

module.exports = router;
