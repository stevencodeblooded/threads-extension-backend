// src/config/index.js - Central configuration exports
const connectDB = require("./database");
const constants = require("./constants");

module.exports = {
  connectDB,
  ...constants,
};
