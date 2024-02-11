const { google } = require("googleapis");

const {
  GOOGLE_CLIENT_EMAIL,
  GOOGLE_PRIVATE_KEY,
  STUDENTS_SHEET_ID,
} = require("../config");

const sheets = google.sheets("v4");

const SCOPES = [
  "https://www.googleapis.com/auth/spreadsheets",
  "https://www.googleapis.com/auth/spreadsheets.readonly",
];

async function getAuthToken() {
  console.log({
    scopes: SCOPES,
    credentials: {
      client_email: GOOGLE_CLIENT_EMAIL,
      private_key: GOOGLE_PRIVATE_KEY,
    },
  });

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

async function getStudentsSpreadSheetValues() {
  const auth = await getAuthToken();

  console.log({
    auth,
    spreadsheetId: STUDENTS_SHEET_ID,
    range: "Sheet1",
    majorDimension: "COLUMNS",
  });

  const res = sheets.spreadsheets.values.get({
    auth,
    spreadsheetId: STUDENTS_SHEET_ID,
    range: "Sheet1",
    majorDimension: "COLUMNS",
  });

  return res;
}

module.exports = {
  getStudentsSpreadSheetValues,
};
