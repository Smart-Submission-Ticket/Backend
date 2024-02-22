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
  app.use("/api/register/student", registerStudent);
  app.use("/api/register/teacher", registerTeacher);
  app.use("/api/login", login);
  app.use("/api/fetch", teacher, fetch);
  app.use("/api/submit", teacher, submit);
  app.use("/api/records", records);
  app.use("/api/classes", teacher, classes);
  app.use(error);
};
