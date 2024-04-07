const express = require("express");
const assert = require("assert");
const _ = require("lodash");
const bcrypt = require("bcrypt");
const jwt = require("jsonwebtoken");

const { JWT_PRIVATE_KEY } = require("../config");
const { StudentData } = require("../models/student_data");
const { OTP } = require("../models/otp");
const { StudentLogin, validate } = require("../models/student_login");
const { Batch } = require("../models/batch");
const { generateOtp, sendRegistrationOtpMail } = require("../utils/sendMail");

const router = express.Router();

const checkIfStudentAllowed = async (req, res, next) => {
  const { email } = req.body;
  assert(email, "ERROR 400: Email is required.");

  const allowedStudent = await StudentData.findOne({
    email: email,
  }).select("-_id -__v");
  assert(allowedStudent, "ERROR 400: Student not allowed.");

  req.body.student = allowedStudent;
  next();
};

router.post("/verify-email", checkIfStudentAllowed, async (req, res) => {
  const { email } = req.body;
  const student = await StudentLogin.findOne({ email: email });
  assert(!student, "ERROR 400: Student already registered.");

  const otp = generateOtp();
  const newOtp = new OTP({
    email: email,
    otp: otp,
  });

  sendRegistrationOtpMail(email, otp);
  await newOtp.save();

  res.status(200).send({
    message: "Registration OTP sent successfully.",
    student: req.body.student,
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
  const { token } = _.pick(req.body, ["token"]);
  assert(token, "ERROR 400: Token is required.");

  const decoded = jwt.verify(token, JWT_PRIVATE_KEY);
  assert(decoded, "ERROR 400: Invalid token.");
  assert(decoded.email === req.body.email, "ERROR 400: Invalid token.");

  const student = await StudentLogin.findOne({ email: req.body.email });
  assert(!student, "ERROR 400: Student already registered.");

  const studentData = _.pick(req.body, [
    "name",
    "email",
    "password",
    "mobile",
    "rollNo",
    "abcId",
    "batch",
    "class",
    "year",
  ]);

  const studentLogin = _.pick(studentData, ["rollNo", "email", "password"]);

  const { error } = validate(studentLogin);
  assert(!error, error);

  const salt = await bcrypt.genSalt(10);
  studentLogin.password = await bcrypt.hash(studentData.password, salt);

  const newStudent = new StudentLogin(studentLogin);

  await Promise.all([
    newStudent.save(),
    StudentData.findOneAndUpdate(
      { email: studentData.email },
      {
        $set: {
          name: studentData.name,
          mobile: studentData.mobile,
          abcId: studentData.abcId,
        },
      }
    ),
    Batch.findOneAndUpdate(
      { batch: studentData.batch },
      { $push: { students: newStudent._id } }
    ),
  ]);

  const x_auth_token = newStudent.generateAuthToken();

  res
    .status(201)
    .header("x-auth-token", x_auth_token)
    .send({ message: "Student registered successfully." });
});

module.exports = router;
