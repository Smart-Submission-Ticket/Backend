const express = require("express");
const _ = require("lodash");

const { OTP } = require("../models/otp");
const { AllowedStudents } = require("../models/allowed_students");
const { sendRegistrationOtpMail } = require("../utils/sendMail");

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

router.post("/verify-email", checkIfStudentAllowed, async (req, res) => {
  const member = _.pick(req.body, ["email"]);

  const otp = Math.floor(100000 + Math.random() * 900000);

  const newOtp = new OTP({
    email: member.email,
    otp: otp,
  });

  sendRegistrationOtpMail(member.email, otp);

  await newOtp.save();
  res.status(200).send({
    message: "Registration OTP sent successfully.",
    student: req.body.student,
  });
});

router.post("/verify-otp", async (req, res) => {
  const { email, otp } = req.body;

  if (!email || !otp)
    return res.status(400).send({ message: "Please provide email/otp" });

  const otpDoc = await OTP.findOne({ email: email });
  if (!otpDoc) return res.status(400).send({ message: "Time expired." });

  if (otpDoc.otp !== otp)
    return res.status(400).send({ message: "Incorrect OTP." });

  await OTP.deleteMany({ email: email });

  res.status(200).send({
    message: "OTP verified successfully.",
  });
});

module.exports = router;
