const mongoose = require("mongoose");

const curriculumSchema = new mongoose.Schema({
  batch: {
    type: String,
    required: true,
  },
  subjects: [
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
        type: mongoose.Schema.Types.Mixed,
        required: true,
      },
    },
  ],
});

const Curriculum = mongoose.model("Curriculum", curriculumSchema);

exports.Curriculum = Curriculum;
