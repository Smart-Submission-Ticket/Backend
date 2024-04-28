const { getSpreadSheet, updateSpreadSheet } = require("./sheets_services");

async function addSheet(spreadsheetId, title) {
  const res = updateSpreadSheet(spreadsheetId, [
    {
      addSheet: {
        properties: {
          title,
        },
      },
    },
  ]);

  return res;
}

async function deleteSheet(spreadsheetId, sheetId) {
  const res = updateSpreadSheet(spreadsheetId, [
    {
      deleteSheet: {
        sheetId,
      },
    },
  ]);

  return res;
}

const convertRowColToA1Notation = (sheet, row, col) => {
  return `'${sheet}'!${String.fromCharCode(65 + col)}${row + 1}`;
};

const makeTimesNewRomanAsDefaultFont = async (spreadsheetId, sheetId) => {
  const requests = [
    {
      repeatCell: {
        range: {
          sheetId,
          startRowIndex: 0,
          endRowIndex: 1000,
          startColumnIndex: 0,
          endColumnIndex: 1000,
        },
        cell: {
          userEnteredFormat: {
            textFormat: {
              fontFamily: "Times New Roman",
            },
          },
        },
        fields: "userEnteredFormat.textFormat.fontFamily",
      },
    },
  ];

  await updateSpreadSheet(spreadsheetId, requests);
};

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

const mergeCellsRequest = (
  sheetId,
  startRowIndex,
  endRowIndex,
  startColumnIndex,
  endColumnIndex
) => {
  return {
    mergeCells: {
      range: {
        sheetId,
        startRowIndex,
        endRowIndex,
        startColumnIndex,
        endColumnIndex,
      },
      mergeType: "MERGE_ALL",
    },
  };
};

const repeatCellRequest = (
  sheetId,
  startRowIndex,
  endRowIndex,
  startColumnIndex,
  endColumnIndex,
  { textFormat = null, borders = null }
) => {
  return {
    repeatCell: {
      range: {
        sheetId,
        startRowIndex,
        endRowIndex,
        startColumnIndex,
        endColumnIndex,
      },
      cell: {
        userEnteredFormat: {
          horizontalAlignment: "CENTER",
          verticalAlignment: "MIDDLE",
          wrapStrategy: "WRAP",
          ...(textFormat !== null ? { textFormat } : {}),
          ...(borders !== null ? { borders } : {}),
        },
      },
      fields:
        // "userEnteredFormat(horizontalAlignment,verticalAlignment,wrapStrategy,textFormat,borders)",
        `userEnteredFormat(horizontalAlignment,verticalAlignment,wrapStrategy,${
          textFormat !== null ? "textFormat," : ""
        }${borders !== null ? "borders" : ""})`,
    },
  };
};

const textFormatRequest = ({
  fontSize = 12,
  bold = false,
  italic = false,
  foregroundColor = null,
}) => {
  return {
    fontSize,
    bold,
    italic,
    foregroundColor,
  };
};

const bordersRequest = (
  topWidth = null,
  bottomWidth = null,
  leftWidth = null,
  rightWidth = null
) => {
  return {
    top: topWidth ? { style: "SOLID", width: topWidth } : null,
    bottom: bottomWidth ? { style: "SOLID", width: bottomWidth } : null,
    left: leftWidth ? { style: "SOLID", width: leftWidth } : null,
    right: rightWidth ? { style: "SOLID", width: rightWidth } : null,
  };
};

const updateDimensionsRequest = (
  sheetId,
  startColumnIndex,
  endColumnIndex,
  pixelSize
) => {
  return {
    updateDimensionProperties: {
      range: {
        sheetId,
        dimension: "COLUMNS",
        startIndex: startColumnIndex,
        endIndex: endColumnIndex,
      },
      properties: {
        pixelSize,
      },
      fields: "pixelSize",
    },
  };
};

module.exports = {
  addSheet,
  deleteSheet,
  convertRowColToA1Notation,
  makeTimesNewRomanAsDefaultFont,
  adjustCellsSpacing,
  mergeCellsRequest,
  repeatCellRequest,
  textFormatRequest,
  bordersRequest,
  updateDimensionsRequest,
};
