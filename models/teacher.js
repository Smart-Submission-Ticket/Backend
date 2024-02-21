const mongoose = require("mongoose");
const Joi = require("joi");
const jwt = require("jsonwebtoken");

const { JWT_PRIVATE_KEY } = require("../config");

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
    name: Joi.string().required(),
    email: Joi.string().required(),
    password: Joi.string().required(),
  };
  return Joi.validate(teacher, schema);
}

exports.Teacher = Teacher;
exports.validate = validateTeacher;
