const express = require("express");

const fetch = require("../routes/fetch");
const register = require("../routes/register");
const error = require("../middleware/error");

module.exports = function (app) {
  app.use(express.json());
  app.use(express.urlencoded({ extended: true }));
  app.use("/api/fetch", fetch);
  app.use("/api/register", register);
  app.use(error);
};
