const nodemailer = require("nodemailer");
const fs = require("fs");
const path = require("path");

const { NODE_ENV, EMAIL_PASSWORD, EMAIL_USER } = require("../config");

const generateOtp = () => {
  if (NODE_ENV === "development") return 123456;
  return Math.floor(100000 + Math.random() * 900000);
};

const registrationOtpTemplate = fs.readFileSync(
  path.resolve(__dirname, "mail_templates/registration_otp.html"),
  { encoding: "utf-8" }
);

const forgotPasswordTemplate = fs.readFileSync(
  path.resolve(__dirname, "mail_templates/forgot_password.html"),
  { encoding: "utf-8" }
);

const mailTransporter = nodemailer.createTransport({
  service: "gmail",
  auth: {
    user: EMAIL_USER,
    pass: EMAIL_PASSWORD,
  },
});

const sendForgotPasswordMail = (memberName, memberEmail, otp) => {
  if (NODE_ENV === "development") return;

  const emailBody = forgotPasswordTemplate
    .replaceAll("$$NAME$$", memberName)
    .replaceAll("$$EMAIL$$", memberEmail)
    .replaceAll("$$OTP$$", otp)
    .replaceAll("$$MY_EMAIL$$", EMAIL_USER);

  let mailDetails = {
    from: {
      name: "Smart Submission Ticket",
      address: EMAIL_USER,
    },
    to: memberEmail,
    subject: "Forgot Password - Smart Submission Ticket",
    text: `Hi ${memberName},\n\nYour OTP for resetting password is ${otp}.\n\nRegards,\nSmart Submission Ticket Team`,
    html: emailBody,
  };

  return new Promise((resolve, reject) => {
    mailTransporter.sendMail(mailDetails, function (err, data) {
      if (err) {
        reject(err);
      } else {
        resolve(data);
      }
    });
  });
};

const sendRegistrationOtpMail = (memberEmail, otp) => {
  if (NODE_ENV === "development") return;

  const emailBody = registrationOtpTemplate
    .replaceAll("$$EMAIL$$", memberEmail)
    .replaceAll("$$OTP$$", otp)
    .replaceAll("$$MY_EMAIL$$", EMAIL_USER);

  let mailDetails = {
    from: {
      name: "Smart Submission Ticket",
      address: EMAIL_USER,
    },
    to: memberEmail,
    subject: "Registration OTP - Smart Submission Ticket",
    text: `Hi,\n\nYour OTP for registration is ${otp}.\n\nRegards,\nSmart Submission Ticket Team`,
    html: emailBody,
  };

  return new Promise((resolve, reject) => {
    mailTransporter.sendMail(mailDetails, function (err, data) {
      if (err) {
        reject(err);
      } else {
        resolve(data);
      }
    });
  });
};

module.exports = {
  generateOtp,
  sendForgotPasswordMail,
  sendRegistrationOtpMail,
};
