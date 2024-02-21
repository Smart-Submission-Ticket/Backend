const mongoose = require("mongoose");

const classesSchema = new mongoose.Schema({
  year: {
    type: Number,
    required: true,
  },
  class: {
    type: String,
    required: true,
  },
  batches: {
    type: [String],
    required: true,
  },
});

const Classes = mongoose.model("Classes", classesSchema);

module.exports.Classes = Classes;
