const mongoose = require("mongoose");

const logsSchema = new mongoose.Schema({
  email: {
    type: String,
    required: true,
  },
  endpoint: {
    type: String,
    required: true,
  },
  activity: {
    type: String,
    required: true,
  },
  time: {
    type: Date,
    required: true,
  },
});

const Logs = mongoose.model("Logs", logsSchema);

exports.Logs = Logs;
