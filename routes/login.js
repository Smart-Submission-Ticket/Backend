const express = require("express");
const assert = require("assert");
const bcrypt = require("bcrypt");
const jwt = require("jsonwebtoken");

const { JWT_PRIVATE_KEY } = require("../config");
const { StudentLogin } = require("../models/student_login");
const { Teacher } = require("../models/teacher");
const { Admin } = require("../models/admin");
const { OTP } = require("../models/otp");
const auth = require("../middleware/auth");
const { sendForgotPasswordMail, generateOtp } = require("../utils/send_mail");
const { addDevice, removeDevice } = require("../utils/devices");

const router = express.Router();

router.post("/", async (req, res) => {
  const { email, password } = req.body;

  assert(email, "ERROR 400: Please provide email.");
  assert(password, "ERROR 400: Please provide password.");

  const [student, teacher, admin] = await Promise.all([
    StudentLogin.findOne({ email }),
    Teacher.findOne({ email, isRegistered: true }),
    Admin.findOne({ email }),
  ]);

  assert(admin || teacher || student, "ERROR 400: User not found.");

  const [isValidAdmin, isValidTeacher, isValidStudent] = await Promise.all([
    admin && bcrypt.compare(password, admin.password),
    teacher && bcrypt.compare(password, teacher.password),
    student && bcrypt.compare(password, student.password),
  ]);
  assert(
    isValidAdmin || isValidTeacher || isValidStudent,
    "ERROR 400: Invalid password."
  );

  const user = isValidAdmin ? admin : isValidTeacher ? teacher : student;

  addDevice(req, email);

  const x_auth_token = user.generateAuthToken();
  res.header("x-auth-token", x_auth_token).send({
    message: "Login successful.",
    role: isValidAdmin ? "admin" : isValidTeacher ? "teacher" : "student",
    user: {
      email: user.email,
      ...(student && { rollNo: user.rollNo }),
      ...(teacher && { name: user.name }),
    },
  });
});

router.delete("/", auth, async (req, res) => {
  removeDevice(req, req.user.email);
  res.status(200).send({
    message: "Logout successful.",
  });
});

router.post("/forgot-password", async (req, res) => {
  const { email } = req.body;
  assert(email, "ERROR 400: Email is required.");

  const [student, teacher, admin] = await Promise.all([
    StudentLogin.findOne({ email }),
    Teacher.findOne({ email, isRegistered: true }),
    Admin.findOne({ email }),
  ]);

  const user = admin || teacher || student;
  assert(user, "ERROR 400: Email not registered.");

  const otp = generateOtp();
  const newOtp = new OTP({ email, otp });

  sendForgotPasswordMail(user.name || user.rollNo || "Admin", email, otp);
  await newOtp.save();

  res.status(200).send({
    message: "OTP sent successfully.",
  });
});

router.post("/verify-otp", async (req, res) => {
  const { email, otp } = req.body;

  assert(email, "ERROR 400: Email is required.");
  assert(otp, "ERROR 400: OTP is required.");

  const otpDoc = await OTP.findOne({ email });
  assert(otpDoc, "ERROR 400: Time expired.");

  assert(otpDoc.otp === otp, "ERROR 400: Incorrect OTP.");

  await OTP.deleteMany({ email });
  const token = jwt.sign({ email }, JWT_PRIVATE_KEY);

  res.status(200).send({
    message: "OTP verified successfully.",
    token,
  });
});

router.post("/reset-password", async (req, res) => {
  const { token, password } = req.body;

  assert(token, "ERROR 400: Token is required.");
  assert(password, "ERROR 400: Password is required.");

  const decoded = jwt.verify(token, JWT_PRIVATE_KEY);
  assert(decoded, "ERROR 400: Invalid token.");

  const [student, teacher, admin] = await Promise.all([
    StudentLogin.findOne({ email: decoded.email }),
    Teacher.findOne({ email: decoded.email, isRegistered: true }),
    Admin.findOne({ email: decoded.email }),
  ]);

  const user = admin || teacher || student;
  assert(user, "ERROR 400: Invalid token.");

  const salt = await bcrypt.genSalt(10);
  user.password = await bcrypt.hash(password, salt);
  await user.save();

  res.status(200).send({
    message: "Password reset successfully.",
  });
});

module.exports = router;
