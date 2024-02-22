const express = require("express");
const _ = require("lodash");

const { StudentRecord } = require("../models/student_record");
const { Batch } = require("../models/batch");
const { StudentData } = require("../models/student_data");
const auth = require("../middleware/auth");
const teacher = require("../middleware/teacher");

const router = express.Router();

router.get("/", auth, async (req, res, next) => {
  try {
    const [student, record, batch] = await Promise.all([
      StudentData.findOne({ email: req.user.email }).select("-_id -__v"),
      StudentRecord.findOne({ rollNo: req.user.rollNo }).select("-_id -__v"),
      Batch.findOne({ rollNos: req.user.rollNo }).select("-_id -__v"),
    ]);

    if (!record) return res.status(404).send({ message: "Record not found" });

    const assignments = {};
    if (record.assignments && typeof record.assignments === "object") {
      for (const [key, value] of record.assignments) {
        assignments[key] = {
          noOfAssignments: batch.practical.find(
            (practical) => practical.title === key
          ).noOfAssignments,
          marks: value,
        };
      }
    }

    const unitTests = {};
    if (record.unitTests && typeof record.unitTests === "object") {
      for (const [key, value] of record.unitTests) {
        unitTests[key] = _.pick(value, [
          "ut1",
          "ut2",
          "ut1Alternate",
          "ut2Alternate",
        ]);
      }
    }

    res.send({
      ..._.pick(student, ["rollNo", "name", "email", "batch", "class", "year"]),
      ..._.pick(record, ["attendance", "attendanceAlternate"]),
      assignments,
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

    const [student, record, batch] = await Promise.all([
      StudentData.findOne({ rollNo }).select("-_id -__v"),
      StudentRecord.findOne({ rollNo }).select("-_id -__v"),
    ]);
    if (!record) return res.status(404).send({ message: "Record not found" });

    const assignments = {};
    if (record.assignments && typeof record.assignments === "object") {
      for (const [key, value] of record.assignments) {
        assignments[key] = {
          noOfAssignments: batch.practical.find(
            (practical) => practical.title === key
          ).noOfAssignments,
          marks: value,
        };
      }
    }

    const unitTests = {};
    if (record.unitTests && typeof record.unitTests === "object") {
      for (const [key, value] of record.unitTests) {
        unitTests[key] = _.pick(value, [
          "ut1",
          "ut2",
          "ut1Alternate",
          "ut2Alternate",
        ]);
      }
    }

    res.send({
      ..._.pick(student, ["rollNo", "name", "email", "batch", "class", "year"]),
      ..._.pick(record, ["attendance", "attendanceAlternate"]),
      assignments,
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
      StudentData.find({ rollNo: { $in: batchDoc.rollNos } }).select(
        "-_id -__v"
      ),
      StudentRecord.find({ rollNo: { $in: batchDoc.rollNos } }).select(
        "-_id -__v"
      ),
    ]);
    if (!records) return res.status(404).send({ message: "Records not found" });

    const response = {};
    const noOfAssignments = {};

    students.forEach((student) => {
      const record = records.find((record) => record.rollNo === student.rollNo);

      const assignments = {};
      if (record.assignments && typeof record.assignments === "object") {
        for (const [key, value] of record.assignments) {
          if (!noOfAssignments[key]) {
            noOfAssignments[key] = batchDoc.practical.find(
              (practical) => practical.title === key
            ).noOfAssignments;
          }

          assignments[key] = {
            noOfAssignments: noOfAssignments[key],
            marks: value,
          };
        }
      }

      const unitTests = {};
      if (record.unitTests && typeof record.unitTests === "object") {
        for (const [key, value] of record.unitTests) {
          unitTests[key] = _.pick(value, [
            "ut1",
            "ut2",
            "ut1Alternate",
            "ut2Alternate",
          ]);
        }
      }

      response[student.rollNo] = {
        ..._.pick(student, ["email", "name", "batch", "class", "year"]),
        ..._.pick(record, ["attendance", "attendanceAlternate"]),
        assignments,
        unitTests,
      };
    });

    res.send(response);
  } catch (error) {
    console.log(error);
    next(error);
  }
});

router.get("/class/:class", teacher, async (req, res, next) => {
  try {
    const { class: className } = req.params;
    if (!className)
      return res.status(400).send({ message: "Class not provided" });

    const batchDocs = await Batch.find({ class: className }).select(
      "-_id -__v"
    );
    if (!batchDocs) return res.status(404).send({ message: "Class not found" });

    const [students, records] = await Promise.all([
      StudentData.find({ class: className }).select("-_id -__v"),
      StudentRecord.find({
        rollNo: { $in: batchDocs.map((b) => b.rollNos).flat() },
      }).select("-_id -__v"),
    ]);
    if (!records) return res.status(404).send({ message: "Records not found" });

    const response = {};
    const noOfAssignments = {};

    students.forEach((student) => {
      const record = records.find((record) => record.rollNo === student.rollNo);

      const assignments = {};
      if (record.assignments && typeof record.assignments === "object") {
        for (const [key, value] of record.assignments) {
          if (!noOfAssignments[key]) {
            noOfAssignments[key] = batchDocs
              .find((b) => b.rollNos.includes(student.rollNo))
              .practical.find(
                (practical) => practical.title === key
              ).noOfAssignments;
          }

          assignments[key] = {
            noOfAssignments: noOfAssignments[key],
            marks: value,
          };
        }
      }

      const unitTests = {};
      if (record.unitTests && typeof record.unitTests === "object") {
        for (const [key, value] of record.unitTests) {
          unitTests[key] = _.pick(value, [
            "ut1",
            "ut2",
            "ut1Alternate",
            "ut2Alternate",
          ]);
        }
      }

      response[student.rollNo] = {
        ..._.pick(student, ["email", "name", "batch", "class", "year"]),
        ..._.pick(record, ["attendance", "attendanceAlternate"]),
        assignments,
        unitTests,
      };
    });

    res.send(response);
  } catch (error) {
    console.log(error);
    next(error);
  }
});

router.get(
  "/batch/:batch/subject/:subject",
  teacher,
  async (req, res, next) => {
    try {
      const { batch, subject } = req.params;
      if (!batch || !subject)
        return res
          .status(400)
          .send({ message: "Batch or subject not provided" });

      const batchDoc = await Batch.findOne({ batch }).select("-_id -__v");
      if (!batchDoc)
        return res.status(404).send({ message: "Batch not found" });

      const [students, records] = await Promise.all([
        StudentData.find({ rollNo: { $in: batchDoc.rollNos } }).select(
          "-_id -__v"
        ),
        StudentRecord.find({ rollNo: { $in: batchDoc.rollNos } }).select(
          "-_id -__v"
        ),
      ]);
      if (!records)
        return res.status(404).send({ message: "Records not found" });

      const response = {};
      const noOfAssignments = {};

      students.forEach((student) => {
        const record = records.find(
          (record) => record.rollNo === student.rollNo
        );

        const assignments = {};
        if (record.assignments && typeof record.assignments === "object") {
          if (!noOfAssignments[subject]) {
            noOfAssignments[subject] = batchDoc.practical.find(
              (practical) => practical.title === subject
            ).noOfAssignments;
          }

          assignments[subject] = {
            noOfAssignments: noOfAssignments[subject],
            marks: record.assignments.get(subject),
          };
        }

        const unitTests = {};
        if (record.unitTests && typeof record.unitTests === "object") {
          unitTests[subject] = _.pick(record.unitTests.get(subject), [
            "ut1",
            "ut2",
            "ut1Alternate",
            "ut2Alternate",
          ]);
        }

        response[student.rollNo] = {
          ..._.pick(student, ["email", "name", "batch", "class", "year"]),
          ..._.pick(record, ["attendance", "attendanceAlternate"]),
          assignments,
          unitTests,
        };
      });

      res.send(response);
    } catch (error) {
      console.log(error);
      next(error);
    }
  }
);

router.get(
  "/class/:class/subject/:subject",
  teacher,
  async (req, res, next) => {
    try {
      const { class: className, subject } = req.params;
      if (!className || !subject)
        return res
          .status(400)
          .send({ message: "Class or subject not provided" });

      const batchDocs = await Batch.find({ class: className }).select(
        "-_id -__v"
      );
      if (!batchDocs)
        return res.status(404).send({ message: "Class not found" });

      const [students, records] = await Promise.all([
        StudentData.find({ class: className }).select("-_id -__v"),
        StudentRecord.find({
          rollNo: { $in: batchDocs.map((b) => b.rollNos).flat() },
        }).select("-_id -__v"),
      ]);
      if (!records)
        return res.status(404).send({ message: "Records not found" });

      const response = {};
      const noOfAssignments = {};

      students.forEach((student) => {
        const record = records.find(
          (record) => record.rollNo === student.rollNo
        );

        const assignments = {};
        if (record.assignments && typeof record.assignments === "object") {
          if (!noOfAssignments[subject]) {
            noOfAssignments[subject] = batchDocs
              .find((b) => b.rollNos.includes(student.rollNo))
              .practical.find(
                (practical) => practical.title === subject
              ).noOfAssignments;
          }

          assignments[subject] = {
            noOfAssignments: noOfAssignments[subject],
            marks: record.assignments.get(subject),
          };
        }

        const unitTests = {};
        if (record.unitTests && typeof record.unitTests === "object") {
          unitTests[subject] = _.pick(record.unitTests.get(subject), [
            "ut1",
            "ut2",
            "ut1Alternate",
            "ut2Alternate",
          ]);
        }

        response[student.rollNo] = {
          ..._.pick(student, ["email", "name", "batch", "class", "year"]),
          ..._.pick(record, ["attendance", "attendanceAlternate"]),
          assignments,
          unitTests,
        };
      });

      res.send(response);
    } catch (error) {
      console.log(error);
      next(error);
    }
  }
);

module.exports = router;
