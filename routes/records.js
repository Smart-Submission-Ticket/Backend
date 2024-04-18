const express = require("express");
const assert = require("assert");
const _ = require("lodash");

const { TicketData } = require("../models/ticket_data");
const { StudentRecord } = require("../models/student_record");
const { Batch } = require("../models/batch");
const { Classes } = require("../models/classes");
const { StudentData } = require("../models/student_data");
const auth = require("../middleware/auth");
const teacher = require("../middleware/teacher");

const router = express.Router();

router.get("/ticket", async (req, res) => {
  const ticketData = await TicketData.getTicketData();
  res.send(ticketData || {});
});

router.get("/", auth, async (req, res) => {
  const [student, record, batch, classes] = await Promise.all([
    StudentData.findOne({ email: req.user.email }).select("-_id -__v"),
    StudentRecord.findOne({ rollNo: req.user.rollNo }).select("-_id -__v"),
    Batch.findOne({ rollNos: req.user.rollNo }).select("-_id -__v"),
    Classes.find().select("-_id -__v"),
  ]);

  assert(record, "ERROR 404: Record not found");
  assert(batch, "ERROR 404: Batch not found");

  res.send({
    ..._.pick(student, [
      "rollNo",
      "name",
      "email",
      "batch",
      "class",
      "year",
      "mobile",
      "abcId",
    ]),
    class_coordinator: classes.find(
      (c) => c.class === batch.class && c.year === batch.year
    ).coordinator,
    mentor: batch.mentor,
    subjects: {
      theory: batch.theory.map((theory) => {
        return {
          title: theory.title,
          teacher: theory.teacher,
        };
      }),
      practical: batch.practical.map((practical) => {
        return {
          title: practical.title,
          noOfAssignments: practical.noOfAssignments,
          teacher: practical.teacher,
        };
      }),
    },
    ..._.pick(record, ["attendance", "attendanceAlternate"]),
    assignments: record.assignments,
    unitTests: record.unitTests,
    ...Object.fromEntries(record.extra || new Map()),
  });
});

router.get("/rollNo/:rollNo", teacher, async (req, res) => {
  const { rollNo } = req.params;
  assert(rollNo, "ERROR 400: Roll no not provided");

  const [student, record, batch, classes] = await Promise.all([
    StudentData.findOne({ rollNo }).select("-_id -__v"),
    StudentRecord.findOne({ rollNo }).select("-_id -__v"),
    Batch.findOne({ rollNos: rollNo }).select("-_id -__v"),
    Classes.find().select("-_id -__v"),
  ]);
  assert(record, "ERROR 404: Record not found");
  assert(batch, "ERROR 404: Batch not found");

  res.send({
    ..._.pick(student, ["rollNo", "name", "email", "batch", "class", "year"]),
    class_coordinator: classes.find(
      (c) => c.class === batch.class && c.year === batch.year
    ).coordinator,
    mentor: batch.mentor,
    subjects: {
      theory: batch.theory.map((theory) => {
        return {
          title: theory.title,
          teacher: theory.teacher,
        };
      }),
      practical: batch.practical.map((practical) => {
        return {
          title: practical.title,
          noOfAssignments: practical.noOfAssignments,
          teacher: practical.teacher,
        };
      }),
    },
    ..._.pick(record, ["attendance", "attendanceAlternate"]),
    assignments: record.assignments,
    unitTests: record.unitTests,
    ...Object.fromEntries(record.extra || new Map()),
  });
});

router.get("/batch/:batch", teacher, async (req, res) => {
  const { batch } = req.params;
  assert(batch, "ERROR 400: Batch not provided");

  const batchDoc = await Batch.findOne({
    batch: { $regex: new RegExp(`^${batch}$`, "i") },
  }).select("-_id -__v");
  assert(batchDoc, "ERROR 404: Batch not found");

  const [students, records, class_] = await Promise.all([
    StudentData.find({ rollNo: { $in: batchDoc.rollNos } }).select("-_id -__v"),
    StudentRecord.find({ rollNo: { $in: batchDoc.rollNos } }).select(
      "-_id -__v"
    ),
    Classes.findOne({
      class: batchDoc.class,
    }).select("-_id -__v"),
  ]);
  assert(records, "ERROR 404: Records not found");

  const student_records = {};

  const batches = {};
  batches[batchDoc.batch] = {
    batch: batchDoc.batch,
    class: batchDoc.class,
    year: batchDoc.year,
    class_coordinator: class_.coordinator,
    mentor: batchDoc.mentor,
    subjects: {
      theory: batchDoc.theory.map((theory) => {
        return {
          title: theory.title,
          teacher: theory.teacher,
        };
      }),
      practical: batchDoc.practical.map((practical) => {
        return {
          title: practical.title,
          noOfAssignments: practical.noOfAssignments,
          teacher: practical.teacher,
        };
      }),
    },
  };

  const noOfAssignments = {};
  batchDoc.practical.forEach((practical) => {
    noOfAssignments[practical.title] = practical.noOfAssignments;
  });

  students.forEach((student) => {
    const record = records.find((record) => record.rollNo === student.rollNo);

    student_records[student.rollNo] = {
      ..._.pick(student, ["email", "name", "batch"]),
      ..._.pick(record, ["attendance", "attendanceAlternate"]),
      assignments: record.assignments,
      unitTests: record.unitTests,
      ...Object.fromEntries(record.extra || new Map()),
    };
  });

  res.send({
    batches,
    students: student_records,
  });
});

router.get("/class/:class", teacher, async (req, res) => {
  const { class: className } = req.params;
  assert(className, "ERROR 400: Class not provided");

  const [batchDocs, class_] = await Promise.all([
    Batch.find({
      class: { $regex: new RegExp(`^${className}$`, "i") },
    }).select("-_id -__v"),
    Classes.findOne({
      class: { $regex: new RegExp(`^${className}$`, "i") },
    }).select("-_id -__v"),
  ]);
  assert(batchDocs, "ERROR 404: Class not found");

  const [students, records] = await Promise.all([
    StudentData.find({
      class: { $regex: new RegExp(`^${className}$`, "i") },
    }).select("-_id -__v"),
    StudentRecord.find({
      rollNo: { $in: batchDocs.map((b) => b.rollNos).flat() },
    }).select("-_id -__v"),
  ]);
  assert(records, "ERROR 404: Records not found");

  const student_records = {};

  const batches = {};
  batchDocs.forEach((batchDoc) => {
    batches[batchDoc.batch] = {
      batch: batchDoc.batch,
      class: batchDoc.class,
      year: batchDoc.year,
      class_coordinator: class_.coordinator,
      mentor: batchDoc.mentor,
      subjects: {
        theory: batchDoc.theory.map((theory) => {
          return {
            title: theory.title,
            teacher: theory.teacher,
          };
        }),
        practical: batchDoc.practical.map((practical) => {
          return {
            title: practical.title,
            noOfAssignments: practical.noOfAssignments,
            teacher: practical.teacher,
          };
        }),
      },
    };
  });

  const noOfAssignments = {};
  batchDocs[0].practical.forEach((practical) => {
    noOfAssignments[practical.title] = practical.noOfAssignments;
  });

  students.forEach((student) => {
    const record = records.find((record) => record.rollNo === student.rollNo);

    student_records[student.rollNo] = {
      ..._.pick(student, ["email", "name", "batch"]),
      ..._.pick(record, ["attendance", "attendanceAlternate"]),
      assignments: record.assignments,
      unitTests: record.unitTests,
      ...Object.fromEntries(record.extra || new Map()),
    };
  });

  res.send({
    batches,
    students: student_records,
  });
});

router.get("/batch/:batch/subject/:subject", teacher, async (req, res) => {
  const { batch, subject } = req.params;
  assert(batch, "ERROR 400: Batch not provided");
  assert(subject, "ERROR 400: Subject not provided");

  const batchDoc = await Batch.findOne({
    batch: { $regex: new RegExp(`^${batch}$`, "i") },
  }).select("-_id -__v");
  assert(batchDoc, "ERROR 404: Batch not found");

  const [students, records] = await Promise.all([
    StudentData.find({ rollNo: { $in: batchDoc.rollNos } }).select("-_id -__v"),
    StudentRecord.find({ rollNo: { $in: batchDoc.rollNos } }).select(
      "-_id -__v"
    ),
  ]);
  assert(records, "ERROR 404: Records not found");

  // See if subject is present in the assignments
  const subjectExistsInAssignments = batchDoc.practical.some(
    (practical) => practical.title === subject
  );

  // See if subject is present in the theory
  const subjectExistsInTheory = batchDoc.theory.some(
    (theory) => theory.title === subject
  );

  assert(
    subjectExistsInAssignments || subjectExistsInTheory,
    "ERROR 404: Subject not found"
  );

  const student_records = {};

  const batches = {};
  batches[batchDoc.batch] = {
    batch: batchDoc.batch,
    class: batchDoc.class,
    year: batchDoc.year,
    subjects: {
      theory: batchDoc.theory.map((theory) => {
        return {
          title: theory.title,
          teacher: theory.teacher,
        };
      }),
      practical: batchDoc.practical.map((practical) => {
        return {
          title: practical.title,
          noOfAssignments: practical.noOfAssignments,
          teacher: practical.teacher,
        };
      }),
    },
  };

  const noOfAssignments = {};
  batchDoc.practical.forEach((practical) => {
    noOfAssignments[practical.title] = practical.noOfAssignments;
  });

  students.forEach((student) => {
    const record = records.find((record) => record.rollNo === student.rollNo);

    student_records[student.rollNo] = {
      ..._.pick(student, ["email", "name", "batch"]),
      ..._.pick(record, ["attendance", "attendanceAlternate"]),
      ...(subjectExistsInAssignments
        ? {
            assignments:
              record.assignments && record.assignments.get(subject)
                ? record.assignments.get(subject)
                : {},
          }
        : {}),
      ...(subjectExistsInTheory
        ? {
            unitTests:
              record.unitTests && record.unitTests.get(subject)
                ? record.unitTests.get(subject)
                : {},
          }
        : {}),
    };
  });

  res.send({
    batches,
    students: student_records,
  });
});

router.get("/class/:class/subject/:subject", teacher, async (req, res) => {
  const { class: className, subject } = req.params;
  assert(className, "ERROR 400: Class not provided");
  assert(subject, "ERROR 400: Subject not provided");

  const batchDocs = await Batch.find({
    class: { $regex: new RegExp(`^${className}$`, "i") },
  }).select("-_id -__v");
  assert(batchDocs, "ERROR 404: Class not found");

  const [students, records] = await Promise.all([
    StudentData.find({
      class: { $regex: new RegExp(`^${className}$`, "i") },
    }).select("-_id -__v"),
    StudentRecord.find({
      rollNo: { $in: batchDocs.map((b) => b.rollNos).flat() },
    }).select("-_id -__v"),
  ]);
  assert(records, "ERROR 404: Records not found");

  // See if subject is present in the assignments
  const subjectExistsInAssignments = batchDocs[0].practical.some(
    (practical) => practical.title === subject
  );

  // See if subject is present in the theory
  const subjectExistsInTheory = batchDocs[0].theory.some(
    (theory) => theory.title === subject
  );

  assert(
    subjectExistsInAssignments || subjectExistsInTheory,
    "ERROR 404: Subject not found"
  );

  const student_records = {};

  const batches = {};
  batchDocs.forEach((batchDoc) => {
    batches[batchDoc.batch] = {
      batch: batchDoc.batch,
      class: batchDoc.class,
      year: batchDoc.year,
      subjects: {
        theory: batchDoc.theory.map((theory) => {
          return {
            title: theory.title,
            teacher: theory.teacher,
          };
        }),
        practical: batchDoc.practical.map((practical) => {
          return {
            title: practical.title,
            noOfAssignments: practical.noOfAssignments,
            teacher: practical.teacher,
          };
        }),
      },
    };
  });

  const noOfAssignments = {};
  batchDocs[0].practical.forEach((practical) => {
    noOfAssignments[practical.title] = practical.noOfAssignments;
  });

  students.forEach((student) => {
    const record = records.find((record) => record.rollNo === student.rollNo);

    student_records[student.rollNo] = {
      ..._.pick(student, ["email", "name", "batch"]),
      ..._.pick(record, ["attendance", "attendanceAlternate"]),
      ...(subjectExistsInAssignments
        ? {
            assignments:
              record.assignments && record.assignments.get(subject)
                ? record.assignments.get(subject)
                : {},
          }
        : {}),
      ...(subjectExistsInTheory
        ? {
            unitTests:
              record.unitTests && record.unitTests.get(subject)
                ? record.unitTests.get(subject)
                : {},
          }
        : {}),
    };
  });

  res.send({
    batches,
    students: student_records,
  });
});

module.exports = router;
