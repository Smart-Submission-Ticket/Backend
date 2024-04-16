const express = require("express");

const {
  getClassesSpreadSheetValues,
  getStudentsSpreadSheetValues,
  getCurriculumSpreadSheetValues,
  getAttendanceSpreadSheetValues,
  getCCSpreadSheetValues,
  getMentorsSpreadSheetValues,
  getTESeminarsSpreadSheetValues,
  getBEProjectsSpreadSheetValues,
  getHonorsSpreadSheetValues,
} = require("../utils/google_sheets_service");

const {
  uploadClassesData,
  uploadStudentsData,
  uploadCurriculumData,
  uploadAttendanceData,
  uploadCCData,
  uploadMentorsData,
  uploadTESeminarsData,
  uploadBEProjectsData,
  uploadHonorsData,
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

router.post("/class_coordinators", async (req, res) => {
  const cc = await getCCSpreadSheetValues();
  await uploadCCData(cc);
  res.send({ message: "Class coordinators updated." });
});

router.post("/mentors", async (req, res) => {
  const mentors = await getMentorsSpreadSheetValues();
  await uploadMentorsData(mentors);
  res.send({ message: "Mentors updated." });
});

router.post("/te_seminars", async (req, res) => {
  const teSeminars = await getTESeminarsSpreadSheetValues();
  await uploadTESeminarsData(teSeminars);
  res.send({ message: "TE seminars guides updated." });
});

router.post("/be_projects", async (req, res) => {
  const beProjects = await getBEProjectsSpreadSheetValues();
  await uploadBEProjectsData(beProjects);
  res.send({ message: "BE projects guides updated." });
});

router.post("/honors", async (req, res) => {
  const honors = await getHonorsSpreadSheetValues();
  await uploadHonorsData(honors);
  res.send({ message: "Honors updated." });
});

module.exports = router;
