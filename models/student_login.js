const mongoose = require("mongoose");
const Joi = require("joi");
const jwt = require("jsonwebtoken");

const { JWT_PRIVATE_KEY } = require("../config");

const studentLoginSchema = new mongoose.Schema({
  rollNo: {
    type: String,
    required: true,
  },
  email: {
    type: String,
    required: true,
    index: true,
  },
  password: {
    type: String,
    required: true,
  },
});

studentLoginSchema.methods.generateAuthToken = function () {
  const token = jwt.sign(
    { _id: this._id, email: this.email, role: "student" },
    JWT_PRIVATE_KEY
  );
  return token;
};

const StudentLogin = mongoose.model("StudentLogin", studentLoginSchema);

async function validateStudent(student) {
  const schema = Joi.object({
    rollNo: Joi.string().required(),
    email: Joi.string().email().required(),
    password: Joi.string().min(5).max(255).required(),
  });

  return await schema.validateAsync(student);
}

exports.StudentLogin = StudentLogin;
exports.validate = validateStudent;
