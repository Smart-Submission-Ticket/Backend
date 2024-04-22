const express = require("express");
require("express-async-errors");

const registerStudent = require("../routes/register_student");
const registerTeacher = require("../routes/register_teacher");
const login = require("../routes/login");
const fetch = require("../routes/fetch");
const submit = require("../routes/submit");
const classes = require("../routes/classes");
const records = require("../routes/records");
const recordsUpdate = require("../routes/records_update");

const teacher = require("../middleware/teacher");
const admin = require("../middleware/admin");
const error = require("../middleware/error");

module.exports = function (app) {
  app.use(express.json());
  app.use(express.urlencoded({ extended: true }));
  app.use("/register/student", registerStudent);
  app.use("/register/teacher", registerTeacher);
  app.use("/login", login);
  app.use("/fetch", admin, fetch);
  app.use("/submit", teacher, submit);
  app.use("/classes", classes);
  app.use("/records", records);
  app.use("/records/update", teacher, recordsUpdate);
  app.use(error);
};
