const express = require("express");

const upload = require("../middleware/files");
const readExcel = require("../utils/readExcel");
const {
  uploadClassesData,
  uploadStudentsData,
  uploadCurriculumData,
  uploadAttendanceData,
  uploadAssignmentsData,
  uploadUTMarksData,
} = require("../utils/uploadData");

const router = express.Router();

router.post("/classes", upload.single("file"), async (req, res, next) => {
  try {
    const classes = readExcel(req.file.buffer);
    await uploadClassesData(classes);
    res.send({ message: "Classes updated." });
  } catch (error) {
    console.log(error);
    next(error);
  }
});

router.post("/students", upload.single("file"), async (req, res, next) => {
  try {
    const students = readExcel(req.file.buffer);
    await uploadStudentsData(students);
    res.send({ message: "Allowed students updated." });
  } catch (error) {
    console.log(error);
    next(error);
  }
});

router.post("/curriculum", upload.single("file"), async (req, res, next) => {
  try {
    const theory = readExcel(req.file.buffer, "Theory");
    const practical = readExcel(req.file.buffer, "Practical");
    const curriculum = { theory, practical };
    await uploadCurriculumData(curriculum);
    res.send({ message: "Curriculum updated." });
  } catch (error) {
    console.log(error);
    next(error);
  }
});

router.post("/attendance", upload.single("file"), async (req, res, next) => {
  try {
    const attendance = readExcel(req.file.buffer);
    await uploadAttendanceData(attendance);
    res.send({ message: "Attendance updated." });
  } catch (error) {
    console.log(error);
    next(error);
  }
});

router.post("/assignments", upload.single("file"), async (req, res, next) => {
  try {
    const { subject } = req.body;

    if (!subject) {
      return res.status(400).send({ message: "Subject is required." });
    }

    // TODO: Check if teacher is allowed to upload assignments for the subject.

    const assignments = readExcel(req.file.buffer);
    await uploadAssignmentsData(subject, assignments);
    res.send({ message: "Assignments updated." });
  } catch (error) {
    console.log(error);
    next(error);
  }
});

router.post("/utmarks", upload.single("file"), async (req, res, next) => {
  try {
    const { subject } = req.body;

    if (!subject) {
      return res.status(400).send({ message: "Subject is required." });
    }

    // TODO: Check if teacher is allowed to upload UT marks for the subject.

    const utmarks = readExcel(req.file.buffer);
    await uploadUTMarksData(subject, utmarks);
    res.send({ message: "UT marks updated." });
  } catch (error) {
    console.log(error);
    next(error);
  }
});

module.exports = router;
