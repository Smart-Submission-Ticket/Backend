const mongoose = require("mongoose");

const batchSchema = new mongoose.Schema({
  batch: {
    type: String,
    required: true,
    index: true,
  },
  class: {
    type: String,
    required: true,
  },
  year: {
    type: Number,
    required: true,
  },
  rollNos: [
    {
      type: String,
      required: true,
    },
  ],
  students: [
    {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Student",
    },
  ],
  theory: [
    {
      title: {
        type: String,
        required: true,
      },
      teacher: {
        type: String,
        required: true,
      },
    },
  ],
  practical: [
    {
      title: {
        type: String,
        required: true,
      },
      noOfAssignments: {
        type: Number,
        required: true,
      },
      teacher: {
        type: String,
        required: true,
      },
    },
  ],
});

const Batch = mongoose.model("Batch", batchSchema);

exports.Batch = Batch;
