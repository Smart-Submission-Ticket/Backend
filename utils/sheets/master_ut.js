const { Classes } = require("../../models/classes");
const { Batch } = require("../../models/batch");
const { StudentData } = require("../../models/student_data");
const { StudentRecord } = require("../../models/student_record");
const { TicketData } = require("../../models/ticket_data");
const {
  addSheet,
  convertRowColToA1Notation,
  makeTimesNewRomanAsDefaultFont,
  adjustCellsSpacing,
  mergeCellsRequest,
  repeatCellRequest,
  textFormatRequest,
  bordersRequest,
  updateDimensionsRequest,
  updateBordersRequest,
} = require("../google_apis/sheets_helpers");
const {
  updateSpreadSheet,
  updateSpreadSheetValues,
  updateSpreadSheetValuesBatch,
  getSpreadSheet,
} = require("../google_apis/sheets_services");
const { deleteSheet } = require("../google_apis/sheets_helpers");
const { isValidUTMarks } = require("../valid_records");

const gatherData = async (year, class_) => {
  const data = {};

  const [batches, studentData, ticket] = await Promise.all([
    Batch.find({ year, class: class_ }),
    StudentData.find({ year, class: class_ }),
    TicketData.getTicketData(),
  ]);

  const rollNos = studentData.map((student) => student.rollNo);
  const names = studentData.map((student) => student.name || "");

  const studentRecords = await StudentRecord.find({ rollNo: { $in: rollNos } });

  data.class_ = class_.slice(0, 2) + " " + class_.slice(2);
  data.academicYear = ticket.academicYear;
  data.semester = ticket.semester;
  data.rollNos = rollNos;
  data.names = names;
  data.subjects = batches[0].theory.map((subject) => {
    return {
      title: subject.title,
      ...(subject.elective && { elective: subject.elective }),
      teacher: subject.teacher.slice(0, 3).toUpperCase(),
    };
  });

  const unitTests = {};

  studentRecords.forEach((studentRecord) => {
    const rollNo = studentRecord.rollNo;
    if (!unitTests[rollNo]) {
      unitTests[rollNo] = {};
    }

    if (studentRecord.unitTests) {
      for (const [key, value] of studentRecord.unitTests) {
        if (!unitTests[rollNo][key]) {
          unitTests[rollNo][key] = {};
        }

        if (value.ut1 !== undefined) {
          unitTests[rollNo][key].ut1 = value.ut1;
          unitTests[rollNo][key].ut1Absent = value.ut1Absent;
        } else {
          unitTests[rollNo][key].ut1 = "";
        }

        if (value.ut2 !== undefined) {
          unitTests[rollNo][key].ut2 = value.ut2;
          unitTests[rollNo][key].ut2Absent = value.ut2Absent;
        } else {
          unitTests[rollNo][key].ut2 = "";
        }
      }
    } else {
      data.unitTests[rollNo] = {};
    }
  });

  data.unitTests = unitTests;
  data.minUTMarksRequired = ticket.minUTMarksRequired;

  return data;
};

const processData = (data) => {
  const rollNosNamesAndUt1Marks = [];
  const rollNosNamesAndUt2Marks = [];

  const rollNoToName = {};
  data.rollNos.forEach((rollNo, index) => {
    rollNoToName[rollNo] = data.names[index].toUpperCase();
  });

  const sortedRollNos = data.rollNos.sort((a, b) => parseInt(a) - parseInt(b));

  rollNosNamesAndUt1Marks.push(sortedRollNos);
  rollNosNamesAndUt2Marks.push(sortedRollNos);

  const names = Array(sortedRollNos.length).fill("");
  names.forEach((_, index) => {
    names[index] = rollNoToName[sortedRollNos[index]];
  });
  rollNosNamesAndUt1Marks.push(names);
  rollNosNamesAndUt2Marks.push(names);

  const subjects = [];

  // Sum of marks of each subject
  const totalUt1Marks = Array(sortedRollNos.length).fill(0);
  const totalUt2Marks = Array(sortedRollNos.length).fill(0);
  const totalMarks = Array(sortedRollNos.length).fill(0);

  const stats = {
    ut1: {
      absent: {},
      appeared: {},
      passed: {},
      failed: {},
      total: {},
      average: {},
    },
    ut2: {
      absent: {},
      appeared: {},
      passed: {},
      failed: {},
      total: {},
      average: {},
    },
    totalUt1Average: 0,
    totalUt2Average: 0,
    ut1Ranges: {
      _0: {},
      _0_11: {},
      _12_17: {},
      _18_22: {},
      _23_30: {},
    },
    ut2Ranges: {
      _0: {},
      _0_11: {},
      _12_17: {},
      _18_22: {},
      _23_30: {},
    },
  };

  data.subjects.forEach((subject) => {
    subjects.push(`${subject.title}\n(${subject.teacher})`);
    const ut1Marks = [];
    const ut2Marks = [];

    if (!stats.ut1.absent[subject.title]) {
      stats.ut1.absent[subject.title] = 0;
      stats.ut1.appeared[subject.title] = 0;
      stats.ut1.passed[subject.title] = 0;
      stats.ut1.failed[subject.title] = 0;
      stats.ut1.total[subject.title] = 0;
      stats.ut1.average[subject.title] = 0;

      stats.ut1Ranges._0[subject.title] = 0;
      stats.ut1Ranges._0_11[subject.title] = 0;
      stats.ut1Ranges._12_17[subject.title] = 0;
      stats.ut1Ranges._18_22[subject.title] = 0;
      stats.ut1Ranges._23_30[subject.title] = 0;
    }

    if (!stats.ut2.absent[subject.title]) {
      stats.ut2.absent[subject.title] = 0;
      stats.ut2.appeared[subject.title] = 0;
      stats.ut2.passed[subject.title] = 0;
      stats.ut2.failed[subject.title] = 0;
      stats.ut2.total[subject.title] = 0;
      stats.ut2.average[subject.title] = 0;

      stats.ut2Ranges._0[subject.title] = 0;
      stats.ut2Ranges._0_11[subject.title] = 0;
      stats.ut2Ranges._12_17[subject.title] = 0;
      stats.ut2Ranges._18_22[subject.title] = 0;
      stats.ut2Ranges._23_30[subject.title] = 0;
    }

    sortedRollNos.forEach((rollNo) => {
      if (data.unitTests[rollNo][subject.title]) {
        if (data.unitTests[rollNo][subject.title].ut1Absent) {
          ut1Marks.push("A");
          stats.ut1.absent[subject.title] += 1;
        } else {
          ut1Marks.push(data.unitTests[rollNo][subject.title].ut1);
          stats.ut1.appeared[subject.title] += 1;

          if (isValidUTMarks(data.unitTests[rollNo][subject.title].ut1)) {
            stats.ut1.passed[subject.title] += 1;
          } else {
            stats.ut1.failed[subject.title] += 1;
          }

          if (data.unitTests[rollNo][subject.title].ut1 === 0) {
            stats.ut1Ranges._0[subject.title] += 1;
          } else if (data.unitTests[rollNo][subject.title].ut1 <= 11) {
            stats.ut1Ranges._0_11[subject.title] += 1;
          } else if (data.unitTests[rollNo][subject.title].ut1 <= 17) {
            stats.ut1Ranges._12_17[subject.title] += 1;
          } else if (data.unitTests[rollNo][subject.title].ut1 <= 22) {
            stats.ut1Ranges._18_22[subject.title] += 1;
          } else {
            stats.ut1Ranges._23_30[subject.title] += 1;
          }
        }

        if (data.unitTests[rollNo][subject.title].ut2Absent) {
          ut2Marks.push("A");
          stats.ut2.absent[subject.title] += 1;
        } else {
          ut2Marks.push(data.unitTests[rollNo][subject.title].ut2);
          stats.ut2.appeared[subject.title] += 1;

          if (isValidUTMarks(data.unitTests[rollNo][subject.title].ut2)) {
            stats.ut2.passed[subject.title] += 1;
          } else {
            stats.ut2.failed[subject.title] += 1;
          }

          if (data.unitTests[rollNo][subject.title].ut2 === 0) {
            stats.ut2Ranges._0[subject.title] += 1;
          } else if (data.unitTests[rollNo][subject.title].ut2 <= 11) {
            stats.ut2Ranges._0_11[subject.title] += 1;
          } else if (data.unitTests[rollNo][subject.title].ut2 <= 17) {
            stats.ut2Ranges._12_17[subject.title] += 1;
          } else if (data.unitTests[rollNo][subject.title].ut2 <= 22) {
            stats.ut2Ranges._18_22[subject.title] += 1;
          } else {
            stats.ut2Ranges._23_30[subject.title] += 1;
          }
        }

        totalUt1Marks[sortedRollNos.indexOf(rollNo)] +=
          data.unitTests[rollNo][subject.title].ut1 || 0;
        totalUt2Marks[sortedRollNos.indexOf(rollNo)] +=
          data.unitTests[rollNo][subject.title].ut2 || 0;

        totalMarks[sortedRollNos.indexOf(rollNo)] +=
          (data.unitTests[rollNo][subject.title].ut1 || 0) +
          (data.unitTests[rollNo][subject.title].ut2 || 0);
      } else {
        ut1Marks.push("");
        ut2Marks.push("");
      }
    });
    rollNosNamesAndUt1Marks.push(ut1Marks);
    rollNosNamesAndUt2Marks.push(ut2Marks);
  });

  rollNosNamesAndUt1Marks.push(totalUt1Marks);
  rollNosNamesAndUt2Marks.push(totalUt2Marks);
  rollNosNamesAndUt2Marks.push(totalMarks);

  rollNosNamesAndUt1Marks.push(subjects);

  // Calculate termwork
  const totalTermwork = totalMarks.map((total) => {
    return Math.round((20 * total) / 300);
  });

  rollNosNamesAndUt2Marks.push(totalTermwork);

  // Calculate stats
  for (const subject in stats.ut1.total) {
    // total = appeared + absent
    stats.ut1.total[subject] =
      stats.ut1.appeared[subject] + stats.ut1.absent[subject];

    // average = passed / appeared * 100
    stats.ut1.average[subject] = parseFloat(
      ((stats.ut1.passed[subject] / stats.ut1.appeared[subject]) * 100).toFixed(
        2
      )
    );

    // total = appeared + absent
    stats.ut2.total[subject] =
      stats.ut2.appeared[subject] + stats.ut2.absent[subject];

    // average = passed / appeared * 100
    stats.ut2.average[subject] = parseFloat(
      ((stats.ut2.passed[subject] / stats.ut2.appeared[subject]) * 100).toFixed(
        2
      )
    );
  }

  // Calculate total average
  // Average of averages
  stats.totalUt1Average = parseFloat(
    (
      Object.values(stats.ut1.average).reduce((acc, curr) => acc + curr, 0) /
      Object.values(stats.ut1.average).length
    ).toFixed(2)
  );

  stats.totalUt2Average = parseFloat(
    (
      Object.values(stats.ut2.average).reduce((acc, curr) => acc + curr, 0) /
      Object.values(stats.ut2.average).length
    ).toFixed(2)
  );

  data.rollNosNamesAndUt1Marks = rollNosNamesAndUt1Marks;
  data.rollNosNamesAndUt2Marks = rollNosNamesAndUt2Marks;
  data.stats = stats;

  return data;
};

const createHeader = async (spreadsheetId, sheetId, sheetName, data) => {
  const width = data.rollNosNamesAndUt1Marks.length - 1;

  const requests = [
    // Make width of the first 200 rows 50
    updateDimensionsRequest(sheetId, 0, data.rollNos.length + 35, 30, "ROWS"),

    // Merge cells
    mergeCellsRequest(sheetId, 0, 1, 0, width), // UT1 - PICT
    mergeCellsRequest(sheetId, 0, 1, width, width * 2), // UT2 - PICT
    mergeCellsRequest(sheetId, 1, 2, 0, width), // UT1 - Department
    mergeCellsRequest(sheetId, 1, 2, width, width * 2), // UT2 - Department
    mergeCellsRequest(sheetId, 2, 3, 0, 2), // UT1 - Semester
    mergeCellsRequest(sheetId, 2, 3, width, width + 2), // UT2 - Semester
    mergeCellsRequest(sheetId, 3, 4, 0, 2), // UT1 - Unit Test 1
    mergeCellsRequest(sheetId, 3, 4, width, width + 2), // UT2 - Unit Test 2
    mergeCellsRequest(sheetId, 2, 4, 2, 5), // UT1 - Class
    mergeCellsRequest(sheetId, 2, 4, width + 2, width + 5), // UT2 - Class
    mergeCellsRequest(sheetId, 2, 4, 5, width), // UT1 - Academic Year
    mergeCellsRequest(sheetId, 2, 4, width + 5, width * 2), // UT2 - Academic Year
    mergeCellsRequest(sheetId, 4, 5, 0, width), // UT1 - UT1 Report
    mergeCellsRequest(sheetId, 4, 5, width, width * 2), // UT2 - UT2 Report
    // Designs
    // PICT and Department
    repeatCellRequest(sheetId, 0, 2, 0, width * 2, {
      textFormat: textFormatRequest({ fontSize: 12, bold: true }),
    }),
    // Semester and Unit Test
    repeatCellRequest(sheetId, 2, 4, 0, 2, {
      textFormat: textFormatRequest({ fontSize: 14, bold: true }),
    }),
    repeatCellRequest(sheetId, 2, 4, width, width + 2, {
      textFormat: textFormatRequest({ fontSize: 14, bold: true }),
    }),
    // Class
    repeatCellRequest(sheetId, 2, 4, 2, 5, {
      textFormat: textFormatRequest({
        fontSize: 36,
        bold: true,
        foregroundColor: { red: 0.0, green: 0.4, blue: 0.8 },
      }),
    }),
    repeatCellRequest(sheetId, 2, 4, width + 2, width + 5, {
      textFormat: textFormatRequest({
        fontSize: 36,
        bold: true,
        foregroundColor: { red: 0.0, green: 0.4, blue: 0.8 },
      }),
    }),
    // Academic Year
    repeatCellRequest(sheetId, 2, 4, 5, width, {
      textFormat: textFormatRequest({ fontSize: 16, bold: true }),
    }),
    repeatCellRequest(sheetId, 2, 4, width + 5, width * 2, {
      textFormat: textFormatRequest({ fontSize: 16, bold: true }),
    }),
    // UT1 and UT2 Report
    repeatCellRequest(sheetId, 4, 5, 0, width, {
      textFormat: textFormatRequest({
        fontSize: 14,
        bold: true,
        foregroundColor: { red: 0.6, green: 0.2, blue: 0.0 },
      }),
    }),
    repeatCellRequest(sheetId, 4, 5, width, width * 2, {
      textFormat: textFormatRequest({
        fontSize: 14,
        bold: true,
        foregroundColor: { red: 0.6, green: 0.2, blue: 0.0 },
      }),
    }),
    // Borders
    repeatCellRequest(sheetId, 0, 5, 0, width * 2, {
      borders: bordersRequest(1, 1, 1, 1),
    }),
  ];

  await updateSpreadSheet(spreadsheetId, requests);

  const values = [
    // UT1 - PICT
    {
      range: convertRowColToA1Notation(sheetName, 0, 0),
      values: [["PUNE INSTITUTE OF COMPUTER TECHNOLOGY, PUNE - 411043"]],
    },
    // UT2 - PICT
    {
      range: convertRowColToA1Notation(sheetName, 0, width),
      values: [["PUNE INSTITUTE OF COMPUTER TECHNOLOGY, PUNE - 411043"]],
    },
    // UT1 - Department
    {
      range: convertRowColToA1Notation(sheetName, 1, 0),
      values: [["Department of Information Technology"]],
    },
    // UT2 - Department
    {
      range: convertRowColToA1Notation(sheetName, 1, width),
      values: [["Department of Information Technology"]],
    },
    // UT1 - Semester
    {
      range: convertRowColToA1Notation(sheetName, 2, 0),
      values: [[`SEMESTER : ${data.semester}`]],
    },
    // UT2 - Semester
    {
      range: convertRowColToA1Notation(sheetName, 2, width),
      values: [[`SEMESTER : ${data.semester}`]],
    },
    // UT1 - Unit Test 1
    {
      range: convertRowColToA1Notation(sheetName, 3, 0),
      values: [["UNIT TEST : I"]],
    },
    // UT2 - Unit Test 2
    {
      range: convertRowColToA1Notation(sheetName, 3, width),
      values: [["UNIT TEST : II"]],
    },
    // UT1 - Class
    {
      range: convertRowColToA1Notation(sheetName, 2, 2),
      values: [[data.class_]],
    },
    // UT2 - Class
    {
      range: convertRowColToA1Notation(sheetName, 2, width + 2),
      values: [[data.class_]],
    },
    // UT1 - Academic Year
    {
      range: convertRowColToA1Notation(sheetName, 2, 5),
      values: [[`Academic Year : ${data.academicYear}`]],
    },
    // UT2 - Academic Year
    {
      range: convertRowColToA1Notation(sheetName, 2, width + 5),
      values: [[`Academic Year : ${data.academicYear}`]],
    },
    // UT1 - UT1 Report
    {
      range: convertRowColToA1Notation(sheetName, 4, 0),
      values: [["UNIT TEST I REPORT "]],
    },
    // UT2 - UT2 Report
    {
      range: convertRowColToA1Notation(sheetName, 4, width),
      values: [["UNIT TEST II REPORT "]],
    },
  ];

  await updateSpreadSheetValuesBatch(spreadsheetId, values);
};

const createSubjectHeader = async (spreadsheetId, sheetId, sheetName, data) => {
  const width = data.rollNosNamesAndUt1Marks.length - 1;

  const requests = [
    // Merge cells
    // UT1
    mergeCellsRequest(sheetId, 5, 7, 0, 1), // Roll No
    mergeCellsRequest(sheetId, 5, 7, 1, 2), // Name
    mergeCellsRequest(sheetId, 5, 7, width - 1, width), // Total

    // UT2
    mergeCellsRequest(sheetId, 5, 7, width, width + 1), // Roll No
    mergeCellsRequest(sheetId, 5, 7, width + 1, width + 2), // Name
    mergeCellsRequest(sheetId, 5, 7, width * 2 - 1, width * 2), // Total

    // Grand Total
    mergeCellsRequest(sheetId, 5, 7, width * 2, width * 2 + 1), // Grand Total
    mergeCellsRequest(sheetId, 5, 7, width * 2 + 1, width * 2 + 2), // Termwork
  ];

  // Designs
  requests.push(
    ...[
      // Roll No, Name, Total
      repeatCellRequest(sheetId, 5, 7, 0, 2, {
        textFormat: textFormatRequest({ fontSize: 12, bold: true }),
      }),
      repeatCellRequest(sheetId, 5, 7, width - 1, width + 2, {
        textFormat: textFormatRequest({ fontSize: 12, bold: true }),
      }),
      repeatCellRequest(sheetId, 5, 7, width * 2 - 1, width * 2 + 2, {
        textFormat: textFormatRequest({ fontSize: 12, bold: true }),
      }),
    ]
  );

  // Borders
  requests.push(
    repeatCellRequest(sheetId, 5, 7, 0, width * 2 + 2, {
      borders: bordersRequest(1, 1, 1, 1),
    })
  );

  // For subjects
  // For non-elective subjects, merge 2 cells
  // For elective subjects, merge upper cells for subjects under the same elective

  const nonElectiveSubjects = data.subjects.filter(
    (subject) => !subject.elective
  );

  let startCol = 2;

  nonElectiveSubjects.forEach((_) => {
    requests.push(mergeCellsRequest(sheetId, 5, 7, startCol, startCol + 1));
    requests.push(
      mergeCellsRequest(sheetId, 5, 7, startCol + width, startCol + width + 1)
    );

    // Designs
    requests.push(
      repeatCellRequest(sheetId, 5, 7, startCol, startCol + 1, {
        textFormat: textFormatRequest({
          fontSize: 12,
          bold: true,
          foregroundColor: { red: 1.0, green: 0.0, blue: 0.0 },
        }),
      })
    );

    requests.push(
      repeatCellRequest(sheetId, 5, 7, startCol + width, startCol + width + 1, {
        textFormat: textFormatRequest({
          fontSize: 12,
          bold: true,
          foregroundColor: { red: 1.0, green: 0.0, blue: 0.0 },
        }),
      })
    );

    startCol += 1;
  });

  const electiveToSubjects = {};
  data.subjects.forEach((subject) => {
    if (subject.elective) {
      if (!electiveToSubjects[subject.elective]) {
        electiveToSubjects[subject.elective] = [];
      }
      electiveToSubjects[subject.elective].push(
        `${subject.title}\n(${subject.teacher})`
      );
    }
  });

  for (const elective in electiveToSubjects) {
    const subjects = electiveToSubjects[elective];
    // Merge the upper cells
    requests.push(
      mergeCellsRequest(sheetId, 5, 6, startCol, startCol + subjects.length)
    );
    requests.push(
      mergeCellsRequest(
        sheetId,
        5,
        6,
        startCol + width,
        startCol + width + subjects.length
      )
    );

    // Designs
    requests.push(
      repeatCellRequest(sheetId, 5, 6, startCol, startCol + subjects.length, {
        textFormat: textFormatRequest({
          fontSize: 10,
          bold: true,
        }),
      })
    );

    requests.push(
      repeatCellRequest(
        sheetId,
        5,
        6,
        startCol + width,
        startCol + width + subjects.length,
        {
          textFormat: textFormatRequest({
            fontSize: 10,
            bold: true,
          }),
        }
      )
    );

    requests.push(
      repeatCellRequest(sheetId, 6, 7, startCol, startCol + subjects.length, {
        textFormat: textFormatRequest({
          fontSize: 12,
          bold: true,
          foregroundColor: { red: 1.0, green: 0.0, blue: 0.0 },
        }),
      })
    );

    requests.push(
      repeatCellRequest(
        sheetId,
        6,
        7,
        startCol + width,
        startCol + width + subjects.length,
        {
          textFormat: textFormatRequest({
            fontSize: 12,
            bold: true,
            foregroundColor: { red: 1.0, green: 0.0, blue: 0.0 },
          }),
        }
      )
    );

    startCol += subjects.length;
  }

  const totalMarks =
    (nonElectiveSubjects.length + Object.keys(electiveToSubjects).length) * 30;

  await updateSpreadSheet(spreadsheetId, requests);

  const values = [
    // Roll No
    {
      range: convertRowColToA1Notation(sheetName, 5, 0),
      values: [["Roll No"]],
    },
    // Name
    {
      range: convertRowColToA1Notation(sheetName, 5, 1),
      values: [["Name of Student"]],
    },
    // Total
    {
      range: convertRowColToA1Notation(sheetName, 5, width - 1),
      values: [[`Out of ${totalMarks}`]],
    },
    // Roll No
    {
      range: convertRowColToA1Notation(sheetName, 5, width),
      values: [["Roll No"]],
    },
    // Name
    {
      range: convertRowColToA1Notation(sheetName, 5, width + 1),
      values: [["Name of Student"]],
    },
    // Total
    {
      range: convertRowColToA1Notation(sheetName, 5, width * 2 - 1),
      values: [[`Out of ${totalMarks}`]],
    },
    // Grand Total
    {
      range: convertRowColToA1Notation(sheetName, 5, width * 2),
      values: [[`Out of ${totalMarks * 2}`]],
    },
    // Termwork
    {
      range: convertRowColToA1Notation(sheetName, 5, width * 2 + 1),
      values: [["Out of 20\n(For Termwork)"]],
    },
  ];

  // For subjects
  startCol = 2;
  nonElectiveSubjects.forEach((subject) => {
    values.push({
      range: convertRowColToA1Notation(sheetName, 5, startCol),
      values: [[`${subject.title}\n(${subject.teacher})`]],
    });
    values.push({
      range: convertRowColToA1Notation(sheetName, 5, startCol + width),
      values: [[`${subject.title}\n(${subject.teacher})`]],
    });
    startCol += 1;
  });

  for (const elective in electiveToSubjects) {
    const subjects = electiveToSubjects[elective];
    values.push({
      range: convertRowColToA1Notation(sheetName, 5, startCol),
      values: [[`${elective}`]],
    });
    values.push({
      range: convertRowColToA1Notation(sheetName, 5, startCol + width),
      values: [[`${elective}`]],
    });
    values.push({
      range: convertRowColToA1Notation(sheetName, 6, startCol),
      values: [subjects],
    });
    values.push({
      range: convertRowColToA1Notation(sheetName, 6, startCol + width),
      values: [subjects],
    });
    startCol += subjects.length;
  }

  await updateSpreadSheetValuesBatch(spreadsheetId, values);
};

const createSubjectMarks = async (spreadsheetId, sheetId, sheetName, data) => {
  const width = data.rollNosNamesAndUt1Marks.length - 1;

  const values = [];
  // Transform column-wise data to row-wise data
  for (let i = 0; i < data.rollNosNamesAndUt1Marks[0].length; i++) {
    const row = [];
    for (let j = 0; j < data.rollNosNamesAndUt1Marks.length - 1; j++) {
      row.push(data.rollNosNamesAndUt1Marks[j][i]);
    }
    for (let j = 0; j < data.rollNosNamesAndUt2Marks.length; j++) {
      row.push(data.rollNosNamesAndUt2Marks[j][i]);
    }
    values.push(row);
  }

  const range = convertRowColToA1Notation(sheetName, 7, 0);
  await updateSpreadSheetValues(spreadsheetId, range, values);

  const requests = [
    // Make font size 12
    repeatCellRequest(
      sheetId,
      7,
      data.rollNosNamesAndUt1Marks[0].length + 7,
      0,
      width * 2 + 2,
      {
        textFormat: textFormatRequest({ fontSize: 12 }),
        borders: bordersRequest(1, 1, 1, 1),
      }
    ),

    // Conditional formatting
    // Make absent cells foreground color red
    {
      addConditionalFormatRule: {
        rule: {
          ranges: [
            {
              sheetId,
              startRowIndex: 7,
              endRowIndex: data.rollNosNamesAndUt1Marks[0].length + 7,
              startColumnIndex: 0,
              endColumnIndex: width * 2,
            },
          ],
          booleanRule: {
            condition: {
              type: "TEXT_EQ",
              values: [{ userEnteredValue: "A" }],
            },
            format: {
              textFormat: {
                foregroundColor: { red: 1.0, green: 0.0, blue: 0.0 },
              },
            },
          },
        },
        index: 0,
      },
    },

    // If ut marks are less than 12, make the cell yellow
    {
      addConditionalFormatRule: {
        rule: {
          ranges: [
            {
              sheetId,
              startRowIndex: 7,
              endRowIndex: data.rollNosNamesAndUt1Marks[0].length + 7,
              startColumnIndex: 2,
              endColumnIndex: width - 1,
            },
          ],
          booleanRule: {
            condition: {
              type: "NUMBER_LESS",
              values: [
                { userEnteredValue: data.minUTMarksRequired.toString() },
              ],
            },
            format: {
              backgroundColor: { red: 1.0, green: 1.0, blue: 0.0 },
            },
          },
        },
        index: 1,
      },
    },

    {
      addConditionalFormatRule: {
        rule: {
          ranges: [
            {
              sheetId,
              startRowIndex: 7,
              endRowIndex: data.rollNosNamesAndUt1Marks[0].length + 7,
              startColumnIndex: width + 2,
              endColumnIndex: width * 2 - 1,
            },
          ],
          booleanRule: {
            condition: {
              type: "NUMBER_LESS",
              values: [
                { userEnteredValue: data.minUTMarksRequired.toString() },
              ],
            },
            format: {
              backgroundColor: { red: 1.0, green: 1.0, blue: 0.0 },
            },
          },
        },
        index: 2,
      },
    },

    // Make the total cell bold
    repeatCellRequest(
      sheetId,
      7,
      data.rollNosNamesAndUt1Marks[0].length + 7,
      width - 1,
      width,
      {
        textFormat: textFormatRequest({ bold: true }),
      }
    ),

    repeatCellRequest(
      sheetId,
      7,
      data.rollNosNamesAndUt1Marks[0].length + 7,
      width * 2 - 1,
      width * 2 + 2,
      {
        textFormat: textFormatRequest({ bold: true }),
      }
    ),

    // Make name column width 200
    updateDimensionsRequest(sheetId, 1, 2, 325),
    updateDimensionsRequest(sheetId, width + 1, width + 2, 325),

    // Make text alignment to left for name column
    {
      repeatCell: {
        range: {
          sheetId,
          startRowIndex: 7,
          endRowIndex: data.rollNosNamesAndUt1Marks[0].length + 7,
          startColumnIndex: 1,
          endColumnIndex: 2,
        },
        cell: {
          userEnteredFormat: {
            horizontalAlignment: "LEFT",
            padding: {
              left: 6,
            },
          },
        },
        fields:
          "userEnteredFormat.horizontalAlignment,userEnteredFormat.padding",
      },
    },

    {
      repeatCell: {
        range: {
          sheetId,
          startRowIndex: 7,
          endRowIndex: data.rollNosNamesAndUt1Marks[0].length + 7,
          startColumnIndex: width + 1,
          endColumnIndex: width + 2,
        },
        cell: {
          userEnteredFormat: {
            horizontalAlignment: "LEFT",
            padding: {
              left: 6,
            },
          },
        },
        fields:
          "userEnteredFormat.horizontalAlignment,userEnteredFormat.padding",
      },
    },
  ];

  await updateSpreadSheet(spreadsheetId, requests);
};

const createSubjectStats = async (spreadsheetId, sheetId, sheetName, data) => {
  const width = data.rollNosNamesAndUt1Marks.length - 1;
  const height = data.rollNosNamesAndUt1Marks[0].length + 7;

  // Insert the stats at the end of the sheet in rectangular form

  const statsHeight = 7;
  const totalAverageHeight = 1;
  const noteHeight = 3;
  const rangesHeight = 8;

  const statsOffset = 2;
  const totalAverageOffset = statsOffset + statsHeight + 2;
  const noteOffset = totalAverageOffset + totalAverageHeight + 2;
  const rangesOffset = noteOffset + noteHeight + 2;

  const requests = [
    // Stats
    updateBordersRequest(
      sheetId,
      height + statsOffset,
      height + statsOffset + statsHeight,
      1,
      data.subjects.length + 2,
      2,
      2,
      2,
      2
    ),

    updateBordersRequest(
      sheetId,
      height + statsOffset,
      height + statsOffset + statsHeight,
      width + 1,
      width + data.subjects.length + 2,
      2,
      2,
      2,
      2
    ),

    // Total average
    updateBordersRequest(
      sheetId,
      height + totalAverageOffset,
      height + totalAverageOffset + totalAverageHeight,
      1,
      3,
      2,
      2,
      2,
      2
    ),
    updateBordersRequest(
      sheetId,
      height + totalAverageOffset,
      height + totalAverageOffset + totalAverageHeight,
      width + 1,
      width + 3,
      2,
      2,
      2,
      2
    ),

    // Note
    updateBordersRequest(
      sheetId,
      height + noteOffset,
      height + noteOffset + noteHeight,
      1,
      data.subjects.length + 2,
      2,
      2,
      2,
      2
    ),

    updateBordersRequest(
      sheetId,
      height + noteOffset,
      height + noteOffset + noteHeight,
      width + 1,
      width + data.subjects.length + 2,
      2,
      2,
      2,
      2
    ),

    mergeCellsRequest(
      sheetId,
      height + noteOffset,
      height + noteOffset + noteHeight,
      1,
      2
    ),
    mergeCellsRequest(
      sheetId,
      height + noteOffset,
      height + noteOffset + noteHeight,
      width + 1,
      width + 2
    ),
    mergeCellsRequest(
      sheetId,
      height + noteOffset,
      height + noteOffset + 1,
      2,
      data.subjects.length + 2
    ),
    mergeCellsRequest(
      sheetId,
      height + noteOffset,
      height + noteOffset + 1,
      width + 2,
      width + data.subjects.length + 2
    ),
    mergeCellsRequest(
      sheetId,
      height + noteOffset + 1,
      height + noteOffset + 2,
      3,
      data.subjects.length + 2
    ),
    mergeCellsRequest(
      sheetId,
      height + noteOffset + 1,
      height + noteOffset + 2,
      width + 3,
      width + data.subjects.length + 2
    ),
    mergeCellsRequest(
      sheetId,
      height + noteOffset + 2,
      height + noteOffset + noteHeight,
      3,
      data.subjects.length + 2
    ),
    mergeCellsRequest(
      sheetId,
      height + noteOffset + 2,
      height + noteOffset + noteHeight,
      width + 3,
      width + data.subjects.length + 2
    ),

    // Ranges
    updateBordersRequest(
      sheetId,
      height + rangesOffset,
      height + rangesOffset + rangesHeight,
      1,
      data.subjects.length + 2,
      2,
      2,
      2,
      2
    ),

    updateBordersRequest(
      sheetId,
      height + rangesOffset,
      height + rangesOffset + rangesHeight,
      width + 1,
      width + data.subjects.length + 2,
      2,
      2,
      2,
      2
    ),

    // Stats
    // Make the total cell font size 12
    repeatCellRequest(
      sheetId,
      height + statsOffset,
      height + statsOffset + statsHeight,
      0,
      width * 2,
      {
        textFormat: textFormatRequest({ fontSize: 12 }),
      }
    ),

    // Make subject names red and bold
    repeatCellRequest(
      sheetId,
      height + statsOffset,
      height + statsOffset + 1,
      0,
      width * 2,
      {
        textFormat: textFormatRequest({
          fontSize: 12,
          bold: true,
          foregroundColor: { red: 1.0, green: 0.0, blue: 0.0 },
        }),
      }
    ),

    // Make headers bold
    repeatCellRequest(
      sheetId,
      height + statsOffset + 1,
      height + statsOffset + statsHeight,
      1,
      2,
      {
        textFormat: textFormatRequest({ fontSize: 12, bold: true }),
      }
    ),

    repeatCellRequest(
      sheetId,
      height + statsOffset + 1,
      height + statsOffset + statsHeight,
      width + 1,
      width + 2,
      {
        textFormat: textFormatRequest({ fontSize: 12, bold: true }),
      }
    ),

    // Total average
    repeatCellRequest(
      sheetId,
      height + totalAverageOffset,
      height + totalAverageOffset + totalAverageHeight,
      0,
      width * 2,
      {
        textFormat: textFormatRequest({
          fontSize: 14,
          bold: true,
          foregroundColor: { red: 0.6, green: 0.2, blue: 0.0 },
        }),
      }
    ),

    // Note
    repeatCellRequest(
      sheetId,
      height + noteOffset,
      height + noteOffset + 1,
      1,
      2,
      {
        textFormat: textFormatRequest({
          fontSize: 14,
          bold: true,
          foregroundColor: { red: 0.6, green: 0.2, blue: 0.0 },
        }),
      }
    ),
    repeatCellRequest(
      sheetId,
      height + noteOffset,
      height + noteOffset + 1,
      width + 1,
      width + 2,
      {
        textFormat: textFormatRequest({
          fontSize: 14,
          bold: true,
          foregroundColor: { red: 0.6, green: 0.2, blue: 0.0 },
        }),
      }
    ),

    repeatCellRequest(
      sheetId,
      height + noteOffset,
      height + noteOffset + 1,
      2,
      3,
      {
        textFormat: textFormatRequest({
          fontSize: 12,
          bold: true,
          foregroundColor: { red: 0.6, green: 0.2, blue: 0.0 },
        }),
      }
    ),
    repeatCellRequest(
      sheetId,
      height + noteOffset,
      height + noteOffset + 1,
      width + 2,
      width + 3,
      {
        textFormat: textFormatRequest({
          fontSize: 12,
          bold: true,
          foregroundColor: { red: 0.6, green: 0.2, blue: 0.0 },
        }),
      }
    ),

    repeatCellRequest(
      sheetId,
      height + noteOffset + 1,
      height + noteOffset + 2,
      2,
      3,
      {
        textFormat: textFormatRequest({
          fontSize: 12,
          bold: true,
          foregroundColor: { red: 1.0, green: 0.0, blue: 0.0 },
        }),
      }
    ),

    repeatCellRequest(
      sheetId,
      height + noteOffset + 1,
      height + noteOffset + 2,
      width + 2,
      width + 3,
      {
        textFormat: textFormatRequest({
          fontSize: 12,
          bold: true,
          foregroundColor: { red: 1.0, green: 0.0, blue: 0.0 },
        }),
      }
    ),

    // Make background yellow
    {
      repeatCell: {
        range: {
          sheetId,
          startRowIndex: height + noteOffset + 2,
          endRowIndex: height + noteOffset + noteHeight,
          startColumnIndex: 2,
          endColumnIndex: 3,
        },
        cell: {
          userEnteredFormat: {
            backgroundColor: { red: 1.0, green: 1.0, blue: 0.0 },
          },
        },
        fields: "userEnteredFormat.backgroundColor",
      },
    },

    {
      repeatCell: {
        range: {
          sheetId,
          startRowIndex: height + noteOffset + 2,
          endRowIndex: height + noteOffset + noteHeight,
          startColumnIndex: width + 2,
          endColumnIndex: width + 3,
        },
        cell: {
          userEnteredFormat: {
            backgroundColor: { red: 1.0, green: 1.0, blue: 0.0 },
          },
        },
        fields: "userEnteredFormat.backgroundColor",
      },
    },

    repeatCellRequest(
      sheetId,
      height + noteOffset + 1,
      height + noteOffset + noteHeight,
      3,
      data.subjects.length + 2,
      {
        textFormat: textFormatRequest({
          fontSize: 12,
          bold: true,
        }),
      }
    ),

    repeatCellRequest(
      sheetId,
      height + noteOffset + 1,
      height + noteOffset + noteHeight,
      width + 3,
      width + data.subjects.length + 2,
      {
        textFormat: textFormatRequest({
          fontSize: 12,
          bold: true,
        }),
      }
    ),

    // Ranges
    // Make the total cell font size 12
    repeatCellRequest(
      sheetId,
      height + rangesOffset,
      height + rangesOffset + rangesHeight,
      0,
      width * 2,
      {
        textFormat: textFormatRequest({ fontSize: 12 }),
      }
    ),

    // Make subject names red and bold
    repeatCellRequest(
      sheetId,
      height + rangesOffset,
      height + rangesOffset + 1,
      2,
      data.subjects.length + 2,
      {
        textFormat: textFormatRequest({
          fontSize: 12,
          bold: true,
          foregroundColor: { red: 1.0, green: 0.0, blue: 0.0 },
        }),
      }
    ),

    repeatCellRequest(
      sheetId,
      height + rangesOffset,
      height + rangesOffset + 1,
      width + 2,
      width + data.subjects.length + 2,
      {
        textFormat: textFormatRequest({
          fontSize: 12,
          bold: true,
          foregroundColor: { red: 1.0, green: 0.0, blue: 0.0 },
        }),
      }
    ),

    // Make headers bold
    repeatCellRequest(
      sheetId,
      height + rangesOffset,
      height + rangesOffset + rangesHeight,
      1,
      2,
      {
        textFormat: textFormatRequest({ fontSize: 12, bold: true }),
      }
    ),

    repeatCellRequest(
      sheetId,
      height + rangesOffset,
      height + rangesOffset + rangesHeight,
      width + 1,
      width + 2,
      {
        textFormat: textFormatRequest({ fontSize: 12, bold: true }),
      }
    ),
  ];

  await updateSpreadSheet(spreadsheetId, requests);

  const ut1Stats = [];
  const ut2Stats = [];
  const ut1TotalAverage = [];
  const ut2TotalAverage = [];
  const ut1Ranges = [];
  const ut2Ranges = [];

  // Headers
  const statsHeader = [""];
  const rangesHeader = ["Marks obtained by Students"];

  for (const subject of data.subjects) {
    statsHeader.push(subject.title);
    rangesHeader.push(subject.title);
  }

  ut1Stats.push(statsHeader);
  ut2Stats.push(statsHeader);
  ut1Ranges.push(rangesHeader);
  ut2Ranges.push(rangesHeader);

  // Stats
  // Absent
  const ut1Absent = ["ABSENT"];
  const ut2Absent = ["ABSENT"];
  // Appeared
  const ut1Appeared = ["APPEARED"];
  const ut2Appeared = ["APPEARED"];
  // Passed
  const ut1Passed = ["PASS"];
  const ut2Passed = ["PASS"];
  // Failed
  const ut1Failed = ["FAIL"];
  const ut2Failed = ["FAIL"];
  // Total
  const ut1Total = ["TOTAL"];
  const ut2Total = ["TOTAL"];
  // Average
  const ut1Average = ["AVG"];
  const ut2Average = ["AVG"];

  // Ranges
  // Absent
  const ut1_A = ["A"];
  const ut2_A = ["A"];
  // 0
  const ut1_0 = ["0"];
  const ut2_0 = ["0"];
  // 0-11
  const ut1_0_11 = ["0-11"];
  const ut2_0_11 = ["0-11"];
  // 12-17
  const ut1_12_17 = ["12-17"];
  const ut2_12_17 = ["12-17"];
  // 18-22
  const ut1_18_22 = ["18-22"];
  const ut2_18_22 = ["18-22"];
  // 23-30
  const ut1_23_30 = ["23-30"];
  const ut2_23_30 = ["23-30"];
  // Total
  const ut1_Total = [""];
  const ut2_Total = [""];

  for (const subject of data.subjects) {
    ut1Absent.push(data.stats.ut1.absent[subject.title]);
    ut2Absent.push(data.stats.ut2.absent[subject.title]);
    ut1Appeared.push(data.stats.ut1.appeared[subject.title]);
    ut2Appeared.push(data.stats.ut2.appeared[subject.title]);
    ut1Passed.push(data.stats.ut1.passed[subject.title]);
    ut2Passed.push(data.stats.ut2.passed[subject.title]);
    ut1Failed.push(data.stats.ut1.failed[subject.title]);
    ut2Failed.push(data.stats.ut2.failed[subject.title]);
    ut1Total.push(data.stats.ut1.total[subject.title]);
    ut2Total.push(data.stats.ut2.total[subject.title]);
    ut1Average.push(data.stats.ut1.average[subject.title]);
    ut2Average.push(data.stats.ut2.average[subject.title]);

    ut1_A.push(data.stats.ut1.absent[subject.title]);
    ut2_A.push(data.stats.ut2.absent[subject.title]);
    ut1_0.push(data.stats.ut1Ranges._0[subject.title]);
    ut2_0.push(data.stats.ut2Ranges._0[subject.title]);
    ut1_0_11.push(data.stats.ut1Ranges._0_11[subject.title]);
    ut2_0_11.push(data.stats.ut2Ranges._0_11[subject.title]);
    ut1_12_17.push(data.stats.ut1Ranges._12_17[subject.title]);
    ut2_12_17.push(data.stats.ut2Ranges._12_17[subject.title]);
    ut1_18_22.push(data.stats.ut1Ranges._18_22[subject.title]);
    ut2_18_22.push(data.stats.ut2Ranges._18_22[subject.title]);
    ut1_23_30.push(data.stats.ut1Ranges._23_30[subject.title]);
    ut2_23_30.push(data.stats.ut2Ranges._23_30[subject.title]);
    ut1_Total.push(data.stats.ut1.total[subject.title]);
    ut2_Total.push(data.stats.ut2.total[subject.title]);
  }

  ut1Stats.push(
    ...[ut1Absent, ut1Appeared, ut1Passed, ut1Failed, ut1Total, ut1Average]
  );
  ut2Stats.push(
    ...[ut2Absent, ut2Appeared, ut2Passed, ut2Failed, ut2Total, ut2Average]
  );

  ut1TotalAverage.push(["TOTAL AVG", data.stats.totalUt1Average]);
  ut2TotalAverage.push(["TOTAL AVG", data.stats.totalUt2Average]);

  ut1Ranges.push(
    ...[ut1_A, ut1_0, ut1_0_11, ut1_12_17, ut1_18_22, ut1_23_30, ut1_Total]
  );

  ut2Ranges.push(
    ...[ut2_A, ut2_0, ut2_0_11, ut2_12_17, ut2_18_22, ut2_23_30, ut2_Total]
  );

  const ut1StatsRange = convertRowColToA1Notation(
    sheetName,
    height + statsOffset,
    1
  );
  const ut2StatsRange = convertRowColToA1Notation(
    sheetName,
    height + statsOffset,
    width + 1
  );
  const ut1TotalAverageRange = convertRowColToA1Notation(
    sheetName,
    height + totalAverageOffset,
    1
  );
  const ut2TotalAverageRange = convertRowColToA1Notation(
    sheetName,
    height + totalAverageOffset,
    width + 1
  );
  const ut1RangesRange = convertRowColToA1Notation(
    sheetName,
    height + rangesOffset,
    1
  );
  const ut2RangesRange = convertRowColToA1Notation(
    sheetName,
    height + rangesOffset,
    width + 1
  );

  // Note
  const values = [
    // Note
    {
      range: convertRowColToA1Notation(sheetName, height + noteOffset, 1),
      values: [["Note"]],
    },
    {
      range: convertRowColToA1Notation(
        sheetName,
        height + noteOffset,
        width + 1
      ),
      values: [["Note"]],
    },
    // Consider 12 marks for passing
    {
      range: convertRowColToA1Notation(sheetName, height + noteOffset, 2),
      values: [[`Considered ${data.minUTMarksRequired} marks for passing`]],
    },
    {
      range: convertRowColToA1Notation(
        sheetName,
        height + noteOffset,
        width + 2
      ),
      values: [[`Considered ${data.minUTMarksRequired} marks for passing`]],
    },
    // Absent Fail
    {
      range: convertRowColToA1Notation(sheetName, height + noteOffset + 1, 2),
      values: [
        ["A", "ABSENT"],
        ["", "FAIL"],
      ],
    },
    {
      range: convertRowColToA1Notation(
        sheetName,
        height + noteOffset + 1,
        width + 2
      ),
      values: [
        ["A", "ABSENT"],
        ["", "FAIL"],
      ],
    },
  ];

  await Promise.all([
    // Stats
    updateSpreadSheetValues(spreadsheetId, ut1StatsRange, ut1Stats),
    updateSpreadSheetValues(spreadsheetId, ut2StatsRange, ut2Stats),

    // Total average
    updateSpreadSheetValues(
      spreadsheetId,
      ut1TotalAverageRange,
      ut1TotalAverage
    ),
    updateSpreadSheetValues(
      spreadsheetId,
      ut2TotalAverageRange,
      ut2TotalAverage
    ),

    // Note
    updateSpreadSheetValuesBatch(spreadsheetId, values),

    // Ranges
    updateSpreadSheetValues(spreadsheetId, ut1RangesRange, ut1Ranges),
    updateSpreadSheetValues(spreadsheetId, ut2RangesRange, ut2Ranges),
  ]);
};

const drawCharts = async (spreadsheetId, sheetId, sheetName, data) => {
  // Draw charts
  // On x-axis, we have subjects
  // On y-axis, we have range of marks (A, 0, 0-11, 12-17, 18-22, 23-30)

  const width = data.rollNosNamesAndUt1Marks.length - 1;
  const height = data.rollNosNamesAndUt1Marks[0].length + 7;

  const charts = [];

  charts.push({
    title: "Unit Test I",
    domainSourceData: {
      startRowIndex: height + 19,
      endRowIndex: height + 20,
      startColumnIndex: 1,
      endColumnIndex: data.subjects.length + 2,
    },
    series: Array(6)
      .fill(0)
      .map((_, index) => {
        return {
          startRowIndex: height + index + 20,
          endRowIndex: height + index + 21,
          startColumnIndex: 1,
          endColumnIndex: data.subjects.length + 2,
        };
      }),
    position: {
      rowIndex: height + 30,
      columnIndex: 1,
    },
  });

  charts.push({
    title: "Unit Test II",
    domainSourceData: {
      startRowIndex: height + 19,
      endRowIndex: height + 20,
      startColumnIndex: width + 1,
      endColumnIndex: width + data.subjects.length + 2,
    },
    series: Array(6)
      .fill(0)
      .map((_, index) => {
        return {
          startRowIndex: height + index + 20,
          endRowIndex: height + index + 21,
          startColumnIndex: width + 1,
          endColumnIndex: width + data.subjects.length + 2,
        };
      }),
    position: {
      rowIndex: height + 30,
      columnIndex: width + 1,
    },
  });

  const requests = [];

  for (const chart of charts) {
    requests.push({
      addChart: {
        chart: {
          spec: {
            title: chart.title,
            basicChart: {
              chartType: "COLUMN",
              legendPosition: "RIGHT_LEGEND",
              domains: [
                {
                  domain: {
                    sourceRange: {
                      sources: [
                        {
                          sheetId,
                          startRowIndex: chart.domainSourceData.startRowIndex,
                          endRowIndex: chart.domainSourceData.endRowIndex,
                          startColumnIndex:
                            chart.domainSourceData.startColumnIndex,
                          endColumnIndex: chart.domainSourceData.endColumnIndex,
                        },
                      ],
                    },
                  },
                },
              ],
              series: chart.series.map((series) => {
                return {
                  series: {
                    sourceRange: {
                      sources: [
                        {
                          sheetId,
                          startRowIndex: series.startRowIndex,
                          endRowIndex: series.endRowIndex,
                          startColumnIndex: series.startColumnIndex,
                          endColumnIndex: series.endColumnIndex,
                        },
                      ],
                    },
                  },
                  targetAxis: "LEFT_AXIS",
                };
              }),
              headerCount: 1,
            },
          },
          position: {
            overlayPosition: {
              anchorCell: {
                sheetId,
                rowIndex: chart.position.rowIndex,
                columnIndex: chart.position.columnIndex,
              },
              widthPixels: 900,
              heightPixels: 600,
            },
          },
        },
      },
    });
  }

  await updateSpreadSheet(spreadsheetId, requests);
};

const finalizeSheet = async (spreadsheetId, sheetId, data) => {
  await Promise.all([
    // Make font times new roman
    makeTimesNewRomanAsDefaultFont(spreadsheetId, sheetId),

    // Adjust spacing of main sheet
    adjustCellsSpacing(
      spreadsheetId,
      sheetId,
      0,
      data.rollNos.length + 7,
      0,
      data.rollNosNamesAndUt1Marks.length + 2
    ),

    // Adjust spacing of stats sheet
    adjustCellsSpacing(
      spreadsheetId,
      sheetId,
      data.rollNos.length + 9,
      data.rollNos.length + 30,
      0,
      data.rollNosNamesAndUt1Marks.length + 2,
      7
    ),
  ]);
};

const generateMasterUtSheet = async (year, spreadsheetId) => {
  const classes = await Classes.find({ year }).sort("class");

  for (const class_ of classes) {
    let data = await gatherData(year, class_.class);

    if (!data || !data.rollNos || !data.rollNos.length) {
      continue;
    }

    data = processData(data);

    const sheet = await getSpreadSheet(spreadsheetId);

    const sheetTitle = `${data.class_} SEM-${data.semester} ${data.academicYear}`;
    const sheetExists = sheet.data.sheets.find(
      (sheet) => sheet.properties.title === sheetTitle
    );
    if (!sheetExists) {
      await addSheet(
        spreadsheetId,
        `${data.class_} SEM-${data.semester} ${data.academicYear}`
      );

      // Delete the default sheet
      const defaultSheet = sheet.data.sheets.find(
        (sheet) => sheet.properties.title === "Sheet1"
      );
      if (defaultSheet) {
        deleteSheet(spreadsheetId, defaultSheet.properties.sheetId);
      }
    }

    const newSheet = await getSpreadSheet(spreadsheetId);
    const newSheetForTitle = newSheet.data.sheets.find(
      (sheet) => sheet.properties.title === sheetTitle
    );

    const titleSheetId = newSheetForTitle.properties.sheetId;

    await Promise.all([
      createHeader(spreadsheetId, titleSheetId, sheetTitle, data),
      createSubjectHeader(spreadsheetId, titleSheetId, sheetTitle, data),
      createSubjectMarks(spreadsheetId, titleSheetId, sheetTitle, data),
      createSubjectStats(spreadsheetId, titleSheetId, sheetTitle, data),
      drawCharts(spreadsheetId, titleSheetId, sheetTitle, data),
    ]);

    await finalizeSheet(spreadsheetId, titleSheetId, data);
  }
};

module.exports = {
  generateMasterUtSheet,
};
