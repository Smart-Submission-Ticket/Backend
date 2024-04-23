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
  uploadCCData,
  uploadMentorsData,
  uploadTESeminarsData,
  uploadBEProjectsData,
  uploadHonorsData,
} = require("../utils/upload_data");
const { StudentRecord } = require("../models/student_record");
const { updateMinAttendanceAndUTMarks } = require("../utils/valid_records");
const logs = require("../utils/logs");

const router = express.Router();

router.post("/classes", admin, upload.single("file"), async (req, res) => {
  const classes = readExcel(req.file.buffer);
  await uploadClassesData(classes);
  logs(req, "Updated classes via file.");
  res.send({ message: "Classes updated." });
});

router.post("/students", admin, upload.single("file"), async (req, res) => {
  const students = readExcel(req.file.buffer);
  await uploadStudentsData(students);
  logs(req, "Updated students via file.");
  res.send({ message: "Allowed students updated." });
});

router.post("/curriculum", admin, upload.single("file"), async (req, res) => {
  const theory = readExcel(req.file.buffer, "Theory");
  const practical = readExcel(req.file.buffer, "Practical");
  const curriculum = { theory, practical };
  await uploadCurriculumData(curriculum);
  logs(req, "Updated curriculum via file.");
  res.send({ message: "Curriculum updated." });
});

router.post("/attendance", admin, upload.single("file"), async (req, res) => {
  const attendance = readExcel(req.file.buffer);
  await uploadAttendanceData(attendance);
  logs(req, "Updated attendance via file.");
  res.send({ message: "Attendance updated." });
});

router.post(
  "/class_coordinators",
  admin,
  upload.single("file"),
  async (req, res) => {
    const cc = readExcel(req.file.buffer);
    await uploadCCData(cc);
    logs(req, "Updated class coordinators via file.");
    res.send({ message: "Class coordinators updated." });
  }
);

router.post("/mentors", admin, upload.single("file"), async (req, res) => {
  const mentors = readExcel(req.file.buffer);
  await uploadMentorsData(mentors);
  logs(req, "Updated mentors via file.");
  res.send({ message: "Mentors updated." });
});

router.post("/te_seminars", admin, upload.single("file"), async (req, res) => {
  const te_seminars = readExcel(req.file.buffer);
  await uploadTESeminarsData(te_seminars);
  logs(req, "Updated TE seminars via file.");
  res.send({ message: "TE seminars updated." });
});

router.post("/be_projects", admin, upload.single("file"), async (req, res) => {
  const be_projects = readExcel(req.file.buffer);
  await uploadBEProjectsData(be_projects);
  logs(req, "Updated BE projects via file.");
  res.send({ message: "BE projects updated." });
});

router.post("/honors", admin, upload.single("file"), async (req, res) => {
  const honors = readExcel(req.file.buffer);
  await uploadHonorsData(honors);
  logs(req, "Updated honors via file.");
  res.send({ message: "Honors updated." });
});

router.post("/assignments", upload.single("file"), async (req, res) => {
  const { subject } = req.body;
  assert(subject, "ERROR 400: Subject is required.");

  const assignments = readExcel(req.file.buffer);
  await uploadAssignmentsData(subject, assignments, req.user);
  logs(req, `Assignments updated for ${subject}.`);
  res.send({ message: "Assignments updated." });
});

router.post("/utmarks", upload.single("file"), async (req, res) => {
  const { subject } = req.body;
  assert(subject, "ERROR 400: Subject is required.");

  const utmarks = readExcel(req.file.buffer);
  await uploadUTMarksData(subject, utmarks, req.user);
  logs(req, `UT marks updated for ${subject}.`);
  res.send({ message: "UT marks updated." });
});

router.post("/ticket", admin, async (req, res) => {
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

  logs(req, "Updated ticket submission details.");
  res.send({ message: "Ticket submission details updated." });
});

module.exports = router;
