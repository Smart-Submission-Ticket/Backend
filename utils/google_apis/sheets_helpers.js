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

async function adjustCellsSpacing(
  spreadsheetId,
  sheetId,
  startRowIndex = null,
  endRowIndex = null,
  startColumnIndex = null,
  endColumnIndex = null,
  verticalPadding = 5,
  horizontalPadding = 8
) {
  const requests = [];

  // Resize rows
  requests.push({
    autoResizeDimensions: {
      dimensions: {
        sheetId,
        dimension: "ROWS",
        startIndex: startRowIndex || 0,
        endIndex: endRowIndex || 1000,
      },
    },
  });

  requests.push({
    repeatCell: {
      range: {
        sheetId,
        startRowIndex: startRowIndex || 0,
        endRowIndex: endRowIndex || 1000,
        startColumnIndex: startColumnIndex || 0,
        endColumnIndex: endColumnIndex || 1000,
      },
      cell: {
        // Apply padding to cells
        userEnteredFormat: {
          padding: {
            top: verticalPadding,
            bottom: verticalPadding,
            left: horizontalPadding,
            right: horizontalPadding,
          },
        },
      },
      fields: "userEnteredFormat(padding)",
    },
  });

  await updateSpreadSheet(spreadsheetId, requests);
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
      fields: `userEnteredFormat(horizontalAlignment,verticalAlignment,wrapStrategy,${
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
  pixelSize,
  dimension = "COLUMNS"
) => {
  return {
    updateDimensionProperties: {
      range: {
        sheetId,
        dimension,
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

const updateBordersRequest = (
  sheetId,
  startRowIndex,
  endRowIndex,
  startColumnIndex,
  endColumnIndex,
  topWidth = null,
  bottomWidth = null,
  leftWidth = null,
  rightWidth = null
) => {
  return {
    updateBorders: {
      range: {
        sheetId,
        startRowIndex,
        endRowIndex,
        startColumnIndex,
        endColumnIndex,
      },
      top: topWidth ? { style: "SOLID", width: topWidth } : null,
      bottom: bottomWidth ? { style: "SOLID", width: bottomWidth } : null,
      left: leftWidth ? { style: "SOLID", width: leftWidth } : null,
      right: rightWidth ? { style: "SOLID", width: rightWidth } : null,
      innerHorizontal: { style: "SOLID", width: 1 },
      innerVertical: { style: "SOLID", width: 1 },
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
  updateBordersRequest,
};
