const express = require("express");

const { AllowedStudents } = require("../models/allowed_students");
const { Curriculum } = require("../models/curriculum");
const { Attendance } = require("../models/attendance");

const teacher = require("../middleware/teacher");
const {
  getStudentsSpreadSheetValues,
  getCurriculumSpreadSheetValues,
  getAttendanceSpreadSheetValues,
} = require("../utils/googleSheetsService");

const router = express.Router();

router.get("/students", teacher, async (req, res) => {
  const students = await getStudentsSpreadSheetValues();
  const allowedStudents = await AllowedStudents.find();

  const newStudents = [];

  for (let i = 0; i < students.length; i++) {
    const batch = students[i][0];

    for (let j = 1; j < students[i].length; j++) {
      const email = students[i][j];

      if (!allowedStudents.find((s) => s.email === email)) {
        newStudents.push({
          email,
          batch,
        });
      }
    }
  }

  await AllowedStudents.insertMany(newStudents);

  res.send({ message: "Allowed students updated." });
});

router.get("/curriculum", teacher, async (req, res) => {
  const curriculum = await getCurriculumSpreadSheetValues();
  await Curriculum.deleteMany();

  const newCurriculum = [];

  let batch = "";
  let subjectsTitle = [];
  let subjectsNoOfAssignments = [];
  let subjectsTeacher = [];

  for (let i = 0; i < curriculum.length; i++) {
    if (curriculum[i][0] !== "") {
      if (batch !== "") {
        newCurriculum.push({
          batch,
          subjects: subjectsTitle.map((title, index) => ({
            title,
            noOfAssignments: subjectsNoOfAssignments[index],
            teacher: subjectsTeacher[index],
          })),
        });

        subjectsTitle = [];
        subjectsNoOfAssignments = [];
        subjectsTeacher = [];
      }

      batch = curriculum[i][0];
    } else {
      batch = batch;
    }

    if (curriculum[i][1].trim().toLowerCase().includes("subject"))
      subjectsTitle = curriculum[i].slice(2);

    if (curriculum[i][1].trim().toLowerCase().includes("assignment"))
      subjectsNoOfAssignments = curriculum[i].slice(2);

    if (curriculum[i][1].trim().toLowerCase().includes("teacher"))
      subjectsTeacher = curriculum[i].slice(2);
  }

  newCurriculum.push({
    batch,
    subjects: subjectsTitle.map((title, index) => ({
      title,
      noOfAssignments: subjectsNoOfAssignments[index],
      teacher: subjectsTeacher[index],
    })),
  });

  await Curriculum.insertMany(newCurriculum);

  res.send({ message: "Curriculum updated." });
});

router.get("/attendance", teacher, async (req, res) => {
  const attendance = await getAttendanceSpreadSheetValues();
  await Attendance.deleteMany();

  const newAttendance = [];

  let rollNos = [];
  let avgAttendance = [];
  for (let i = 0; i < attendance.length; i++) {
    if (attendance[i][1].trim().toLowerCase().includes("roll"))
      rollNos = attendance[i].slice(2);

    if (attendance[i][1].trim().toLowerCase().includes("attendance")) {
      avgAttendance = attendance[i].slice(2);

      for (let j = 0; j < rollNos.length; j++) {
        let _rollNo = rollNos[j];
        let _attendance = avgAttendance[j];

        if (_rollNo === "" || _attendance === "") continue;
        _attendance = _attendance.replace("%", "").trim();

        newAttendance.push({
          rollNo: _rollNo,
          attendance: _attendance,
        });
      }
    }
  }

  await Attendance.insertMany(newAttendance);

  res.send({ message: "Attendance updated." });
});

module.exports = router;
