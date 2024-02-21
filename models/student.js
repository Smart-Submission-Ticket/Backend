const mongoose = require("mongoose");
const Joi = require("joi");
const jwt = require("jsonwebtoken");

const { JWT_PRIVATE_KEY } = require("../config");

const studentSchema = new mongoose.Schema({
  name: {
    type: String,
    required: true,
  },
  email: {
    type: String,
    required: true,
  },
  mobile: {
    type: String,
    required: true,
  },
  password: {
    type: String,
    required: true,
  },
  rollNo: {
    type: String,
    required: true,
  },
  abcId: {
    type: String,
    required: true,
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
});

studentSchema.methods.generateAuthToken = function () {
  const token = jwt.sign(
    { _id: this._id, email: this.email, role: "student" },
    JWT_PRIVATE_KEY
  );
  return token;
};

const Student = mongoose.model("Student", studentSchema);

async function validateStudent(student) {
  const schema = Joi.object({
    name: Joi.string().required(),
    email: Joi.string().required(),
    mobile: Joi.string().required(),
    password: Joi.string().required(),
    rollNo: Joi.string().required(),
    abcId: Joi.string().required(),
    batch: Joi.string().required(),
    class: Joi.string().required(),
    year: Joi.number().required(),
  });

  return await schema.validateAsync(student);
}

exports.Student = Student;
exports.validate = validateStudent;
