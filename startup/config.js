const assert = require("assert");

const {
  DB_URL,
  JWT_PRIVATE_KEY,
  ADMIN_EMAIL,
  ADMIN_PASSWORD,
} = require("../config");
const { initAdmin } = require("../models/admin");
const { updateMinAttendanceAndUTMarks } = require("../utils/valid_records");

module.exports = function () {
  assert(DB_URL, "FATAL ERROR: DB_URL is not defined.");
  assert(JWT_PRIVATE_KEY, "FATAL ERROR: JWT_PRIVATE_KEY is not defined.");
  assert(ADMIN_EMAIL, "FATAL ERROR: ADMIN_EMAIL is not defined.");
  assert(ADMIN_PASSWORD, "FATAL ERROR: ADMIN_PASSWORD is not defined.");

  updateMinAttendanceAndUTMarks();
  initAdmin();
};
