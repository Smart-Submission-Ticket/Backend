const mongoose = require("mongoose");
const Joi = require("joi");
const jwt = require("jsonwebtoken");

const { JWT_PRIVATE_KEY } = require("../config");

const teacherSchema = new mongoose.Schema({
  name: {
    type: String,
  },
  email: {
    type: String,
    required: true,
    index: true,
  },
  password: {
    type: String,
  },
  isRegistered: {
    type: Boolean,
    default: false,
  },
});

teacherSchema.methods.generateAuthToken = function () {
  const token = jwt.sign(
    { _id: this._id, email: this.email, role: "teacher" },
    JWT_PRIVATE_KEY
  );
  return token;
};

const Teacher = mongoose.model("Teacher", teacherSchema);

function validateTeacher(teacher) {
  const schema = {
    name: Joi.string(),
    email: Joi.string().required().email(),
    password: Joi.string(),
  };
  return Joi.validate(teacher, schema);
}

exports.Teacher = Teacher;
exports.validate = validateTeacher;
