const mongoose = require("mongoose");

const sheetSchema = new mongoose.Schema({
  title: {
    type: String,
    required: true,
  },
  spreadsheetId: {
    type: String,
    required: true,
  },
  parentFolderId: {
    type: String,
  },
});

const Sheet = mongoose.model("Sheet", sheetSchema);

const insertSheets = async (sheets) => {
  // Check if the sheets already exist
  const existingSheets = await Sheet.find({
    title: { $in: sheets.map((sheet) => sheet.title) },
  });

  // If the sheets already exist, return
  if (existingSheets.length === sheets.length) {
    return;
  }

  // If the sheets do not exist, insert them
  const newSheets = sheets.filter(
    (sheet) =>
      !existingSheets.find(
        (existingSheet) => existingSheet.title === sheet.title
      )
  );
  await Sheet.insertMany(newSheets);
};

exports.Sheet = Sheet;
exports.insertSheets = insertSheets;
