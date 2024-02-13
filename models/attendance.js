const mongoose = require("mongoose");

const attendanceSchema = new mongoose.Schema({
  rollNo: {
    type: String,
    required: true,
  },
  attendance: {
    type: Number,
    required: true,
  },
});

const Attendance = mongoose.model("Attendance", attendanceSchema);

exports.Attendance = Attendance;
