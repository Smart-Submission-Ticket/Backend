const express = require("express");

const {
  getClassesSpreadSheetValues,
  getStudentsSpreadSheetValues,
  getCurriculumSpreadSheetValues,
  getAttendanceSpreadSheetValues,
} = require("../utils/googleSheetsService");

const {
  uploadClassesData,
  uploadStudentsData,
  uploadCurriculumData,
  uploadAttendanceData,
} = require("../utils/uploadData");

const router = express.Router();

router.get("/classes", async (req, res, next) => {
  try {
    const classes = await getClassesSpreadSheetValues();
    await uploadClassesData(classes);
    res.send({ message: "Classes updated." });
  } catch (err) {
    console.log(err);
    next(err);
  }
});

router.get("/students", async (req, res, next) => {
  try {
    const students = await getStudentsSpreadSheetValues();
    await uploadStudentsData(students);
    res.send({ message: "Allowed students updated." });
  } catch (err) {
    console.log(err);
    next(err);
  }
});

router.get("/curriculum", async (req, res, next) => {
  try {
    const curriculum = await getCurriculumSpreadSheetValues();
    await uploadCurriculumData(curriculum);
    res.send({ message: "Curriculum updated." });
  } catch (err) {
    console.log(err);
    next(err);
  }
});

router.get("/attendance", async (req, res, next) => {
  try {
    const attendance = await getAttendanceSpreadSheetValues();
    await uploadAttendanceData(attendance);
    res.send({ message: "Attendance updated." });
  } catch (err) {
    console.log(err);
    next(err);
  }
});

module.exports = router;
