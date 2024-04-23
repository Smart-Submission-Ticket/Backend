const { Logs } = require("../models/logs");

module.exports = async function (req, activity) {
  const newLog = new Logs({
    email: req.user.email,
    endpoint: req.originalUrl,
    activity,
    time: Date.now(),
  });

  await newLog.save();
};
