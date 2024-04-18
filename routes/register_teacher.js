const express = require("express");
const assert = require("assert");
const bcrypt = require("bcrypt");
const jwt = require("jsonwebtoken");

const { JWT_PRIVATE_KEY } = require("../config");
const { OTP } = require("../models/otp");
const { generateOtp, sendRegistrationOtpMail } = require("../utils/send_mail");
const { Teacher } = require("../models/teacher");

const router = express.Router();

const checkIfTeacherAllowed = async (req, res, next) => {
  const { email } = req.body;
  assert(email, "ERROR 400: Email is required.");

  const teacher = await Teacher.findOne({ email });
  assert(teacher, "ERROR 400: Teacher not allowed.");

  assert(!teacher.isRegistered, "ERROR 400: Teacher already registered.");

  next();
};

router.post("/verify-email", checkIfTeacherAllowed, async (req, res) => {
  const { email } = req.body;
  const teacher = await Teacher.findOne({ email: email, isRegistered: true });
  assert(!teacher, "ERROR 400: Teacher already registered.");

  const otp = generateOtp();
  const newOtp = new OTP({
    email: email,
    otp: otp,
  });

  sendRegistrationOtpMail(email, otp);
  await newOtp.save();

  res.status(200).send({
    message: "Registration OTP sent successfully.",
  });
});

router.post("/verify-otp", async (req, res) => {
  const { email, otp } = req.body;

  assert(email, "ERROR 400: Email is required.");
  assert(otp, "ERROR 400: OTP is required.");

  const otpDoc = await OTP.findOne({ email: email });
  assert(otpDoc, "ERROR 400: Time expired.");

  assert(otpDoc.otp === otp, "ERROR 400: Incorrect OTP.");

  await OTP.deleteMany({ email: email });
  const token = jwt.sign({ email: email }, JWT_PRIVATE_KEY);

  res.status(200).send({
    message: "OTP verified successfully.",
    token: token,
  });
});

router.post("/", async (req, res) => {
  const { token, email, password, name } = req.body;

  assert(token, "ERROR 400: Token is required.");
  assert(email, "ERROR 400: Email is required.");
  assert(password, "ERROR 400: Password is required.");
  assert(name, "ERROR 400: Name is required.");

  const decoded = jwt.verify(token, JWT_PRIVATE_KEY);
  assert(decoded, "ERROR 400: Invalid token.");

  assert(decoded.email === email, "ERROR 400: Invalid token.");

  const salt = await bcrypt.genSalt(10);
  const hashedPassword = await bcrypt.hash(password, salt);

  const teacher = await Teacher.findOneAndUpdate(
    { email: email },
    {
      name,
      password: hashedPassword,
      isRegistered: true,
    }
  );

  const x_auth_token = teacher.generateAuthToken();

  res
    .status(201)
    .header("x-auth-token", x_auth_token)
    .send({ message: "Teacher registered successfully." });
});

module.exports = router;
