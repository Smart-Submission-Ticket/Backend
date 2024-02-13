const express = require("express");

const { AllowedStudents } = require("../models/allowed_students");
const teacher = require("../middleware/teacher");
const {
  getStudentsSpreadSheetValues,
} = require("../utils/googleSheetsService");

const router = express.Router();

router.get("/allowed-students", teacher, async (req, res) => {
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

  res.send({
    message: "Allowed students updated.",
    newStudents: newStudents,
    allowedStudents: allowedStudents,
  });
});

module.exports = router;
