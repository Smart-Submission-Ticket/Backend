const { VALID_ATTENDANCE, VALID_UT_MARKS } = require("../config");

const isValidAttendance = (attendance) => {
  if (typeof attendance !== "number") {
    attendance = parseFloat(attendance);
  }

  return attendance >= VALID_ATTENDANCE;
};

const isValidUTMarks = (marks) => {
  if (typeof marks !== "number") {
    marks = parseFloat(marks);
  }

  return marks >= VALID_UT_MARKS;
};

module.exports = {
  isValidAttendance,
  isValidUTMarks,
};
