const express = require("express");
const _ = require("lodash");

const { StudentRecord } = require("../models/student_record");
const { Batch } = require("../models/batch");
const { AllowedStudents } = require("../models/allowed_student");
const auth = require("../middleware/auth");
const teacher = require("../middleware/teacher");

const router = express.Router();

router.get("/", auth, async (req, res, next) => {
  try {
    const [student, record] = await Promise.all([
      AllowedStudents.findOne({ rollNo: req.user.rollNo }).select("-_id -__v"),
      StudentRecord.findOne({ rollNo: req.user.rollNo }).select("-_id -__v"),
    ]);
    if (!record) return res.status(404).send({ message: "Record not found" });

    const unitTests = {};
    for (const [key, value] of record.unitTests) {
      unitTests[key] = _.pick(value, [
        "ut1",
        "ut2",
        "ut1Alternate",
        "ut2Alternate",
      ]);
    }

    res.send({
      ..._.pick(student, ["rollNo", "email", "batch", "class", "year"]),
      ..._.pick(record, ["attendance", "attendanceAlternate", "assignments"]),
      unitTests,
    });
  } catch (error) {
    console.log(error);
    next(error);
  }
});

router.get("/rollNo/:rollNo", teacher, async (req, res, next) => {
  try {
    const { rollNo } = req.params;
    if (!rollNo)
      return res.status(400).send({ message: "Roll no not provided" });

    const [student, record] = await Promise.all([
      AllowedStudents.findOne({ rollNo }).select("-_id -__v"),
      StudentRecord.findOne({ rollNo }).select("-_id -__v"),
    ]);
    if (!record) return res.status(404).send({ message: "Record not found" });

    const unitTests = {};
    for (const [key, value] of record.unitTests) {
      unitTests[key] = _.pick(value, [
        "ut1",
        "ut2",
        "ut1Alternate",
        "ut2Alternate",
      ]);
    }

    res.send({
      ..._.pick(student, ["rollNo", "email", "batch", "class", "year"]),
      ..._.pick(record, ["attendance", "attendanceAlternate", "assignments"]),
      unitTests,
    });
  } catch (error) {
    console.log(error);
    next(error);
  }
});

router.get("/batch/:batch", teacher, async (req, res, next) => {
  try {
    const { batch } = req.params;
    if (!batch) return res.status(400).send({ message: "Batch not provided" });

    const batchDoc = await Batch.findOne({ batch }).select("-_id -__v");
    if (!batchDoc) return res.status(404).send({ message: "Batch not found" });

    const [students, records] = await Promise.all([
      AllowedStudents.find({ rollNo: { $in: batchDoc.rollNos } }).select(
        "-_id -__v"
      ),
      StudentRecord.find({ rollNo: { $in: batchDoc.rollNos } }).select(
        "-_id -__v"
      ),
    ]);
    if (!records) return res.status(404).send({ message: "Records not found" });

    const response = {};

    students.forEach((student) => {
      const record = records.find((record) => record.rollNo === student.rollNo);

      const unitTests = {};
      for (const [key, value] of record.unitTests) {
        unitTests[key] = _.pick(value, [
          "ut1",
          "ut2",
          "ut1Alternate",
          "ut2Alternate",
        ]);
      }

      response[student.rollNo] = {
        ..._.pick(student, ["email", "batch", "class", "year"]),
        ..._.pick(record, ["attendance", "attendanceAlternate", "assignments"]),
        unitTests,
      };
    });

    res.send(response);
  } catch (error) {
    console.log(error);
    next(error);
  }
});

module.exports = router;
