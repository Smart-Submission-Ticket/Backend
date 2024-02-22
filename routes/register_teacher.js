const express = require("express");
const bcrypt = require("bcrypt");
const jwt = require("jsonwebtoken");

const { JWT_PRIVATE_KEY } = require("../config");
const { OTP } = require("../models/otp");
const { generateOtp, sendRegistrationOtpMail } = require("../utils/sendMail");
const { Teacher } = require("../models/teacher");

const router = express.Router();

const checkIfTeacherAllowed = async (req, res, next) => {
  const { email } = req.body;
  if (!email) return res.status(400).send({ message: "Email is required" });

  const teacher = await Teacher.findOne({ email });
  if (!teacher)
    return res.status(400).send({ message: "Teacher not allowed." });

  if (teacher.isRegistered)
    return res.status(400).send({ message: "Teacher already registered." });

  next();
};

router.post("/verify-email", checkIfTeacherAllowed, async (req, res, next) => {
  try {
    const { email } = req.body;

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
    const { token, email, password, name } = req.body;

    if (!token) return res.status(400).send({ message: "Token is required." });

    if (!email || !password || !name)
      return res
        .status(400)
        .send({ message: "Email, password and name are required." });

    const decoded = jwt.verify(token, JWT_PRIVATE_KEY);
    if (!decoded) return res.status(400).send({ message: "Invalid token." });

    if (decoded.email !== email)
      return res.status(400).send({ message: "Invalid token." });

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
  } catch (err) {
    console.log(err);
    next(err);
  }
});

module.exports = router;
