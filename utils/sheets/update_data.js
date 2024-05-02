const { ATTENDANCE_SHEET_ID } = require("../../config");
const {
  updateSpreadSheetValuesBatch,
} = require("../google_apis/sheets_services");
const { getAttendanceSpreadSheetValues } = require("./get_data");

async function updateAttendanceSpreadSheetValues(attendance) {
  const pastAttendance = await getAttendanceSpreadSheetValues();

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

  const res = await updateSpreadSheetValuesBatch(
    ATTENDANCE_SHEET_ID,
    updateValues
  );

  return res;
}

module.exports = {
  updateAttendanceSpreadSheetValues,
};
