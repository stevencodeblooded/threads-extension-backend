// src/routes/adminRoutes.js - Admin endpoints
const express = require("express");
const router = express.Router();
const adminController = require("../controllers/adminController");
const { authenticateAdmin } = require("../middleware/auth");
const { validateRequest } = require("../middleware/validation");
const Joi = require("joi");

// Apply admin authentication to all routes
router.use(authenticateAdmin);

// Validation schemas
const createLicenseSchema = Joi.object({
  email: Joi.string().email().required(),
  type: Joi.string()
    .valid("trial", "basic", "pro", "enterprise")
    .default("basic"),
  days: Joi.number().min(1).max(3650).optional(),
  notes: Joi.string().optional(),
});

const revokeLicenseSchema = Joi.object({
  reason: Joi.string().required(),
});

const extendLicenseSchema = Joi.object({
  days: Joi.number().min(1).max(3650).required(),
});

// Routes
router.post(
  "/licenses",
  validateRequest(createLicenseSchema),
  adminController.createLicense
);

router.get("/licenses", adminController.listLicenses);

router.post(
  "/licenses/:key/revoke",
  validateRequest(revokeLicenseSchema),
  adminController.revokeLicense
);

router.post("/licenses/:key/reactivate", adminController.reactivateLicense);

router.post(
  "/licenses/:key/extend",
  validateRequest(extendLicenseSchema),
  adminController.extendLicense
);

router.get("/dashboard/stats", adminController.getDashboardStats);

router.get("/licenses/active", adminController.getActiveLicenses);

module.exports = router;
