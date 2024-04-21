const { TicketData } = require("../models/ticket_data");

let _minAttendanceRequired = null;
let _minUTMarksRequired = null;

const updateMinAttendanceAndUTMarks = async (force = false) => {
  if (!force && _minAttendanceRequired && _minUTMarksRequired) return;

  const ticketData = await TicketData.getMinAttendanceAndUTMarks();

  if (!ticketData) {
    _minAttendanceRequired = 75;
    _minUTMarksRequired = 12;
    return;
  }

  _minAttendanceRequired = ticketData.minAttendanceRequired;
  _minUTMarksRequired = ticketData.minUTMarksRequired;
};

const isValidAttendance = (attendance) => {
  if (typeof attendance !== "number") {
    attendance = parseFloat(attendance);
  }

  return attendance >= _minAttendanceRequired;
};

const isValidUTMarks = (marks) => {
  if (typeof marks !== "number") {
    marks = parseFloat(marks);
  }

  return marks >= _minUTMarksRequired;
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
  updateMinAttendanceAndUTMarks,
};
