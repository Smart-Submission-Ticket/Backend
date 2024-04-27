const { google } = require("googleapis");

const { getAuthToken } = require("./auth");

const sheets = google.sheets("v4");

async function getSpreadSheet(spreadsheetId) {
  const auth = await getAuthToken();

  const res = sheets.spreadsheets.get({
    auth,
    spreadsheetId,
  });

  return res;
}

async function getSpreadSheetValues(spreadsheetId, range = "Sheet1") {
  const auth = await getAuthToken();

  const res = sheets.spreadsheets.values.get({
    auth,
    spreadsheetId,
    range,
    majorDimension: "COLUMNS",
  });

  return res;
}

async function updateSpreadSheetValues(spreadsheetId, range, values) {
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

async function updateSpreadSheetValuesBatch(spreadsheetId, data) {
  const auth = await getAuthToken();

  const res = sheets.spreadsheets.values.batchUpdate({
    auth,
    spreadsheetId,
    resource: {
      data,
      valueInputOption: "USER_ENTERED",
    },
  });

  return res;
}

async function updateSpreadSheet(spreadsheetId, requests) {
  const auth = await getAuthToken();

  const res = sheets.spreadsheets.batchUpdate({
    auth,
    spreadsheetId,
    resource: {
      requests,
    },
  });

  return res;
}

module.exports = {
  getSpreadSheet,
  getSpreadSheetValues,
  updateSpreadSheetValues,
  updateSpreadSheetValuesBatch,
  updateSpreadSheet,
};
