const { Classes } = require("../models/classes");
const { AllowedStudents } = require("../models/allowed_student");
const { StudentRecord } = require("../models/student_record");
const { Batch } = require("../models/batch");

const uploadClassesData = async (classes) => {
  const newClasses = [];

  let year = "";
  let class_ = "";
  let batches = [];

  for (let i = 0; i < classes.length; i++) {
    if (classes[i][0] !== "") {
      year = classes[i][0];
    }

    if (classes[i][1] !== "") {
      class_ = classes[i][1];
    }

    for (let j = 2; j < classes[i].length; j++) {
      let batch = classes[i][j];

      if (batch === "") continue;
      batches.push(batch);
    }
    newClasses.push({
      year,
      class: class_,
      batches,
    });

    batches = [];
  }

  await Classes.deleteMany();
  await Classes.insertMany(newClasses);
};

const uploadStudentsData = async (students) => {
  const classes = await Classes.find();
  const newStudents = [];

  let batch = "";
  let rollNos = [];
  let emails = [];

  const addStudents = (batch, rollNos, emails) => {
    for (let i = 0; i < rollNos.length; i++) {
      let rollNo = rollNos[i];
      let email = emails[i];

      if (rollNo === "" || email === "") continue;

      newStudents.push({
        email,
        rollNo,
        batch,
        class: classes.find((c) => c.batches.includes(batch)).class,
        year: classes.find((c) => c.batches.includes(batch)).year,
      });
    }
  };

  for (let i = 0; i < students.length; i++) {
    if (students[i][0] !== "") {
      addStudents(batch, rollNos, emails);
      batch = students[i][0];
    }

    if (students[i][1].trim().toLowerCase().includes("roll"))
      rollNos = students[i].slice(2);

    if (students[i][1].trim().toLowerCase().includes("email"))
      emails = students[i].slice(2);
  }

  addStudents(batch, rollNos, emails);

  await AllowedStudents.bulkWrite(
    newStudents.map((s) => ({
      updateOne: {
        filter: { email: s.email },
        update: s,
        upsert: true,
      },
    }))
  );
};

const uploadCurriculumData = async (curriculum) => {
  const [classes, allowedStudents, batchDocs] = await Promise.all([
    Classes.find(),
    AllowedStudents.find(),
    Batch.find(),
  ]);

  const [theory, practical] = [curriculum.theory, curriculum.practical];

  const theorySubjects = {};

  let nextYearSubjectIndex = 0;
  for (let i = 0; i < theory.length; i++) {
    if (theory[i][0] !== "") {
      nextYearSubjectIndex = i;
    }

    const class_ = theory[i][1];

    const classDoc = classes.find((c) => c.class === class_);
    if (!classDoc) continue;

    const batches = classDoc.batches;

    for (let j = 2; j < theory[i].length; j++) {
      const teacherEmail = theory[i][j];

      if (teacherEmail === "") continue;

      batches.forEach((batch) => {
        if (theorySubjects[batch] === undefined) {
          theorySubjects[batch] = [];
        }

        theorySubjects[batch].push({
          title: theory[nextYearSubjectIndex][j],
          teacher: teacherEmail,
        });
      });
    }
  }

  const practicalSubjects = {};

  let nextYearPracticalIndex = 0;
  for (let i = 0; i < practical.length; i++) {
    if (practical[i][0] !== "") {
      nextYearPracticalIndex = i;
    }

    const batch = practical[i][1];

    if (!classes.find((c) => c.batches.includes(batch))) continue;

    for (let j = 2; j < practical[i].length; j++) {
      const teacherEmail = practical[i][j];

      if (teacherEmail === "") continue;

      if (practicalSubjects[batch] === undefined) {
        practicalSubjects[batch] = [];
      }

      practicalSubjects[batch].push({
        title: practical[nextYearPracticalIndex][j],
        noOfAssignments: practical[nextYearPracticalIndex + 1][j],
        teacher: teacherEmail,
      });
    }
  }

  const newBatches = [];

  const allBatches = classes.reduce((acc, c) => {
    acc.push(...c.batches);
    return acc;
  }, []);

  for (let i = 0; i < allBatches.length; i++) {
    const batch = allBatches[i];
    const batchDoc = batchDocs.find((b) => b.batch === batch);
    const rollNos = allowedStudents
      .filter((s) => s.batch === batch)
      .map((s) => s.rollNo);

    newBatches.push({
      batch,
      class: classes.find((c) => c.batches.includes(batch)).class,
      year: classes.find((c) => c.batches.includes(batch)).year,
      rollNos,
      students: batchDoc ? batchDoc.students : [],
      theory: theorySubjects[batch] || [],
      practical: practicalSubjects[batch] || [],
    });
  }

  await Batch.bulkWrite(
    newBatches.map((b) => ({
      updateOne: {
        filter: { batch: b.batch },
        update: b,
        upsert: true,
      },
    }))
  );
};

const uploadAttendanceData = async (attendance) => {
  const newAttendances = [];
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

        newAttendances.push({
          rollNo: _rollNo,
          attendance: _attendance,
          attendanceAlternate: parseFloat(_attendance) >= 75,
        });
      }
    }
  }

  const studentRecords = await StudentRecord.find().select("-_id -__v");
  const newStudentRecords = [];
  const brandNewStudentRecords = [];

  for (let i = 0; i < newAttendances.length; i++) {
    const studentRecord = studentRecords.find(
      (s) => s.rollNo === newAttendances[i].rollNo
    );

    if (studentRecord) {
      studentRecord.attendance = newAttendances[i].attendance;
      studentRecord.attendanceAlternate = newAttendances[i].attendanceAlternate;

      newStudentRecords.push(studentRecord);
    } else {
      brandNewStudentRecords.push(newAttendances[i]);
    }
  }

  await Promise.all([
    StudentRecord.bulkWrite(
      newStudentRecords.map((s) => ({
        updateOne: {
          filter: { rollNo: s.rollNo },
          update: s,
          upsert: true,
        },
      }))
    ),
    StudentRecord.insertMany(brandNewStudentRecords),
  ]);
};

const uploadAssignmentsData = async (subject, assignments) => {
  const rollNos = assignments
    .find((a) => a[0].trim().toLowerCase().includes("roll"))
    .slice(1);

  const newAssignments = [];

  for (let i = 0; i < rollNos.length; i++) {
    const rollNo = rollNos[i];

    const subjectAssignments = [];

    for (let j = 1; j < assignments.length; j++) {
      subjectAssignments.push(assignments[j][i + 1]);
    }

    newAssignments.push({
      rollNo,
      subjectAssignments,
    });
  }

  const studentRecords = await StudentRecord.find().select("-_id -__v");
  const newStudentRecords = [];
  const brandNewStudentRecords = [];

  for (let i = 0; i < newAssignments.length; i++) {
    const studentRecord = studentRecords.find(
      (s) => s.rollNo === newAssignments[i].rollNo
    );

    if (studentRecord) {
      const newAssignmentsMap = new Map(studentRecord.assignments);
      newAssignmentsMap.set(subject, newAssignments[i].subjectAssignments);
      studentRecord.assignments = newAssignmentsMap;

      newStudentRecords.push(studentRecord);
    } else {
      brandNewStudentRecords.push({
        rollNo: newAssignments[i].rollNo,
        assignments: new Map([[subject, newAssignments[i].subjectAssignments]]),
      });
    }
  }

  await Promise.all([
    StudentRecord.bulkWrite(
      newStudentRecords.map((s) => ({
        updateOne: {
          filter: { rollNo: s.rollNo },
          update: s,
          upsert: true,
        },
      }))
    ),
    StudentRecord.insertMany(brandNewStudentRecords),
  ]);
};

const uploadUTMarksData = async (subject, utMarks) => {
  const rollNos = utMarks
    .find((a) => a[0].trim().toLowerCase().includes("roll"))
    .slice(1);

  const newUTMarks = [];

  for (let i = 0; i < rollNos.length; i++) {
    const rollNo = rollNos[i];

    const _utMarks = [];
    const _utMarksAlternate = [];

    for (let j = 1; j < utMarks.length; j++) {
      _utMarks.push(utMarks[j][i + 1]);
      _utMarksAlternate.push(parseFloat(utMarks[j][i + 1]) >= 12);
    }

    newUTMarks.push({
      rollNo,
      utMarks: _utMarks,
      utMarksAlternate: _utMarksAlternate,
    });
  }

  const studentRecords = await StudentRecord.find().select("-_id -__v");
  const newStudentRecords = [];
  const brandNewStudentRecords = [];

  for (let i = 0; i < newUTMarks.length; i++) {
    const studentRecord = studentRecords.find(
      (s) => s.rollNo === newUTMarks[i].rollNo
    );

    if (studentRecord) {
      const newUTMarksMap = new Map(studentRecord.unitTests);

      const newUTRecord = {
        ut1: newUTMarks[i].utMarks[0],
        ut2: newUTMarks[i].utMarks[1],
        ut1Alternate: newUTMarks[i].utMarksAlternate[0],
        ut2Alternate: newUTMarks[i].utMarksAlternate[1],
      };

      newUTMarksMap.set(subject, newUTRecord);
      studentRecord.unitTests = newUTMarksMap;

      newStudentRecords.push(studentRecord);
    } else {
      brandNewStudentRecords.push({
        rollNo: newUTMarks[i].rollNo,
        unitTests: new Map([
          [
            subject,
            {
              ut1: newUTMarks[i].utMarks[0],
              ut2: newUTMarks[i].utMarks[1],
              ut1Alternate: newUTMarks[i].utMarksAlternate[0],
              ut2Alternate: newUTMarks[i].utMarksAlternate[1],
            },
          ],
        ]),
      });
    }
  }

  await Promise.all([
    StudentRecord.bulkWrite(
      newStudentRecords.map((s) => ({
        updateOne: {
          filter: { rollNo: s.rollNo },
          update: s,
          upsert: true,
        },
      }))
    ),
    StudentRecord.insertMany(brandNewStudentRecords),
  ]);
};

module.exports = {
  uploadClassesData,
  uploadStudentsData,
  uploadCurriculumData,
  uploadAttendanceData,
  uploadAssignmentsData,
  uploadUTMarksData,
};
