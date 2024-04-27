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
const { getSpreadSheetValues } = require("./services");

async function getStudentsSpreadSheetValues() {
  const res = await getSpreadSheetValues(STUDENTS_SHEET_ID);
  return res.data.values;
}

async function getCurriculumSpreadSheetValues() {
  const [theory, practical] = await Promise.all([
    getSpreadSheetValues(CURRICULUM_SHEET_ID, "Theory"),
    getSpreadSheetValues(CURRICULUM_SHEET_ID, "Practical"),
  ]);

  return {
    theory: theory.data.values,
    practical: practical.data.values,
  };
}

async function getAttendanceSpreadSheetValues() {
  const res = await getSpreadSheetValues(ATTENDANCE_SHEET_ID);
  return res.data.values;
}

async function getClassesSpreadSheetValues() {
  const res = await getSpreadSheetValues(CLASSES_SHEET_ID);
  return res.data.values;
}

async function getCCSpreadSheetValues() {
  const res = await getSpreadSheetValues(CC_SHEET_ID);
  return res.data.values;
}

async function getMentorsSpreadSheetValues() {
  const res = await getSpreadSheetValues(MENTORS_SHEET_ID);
  return res.data.values;
}

async function getTESeminarsSpreadSheetValues() {
  const res = await getSpreadSheetValues(TE_SEMINARS_SHEET_ID);
  return res.data.values;
}

async function getBEProjectsSpreadSheetValues() {
  const res = await getSpreadSheetValues(BE_PROJECTS_SHEET_ID);
  return res.data.values;
}

async function getHonorsSpreadSheetValues() {
  const res = await getSpreadSheetValues(HONORS_SHEET_ID);
  return res.data.values;
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
};
