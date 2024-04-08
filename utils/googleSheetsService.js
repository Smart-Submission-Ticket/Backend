const { google } = require("googleapis");

const {
  GOOGLE_CLIENT_EMAIL,
  GOOGLE_PRIVATE_KEY,
  STUDENTS_SHEET_ID,
  CURRICULUM_SHEET_ID,
  ATTENDANCE_SHEET_ID,
  CLASSES_SHEET_ID,
} = require("../config");

const sheets = google.sheets("v4");

const SCOPES = ["https://www.googleapis.com/auth/spreadsheets"];

async function getAuthToken() {
  const auth = new google.auth.GoogleAuth({
    scopes: SCOPES,
    credentials: {
      client_email: GOOGLE_CLIENT_EMAIL,
      private_key: GOOGLE_PRIVATE_KEY,
    },
  });
  const authToken = await auth.getClient();
  return authToken;
}

async function _getSpreadSheetValues(spreadsheetId, range = "Sheet1") {
  const auth = await getAuthToken();

  const res = sheets.spreadsheets.values.get({
    auth,
    spreadsheetId,
    range,
    majorDimension: "COLUMNS",
  });

  return res;
}

async function getStudentsSpreadSheetValues() {
  const res = await _getSpreadSheetValues(STUDENTS_SHEET_ID);
  return res.data.values;
}

async function getCurriculumSpreadSheetValues() {
  const [theory, practical] = await Promise.all([
    _getSpreadSheetValues(CURRICULUM_SHEET_ID, "Theory"),
    _getSpreadSheetValues(CURRICULUM_SHEET_ID, "Practical"),
  ]);

  return {
    theory: theory.data.values,
    practical: practical.data.values,
  };
}

async function getAttendanceSpreadSheetValues() {
  const res = await _getSpreadSheetValues(ATTENDANCE_SHEET_ID);
  return res.data.values;
}

async function getClassesSpreadSheetValues() {
  const res = await _getSpreadSheetValues(CLASSES_SHEET_ID);
  return res.data.values;
}

async function updateAttendanceSpreadSheetValues(attendance) {
  const [pastAttendance, auth] = await Promise.all([
    getAttendanceSpreadSheetValues(),
    getAuthToken(),
  ]);

  const rollNoToValue = {};
  attendance.forEach((a) => {
    rollNoToValue[a.rollNo] = a.value;
  });

  const newAttendance = [];

  for (let i = 0; i < pastAttendance.length; i++) {
    for (let j = 0; j < pastAttendance[i].length; j++) {
      const rollNo = pastAttendance[i][j];
      if (rollNo in rollNoToValue) {
        newAttendance.push({
          row: i + 1,
          column: j,
          value: rollNoToValue[rollNo],
        });
      }
    }
  }

  const updateValues = newAttendance.map((a) => {
    return {
      range: `${String.fromCharCode(65 + a.row)}${a.column + 1}`,
      values: [[a.value]],
      majorDimension: "COLUMNS",
    };
  });

  const res = sheets.spreadsheets.values.batchUpdate({
    auth,
    spreadsheetId: ATTENDANCE_SHEET_ID,
    resource: {
      data: updateValues,
      valueInputOption: "USER_ENTERED",
    },
  });

  return res;
}

module.exports = {
  getStudentsSpreadSheetValues,
  getCurriculumSpreadSheetValues,
  getAttendanceSpreadSheetValues,
  getClassesSpreadSheetValues,
  updateAttendanceSpreadSheetValues,
};
