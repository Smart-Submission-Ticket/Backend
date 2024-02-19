const express = require("express");

const { AllowedStudents } = require("../models/allowed_students");
const { Curriculum } = require("../models/curriculum");
const { Attendance } = require("../models/attendance");
const { Batch } = require("../models/batch");
const teacher = require("../middleware/teacher");
const {
  getStudentsSpreadSheetValues,
  getCurriculumSpreadSheetValues,
  getAttendanceSpreadSheetValues,
  getClassesSpreadSheetValues,
} = require("../utils/googleSheetsService");

const router = express.Router();

const getBatchToClassAndClassToYear = (classes) => {
  const batchToClass = {};
  const classToYear = {};

  let year = "";
  let class_ = "";
  let batch = "";

  for (let i = 0; i < classes.length; i++) {
    if (classes[i][0] !== "") {
      year = classes[i][0];
    }

    if (classes[i][1] !== "") {
      class_ = classes[i][1];
    }

    for (let j = 2; j < classes[i].length; j++) {
      batch = classes[i][j];

      if (batch === "") continue;

      batchToClass[batch] = class_;
      classToYear[class_] = year;
    }
  }

  return [batchToClass, classToYear];
};

router.get("/students", teacher, async (req, res, next) => {
  try {
    const [students, classes] = await Promise.all([
      getStudentsSpreadSheetValues(),
      getClassesSpreadSheetValues(),
    ]);

    const [batchToClass, classToYear] = getBatchToClassAndClassToYear(classes);
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
            class: batchToClass[batch],
            year: classToYear[batchToClass[batch]],
          });
        }
      }
    }

    await AllowedStudents.insertMany(newStudents);
    res.send({ message: "Allowed students updated." });
  } catch (err) {
    console.log(err);
    next(err);
  }
});

router.get("/curriculum", teacher, async (req, res, next) => {
  try {
    const [curriculum, classes] = await Promise.all([
      getCurriculumSpreadSheetValues(),
      getClassesSpreadSheetValues(),
    ]);

    const [batchToClass, classToYear] = getBatchToClassAndClassToYear(classes);

    const newCurriculum = [];
    const newBatch = [];

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

    await Curriculum.deleteMany();
    const curriculumDocs = await Curriculum.insertMany(newCurriculum);

    const batchDocs = await Batch.find();

    for (let i = 0; i < curriculumDocs.length; i++) {
      const batchDoc = batchDocs.find(
        (b) => b.batch === curriculumDocs[i].batch
      );

      if (!batchDoc) {
        newBatch.push({
          batch: curriculumDocs[i].batch,
          class: batchToClass[curriculumDocs[i].batch],
          year: classToYear[batchToClass[curriculumDocs[i].batch]],
          curriculum: curriculumDocs[i]._id,
        });
      }
    }

    await Batch.deleteMany();
    await Batch.insertMany(newBatch);

    res.send({ message: "Curriculum updated." });
  } catch (err) {
    console.log(err);
    next(err);
  }
});

router.get("/attendance", teacher, async (req, res, next) => {
  try {
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
  } catch (err) {
    console.log(err);
    next(err);
  }
});

module.exports = router;
