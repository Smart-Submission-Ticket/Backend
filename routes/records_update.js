const express = require("express");
const assert = require("assert");

const { StudentRecord } = require("../models/student_record");
const {
  updateAttendanceSpreadSheetValues,
} = require("../utils/googleSheetsService");

const router = express.Router();

router.post("/attendance", async (req, res) => {
  let { attendance } = req.body;
  assert(attendance, "ERROR 400: attendance is required");

  /*
  Valid attendance:
  1. attendance: { rollNo: "123", value: 90 }
  2. attendance: [{ rollNo: "123", value: 90 }, { rollNo: "456", value: 80 }]
  */

  // Convert to array if not already
  if (!Array.isArray(attendance)) {
    attendance = [attendance];
  }

  // Check if all attendance values are valid
  attendance.forEach((a) => {
    assert(a.rollNo, "ERROR 400: rollNo is required");
    assert(a.value, "ERROR 400: value is required");
    assert(typeof a.value === "number", "ERROR 400: value must be a number");
  });

  // Check if all roll numbers are valid
  const rollNos = attendance.map((a) => a.rollNo);
  const students = await StudentRecord.find({ rollNo: { $in: rollNos } });
  const studentRollNos = students.map((s) => s.rollNo);
  const invalidRollNos = rollNos.filter((r) => !studentRollNos.includes(r));
  assert(
    invalidRollNos.length === 0,
    `ERROR 400: Invalid roll numbers: ${invalidRollNos.join(", ")}`
  );

  await StudentRecord.bulkWrite(
    attendance.map((a) => ({
      updateOne: {
        filter: { rollNo: a.rollNo },
        update: {
          attendance: a.value,
          attendanceAlternate: parseFloat(a.value) >= 75,
        },
      },
    }))
  );

  updateAttendanceSpreadSheetValues(attendance);
  res.send({ message: "Attendance updated." });
});

module.exports = router;
