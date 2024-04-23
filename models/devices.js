const mongoose = require("mongoose");

const devicesSchema = new mongoose.Schema({
  email: {
    type: String,
    required: true,
  },
  platform: {
    type: String,
    required: true,
  },
  os: {
    type: String,
    required: true,
  },
  browser: {
    type: String,
    required: true,
  },
  version: {
    type: String,
    required: true,
  },
  source: {
    type: String,
    required: true,
  },
  ip: {
    type: String,
    required: true,
  },
  isMobile: {
    type: Boolean,
    required: true,
  },
  isDesktop: {
    type: Boolean,
    required: true,
  },
  isTablet: {
    type: Boolean,
    required: true,
  },
  isWindows: {
    type: Boolean,
    required: true,
  },
  isLinux: {
    type: Boolean,
    required: true,
  },
  isMac: {
    type: Boolean,
    required: true,
  },
  status: {
    type: String,
    required: true,
  },
});

const Devices = mongoose.model("Devices", devicesSchema);

exports.Devices = Devices;
