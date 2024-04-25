const express = require("express");
const assert = require("assert");

const { isValidAttendance, isValidUTMarks } = require("../utils/valid_records");
const admin = require("../middleware/admin");
const teacher = require("../middleware/teacher");
const { StudentRecord } = require("../models/student_record");
const { Batch } = require("../models/batch");
const {
  updateAttendanceSpreadSheetValues,
} = require("../utils/google_sheets_service");
const logs = require("../utils/logs");

const router = express.Router();

router.post("/attendance", admin, async (req, res) => {
  /*
  Valid attendance:
  1. attendance: { rollNo: "123", attendance: 90 }
  2. attendance: { rollNo: "456", attendanceAlternate: true }
  3. attendance: [{ rollNo: "123", attendance: 90 }, { rollNo: "456", attendanceAlternate: true }]
  */

  let { attendance } = req.body;
  assert(attendance, "ERROR 400: attendance is required");

  // Convert to array if not already
  if (!Array.isArray(attendance)) attendance = [attendance];

  // Check if all attendance values are valid
  attendance.forEach((a) => {
    assert(a.rollNo, "ERROR 400: rollNo is required");
    assert(
      a.attendance || a.attendanceAlternate,
      "ERROR 400: attendance or attendanceAlternate is required"
    );
    assert(
      a.attendance === undefined || typeof a.attendance === "number",
      "ERROR 400: attendance must be a number"
    );
    assert(
      a.attendanceAlternate === undefined ||
        typeof a.attendanceAlternate === "boolean",
      "ERROR 400: attendanceAlternate must be a boolean"
    );
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

  // Fill all missing values with values from the database
  attendance = attendance.map((a) => {
    const student = students.find((s) => s.rollNo === a.rollNo);

    /*
    attendanceAlternate calculation:
    - If attendanceAlternate is provided, use that value
    - If attendance is provided, use attendance >= 75
    - If attendance is not provided, use student.attendance >= 75
    */

    const attendanceAlternate =
      a.attendanceAlternate !== undefined
        ? a.attendanceAlternate
        : a.attendance !== undefined
        ? isValidAttendance(a.attendance)
        : isValidAttendance(student.attendance);

    return {
      rollNo: a.rollNo,
      attendance: a.attendance || student.attendance,
      attendanceAlternate,
    };
  });

  await StudentRecord.bulkWrite(
    attendance.map((a) => ({
      updateOne: {
        filter: { rollNo: a.rollNo },
        update: {
          attendance: a.attendance,
          attendanceAlternate: a.attendanceAlternate,
        },
      },
    }))
  );

  updateAttendanceSpreadSheetValues(attendance);
  logs(req, `Attendance updated for ${attendance.length} students.`);
  res.send({ message: "Attendance updated.", attendance });
});

router.post("/utmarks/:subject", teacher, async (req, res) => {
  /*
  Valid utmarks:
  1. utmarks: { rollNo: "123", ut1: 23, ut2: 20, ut1Alternate: true, ut2Alternate: true }
  2. utmarks: [
    { rollNo: "123", ut1: 23, ut2: 20, ut1Alternate: true, ut2Alternate: true },
    { rollNo: "456", ut1: 25 },
    { rollNo: "789", ut1Alternate: true }
  ]
  */

  let { subject } = req.params;
  assert(subject, "ERROR 400: subject is required");

  let { utmarks } = req.body;
  assert(utmarks, "ERROR 400: utmarks is required");

  // Convert to array if not already
  if (!Array.isArray(utmarks)) utmarks = [utmarks];

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
  const [students, batches] = await Promise.all([
    StudentRecord.find({ rollNo: { $in: rollNos } }),
    Batch.find({ rollNos: { $in: rollNos } }),
  ]);
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

  // Check if teacher is allowed to upload UT marks for the subject for the roll numbers
  if (req.user.role === "teacher") {
    for (let batch of batches) {
      const subjectData = batch.practical.find((s) => s.title === subject);
      assert(
        subjectData.teacher === req.user.email,
        `ERROR 400: You are not allowed to upload UT marks for ${subject} for ${batch.batch} batch.`
      );
    }
  }

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

  logs(req, `UT marks updated for ${utmarks.length} students for ${subject}.`);
  res.send({ message: "UT marks updated.", utmarks });
});

router.post("/assignments/:subject", teacher, async (req, res) => {
  /*
  Valid assignments:
  1. assignments: { rollNo: "123", allCompleted: true }
  2. assignments: [
    { rollNo: "123", allCompleted: true },
    { rollNo: "456", allCompleted: true }
  ]
  */

  let { subject } = req.params;
  assert(subject, "ERROR 400: subject is required");

  let { assignments } = req.body;
  assert(assignments, "ERROR 400: assignments is required");

  // Convert to array if not already
  if (!Array.isArray(assignments)) assignments = [assignments];

  // Check if all assignments values are valid
  assignments.forEach((a) => {
    assert(a.rollNo, "ERROR 400: rollNo is required");
    assert(a.allCompleted !== undefined, "ERROR 400: allCompleted is required");
    assert(
      typeof a.allCompleted === "boolean",
      "ERROR 400: allCompleted must be a boolean"
    );
  });

  // Check if all roll numbers are valid
  const rollNos = assignments.map((a) => a.rollNo);
  const [students, batches] = await Promise.all([
    StudentRecord.find({ rollNo: { $in: rollNos } }),
    Batch.find({ rollNos: { $in: rollNos } }),
  ]);
  const studentRollNos = students.map((s) => s.rollNo);
  const invalidRollNos = rollNos.filter((r) => !studentRollNos.includes(r));
  assert(
    invalidRollNos.length === 0,
    `ERROR 400: Invalid roll numbers: ${invalidRollNos.join(", ")}`
  );

  // Check if subject is valid
  const validSubjects = new Set(students[0].assignments.keys());

  assert(
    validSubjects.has(subject),
    `ERROR 400: Invalid subject. Valid subjects: ${[...validSubjects].join(
      ", "
    )}`
  );

  // Check if teacher is allowed to upload assignments for the subject for the roll numbers
  if (req.user.role === "teacher") {
    for (let batch of batches) {
      const subjectData = batch.practical.find((s) => s.title === subject);
      assert(
        subjectData.teacher === req.user.email,
        `ERROR 400: You are not allowed to upload assignments for ${subject} for ${batch.batch} batch.`
      );
    }
  }

  await StudentRecord.bulkWrite(
    assignments.map((a) => ({
      updateOne: {
        filter: { rollNo: a.rollNo },
        update: {
          [`assignments.${subject}.allCompleted`]: a.allCompleted,
        },
      },
    }))
  );

  logs(
    req,
    `Assignments updated for ${assignments.length} students for ${subject}.`
  );
  res.send({ message: "Assignments updated.", assignments });
});

module.exports = router;
