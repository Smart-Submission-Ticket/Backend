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
const logs = require("../utils/logs");

const { StudentRecord } = require("../models/student_record");

const router = express.Router();

router.post("/classes", async (req, res) => {
  const classes = await getClassesSpreadSheetValues();
  await uploadClassesData(classes);
  logs(req, "Updated classes via google sheets.");
  res.send({ message: "Classes updated." });
});

router.post("/students", async (req, res) => {
  const students = await getStudentsSpreadSheetValues();
  await uploadStudentsData(students);
  logs(req, "Updated students via google sheets.");
  res.send({ message: "Allowed students updated." });
});

router.post("/curriculum", async (req, res) => {
  const curriculum = await getCurriculumSpreadSheetValues();
  await uploadCurriculumData(curriculum);
  logs(req, "Updated curriculum via google sheets.");
  res.send({ message: "Curriculum updated." });
});

router.post("/attendance", async (req, res) => {
  const attendance = await getAttendanceSpreadSheetValues();
  await uploadAttendanceData(attendance);
  logs(req, "Updated attendance via google sheets.");
  res.send({ message: "Attendance updated." });
});

router.post("/class_coordinators", async (req, res) => {
  const cc = await getCCSpreadSheetValues();
  await uploadCCData(cc);
  logs(req, "Updated class coordinators via google sheets.");
  res.send({ message: "Class coordinators updated." });
});

router.post("/mentors", async (req, res) => {
  const mentors = await getMentorsSpreadSheetValues();
  await uploadMentorsData(mentors);
  logs(req, "Updated mentors via google sheets.");
  res.send({ message: "Mentors updated." });
});

router.post("/te_seminars", async (req, res) => {
  const teSeminars = await getTESeminarsSpreadSheetValues();
  await uploadTESeminarsData(teSeminars);
  logs(req, "Updated TE seminars via google sheets.");
  res.send({ message: "TE seminars guides updated." });
});

router.post("/be_projects", async (req, res) => {
  const beProjects = await getBEProjectsSpreadSheetValues();
  await uploadBEProjectsData(beProjects);
  logs(req, "Updated BE projects via google sheets.");
  res.send({ message: "BE projects guides updated." });
});

router.post("/honors", async (req, res) => {
  const honors = await getHonorsSpreadSheetValues();
  await uploadHonorsData(honors);
  logs(req, "Updated honors via google sheets.");
  res.send({ message: "Honors updated." });
});

router.post("/all", async (req, res) => {
  const [
    classes,
    students,
    curriculum,
    attendance,
    cc,
    mentors,
    teSeminars,
    beProjects,
    honors,
  ] = await Promise.all([
    getClassesSpreadSheetValues(),
    getStudentsSpreadSheetValues(),
    getCurriculumSpreadSheetValues(),
    getAttendanceSpreadSheetValues(),
    getCCSpreadSheetValues(),
    getMentorsSpreadSheetValues(),
    getTESeminarsSpreadSheetValues(),
    getBEProjectsSpreadSheetValues(),
    getHonorsSpreadSheetValues(),
  ]);

  await uploadClassesData(classes);
  await uploadCurriculumData(curriculum);
  await uploadStudentsData(students);

  await Promise.all([
    uploadAttendanceData(attendance),
    uploadCCData(cc),
    uploadMentorsData(mentors),
    uploadTESeminarsData(teSeminars),
    uploadBEProjectsData(beProjects),
    uploadHonorsData(honors),
  ]);

  StudentRecord.mergeRecordsByRollNo();

  logs(req, "Updated all data via google sheets.");
  res.send({ message: "All data updated." });
});

module.exports = router;
