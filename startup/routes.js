const express = require("express");

const registerStudent = require("../routes/register_student");
const registerTeacher = require("../routes/register_teacher");
const login = require("../routes/login");
const fetch = require("../routes/fetch");
const submit = require("../routes/submit");
const records = require("../routes/records");
const classes = require("../routes/classes");

const teacher = require("../middleware/teacher");
const error = require("../middleware/error");

module.exports = function (app) {
  app.use(express.json());
  app.use(express.urlencoded({ extended: true }));
  app.use("/register/student", registerStudent);
  app.use("/register/teacher", registerTeacher);
  app.use("/login", login);
  app.use("/fetch", teacher, fetch);
  app.use("/submit", teacher, submit);
  app.use("/records", records);
  app.use("/classes", teacher, classes);
  app.use(error);
};
