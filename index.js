const express = require("express");

const { PORT } = require("./config");

const app = express();

app.get("/", (_, res) => res.send("Welcome to Smart Submission Ticket API"));

app.get("/students", async (_, res) => {
  const {
    getStudentsSpreadSheetValues,
  } = require("./utils/googleSheetsService");
  const students = await getStudentsSpreadSheetValues();
  res.send(students.data);
});

const server = app.listen(PORT, () =>
  console.log(`Listening on port ${PORT}...`)
);

module.exports = server;
