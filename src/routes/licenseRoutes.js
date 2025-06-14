// src/routes/licenseRoutes.js - License endpoints
const express = require("express");
const router = express.Router();
const licenseController = require("../controllers/licenseController");
const { validateRequest } = require("../middleware/validation");
const Joi = require("joi");

// Validation schemas
const validateLicenseSchema = Joi.object({
  email: Joi.string().email().required(),
  key: Joi.string()
    .pattern(/^[A-Z0-9]{4}-[A-Z0-9]{4}-[A-Z0-9]{4}-[A-Z0-9]{4}$/)
    .required(),
  version: Joi.string().optional(),
  timestamp: Joi.number().optional(),
});

const checkLicenseSchema = Joi.object({
  email: Joi.string().email().required(),
  key: Joi.string()
    .pattern(/^[A-Z0-9]{4}-[A-Z0-9]{4}-[A-Z0-9]{4}-[A-Z0-9]{4}$/)
    .required(),
  version: Joi.string().optional(),
});

// Routes
router.post(
  "/validate",
  validateRequest(validateLicenseSchema),
  licenseController.validateLicense
);

router.post(
  "/check",
  validateRequest(checkLicenseSchema),
  licenseController.checkLicense
);

router.get("/info", licenseController.getLicenseInfo);

module.exports = router;
