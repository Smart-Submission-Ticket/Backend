const assert = require("assert");

const { Classes } = require("../models/classes");
const { StudentData } = require("../models/student_data");
const { StudentRecord } = require("../models/student_record");
const { Batch } = require("../models/batch");
const { Teacher } = require("../models/teacher");

const {
  isValidAttendance,
  isValidUTMarks,
  checkStudentsWithYear,
} = require("./valid_records");

const trimNestedArray = (arr) => {
  return arr.map((a) => a.map((b) => b.trim()));
};

const uploadClassesData = async (classes) => {
  classes = trimNestedArray(classes);

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
  students = trimNestedArray(students);

  const classes = await Classes.find();
  const batchDocs = await Batch.find();
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

    const batchDoc = batchDocs.find((b) => b.batch === batch);
    if (batchDoc) {
      batchDoc.rollNos = rollNos;
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

  await Promise.all([
    StudentData.bulkWrite(
      newStudents.map((s) => ({
        updateOne: {
          filter: { email: s.email },
          update: s,
          upsert: true,
        },
      }))
    ),
    Batch.bulkWrite(
      batchDocs.map((b) => ({
        updateOne: {
          filter: { batch: b.batch },
          update: b,
          upsert: true,
        },
      }))
    ),
  ]);
};

const uploadCurriculumData = async (curriculum) => {
  curriculum.theory = trimNestedArray(curriculum.theory);
  curriculum.practical = trimNestedArray(curriculum.practical);

  const [classes, studentDatas, batchDocs, teachers] = await Promise.all([
    Classes.find(),
    StudentData.find(),
    Batch.find(),
    Teacher.find(),
  ]);

  const [theory, practical] = [curriculum.theory, curriculum.practical];

  const teacherEmails = teachers.map((t) => t.email);
  const newTeachers = [];

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

      if (!teacherEmails.includes(teacherEmail)) {
        newTeachers.push({
          email: teacherEmail,
        });
      }

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

      if (!teacherEmails.includes(teacherEmail)) {
        newTeachers.push({
          email: teacherEmail,
        });
      }

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
    const rollNos = studentDatas
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

  await Promise.all([
    Batch.bulkWrite(
      newBatches.map((b) => ({
        updateOne: {
          filter: { batch: b.batch },
          update: b,
          upsert: true,
        },
      }))
    ),
    Teacher.insertMany(newTeachers),
  ]);
};

const uploadAttendanceData = async (attendance) => {
  attendance = trimNestedArray(attendance);

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

        if (_rollNo === "") continue;
        if (_attendance === "") _attendance = "0";
        _attendance = _attendance.replace("%", "").trim();

        newAttendances.push({
          rollNo: _rollNo,
          attendance: _attendance,
          attendanceAlternate: isValidAttendance(_attendance),
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

const uploadAssignmentsData = async (subject, assignments, user) => {
  subject = subject.trim();
  assignments = trimNestedArray(assignments);

  const rollNos = assignments
    .find((a) => a[0].trim().toLowerCase().includes("roll"))
    .slice(1);

  const [studentRecords, studentDatas] = await Promise.all([
    StudentRecord.find().select("-_id -__v"),
    StudentData.find({ rollNo: { $in: rollNos } }),
  ]);

  assert(
    studentDatas.length === rollNos.length,
    "ERROR 404: Some roll nos not found."
  );

  const batches = studentDatas.map((s) => s.batch);
  const batchDocs = await Batch.find({ batch: { $in: batches } });

  for (let i = 0; i < batchDocs.length; i++) {
    assert(
      batchDocs[i].practical.find(
        (p) => p.title.toLowerCase() === subject.toLowerCase()
      ),
      `ERROR 404: Subject ${subject} not found in batch ${batchDocs[i].batch}.`
    );

    assert(
      batchDocs[i].practical.find(
        (p) => p.title.toLowerCase() === subject.toLowerCase()
      ).teacher === user.email,
      `ERROR 403: You are not allowed to upload assignments for ${subject} for ${batchDocs[i].batch} batch.`
    );
  }

  const subjectTitle = batchDocs[0].practical.find(
    (p) => p.title.toLowerCase() === subject.toLowerCase()
  ).title;

  const noOfAssignments = batchDocs[0].practical.find(
    (p) => p.title.toLowerCase() === subject.toLowerCase()
  ).noOfAssignments;

  const newAssignments = [];

  for (let i = 0; i < rollNos.length; i++) {
    if (rollNos[i] === "") continue;
    const rollNo = rollNos[i];

    const subjectAssignments = [];

    for (let j = 1; j < assignments.length; j++) {
      let assignmentMarks = assignments[j][i + 1];
      if (!assignmentMarks || assignmentMarks === "") assignmentMarks = 0;
      subjectAssignments.push(assignmentMarks);
    }

    newAssignments.push({
      rollNo,
      subjectAssignments,
      allCompleted:
        subjectAssignments.length === noOfAssignments &&
        !(subjectAssignments.includes(0) || subjectAssignments.includes("0")),
    });
  }

  const newStudentRecords = [];
  const brandNewStudentRecords = [];

  for (let i = 0; i < newAssignments.length; i++) {
    const studentRecord = studentRecords.find(
      (s) => s.rollNo === newAssignments[i].rollNo
    );

    if (studentRecord) {
      const newAssignmentsMap = new Map(studentRecord.assignments);

      const newAssignment = {
        marks: newAssignments[i].subjectAssignments,
        allCompleted: newAssignments[i].allCompleted,
      };

      newAssignmentsMap.set(subjectTitle, newAssignment);
      studentRecord.assignments = newAssignmentsMap;

      newStudentRecords.push(studentRecord);
    } else {
      brandNewStudentRecords.push({
        rollNo: newAssignments[i].rollNo,
        assignments: new Map([
          [
            subjectTitle,
            {
              marks: newAssignments[i].subjectAssignments,
              allCompleted: newAssignments[i].allCompleted,
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

const uploadUTMarksData = async (subject, utMarks, user) => {
  subject = subject.trim();
  utMarks = trimNestedArray(utMarks);

  const rollNos = utMarks
    .find((a) => a[0].trim().toLowerCase().includes("roll"))
    .slice(1);

  const [studentRecords, studentDatas] = await Promise.all([
    StudentRecord.find().select("-_id -__v"),
    StudentData.find({ rollNo: { $in: rollNos } }),
  ]);

  assert(
    studentDatas.length === rollNos.length,
    "ERROR 404: Some roll nos not found."
  );

  const batches = studentDatas.map((s) => s.batch);
  const batchDocs = await Batch.find({ batch: { $in: batches } });

  for (let i = 0; i < batchDocs.length; i++) {
    assert(
      batchDocs[i].theory.find(
        (t) => t.title.toLowerCase() === subject.toLowerCase()
      ),
      `ERROR 404: Subject ${subject} not found in batch ${batchDocs[i].batch}.`
    );

    assert(
      batchDocs[i].theory.find(
        (t) => t.title.toLowerCase() === subject.toLowerCase()
      ).teacher === user.email,
      `ERROR 403: You are not allowed to upload UT marks for ${subject} for ${batchDocs[i].batch} batch.`
    );
  }

  const newUTMarks = [];

  for (let i = 0; i < rollNos.length; i++) {
    if (rollNos[i] === "") continue;
    const rollNo = rollNos[i];

    const _utMarks = [];
    const _utMarksAlternate = [];

    for (let j = 1; j < utMarks.length; j++) {
      let utMark = utMarks[j][i + 1];
      if (!utMark || utMark === "") utMark = 0;
      _utMarks.push(utMark);
      _utMarksAlternate.push(isValidUTMarks(utMarks[j][i + 1]));
    }

    newUTMarks.push({
      rollNo,
      utMarks: _utMarks,
      utMarksAlternate: _utMarksAlternate,
    });
  }

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

const uploadCCData = async (cc) => {
  cc = trimNestedArray(cc);

  const classes = await Classes.find();
  const newCCs = [];

  for (let i = 0; i < cc.length; i++) {
    if (cc[i][1].trim().toLowerCase().includes("class")) {
      const _classes = cc[i].slice(2);
      const _ccs = cc[i + 1].slice(2);

      for (let j = 0; j < _classes.length; j++) {
        const class_ = _classes[j];
        const ccEmail = _ccs[j];

        if (!class_ || class_ === "") continue;
        if (!ccEmail || ccEmail === "") continue;

        assert(
          classes.find((c) => c.class === class_),
          `ERROR 404: Class ${class_} not found.`
        );

        newCCs.push({
          class: class_,
          cc: ccEmail,
        });
      }

      i++;
    }
  }

  await Classes.bulkWrite(
    newCCs.map((c) => ({
      updateOne: {
        filter: { class: c.class },
        update: { coordinator: c.cc },
      },
    }))
  );
};

const uploadMentorsData = async (mentors) => {
  mentors = trimNestedArray(mentors);

  const batches = await Batch.find();
  const newMentors = [];

  for (let i = 0; i < mentors.length; i++) {
    if (mentors[i][2].trim().toLowerCase().includes("batch")) {
      const _batches = mentors[i].slice(3);
      const _mentors = mentors[i + 1].slice(3);

      for (let j = 0; j < _batches.length; j++) {
        const batch = _batches[j];
        const mentorEmail = _mentors[j];

        if (!batch || batch === "") continue;
        if (!mentorEmail || mentorEmail === "") continue;

        assert(
          batches.find((b) => b.batch === batch),
          `ERROR 404: Batch ${batch} not found.`
        );

        newMentors.push({
          batch,
          mentor: mentorEmail,
        });
      }

      i++;
    }
  }

  await Batch.bulkWrite(
    newMentors.map((m) => ({
      updateOne: {
        filter: { batch: m.batch },
        update: { mentor: m.mentor },
      },
    }))
  );
};

const uploadTESeminarsData = async (teSeminars) => {
  teSeminars = trimNestedArray(teSeminars);

  const studentRecords = await StudentRecord.find().select("-_id -__v");
  const newTeSeminars = [];

  for (let i = 0; i < teSeminars.length; i++) {
    const teacherEmail = teSeminars[i][0];
    const rollNos = teSeminars[i].slice(1);

    for (let j = 0; j < rollNos.length; j++) {
      const rollNo = rollNos[j];

      if (rollNo === "") continue;
      assert(
        studentRecords.find((s) => s.rollNo === rollNo),
        `ERROR 404: Roll No ${rollNo} not found.`
      );

      // Check if rollNo is of 3rd year.
      assert(
        checkStudentsWithYear(rollNo, 3),
        `ERROR 403: Roll No ${rollNo} is not of 3rd year.`
      );

      newTeSeminars.push({
        rollNo,
        teacherEmail,
      });
    }
  }

  await StudentRecord.bulkWrite(
    newTeSeminars.map((s) => ({
      updateOne: {
        filter: { rollNo: s.rollNo },
        update: { $set: { "extra.te_seminar": s.teacherEmail } },
      },
    }))
  );
};

const uploadBEProjectsData = async (beProjects) => {
  beProjects = trimNestedArray(beProjects);

  const studentRecords = await StudentRecord.find().select("-_id -__v");
  const newBEProjects = [];

  for (let i = 0; i < beProjects.length; i++) {
    const teacherEmail = beProjects[i][0];
    const rollNos = beProjects[i].slice(1);

    for (let j = 0; j < rollNos.length; j++) {
      const rollNo = rollNos[j];

      if (rollNo === "") continue;
      assert(
        studentRecords.find((s) => s.rollNo === rollNo),
        `ERROR 404: Roll No ${rollNo} not found.`
      );

      // Check if rollNo is of 4th year.
      assert(
        checkStudentsWithYear(rollNo, 4),
        `ERROR 403: Roll No ${rollNo} is not of 4th year.`
      );

      newBEProjects.push({
        rollNo,
        teacherEmail,
      });
    }
  }

  await StudentRecord.bulkWrite(
    newBEProjects.map((s) => ({
      updateOne: {
        filter: { rollNo: s.rollNo },
        update: { $set: { "extra.be_project": s.teacherEmail } },
      },
    }))
  );
};

const uploadHonorsData = async (honors) => {
  honors = trimNestedArray(honors);

  const studentRecords = await StudentRecord.find().select("-_id -__v");
  const newHonors = [];

  for (let i = 0; i < honors.length; i++) {
    const teacherEmail = honors[i][0];
    const rollNos = honors[i].slice(1);

    for (let j = 0; j < rollNos.length; j++) {
      const rollNo = rollNos[j];

      if (rollNo === "") continue;
      assert(
        studentRecords.find((s) => s.rollNo === rollNo),
        `ERROR 404: Roll No ${rollNo} not found.`
      );

      newHonors.push({
        rollNo,
        teacherEmail,
      });
    }
  }

  await StudentRecord.bulkWrite(
    newHonors.map((s) => ({
      updateOne: {
        filter: { rollNo: s.rollNo },
        update: { $set: { "extra.honor": s.teacherEmail } },
      },
    }))
  );
};

module.exports = {
  uploadClassesData,
  uploadStudentsData,
  uploadCurriculumData,
  uploadAttendanceData,
  uploadAssignmentsData,
  uploadUTMarksData,
  uploadCCData,
  uploadMentorsData,
  uploadTESeminarsData,
  uploadBEProjectsData,
  uploadHonorsData,
};
