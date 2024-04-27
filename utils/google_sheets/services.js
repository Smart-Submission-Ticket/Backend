const { google } = require("googleapis");

const { GOOGLE_CLIENT_EMAIL, GOOGLE_PRIVATE_KEY } = require("../../config");

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

async function adjustCellsSpacing(spreadsheetId) {
  // Get all sheets in the spreadsheet
  const res = await getSpreadSheet(spreadsheetId);
  const sheets = res.data.sheets;

  sheets.forEach((sheet) => {
    const sheetId = sheet.properties.sheetId;
    const gridProperties = sheet.properties.gridProperties;

    const requests = [];

    // Resize columns
    requests.push({
      autoResizeDimensions: {
        dimensions: {
          sheetId,
          dimension: "COLUMNS",
          startIndex: 0,
          endIndex: gridProperties.columnCount,
        },
      },
    });

    // Resize rows
    requests.push({
      autoResizeDimensions: {
        dimensions: {
          sheetId,
          dimension: "ROWS",
          startIndex: 0,
          endIndex: gridProperties.rowCount,
        },
      },
    });

    requests.push({
      repeatCell: {
        range: {
          sheetId,
          startRowIndex: 0,
          endRowIndex: gridProperties.rowCount,
          startColumnIndex: 0,
          endColumnIndex: gridProperties.columnCount,
        },
        cell: {
          // Apply padding to cells
          userEnteredFormat: {
            padding: {
              top: 4,
              bottom: 2,
              left: 12,
              right: 12,
            },
            // Make text centered
            horizontalAlignment: "CENTER",
          },
        },
        fields: "userEnteredFormat(padding,horizontalAlignment)",
      },
    });

    updateSpreadSheet(spreadsheetId, requests);
  });
}

module.exports = {
  getSpreadSheet,
  getSpreadSheetValues,
  updateSpreadSheetValues,
  updateSpreadSheetValuesBatch,
  updateSpreadSheet,
  adjustCellsSpacing,
};
