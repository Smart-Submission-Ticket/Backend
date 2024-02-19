const mongoose = require("mongoose");

const batchSchema = new mongoose.Schema({
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
  students: [
    {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Student",
    },
  ],
  curriculum: {
    type: mongoose.Schema.Types.ObjectId,
    ref: "Curriculum",
  },
});

const Batch = mongoose.model("Batch", batchSchema);

exports.Batch = Batch;
