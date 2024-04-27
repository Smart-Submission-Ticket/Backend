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
      _id: false,
      title: {
        type: String,
        required: true,
      },
      elective: {
        type: String,
      },
      teacher: {
        type: String,
        required: true,
      },
    },
  ],
  practical: [
    {
      _id: false,
      title: {
        type: String,
        required: true,
      },
      elective: {
        type: String,
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

batchSchema.statics.getAssignedPracticalBatches = async function (teacher) {
  const batches = await this.find({
    "practical.teacher": teacher,
  }).select("-_id -__v -students -rollNos -theory");

  const practicalBatches = batches.map((batch) => {
    return {
      year: batch.year,
      class: batch.class,
      batch: batch.batch,
      practical: batch.practical.find(
        (practical) => practical.teacher === teacher
      ).title,
    };
  });

  return practicalBatches;
};

batchSchema.statics.getAssignedTheoryClasses = async function (teacher) {
  const batches = await this.find({
    "theory.teacher": teacher,
  }).select("-_id -__v -students -rollNos -practical");

  const theoryClasses = batches.reduce((result, batch) => {
    const existingClass = result.find((item) => item.class === batch.class);
    if (!existingClass) {
      result.push({
        year: batch.year,
        class: batch.class,
        theory: batch.theory.find((theory) => theory.teacher === teacher).title,
      });
    }
    return result;
  }, []);

  return theoryClasses;
};

const Batch = mongoose.model("Batch", batchSchema);

exports.Batch = Batch;
