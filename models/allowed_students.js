const mongoose = require("mongoose");

const allowedStudentsSchema = new mongoose.Schema({
  email: {
    type: String,
    required: true,
    index: true,
    unique: true,
  },
  batch: {
    type: String,
    required: true,
  },
});

const AllowedStudents = mongoose.model(
  "AllowedStudents",
  allowedStudentsSchema
);

exports.AllowedStudents = AllowedStudents;
