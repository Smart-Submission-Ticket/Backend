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
} = require("../google_apis/sheets_helpers");
const {
  updateSpreadSheet,
  updateSpreadSheetValues,
  updateSpreadSheetValuesBatch,
  getSpreadSheet,
} = require("../google_apis/sheets_services");
const { deleteSheet } = require("../google_apis/sheets_helpers");

/*
Will return an object with all the data required to
generate the master UT sheet for a particular class
The data will be in the following format:
{
  class_: "TE 09",
  academicYear: "2020-21",
  semester: "I",
  rollNos: ["33167", "33168", ...],
  names: ["Name1", "Name2", ...],
  subjects: [
    {
      title: "Subject1",
      teacher: "ABC",
    },
    ...
  ],
  unitTests: {
    "33167": {
      "Subject1": {
        ut1: "10",
        ut1Absent: false,
        ut2: "20",
        ut2Absent: false,
      },
      ...
    },
    ...
  },
}
*/
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

/*
Will process the data and generate as 
it should be entered in the master UT sheet
*/
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

  data.subjects.forEach((subject) => {
    subjects.push(`${subject.title}\n(${subject.teacher})`);
    const ut1Marks = [];
    const ut2Marks = [];
    sortedRollNos.forEach((rollNo) => {
      if (data.unitTests[rollNo][subject.title]) {
        if (data.unitTests[rollNo][subject.title].ut1Absent) {
          ut1Marks.push("A");
        } else {
          ut1Marks.push(data.unitTests[rollNo][subject.title].ut1);
        }

        if (data.unitTests[rollNo][subject.title].ut2Absent) {
          ut2Marks.push("A");
        } else {
          ut2Marks.push(data.unitTests[rollNo][subject.title].ut2);
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

  return { rollNosNamesAndUt1Marks, rollNosNamesAndUt2Marks };
};

const createHeader = async (spreadsheetId, sheetId, sheetName, data, width) => {
  const requests = [
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

const createSubjectHeader = async (
  spreadsheetId,
  sheetId,
  sheetName,
  data,
  width
) => {
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

const createSubjectMarks = async (
  spreadsheetId,
  sheetId,
  sheetName,
  rollNosNamesAndUt1Marks,
  rollNosNamesAndUt2Marks,
  minUTMarksRequired
) => {
  const width = rollNosNamesAndUt1Marks.length - 1;

  const values = [];
  // Transform column-wise data to row-wise data
  for (let i = 0; i < rollNosNamesAndUt1Marks[0].length; i++) {
    const row = [];
    for (let j = 0; j < rollNosNamesAndUt1Marks.length - 1; j++) {
      row.push(rollNosNamesAndUt1Marks[j][i]);
    }
    for (let j = 0; j < rollNosNamesAndUt2Marks.length; j++) {
      row.push(rollNosNamesAndUt2Marks[j][i]);
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
      rollNosNamesAndUt1Marks[0].length + 7,
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
              endRowIndex: rollNosNamesAndUt1Marks[0].length + 7,
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
              endRowIndex: rollNosNamesAndUt1Marks[0].length + 7,
              startColumnIndex: 2,
              endColumnIndex: width - 1,
            },
          ],
          booleanRule: {
            condition: {
              type: "NUMBER_LESS",
              values: [{ userEnteredValue: minUTMarksRequired.toString() }],
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
              endRowIndex: rollNosNamesAndUt1Marks[0].length + 7,
              startColumnIndex: width + 2,
              endColumnIndex: width * 2 - 1,
            },
          ],
          booleanRule: {
            condition: {
              type: "NUMBER_LESS",
              values: [{ userEnteredValue: minUTMarksRequired.toString() }],
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
      rollNosNamesAndUt1Marks[0].length + 7,
      width - 1,
      width,
      {
        textFormat: textFormatRequest({ bold: true }),
      }
    ),

    repeatCellRequest(
      sheetId,
      7,
      rollNosNamesAndUt1Marks[0].length + 7,
      width * 2 - 1,
      width * 2 + 2,
      {
        textFormat: textFormatRequest({ bold: true }),
      }
    ),

    // Make name column width 200
    updateDimensionsRequest(sheetId, 1, 2, 350),
    updateDimensionsRequest(sheetId, width + 1, width + 2, 350),

    // Make text alignment to left for name column
    {
      repeatCell: {
        range: {
          sheetId,
          startRowIndex: 7,
          endRowIndex: rollNosNamesAndUt1Marks[0].length + 7,
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
          endRowIndex: rollNosNamesAndUt1Marks[0].length + 7,
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

const generateMasterUtSheet = async (year, spreadsheetId) => {
  const classes = await Classes.find({ year }).sort("class");

  for (const class_ of classes) {
    // TODO: Remove this condition
    if (class_.class !== "TE09") {
      continue;
    }

    const data = await gatherData(year, class_.class);
    const { rollNosNamesAndUt1Marks, rollNosNamesAndUt2Marks } =
      processData(data);

    const sheet = await getSpreadSheet(spreadsheetId);

    const sheetTitle = `${data.class_} SEM-${data.semester} ${data.academicYear}`;
    const sheetExists = sheet.data.sheets.find(
      (sheet) => sheet.properties.title === sheetTitle
    );
    if (!sheetExists) {
      addSheet(
        spreadsheetId,
        `${data.class_} SEM-${data.semester} ${data.academicYear}`
      );
    }

    const newSheet = await getSpreadSheet(spreadsheetId);
    const newSheetForTitle = newSheet.data.sheets.find(
      (sheet) => sheet.properties.title === sheetTitle
    );

    const titleSheetId = newSheetForTitle.properties.sheetId;

    await createHeader(
      spreadsheetId,
      titleSheetId,
      sheetTitle,
      data,
      rollNosNamesAndUt1Marks.length - 1
    );

    await createSubjectHeader(
      spreadsheetId,
      titleSheetId,
      sheetTitle,
      data,
      rollNosNamesAndUt1Marks.length - 1
    );

    await createSubjectMarks(
      spreadsheetId,
      titleSheetId,
      sheetTitle,
      rollNosNamesAndUt1Marks,
      rollNosNamesAndUt2Marks,
      data.minUTMarksRequired
    );

    await makeTimesNewRomanAsDefaultFont(spreadsheetId, titleSheetId);
    // await adjustCellsSpacing(spreadsheetId);
  }

  const sheet = await getSpreadSheet(spreadsheetId);
  const sheet1 = sheet.data.sheets.find(
    (sheet) => sheet.properties.title === "Sheet1"
  );
  if (sheet1) {
    deleteSheet(spreadsheetId, sheet1.properties.sheetId);
  }
};

module.exports = {
  generateMasterUtSheet,
};
