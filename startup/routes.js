const express = require("express");
require("express-async-errors");

const registerStudent = require("../routes/register_student");
const registerTeacher = require("../routes/register_teacher");
const registerAdmin = require("../routes/register_admin");
const login = require("../routes/login");
const fetch = require("../routes/fetch");
const submit = require("../routes/submit");
const classes = require("../routes/classes");
const records = require("../routes/records");
const recordsUpdate = require("../routes/records_update");
const reports = require("../routes/reports");

const admin = require("../middleware/admin");
const error = require("../middleware/error");

module.exports = function (app) {
  app.use(express.json());
  app.use(express.urlencoded({ extended: true }));
  app.use("/register/student", registerStudent);
  app.use("/register/teacher", registerTeacher);
  app.use("/register/admin", admin, registerAdmin);
  app.use("/login", login);
  app.use("/fetch", admin, fetch);
  app.use("/submit", submit);
  app.use("/classes", classes);
  app.use("/records", records);
  app.use("/records/update", recordsUpdate);
  app.use("/reports", admin, reports);
  app.use(error);
};
