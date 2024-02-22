const mongoose = require("mongoose");

const studentDataSchema = new mongoose.Schema({
  name: {
    type: String,
  },
  email: {
    type: String,
    required: true,
    index: true,
    unique: true,
  },
  rollNo: {
    type: String,
    required: true,
    index: true,
  },
  batch: {
    type: String,
    required: true,
  },
  class: {
    type: String,
    required: true,
  },
  year: {
    type: Number,
    required: true,
  },
  mobile: {
    type: String,
  },
  abcId: {
    type: String,
  },
});

const StudentData = mongoose.model("StudentData", studentDataSchema);

exports.StudentData = StudentData;
