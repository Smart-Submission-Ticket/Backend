const assert = require("assert");

const { DB_URL, JWT_PRIVATE_KEY } = require("../config");
const { updateMinAttendanceAndUTMarks } = require("../utils/valid_records");

module.exports = function () {
  assert(DB_URL, "FATAL ERROR: DB_URL is not defined.");
  assert(JWT_PRIVATE_KEY, "FATAL ERROR: JWT_PRIVATE_KEY is not defined.");

  updateMinAttendanceAndUTMarks();
};
