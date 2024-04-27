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

  const [classes, batchDocs, studentsRecords] = await Promise.all([
    Classes.find(),
    Batch.find(),
    StudentRecord.find(),
  ]);
  const newStudents = [];
  const newStudentsRecords = [];

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

      if (!studentsRecords.find((s) => s.rollNo === rollNo)) {
        newStudentsRecords.push(rollNo);
      }
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
    StudentRecord.insertMany(newStudentsRecords.map((s) => ({ rollNo: s }))),
  ]);
};

const uploadCurriculumData = async (curriculum) => {
  curriculum.theory = trimNestedArray(curriculum.theory);
  curriculum.practical = trimNestedArray(curriculum.practical);

  const [theory, practical] = [curriculum.theory, curriculum.practical];

  const [classes, studentDatas, batchDocs, teachers] = await Promise.all([
    Classes.find(),
    StudentData.find(),
    Batch.find(),
    Teacher.find(),
  ]);

  const teacherEmails = teachers.map((t) => t.email);
  const newTeachers = [];

  const theorySubjects = {};

  let classes_ = [];
  let elective = "";

  for (let i = 0; i < theory.length; i++) {
    // Update year and classes
    if (theory[i][0] !== "") {
      classes_ = theory[i].slice(3);
      elective = "";
      continue;
    }

    // Update elective
    if (theory[i][1] !== "" && theory[i][2] !== "") {
      elective = theory[i][1];
    }

    // Update theory subjects
    for (let j = 3; j < theory[i].length; j++) {
      const subject = elective ? theory[i][2] : theory[i][1];
      if (subject === "") continue;

      const class_ = classes.find((c) => c.class === classes_[j - 3]);
      if (!class_) continue;

      class_.batches.forEach((batch) => {
        if (theorySubjects[batch] === undefined) {
          theorySubjects[batch] = [];
        }

        const teacher = theory[i][j];
        if (teacher === "") return;

        theorySubjects[batch].push({
          title: subject,
          ...(elective && { elective }),
          teacher,
        });

        if (!teacherEmails.includes(teacher)) {
          newTeachers.push({
            email: teacher,
          });
        }
      });
    }
  }

  const practicalSubjects = {};

  elective = "";
  let batches_ = [];

  for (let i = 0; i < practical.length; i++) {
    // Update year and elective
    if (practical[i][0] !== "") {
      elective = "";
      batches_ = practical[i].slice(2);
      continue;
    }

    // Update elective
    if (practical[i][1] !== "" && practical[i][2] !== "") {
      elective = practical[i][1];
    }

    // Update practical subjects
    for (let j = 4; j < practical[i].length; j++) {
      const subject = elective ? practical[i][2] : practical[i][1];
      if (subject === "") continue;

      const batch = batches_[j - 2];
      if (!classes.find((c) => c.batches.includes(batch))) continue;

      if (practicalSubjects[batch] === undefined) {
        practicalSubjects[batch] = [];
      }

      const teacher = practical[i][j];
      if (teacher === "") continue;

      practicalSubjects[batch].push({
        title: subject,
        noOfAssignments: practical[i][3],
        teacher,
      });

      if (!teacherEmails.includes(teacher)) {
        newTeachers.push({
          email: teacher,
        });
      }
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

  Teacher.removeDuplicates();
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
      user.role === "admin" ||
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
      user.role === "admin" ||
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

  const [classes, teachers] = await Promise.all([
    Classes.find(),
    Teacher.find(),
  ]);
  const newCCs = [];
  const newTeachers = [];

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

        if (!teachers.find((t) => t.email === ccEmail)) {
          newTeachers.push({
            email: ccEmail,
          });
        }
      }

      i++;
    }
  }

  await Promise.all([
    Classes.bulkWrite(
      newCCs.map((c) => ({
        updateOne: {
          filter: { class: c.class },
          update: { coordinator: c.cc },
        },
      }))
    ),
    Teacher.insertMany(newTeachers),
  ]);

  Teacher.removeDuplicates();
};

const uploadMentorsData = async (mentors) => {
  mentors = trimNestedArray(mentors);

  const [studentRecords, teachers] = await Promise.all([
    StudentRecord.find().select("-_id -__v"),
    Teacher.find(),
  ]);
  const newMentors = [];
  const brandNewMentors = [];
  const newTeachers = [];

  for (let i = 0; i < mentors.length; i++) {
    const teacherEmail = mentors[i][0];
    const rollNos = mentors[i].slice(1);

    for (let j = 0; j < rollNos.length; j++) {
      const rollNo = rollNos[j];

      if (rollNo === "") continue;

      if (studentRecords.find((s) => s.rollNo === rollNo)) {
        newMentors.push({
          rollNo,
          teacherEmail,
        });
      } else {
        brandNewMentors.push({
          rollNo,
          teacherEmail,
        });
      }

      if (!teachers.find((t) => t.email === teacherEmail)) {
        newTeachers.push({
          email: teacherEmail,
        });
      }
    }
  }

  await Promise.all([
    StudentRecord.bulkWrite(
      newMentors.map((s) => ({
        updateOne: {
          filter: { rollNo: s.rollNo },
          update: { $set: { "extra.mentor": s.teacherEmail } },
        },
      }))
    ),
    StudentRecord.insertMany(
      brandNewMentors.map((s) => ({
        rollNo: s.rollNo,
        "extra.mentor": s.teacherEmail,
      }))
    ),
    Teacher.insertMany(newTeachers),
  ]);

  Teacher.removeDuplicates();
};

const uploadTESeminarsData = async (teSeminars) => {
  teSeminars = trimNestedArray(teSeminars);

  const [studentRecords, teachers] = await Promise.all([
    StudentRecord.find().select("-_id -__v"),
    Teacher.find(),
  ]);
  const newTeSeminars = [];
  const brandNewTeSeminars = [];
  const newTeachers = [];

  for (let i = 0; i < teSeminars.length; i++) {
    const teacherEmail = teSeminars[i][0];
    const rollNos = teSeminars[i].slice(1);

    for (let j = 0; j < rollNos.length; j++) {
      const rollNo = rollNos[j];

      if (rollNo === "") continue;

      // Check if rollNo is of 3rd year.
      assert(
        checkStudentsWithYear(rollNo, 3),
        `ERROR 403: Roll No ${rollNo} is not of 3rd year.`
      );

      if (studentRecords.find((s) => s.rollNo === rollNo)) {
        newTeSeminars.push({
          rollNo,
          teacherEmail,
        });
      } else {
        brandNewTeSeminars.push({
          rollNo,
          teacherEmail,
        });
      }

      if (!teachers.find((t) => t.email === teacherEmail)) {
        newTeachers.push({
          email: teacherEmail,
        });
      }
    }
  }

  await Promise.all([
    StudentRecord.bulkWrite(
      newTeSeminars.map((s) => ({
        updateOne: {
          filter: { rollNo: s.rollNo },
          update: { $set: { "extra.te_seminar": s.teacherEmail } },
        },
      }))
    ),
    StudentRecord.insertMany(
      brandNewTeSeminars.map((s) => ({
        rollNo: s.rollNo,
        "extra.te_seminar": s.teacherEmail,
      }))
    ),
    Teacher.insertMany(newTeachers),
  ]);

  Teacher.removeDuplicates();
};

const uploadBEProjectsData = async (beProjects) => {
  beProjects = trimNestedArray(beProjects);

  const [studentRecords, teachers] = await Promise.all([
    StudentRecord.find().select("-_id -__v"),
    Teacher.find(),
  ]);
  const newBEProjects = [];
  const brandNewBEProjects = [];
  const newTeachers = [];

  for (let i = 0; i < beProjects.length; i++) {
    const teacherEmail = beProjects[i][0];
    const rollNos = beProjects[i].slice(1);

    for (let j = 0; j < rollNos.length; j++) {
      const rollNo = rollNos[j];

      if (rollNo === "") continue;

      // Check if rollNo is of 4th year.
      assert(
        checkStudentsWithYear(rollNo, 4),
        `ERROR 403: Roll No ${rollNo} is not of 4th year.`
      );

      if (studentRecords.find((s) => s.rollNo === rollNo)) {
        newBEProjects.push({
          rollNo,
          teacherEmail,
        });
      } else {
        brandNewBEProjects.push({
          rollNo,
          teacherEmail,
        });
      }

      if (!teachers.find((t) => t.email === teacherEmail)) {
        newTeachers.push({
          email: teacherEmail,
        });
      }
    }
  }

  await Promise.all([
    StudentRecord.bulkWrite(
      newBEProjects.map((s) => ({
        updateOne: {
          filter: { rollNo: s.rollNo },
          update: { $set: { "extra.be_project": s.teacherEmail } },
        },
      }))
    ),
    StudentRecord.insertMany(
      brandNewBEProjects.map((s) => ({
        rollNo: s.rollNo,
        "extra.be_project": s.teacherEmail,
      }))
    ),
    Teacher.insertMany(newTeachers),
  ]);

  Teacher.removeDuplicates();
};

const uploadHonorsData = async (honors) => {
  honors = trimNestedArray(honors);

  const [studentRecords, teachers] = await Promise.all([
    StudentRecord.find().select("-_id -__v"),
    Teacher.find(),
  ]);

  const newHonors = [];
  const brandNewHonors = [];
  const newTeachers = [];

  for (let i = 0; i < honors.length; i++) {
    const teacherEmail = honors[i][0];
    const rollNos = honors[i].slice(1);

    for (let j = 0; j < rollNos.length; j++) {
      const rollNo = rollNos[j];

      if (rollNo === "") continue;

      if (studentRecords.find((s) => s.rollNo === rollNo)) {
        newHonors.push({
          rollNo,
          teacherEmail,
        });
      } else {
        brandNewHonors.push({
          rollNo,
          teacherEmail,
        });
      }

      if (!teachers.find((t) => t.email === teacherEmail)) {
        newTeachers.push({
          email: teacherEmail,
        });
      }
    }
  }

  await Promise.all([
    StudentRecord.bulkWrite(
      newHonors.map((s) => ({
        updateOne: {
          filter: { rollNo: s.rollNo },
          update: { $set: { "extra.honor": s.teacherEmail } },
        },
      }))
    ),
    StudentRecord.insertMany(
      brandNewHonors.map((s) => ({
        rollNo: s.rollNo,
        "extra.honor": s.teacherEmail,
      }))
    ),
    Teacher.insertMany(newTeachers),
  ]);

  Teacher.removeDuplicates();
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
