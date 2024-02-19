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

const SCOPES = [
  "https://www.googleapis.com/auth/spreadsheets",
  "https://www.googleapis.com/auth/spreadsheets.readonly",
];

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

async function _getSpreadSheetValues(spreadsheetId) {
  const auth = await getAuthToken();

  const res = sheets.spreadsheets.values.get({
    auth,
    spreadsheetId,
    range: "Sheet1",
    majorDimension: "COLUMNS",
  });

  return res;
}

async function getStudentsSpreadSheetValues() {
  const res = await _getSpreadSheetValues(STUDENTS_SHEET_ID);
  return res.data.values;
}

async function getCurriculumSpreadSheetValues() {
  const res = await _getSpreadSheetValues(CURRICULUM_SHEET_ID);
  return res.data.values;
}

async function getAttendanceSpreadSheetValues() {
  const res = await _getSpreadSheetValues(ATTENDANCE_SHEET_ID);
  return res.data.values;
}

async function getClassesSpreadSheetValues() {
  const res = await _getSpreadSheetValues(CLASSES_SHEET_ID);
  return res.data.values;
}

module.exports = {
  getStudentsSpreadSheetValues,
  getCurriculumSpreadSheetValues,
  getAttendanceSpreadSheetValues,
  getClassesSpreadSheetValues,
};
