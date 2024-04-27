const { getSpreadSheet, updateSpreadSheet } = require("./sheets_services");

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
  adjustCellsSpacing,
};
