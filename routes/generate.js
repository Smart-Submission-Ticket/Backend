const express = require("express");
const assert = require("assert");

const { Sheet } = require("../models/sheet");
const { TicketData } = require("../models/ticket_data");
const {
  createFolderIfNotExists,
  createSheetInFolder,
} = require("../utils/google_apis/drive_services");
const { generateMasterUtSheet } = require("../utils/sheets/master_ut");

const router = express.Router();

router.post("/master/ut", async (req, res) => {
  /*
  Valid years:
  1. years: 3
  2. years: [3, 4]
   */
  let { years } = req.body;

  if (!years) years = [2, 3, 4];

  // Convert to array if not already
  if (!Array.isArray(years)) years = [years];

  // Check if all years are valid
  years.forEach((year) => {
    assert(year, "ERROR 400: year is required");
    assert(typeof year === "number", "ERROR 400: year must be a number");
    assert(year >= 2 && year <= 4, "ERROR 400: year must be between 2 and 4");
  });

  const yearToEngg = {
    2: "SE",
    3: "TE",
    4: "BE",
  };

  // Create sheets if not exist
  const [ticketData, sheets] = await Promise.all([
    TicketData.getTicketData(),
    Sheet.find().select("-_id -__v"),
  ]);
  const { academicYear, semester } = ticketData;

  const folder = await createFolderIfNotExists(academicYear);

  await Promise.all(
    years.map(async (year) => {
      const title = `${academicYear} SEM ${semester} IT Unit Test 1 & 2 Reports ${yearToEngg[year]}`;
      const sheetExists = sheets.find((sheet) => sheet.title === title);
      let sheetId;

      if (!sheetExists) {
        const sheet = await createSheetInFolder(title, folder.data.id);

        await Sheet.create({
          title,
          spreadsheetId: sheet.data.id,
          parentFolderId: folder.data.id,
        });

        sheetId = sheet.data.id;
      } else {
        sheetId = sheetExists.spreadsheetId;
      }

      generateMasterUtSheet(year, sheetId);
    })
  );

  const createSheets = await Sheet.find({
    title: {
      $regex: `^${academicYear} SEM ${semester} IT Unit Test 1 & 2 Reports`,
    },
  }).select("-_id -__v -parentFolderId");

  res.send({
    message: "Master UT sheets created.",
    sheets: createSheets.map((sheet) => {
      return {
        title: sheet.title,
        link: `https://docs.google.com/spreadsheets/d/${sheet.spreadsheetId}`,
      };
    }),
  });
});

module.exports = router;
