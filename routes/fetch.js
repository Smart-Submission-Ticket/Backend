const express = require("express");

const {
  getClassesSpreadSheetValues,
  getStudentsSpreadSheetValues,
  getCurriculumSpreadSheetValues,
  getAttendanceSpreadSheetValues,
} = require("../utils/google_sheets_service");

const {
  uploadClassesData,
  uploadStudentsData,
  uploadCurriculumData,
  uploadAttendanceData,
} = require("../utils/upload_data");

const router = express.Router();

router.post("/classes", async (req, res) => {
  const classes = await getClassesSpreadSheetValues();
  await uploadClassesData(classes);
  res.send({ message: "Classes updated." });
});

router.post("/students", async (req, res) => {
  const students = await getStudentsSpreadSheetValues();
  await uploadStudentsData(students);
  res.send({ message: "Allowed students updated." });
});

router.post("/curriculum", async (req, res) => {
  const curriculum = await getCurriculumSpreadSheetValues();
  await uploadCurriculumData(curriculum);
  res.send({ message: "Curriculum updated." });
});

router.post("/attendance", async (req, res) => {
  const attendance = await getAttendanceSpreadSheetValues();
  await uploadAttendanceData(attendance);
  res.send({ message: "Attendance updated." });
});

module.exports = router;
