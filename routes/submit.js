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

const router = express.Router();

router.post("/ticket", admin, async (req, res) => {
  const ticketData = req.body;
  await TicketData.updateTicketData(ticketData);
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
