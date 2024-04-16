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

const checkStudentsWithYear = (rollNos, year) => {
  if (!Array.isArray(rollNos)) rollNos = [rollNos];
  rollNos = rollNos.map((rollNo) => rollNo.toString());
  return rollNos.every((rollNo) =>
    rollNo.toString().startsWith(year.toString())
  );
};

module.exports = {
  isValidAttendance,
  isValidUTMarks,
  checkStudentsWithYear,
};
