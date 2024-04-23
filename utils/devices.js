const { Devices } = require("../models/devices");

const addDevice = async (req, email) => {
  const device = req.useragent;

  const newDevice = new Devices({
    email,
    platform: device.platform,
    os: device.os,
    browser: device.browser,
    version: device.version,
    source: device.source,
    ip: req.ip,
    isMobile: device.isMobile,
    isDesktop: device.isDesktop,
    isTablet: device.isTablet,
    isWindows: device.isWindows,
    isLinux: device.isLinux,
    isMac: device.isMac,
    status: "active",
  });

  await newDevice.save();
};

const removeDevice = async (req, email) => {
  await Devices.findOneAndUpdate(
    {
      email,
      ip: req.ip,
      source: req.useragent.source,
      status: "active",
    },
    {
      status: "inactive",
    }
  );
};

module.exports = { addDevice, removeDevice };
