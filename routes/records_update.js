const express = require("express");
const assert = require("assert");

const { isValidAttendance, isValidUTMarks } = require("../utils/valid_records");

const { StudentRecord } = require("../models/student_record");
const {
  updateAttendanceSpreadSheetValues,
} = require("../utils/google_sheets_service");

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
          attendanceAlternate: isValidAttendance(a.value),
        },
      },
    }))
  );

  updateAttendanceSpreadSheetValues(attendance);
  res.send({ message: "Attendance updated.", attendance });
});

router.post("/utmarks/:subject", async (req, res) => {
  let { subject } = req.params;
  assert(subject, "ERROR 400: subject is required");

  let { utmarks } = req.body;
  assert(utmarks, "ERROR 400: utmarks is required");

  /*
  Valid utmarks:
  1. utmarks: { rollNo: "123", ut1: 23, ut2: 20, ut1Alternate: true, ut2Alternate: true }
  2. utmarks: [
    { rollNo: "123", ut1: 23, ut2: 20, ut1Alternate: true, ut2Alternate: true },
    { rollNo: "456", ut1: 25 },
    { rollNo: "789", ut1Alternate: true }
  ]
  */

  // Convert to array if not already
  if (!Array.isArray(utmarks)) {
    utmarks = [utmarks];
  }

  // Check if all utmarks values are valid
  utmarks.forEach((u) => {
    assert(u.rollNo, "ERROR 400: rollNo is required");
    assert(
      u.ut1 || u.ut2 || u.ut1Alternate || u.ut2Alternate,
      "ERROR 400: ut1, ut2, ut1Alternate or ut2Alternate is required"
    );
    assert(
      u.ut1 === undefined || typeof u.ut1 === "number",
      "ERROR 400: ut1 must be a number"
    );
    assert(
      u.ut2 === undefined || typeof u.ut2 === "number",
      "ERROR 400: ut2 must be a number"
    );
    assert(
      u.ut1Alternate === undefined || typeof u.ut1Alternate === "boolean",
      "ERROR 400: ut1Alternate must be a boolean"
    );
    assert(
      u.ut2Alternate === undefined || typeof u.ut2Alternate === "boolean",
      "ERROR 400: ut2Alternate must be a boolean"
    );
  });

  // Check if all roll numbers are valid
  const rollNos = utmarks.map((u) => u.rollNo);
  const students = await StudentRecord.find({ rollNo: { $in: rollNos } });
  const studentRollNos = students.map((s) => s.rollNo);
  const invalidRollNos = rollNos.filter((r) => !studentRollNos.includes(r));
  assert(
    invalidRollNos.length === 0,
    `ERROR 400: Invalid roll numbers: ${invalidRollNos.join(", ")}`
  );

  // Check if subject is valid
  const validSubjects = new Set(students[0].unitTests.keys());

  assert(
    validSubjects.has(subject),
    `ERROR 400: Invalid subject. Valid subjects: ${[...validSubjects].join(
      ", "
    )}`
  );

  // Fill all missing values with values from the database
  utmarks = utmarks.map((u) => {
    const student = students.find((s) => s.rollNo === u.rollNo);

    /*
    ut1Alternate calculation:
    - If ut1Alternate is provided, use that value
    - If ut1 is provided, use ut1 >= 12
    - If ut1 is not provided, use student.ut1 >= 12
    */

    const ut1Alternate =
      u.ut1Alternate !== undefined
        ? u.ut1Alternate
        : u.ut1 !== undefined
        ? isValidUTMarks(u.ut1)
        : isValidUTMarks(student.unitTests.get(subject).ut1);

    const ut2Alternate =
      u.ut2Alternate !== undefined
        ? u.ut2Alternate
        : u.ut2 !== undefined
        ? isValidUTMarks(u.ut2)
        : isValidUTMarks(student.unitTests.get(subject).ut2);

    return {
      rollNo: u.rollNo,
      ut1: u.ut1 || student.unitTests.get(subject).ut1,
      ut2: u.ut2 || student.unitTests.get(subject).ut2,
      ut1Alternate,
      ut2Alternate,
    };
  });

  await StudentRecord.bulkWrite(
    utmarks.map((u) => ({
      updateOne: {
        filter: { rollNo: u.rollNo },
        update: {
          [`unitTests.${subject}.ut1`]: u.ut1,
          [`unitTests.${subject}.ut2`]: u.ut2,
          [`unitTests.${subject}.ut1Alternate`]: u.ut1Alternate,
          [`unitTests.${subject}.ut2Alternate`]: u.ut2Alternate,
        },
      },
    }))
  );

  res.send({ message: "UT marks updated.", utmarks });
});

module.exports = router;
