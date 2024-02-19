const mongoose = require("mongoose");
const Joi = require("joi");

const teacherSchema = new mongoose.Schema({
  name: {
    type: String,
    required: true,
  },
  email: {
    type: String,
    required: true,
  },
  password: {
    type: String,
    required: true,
  },
});

const Teacher = mongoose.model("Teacher", teacherSchema);

function validateTeacher(teacher) {
  const schema = {
    name: Joi.string().required(),
    email: Joi.string().required(),
    password: Joi.string().required(),
  };
  return Joi.validate(teacher, schema);
}

exports.Teacher = Teacher;
exports.validate = validateTeacher;
