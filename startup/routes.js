const express = require("express");

const register = require("../routes/register");
const fetch = require("../routes/fetch");
const submit = require("../routes/submit");
const records = require("../routes/records");

const teacher = require("../middleware/teacher");
const error = require("../middleware/error");

module.exports = function (app) {
  app.use(express.json());
  app.use(express.urlencoded({ extended: true }));
  app.use("/api/register", register);
  app.use("/api/fetch", teacher, fetch);
  app.use("/api/submit", teacher, submit);
  app.use("/api/records", records);
  app.use(error);
};
