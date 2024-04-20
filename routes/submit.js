const express = require("express");
const assert = require("assert");

const { TicketData } = require("../models/ticket_data");
const admin = require("../middleware/admin");
const upload = require("../middleware/files");
const readExcel = require("../utils/read_excel");
const {
  uploadClassesData,
  uploadStudentsData,
  uploadCurriculumData,
  uploadAttendanceData,
  uploadAssignmentsData,
  uploadUTMarksData,
} = require("../utils/upload_data");
const { updateMinAttendanceAndUTMarks } = require("../utils/valid_records");
const { StudentRecord } = require("../models/student_record");

const router = express.Router();

router.post("/ticket", admin, async (req, res) => {
  /*
    Request body should be like:
    {
      academicYear: "2023-2024",
      attendanceLabAsst: "Name of the faculty",
      studentAcheivementCommittee: "Name of the faculty",
      attedance: {
        minAttendanceRequired: 75,
        updateAllData: false,
      }
      utmarks: {
        minUTMarksRequired: 12,
        updateAllData: false,
      }
    }
  */
  let ticketData = req.body;
  const { attendance, utmarks } = ticketData;

  if (attendance && attendance.minAttendanceRequired) {
    ticketData.minAttendanceRequired = attendance.minAttendanceRequired;
  }

  if (utmarks && utmarks.minUTMarksRequired) {
    ticketData.minUTMarksRequired = utmarks.minUTMarksRequired;
  }

  await TicketData.updateTicketData(ticketData);

  if (ticketData.minAttendanceRequired || ticketData.minUTMarksRequired) {
    await updateMinAttendanceAndUTMarks(true);
  }

  StudentRecord.updateStudentRecords({
    updateAttendances: attendance ? true : false,
    updateUTMarks: utmarks ? true : false,
    updateAllAttendances: attendance
      ? attendance.updateAllData ?? false
      : false,
    updateAllUTMarks: utmarks ? utmarks.updateAllData ?? false : false,
  });

  res.send({ message: "Ticket submission details updated." });
});

router.post("/classes", admin, upload.single("file"), async (req, res) => {
  const classes = readExcel(req.file.buffer);
  await uploadClassesData(classes);
  res.send({ message: "Classes updated." });
});

router.post("/students", admin, upload.single("file"), async (req, res) => {
  const students = readExcel(req.file.buffer);
  await uploadStudentsData(students);
  res.send({ message: "Allowed students updated." });
});

router.post("/curriculum", admin, upload.single("file"), async (req, res) => {
  const theory = readExcel(req.file.buffer, "Theory");
  const practical = readExcel(req.file.buffer, "Practical");
  const curriculum = { theory, practical };
  await uploadCurriculumData(curriculum);
  res.send({ message: "Curriculum updated." });
});

router.post("/attendance", admin, upload.single("file"), async (req, res) => {
  const attendance = readExcel(req.file.buffer);
  await uploadAttendanceData(attendance);
  res.send({ message: "Attendance updated." });
});

router.post("/assignments", upload.single("file"), async (req, res) => {
  const { subject } = req.body;
  assert(subject, "ERROR 400: Subject is required.");

  // TODO: Check if teacher is allowed to upload assignments for the subject.

  const assignments = readExcel(req.file.buffer);
  await uploadAssignmentsData(subject, assignments);
  res.send({ message: "Assignments updated." });
});

router.post("/utmarks", upload.single("file"), async (req, res) => {
  const { subject } = req.body;
  assert(subject, "ERROR 400: Subject is required.");

  // TODO: Check if teacher is allowed to upload UT marks for the subject.

  const utmarks = readExcel(req.file.buffer);
  await uploadUTMarksData(subject, utmarks);
  res.send({ message: "UT marks updated." });
});

module.exports = router;
