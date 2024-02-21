const express = require("express");
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

  if (!email) return res.status(400).send({ message: "Email is required" });

  const allowedStudent = await StudentData.findOne({
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

    const student = await StudentLogin.findOne({ email: email });

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

    const student = await StudentLogin.findOne({ email: req.body.email });
    if (student)
      return res.status(400).send({ message: "Student already registered." });

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
    if (error)
      return res.status(400).send({ message: error.details[0].message });

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
  } catch (err) {
    console.log(err);
    next(err);
  }
});

module.exports = router;
