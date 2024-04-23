const { google } = require("googleapis");

const {
  GOOGLE_CLIENT_EMAIL,
  GOOGLE_PRIVATE_KEY,
  STUDENTS_SHEET_ID,
  CURRICULUM_SHEET_ID,
  ATTENDANCE_SHEET_ID,
  CLASSES_SHEET_ID,
  CC_SHEET_ID,
  MENTORS_SHEET_ID,
  TE_SEMINARS_SHEET_ID,
  BE_PROJECTS_SHEET_ID,
  HONORS_SHEET_ID,
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

async function getCCSpreadSheetValues() {
  const res = await _getSpreadSheetValues(CC_SHEET_ID);
  return res.data.values;
}

async function getMentorsSpreadSheetValues() {
  const res = await _getSpreadSheetValues(MENTORS_SHEET_ID);
  return res.data.values;
}

async function getTESeminarsSpreadSheetValues() {
  const res = await _getSpreadSheetValues(TE_SEMINARS_SHEET_ID);
  return res.data.values;
}

async function getBEProjectsSpreadSheetValues() {
  const res = await _getSpreadSheetValues(BE_PROJECTS_SHEET_ID);
  return res.data.values;
}

async function getHonorsSpreadSheetValues() {
  const res = await _getSpreadSheetValues(HONORS_SHEET_ID);
  return res.data.values;
}

async function updateAttendanceSpreadSheetValues(attendance) {
  const [pastAttendance, auth] = await Promise.all([
    getAttendanceSpreadSheetValues(),
    getAuthToken(),
  ]);

  const rollNoToValue = {};
  attendance.forEach((a) => {
    rollNoToValue[a.rollNo] = a.attendance;
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

async function _updateSpreadSheetValues(spreadsheetId, range, values) {
  const auth = await getAuthToken();

  const res = sheets.spreadsheets.values.update({
    auth,
    spreadsheetId,
    range,
    valueInputOption: "USER_ENTERED",
    resource: {
      values,
    },
  });

  return res;
}

function _convertToMajorDimensionRows(values) {
  const rows = [];
  const longestRow = Math.max(...values.map((v) => v.length));
  for (let i = 0; i < longestRow; i++) {
    rows.push(values.map((v) => v[i] || ""));
  }

  return rows;
}

async function uploadClassesDataToSpreadSheet(classes) {
  await _updateSpreadSheetValues(
    CLASSES_SHEET_ID,
    "Sheet1",
    _convertToMajorDimensionRows(classes)
  );
}

async function uploadStudentsDataToSpreadSheet(students) {
  await _updateSpreadSheetValues(
    STUDENTS_SHEET_ID,
    "Sheet1",
    _convertToMajorDimensionRows(students)
  );
}

async function uploadCurriculumDataToSpreadSheet(curriculum) {
  await Promise.all([
    _updateSpreadSheetValues(
      CURRICULUM_SHEET_ID,
      "Theory",
      _convertToMajorDimensionRows(curriculum.theory)
    ),
    _updateSpreadSheetValues(
      CURRICULUM_SHEET_ID,
      "Practical",
      _convertToMajorDimensionRows(curriculum.practical)
    ),
  ]);
}

async function uploadAttendanceDataToSpreadSheet(attendance) {
  await _updateSpreadSheetValues(
    ATTENDANCE_SHEET_ID,
    "Sheet1",
    _convertToMajorDimensionRows(attendance)
  );
}

async function uploadCCDataToSpreadSheet(cc) {
  await _updateSpreadSheetValues(
    CC_SHEET_ID,
    "Sheet1",
    _convertToMajorDimensionRows(cc)
  );
}

async function uploadMentorsDataToSpreadSheet(mentors) {
  await _updateSpreadSheetValues(
    MENTORS_SHEET_ID,
    "Sheet1",
    _convertToMajorDimensionRows(mentors)
  );
}

async function uploadTESeminarsDataToSpreadSheet(te_seminars) {
  await _updateSpreadSheetValues(
    TE_SEMINARS_SHEET_ID,
    "Sheet1",
    _convertToMajorDimensionRows(te_seminars)
  );
}

async function uploadBEProjectsDataToSpreadSheet(be_projects) {
  await _updateSpreadSheetValues(
    BE_PROJECTS_SHEET_ID,
    "Sheet1",
    _convertToMajorDimensionRows(be_projects)
  );
}

async function uploadHonorsDataToSpreadSheet(honors) {
  await _updateSpreadSheetValues(
    HONORS_SHEET_ID,
    "Sheet1",
    _convertToMajorDimensionRows(honors)
  );
}

module.exports = {
  getStudentsSpreadSheetValues,
  getCurriculumSpreadSheetValues,
  getAttendanceSpreadSheetValues,
  getClassesSpreadSheetValues,
  getCCSpreadSheetValues,
  getMentorsSpreadSheetValues,
  getTESeminarsSpreadSheetValues,
  getBEProjectsSpreadSheetValues,
  getHonorsSpreadSheetValues,
  updateAttendanceSpreadSheetValues,
  uploadClassesDataToSpreadSheet,
  uploadStudentsDataToSpreadSheet,
  uploadCurriculumDataToSpreadSheet,
  uploadAttendanceDataToSpreadSheet,
  uploadCCDataToSpreadSheet,
  uploadMentorsDataToSpreadSheet,
  uploadTESeminarsDataToSpreadSheet,
  uploadBEProjectsDataToSpreadSheet,
  uploadHonorsDataToSpreadSheet,
};
