const express = require("express");
const bcrypt = require("bcrypt");

const { StudentLogin } = require("../models/student_login");
const { Teacher } = require("../models/teacher");

const router = express.Router();

router.post("/student", async (req, res, next) => {
  try {
    const { email, password } = req.body;

    if (!email || !password)
      return res.status(400).send({ message: "Please provide email/password" });

    const student = await StudentLogin.findOne({ email });
    if (!student)
      return res.status(400).send({ message: "Invalid email/password." });

    const isValid = await bcrypt.compare(password, student.password);
    if (!isValid)
      return res.status(400).send({ message: "Invalid email/password." });

    const x_auth_token = student.generateAuthToken();
    res.header("x-auth-token", x_auth_token).send({
      message: "Login successful.",
      student: {
        email: student.email,
        rollNo: student.rollNo,
      },
    });
  } catch (err) {
    console.log(err);
    next(err);
  }
});

router.post("/teacher", async (req, res, next) => {
  try {
    const { email, password } = req.body;

    if (!email || !password)
      return res.status(400).send({ message: "Please provide email/password" });

    const teacher = await Teacher.findOne({ email });
    if (!teacher)
      return res.status(400).send({ message: "Invalid email/password." });

    const isValid = await bcrypt.compare(password, teacher.password);
    if (!isValid)
      return res.status(400).send({ message: "Invalid email/password." });

    const x_auth_token = teacher.generateAuthToken();
    res.header("x-auth-token", x_auth_token).send({
      message: "Login successful.",
      teacher: {
        email: teacher.email,
        name: teacher.name,
      },
    });
  } catch (err) {
    console.log(err);
    next(err);
  }
});

module.exports = router;
