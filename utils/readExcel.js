const xlsx = require("xlsx");

const readExcel = (fileBuffer, sheetName = "Sheet1") => {
  const workbook = xlsx.read(fileBuffer, { type: "buffer" });

  if (!workbook.SheetNames.includes(sheetName))
    sheetName = workbook.SheetNames[0];

  const sheet = workbook.Sheets[sheetName];
  const data = xlsx.utils.sheet_to_json(sheet, {
    header: 1,
    raw: false,
    blankrows: false,
  });

  const maxLength = Math.max(...data.map((row) => row.length));

  const result = [];

  for (let i = 0; i < maxLength; i++) {
    let columnData = [];
    for (let j = 0; j < data.length; j++) columnData.push(data[j][i]);
    while (columnData[columnData.length - 1] == undefined) columnData.pop();
    columnData = columnData.map((value) => (value ? value : ""));
    result.push(columnData);
  }

  return result;
};

module.exports = readExcel;
