const { google } = require("googleapis");

const { getAuthToken } = require("./auth");
const { GOOGLE_DRIVE_FOLDER_ID } = require("../../config");

const drive = google.drive("v3");

async function checkIfSpreadSheetExists(spreadsheet, folderId) {
  const auth = await getAuthToken();

  const queries = [
    `name = '${spreadsheet}'`,
    "mimeType = 'application/vnd.google-apps.spreadsheet'",
    "trashed = false",
    `'${folderId}' in parents`,
  ];

  const sheetExists = await drive.files.list({
    auth,
    q: queries.join(" and "),
    fields: "files(id)",
  });

  return sheetExists.data.files.length > 0;
}

async function createFolderIfNotExists(folderName) {
  const auth = await getAuthToken();

  const queries = [
    `name = '${folderName}'`,
    "mimeType = 'application/vnd.google-apps.folder'",
    "trashed = false",
    `'${GOOGLE_DRIVE_FOLDER_ID}' in parents`,
  ];

  const folderExists = await drive.files.list({
    auth,
    q: queries.join(" and "),
    fields: "files(id)",
  });

  if (folderExists.data.files.length > 0) {
    return { data: { id: folderExists.data.files[0].id } };
  }

  const fileMetadata = {
    name: folderName,
    mimeType: "application/vnd.google-apps.folder",
    parents: [GOOGLE_DRIVE_FOLDER_ID],
  };

  const res = drive.files.create({
    auth,
    requestBody: fileMetadata,
    fields: "id",
  });

  return res;
}

async function createSheetInFolder(title, folderId) {
  const auth = await getAuthToken();
  const res = drive.files.create({
    auth,
    resource: {
      name: title,
      mimeType: "application/vnd.google-apps.spreadsheet",
      parents: [folderId],
    },
    fields: "id",
  });

  return res;
}

module.exports = {
  checkIfSpreadSheetExists,
  createFolderIfNotExists,
  createSheetInFolder,
};
