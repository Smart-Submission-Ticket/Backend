const assert = require("assert");

const {
  DB_URL,
  JWT_PRIVATE_KEY,
  ADMIN_EMAIL,
  ADMIN_PASSWORD,
  STUDENTS_SHEET_ID,
  CURRICULUM_SHEET_ID,
  ATTENDANCE_SHEET_ID,
  CLASSES_SHEET_ID,
  CC_SHEET_ID,
  MENTORS_SHEET_ID,
  TE_SEMINARS_SHEET_ID,
  BE_PROJECTS_SHEET_ID,
  HONORS_SHEET_ID,
} = require("../config");
const { initAdmin } = require("../models/admin");
const { insertSheets } = require("../models/sheet");
const { updateMinAttendanceAndUTMarks } = require("../utils/valid_records");

module.exports = function () {
  assert(DB_URL, "FATAL ERROR: DB_URL is not defined.");
  assert(JWT_PRIVATE_KEY, "FATAL ERROR: JWT_PRIVATE_KEY is not defined.");
  assert(ADMIN_EMAIL, "FATAL ERROR: ADMIN_EMAIL is not defined.");
  assert(ADMIN_PASSWORD, "FATAL ERROR: ADMIN_PASSWORD is not defined.");
  assert(
    STUDENTS_SHEET_ID &&
      CURRICULUM_SHEET_ID &&
      ATTENDANCE_SHEET_ID &&
      CLASSES_SHEET_ID &&
      CC_SHEET_ID &&
      MENTORS_SHEET_ID &&
      TE_SEMINARS_SHEET_ID &&
      BE_PROJECTS_SHEET_ID &&
      HONORS_SHEET_ID,
    "FATAL ERROR: One or more spreadsheet IDs are not defined."
  );

  updateMinAttendanceAndUTMarks();
  initAdmin();

  insertSheets([
    { title: "Students", spreadsheetId: STUDENTS_SHEET_ID },
    { title: "Curriculum", spreadsheetId: CURRICULUM_SHEET_ID },
    { title: "Attendance", spreadsheetId: ATTENDANCE_SHEET_ID },
    { title: "Classes", spreadsheetId: CLASSES_SHEET_ID },
    { title: "CC", spreadsheetId: CC_SHEET_ID },
    { title: "Mentors", spreadsheetId: MENTORS_SHEET_ID },
    { title: "TE Seminars", spreadsheetId: TE_SEMINARS_SHEET_ID },
    { title: "BE Projects", spreadsheetId: BE_PROJECTS_SHEET_ID },
    { title: "Honors", spreadsheetId: HONORS_SHEET_ID },
  ]);
};
