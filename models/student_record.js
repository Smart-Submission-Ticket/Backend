const mongoose = require("mongoose");

const studentRecordSchema = new mongoose.Schema({
  rollNo: {
    type: String,
    required: true,
    index: true,
  },
  attendance: {
    type: Number,
  },
  attendanceAlternate: {
    type: Boolean,
  },
  unitTests: {
    type: Map,
    of: {
      ut1: {
        type: Number,
      },
      ut2: {
        type: Number,
      },
      ut1Alternate: {
        type: Boolean,
      },
      ut2Alternate: {
        type: Boolean,
      },
    },
  },
  assignments: {
    type: Map,
    of: [Number],
  },
  extra: {
    type: Map,
    of: String,
  },
});

const StudentRecord = mongoose.model("StudentRecord", studentRecordSchema);

exports.StudentRecord = StudentRecord;
