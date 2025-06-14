#!/usr/bin/env node

// scripts/generateLicense.js - CLI tool to generate licenses
require("dotenv").config();
const mongoose = require("mongoose");
const License = require("../src/models/License");
const readline = require("readline");

const rl = readline.createInterface({
  input: process.stdin,
  output: process.stdout,
});

const question = (query) =>
  new Promise((resolve) => rl.question(query, resolve));

async function generateLicense() {
  try {
    // Connect to MongoDB
    await mongoose.connect(process.env.MONGODB_URI, {
      useNewUrlParser: true,
      useUnifiedTopology: true,
    });

    console.log("Connected to MongoDB");
    console.log("\n=== Threads Pro License Generator ===\n");

    // Get license details
    const email = await question("Email address: ");
    const type =
      (await question("License type (trial/basic/pro/enterprise) [basic]: ")) ||
      "basic";
    const daysInput = await question("Days valid (leave empty for default): ");
    const notes = await question("Notes (optional): ");

    // Determine days
    let days = parseInt(daysInput);
    if (!days) {
      switch (type) {
        case "trial":
          days = 7;
          break;
        case "basic":
          days = 30;
          break;
        case "pro":
          days = 365;
          break;
        case "enterprise":
          days = 365;
          break;
        default:
          days = 30;
      }
    }

    // Create license
    const license = await License.createLicense(email, type, days, { notes });

    console.log("\n✅ License created successfully!\n");
    console.log("=================================");
    console.log(`Email: ${license.email}`);
    console.log(`License Key: ${license.key}`);
    console.log(`Type: ${license.type}`);
    console.log(`Valid for: ${days} days`);
    console.log(`Expires: ${license.expiresAt.toDateString()}`);
    console.log("=================================\n");

    // Ask if want to create another
    const another = await question("Create another license? (y/n): ");

    if (another.toLowerCase() === "y") {
      await generateLicense();
    } else {
      console.log("\nGoodbye!");
      process.exit(0);
    }
  } catch (error) {
    console.error("\n❌ Error:", error.message);
    process.exit(1);
  }
}

// Handle CLI arguments
const args = process.argv.slice(2);

if (args.includes("--help") || args.includes("-h")) {
  console.log(`
Threads Pro License Generator

Usage: npm run generate-license

This interactive tool will guide you through creating a new license.

Options:
  --help, -h     Show this help message
  --list         List all licenses
  `);
  process.exit(0);
}

if (args.includes("--list")) {
  // List all licenses
  mongoose
    .connect(process.env.MONGODB_URI, {
      useNewUrlParser: true,
      useUnifiedTopology: true,
    })
    .then(async () => {
      const licenses = await License.find().sort({ createdAt: -1 }).limit(20);

      console.log("\n=== Recent Licenses ===\n");
      licenses.forEach((license) => {
        console.log(
          `${license.email} - ${license.key} - ${license.type} - ${
            license.status
          } - Expires: ${license.expiresAt.toDateString()}`
        );
      });

      process.exit(0);
    })
    .catch((error) => {
      console.error("Error:", error.message);
      process.exit(1);
    });
} else {
  // Generate new license
  generateLicense();
}
