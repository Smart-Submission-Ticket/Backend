const {
  STUDENTS_SHEET_ID,
  CURRICULUM_SHEET_ID,
  ATTENDANCE_SHEET_ID,
  CLASSES_SHEET_ID,
  CC_SHEET_ID,
  MENTORS_SHEET_ID,
  TE_SEMINARS_SHEET_ID,
  BE_PROJECTS_SHEET_ID,
  HONORS_SHEET_ID,
} = require("../../config");
const { updateSpreadSheetValues } = require("../google_apis/sheets_services");

function _convertToMajorDimensionRows(values) {
  const rows = [];
  const longestRow = Math.max(...values.map((v) => v.length));
  for (let i = 0; i < longestRow; i++) {
    rows.push(values.map((v) => v[i] || ""));
  }

  return rows;
}

async function uploadClassesDataToSpreadSheet(classes) {
  await updateSpreadSheetValues(
    CLASSES_SHEET_ID,
    "Sheet1",
    _convertToMajorDimensionRows(classes)
  );
}

async function uploadStudentsDataToSpreadSheet(students) {
  await updateSpreadSheetValues(
    STUDENTS_SHEET_ID,
    "Sheet1",
    _convertToMajorDimensionRows(students)
  );
}

async function uploadCurriculumDataToSpreadSheet(curriculum) {
  await Promise.all([
    updateSpreadSheetValues(
      CURRICULUM_SHEET_ID,
      "Theory",
      _convertToMajorDimensionRows(curriculum.theory)
    ),
    updateSpreadSheetValues(
      CURRICULUM_SHEET_ID,
      "Practical",
      _convertToMajorDimensionRows(curriculum.practical)
    ),
  ]);
}

async function uploadAttendanceDataToSpreadSheet(attendance) {
  await updateSpreadSheetValues(
    ATTENDANCE_SHEET_ID,
    "Sheet1",
    _convertToMajorDimensionRows(attendance)
  );
}

async function uploadCCDataToSpreadSheet(cc) {
  await updateSpreadSheetValues(
    CC_SHEET_ID,
    "Sheet1",
    _convertToMajorDimensionRows(cc)
  );
}

async function uploadMentorsDataToSpreadSheet(mentors) {
  await updateSpreadSheetValues(
    MENTORS_SHEET_ID,
    "Sheet1",
    _convertToMajorDimensionRows(mentors)
  );
}

async function uploadTESeminarsDataToSpreadSheet(te_seminars) {
  await updateSpreadSheetValues(
    TE_SEMINARS_SHEET_ID,
    "Sheet1",
    _convertToMajorDimensionRows(te_seminars)
  );
}

async function uploadBEProjectsDataToSpreadSheet(be_projects) {
  await updateSpreadSheetValues(
    BE_PROJECTS_SHEET_ID,
    "Sheet1",
    _convertToMajorDimensionRows(be_projects)
  );
}

async function uploadHonorsDataToSpreadSheet(honors) {
  await updateSpreadSheetValues(
    HONORS_SHEET_ID,
    "Sheet1",
    _convertToMajorDimensionRows(honors)
  );
}

module.exports = {
  uploadStudentsDataToSpreadSheet,
  uploadCurriculumDataToSpreadSheet,
  uploadAttendanceDataToSpreadSheet,
  uploadClassesDataToSpreadSheet,
  uploadCCDataToSpreadSheet,
  uploadMentorsDataToSpreadSheet,
  uploadTESeminarsDataToSpreadSheet,
  uploadBEProjectsDataToSpreadSheet,
  uploadHonorsDataToSpreadSheet,
};
