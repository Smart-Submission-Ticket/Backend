const express = require("express");
const _ = require("lodash");
const bcrypt = require("bcrypt");
const jwt = require("jsonwebtoken");

const { JWT_PRIVATE_KEY } = require("../config");
const { AllowedStudents } = require("../models/allowed_student");
const { OTP } = require("../models/otp");
const { Student, validate } = require("../models/student");
const { Batch } = require("../models/batch");
const { generateOtp, sendRegistrationOtpMail } = require("../utils/sendMail");

const router = express.Router();

const checkIfStudentAllowed = async (req, res, next) => {
  const { email } = req.body;

  if (!email) return res.status(400).send({ message: "Email is required" });

  const allowedStudent = await AllowedStudents.findOne({
    email: email,
  }).select("-_id -__v");

  if (!allowedStudent)
    return res.status(400).send({ message: "Student not allowed." });

  req.body.student = allowedStudent;
  next();
};

router.post("/verify-email", checkIfStudentAllowed, async (req, res, next) => {
  try {
    const { email } = _.pick(req.body, ["email"]);

    const student = await Student.findOne({
      email: email,
    });

    if (student)
      return res.status(400).send({ message: "Student already registered." });

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
  } catch (err) {
    console.log(err);
    next(err);
  }
});

router.post("/verify-otp", async (req, res, next) => {
  try {
    const { email, otp } = req.body;

    if (!email || !otp)
      return res.status(400).send({ message: "Please provide email/otp" });

    const otpDoc = await OTP.findOne({ email: email });
    if (!otpDoc) return res.status(400).send({ message: "Time expired." });

    if (otpDoc.otp !== otp)
      return res.status(400).send({ message: "Incorrect OTP." });

    await OTP.deleteMany({ email: email });
    const token = jwt.sign({ email: email }, JWT_PRIVATE_KEY);

    res.status(200).send({
      message: "OTP verified successfully.",
      token: token,
    });
  } catch (err) {
    console.log(err);
    next(err);
  }
});

router.post("/", async (req, res, next) => {
  try {
    const { token } = _.pick(req.body, ["token"]);
    if (!token) return res.status(400).send({ message: "Token is required." });

    const decoded = jwt.verify(token, JWT_PRIVATE_KEY);
    if (!decoded) return res.status(400).send({ message: "Invalid token." });

    if (decoded.email !== req.body.email)
      return res.status(400).send({ message: "Invalid token." });

    const student = await Student.findOne({ email: req.body.email });
    if (student)
      return res.status(400).send({ message: "Student already registered." });

    const studentData = _.pick(req.body, [
      "name",
      "email",
      "mobile",
      "password",
      "rollNo",
      "abcId",
      "batch",
      "class",
      "year",
    ]);

    const { error } = validate(studentData);
    if (error)
      return res.status(400).send({ message: error.details[0].message });

    const salt = await bcrypt.genSalt(10);
    studentData.password = await bcrypt.hash(studentData.password, salt);

    const newStudent = new Student(studentData);
    await newStudent.save();

    const batch = await Batch.findOne({ batch: newStudent.batch });
    if (!batch) return res.status(400).send({ message: "Invalid batch." });

    batch.students.push(newStudent._id);
    await batch.save();

    const x_auth_token = newStudent.generateAuthToken();

    res
      .status(201)
      .header("x-auth-token", x_auth_token)
      .send({ message: "Student registered successfully." });
  } catch (err) {
    console.log(err);
    next(err);
  }
});

module.exports = router;
