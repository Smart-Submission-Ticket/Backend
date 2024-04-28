const mongoose = require("mongoose");

const { isValidAttendance, isValidUTMarks } = require("../utils/valid_records");

const studentRecordSchema = new mongoose.Schema({
  rollNo: {
    type: String,
    required: true,
    index: true,
  },
  attendance: {
    type: Number,
  },
  attendanceAlternate: {
    type: Boolean,
  },
  unitTests: {
    type: Map,
    of: {
      _id: false,
      ut1: {
        type: Number,
      },
      ut2: {
        type: Number,
      },
      ut1Alternate: {
        type: Boolean,
      },
      ut2Alternate: {
        type: Boolean,
      },
      ut1Absent: {
        type: Boolean,
      },
      ut2Absent: {
        type: Boolean,
      },
    },
  },
  assignments: {
    type: Map,
    of: {
      _id: false,
      marks: {
        type: [Number],
      },
      allCompleted: {
        type: Boolean,
      },
    },
  },
  extra: {
    type: Map,
    of: String,
  },
});

studentRecordSchema.statics.updateStudentRecords = async function ({
  updateAttendances = false,
  updateUTMarks = false,
  updateAllAttendances = false,
  updateAllUTMarks = false,
}) {
  if (!updateAttendances && !updateUTMarks) return;

  let selectionString = "";
  if (updateAttendances) selectionString += " attendance attendanceAlternate";
  if (updateUTMarks) selectionString += " unitTests";

  let students = await this.find().select(selectionString);

  // Update attendances
  const updateAttendanceForStudent = (student) => {
    if (!updateAttendances) return;
    if (!student.attendance) return;

    // If !updateAllAttendances and attendanceAlternate is true, skip
    if (!updateAllAttendances && student.attendanceAlternate) return;

    // If updateAllAttendances, update attendanceAlternate
    if (updateAllAttendances) {
      student.attendanceAlternate = isValidAttendance(student.attendance);
      return;
    }

    // If attendanceAlternate is false, update attendanceAlternate
    if (!student.attendanceAlternate) {
      student.attendanceAlternate = isValidAttendance(student.attendance);
    }
  };

  // Update UT marks
  const updateUTMarksForStudent = (student) => {
    if (!updateUTMarks) return;
    if (!student.unitTests) return;

    for (let [_, ut] of student.unitTests) {
      if (!ut.ut1 || !ut.ut2) continue;

      // If !updateAllUTMarks and ut1Alternate is true or ut2Alternate is true, skip
      if (
        !updateAllUTMarks &&
        (ut.ut1Alternate !== undefined ? ut.ut1Alternate : true) &&
        (ut.ut2Alternate !== undefined ? ut.ut2Alternate : true)
      )
        continue;

      // If updateAllUTMarks, update ut1Alternate and ut2Alternate
      if (updateAllUTMarks) {
        if (ut.ut1Alternate !== undefined)
          ut.ut1Alternate = isValidUTMarks(ut.ut1);
        if (ut.ut2Alternate !== undefined)
          ut.ut2Alternate = isValidUTMarks(ut.ut2);
        continue;
      }

      // If ut1Alternate is false, update ut1Alternate
      if (ut.ut1Alternate !== undefined && !ut.ut1Alternate)
        ut.ut1Alternate = isValidUTMarks(ut.ut1);

      // If ut2Alternate is false, update ut2Alternate
      if (ut.ut2Alternate !== undefined && !ut.ut2Alternate)
        ut.ut2Alternate = isValidUTMarks(ut.ut2);
    }
  };

  students.forEach((student) => {
    updateAttendanceForStudent(student);
    updateUTMarksForStudent(student);
  });

  // Bulk write by _id
  await this.bulkWrite(
    students.map((student) => ({
      updateOne: {
        filter: { _id: student._id },
        update: student.toObject(),
      },
    }))
  );
};

studentRecordSchema.statics.mergeRecordsByRollNo = async function () {
  let students = await this.find();

  let mergedRecords = {};
  let duplicateRecordsRollNos = [];
  let duplicateRecordsIds = [];

  students.forEach((student) => {
    let rollNo = student.rollNo;
    if (!mergedRecords[rollNo]) {
      mergedRecords[rollNo] = {
        rollNo,
        _id: student._id,
      };
    } else {
      duplicateRecordsRollNos.push(rollNo);
      duplicateRecordsIds.push(student._id);
    }

    if (student.attendance) {
      mergedRecords[rollNo].attendance = student.attendance;
      mergedRecords[rollNo].attendanceAlternate = student.attendanceAlternate;
    }

    if (student.unitTests) {
      if (!mergedRecords[rollNo].unitTests)
        mergedRecords[rollNo].unitTests = {};

      for (let [key, ut] of student.unitTests) {
        if (!mergedRecords[rollNo].unitTests[key])
          mergedRecords[rollNo].unitTests[key] = {};

        if (ut.ut1) {
          mergedRecords[rollNo].unitTests[key].ut1 = ut.ut1;
          mergedRecords[rollNo].unitTests[key].ut1Alternate = ut.ut1Alternate;
        }

        if (ut.ut2) {
          mergedRecords[rollNo].unitTests[key].ut2 = ut.ut2;
          mergedRecords[rollNo].unitTests[key].ut2Alternate = ut.ut2Alternate;
        }
      }
    }

    if (student.assignments) {
      if (!mergedRecords[rollNo].assignments)
        mergedRecords[rollNo].assignments = {};

      for (let [key, assignment] of student.assignments) {
        if (!mergedRecords[rollNo].assignments[key])
          mergedRecords[rollNo].assignments[key] = {};

        if (assignment.marks) {
          mergedRecords[rollNo].assignments[key].marks = assignment.marks;
          mergedRecords[rollNo].assignments[key].allCompleted =
            assignment.allCompleted;
        }
      }
    }

    if (student.extra) {
      if (!mergedRecords[rollNo].extra) mergedRecords[rollNo].extra = {};

      for (let [key, value] of student.extra) {
        mergedRecords[rollNo].extra[key] = value;
      }
    }
  });

  let recordsToUpdate = [];
  for (let rollNo of duplicateRecordsRollNos) {
    recordsToUpdate.push({
      updateOne: {
        filter: { _id: mergedRecords[rollNo]._id },
        update: mergedRecords[rollNo],
      },
    });
  }

  await Promise.all([
    this.deleteMany({ _id: { $in: duplicateRecordsIds } }),
    this.bulkWrite(recordsToUpdate),
  ]);
};

const StudentRecord = mongoose.model("StudentRecord", studentRecordSchema);

exports.StudentRecord = StudentRecord;
