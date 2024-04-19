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
  coordinator: {
    type: String,
  },
});

classesSchema.statics.getCoordinatingClasses = async function (teacher) {
  const classes = await this.find({ coordinator: teacher }).select(
    "-_id -__v -coordinator -batches"
  );
  return classes;
};

const Classes = mongoose.model("Classes", classesSchema);

module.exports.Classes = Classes;
