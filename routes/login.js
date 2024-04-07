const express = require("express");
const assert = require("assert");
const bcrypt = require("bcrypt");

const { StudentLogin } = require("../models/student_login");
const { Teacher } = require("../models/teacher");

const router = express.Router();

router.post("/student", async (req, res) => {
  const { email, password } = req.body;

  assert(email, "ERROR 400: Please provide email.");
  assert(password, "ERROR 400: Please provide password.");

  const student = await StudentLogin.findOne({ email });
  assert(student, "ERROR 400: Invalid email/password.");

  const isValid = await bcrypt.compare(password, student.password);
  assert(isValid, "ERROR 400: Invalid email/password.");

  const x_auth_token = student.generateAuthToken();
  res.header("x-auth-token", x_auth_token).send({
    message: "Login successful.",
    student: {
      email: student.email,
      rollNo: student.rollNo,
    },
  });
});

router.post("/teacher", async (req, res) => {
  const { email, password } = req.body;

  assert(email, "ERROR 400: Please provide email.");
  assert(password, "ERROR 400: Please provide password.");

  const teacher = await Teacher.findOne({ email });
  assert(teacher, "ERROR 400: Invalid email/password.");

  const isValid = await bcrypt.compare(password, teacher.password);
  assert(isValid, "ERROR 400: Invalid email/password.");

  const x_auth_token = teacher.generateAuthToken();
  res.header("x-auth-token", x_auth_token).send({
    message: "Login successful.",
    teacher: {
      email: teacher.email,
      name: teacher.name,
    },
  });
});

module.exports = router;
